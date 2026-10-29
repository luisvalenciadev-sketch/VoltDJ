import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

/**
 * Acceso al panel con una sola contraseña (ADMIN_PASSWORD) y una sesión firmada (SESSION_SECRET)
 * en una cookie httpOnly. La sesión no guarda datos personales: solo que es el administrador.
 * proxy.ts filtra rápido por la cookie; aquí se vuelve a verificar en cada página y acción,
 * porque el proxy no debe ser la única defensa.
 */
export const SESSION_COOKIE = "vdj_admin";
const SESSION_DAYS = 7;

const secretKey = () => {
  const s = process.env.SESSION_SECRET ?? "";
  return s.length >= 32 ? new TextEncoder().encode(s) : null;
};

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 10 && secretKey());
}

/** Comparación en tiempo constante (sobre hashes del mismo largo): no filtra cuántos caracteres coinciden. */
export function passwordMatches(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function signAdminToken(): Promise<string | null> {
  const key = secretKey();
  if (!key) return null;
  return new SignJWT({ role: "admin" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${SESSION_DAYS}d`).sign(key);
}

export async function verifyAdminToken(token: string | undefined): Promise<boolean> {
  const key = secretKey();
  if (!key || !token) return false;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export async function createAdminSession(): Promise<void> {
  const token = await signAdminToken();
  if (!token) throw new Error("Panel sin configurar");
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function deleteAdminSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Para páginas y acciones del panel: sin sesión válida, a la pantalla de ingreso. */
export const requireAdmin = cache(async (): Promise<void> => {
  const ok = await verifyAdminToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!ok) redirect("/admin/ingresar");
});

/**
 * Freno a la fuerza bruta: tras 5 intentos fallidos desde la misma IP en 15 minutos, se rechaza
 * sin comparar. Es memoria del proceso (en Vercel, por instancia): frena, no garantiza; la defensa
 * principal es una contraseña larga.
 */
const attempts = new Map<string, { n: number; until: number }>();
export function loginBlocked(ip: string): boolean {
  const a = attempts.get(ip);
  return Boolean(a && a.n >= 5 && Date.now() < a.until);
}
export function recordFailedLogin(ip: string): void {
  const a = attempts.get(ip);
  const fresh = !a || Date.now() >= a.until;
  attempts.set(ip, { n: fresh ? 1 : a.n + 1, until: Date.now() + 15 * 60_000 });
}
export function clearLoginAttempts(ip: string): void {
  attempts.delete(ip);
}

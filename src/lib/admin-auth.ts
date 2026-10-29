import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "./permissions";
import { usersStore, type PanelUser } from "./users-store";

/**
 * Acceso al panel. Dos formas de entrar:
 *  - Usuarios con correo y contraseña, cada uno con su rol (dueño o asesor). Es lo normal.
 *  - La contraseña única (ADMIN_PASSWORD), solo mientras no exista ningún dueño activo: sirve para crear
 *    el primero y luego deja de funcionar. ADMIN_RECOVERY=1 la reactiva si el único dueño perdió su clave.
 * La sesión va firmada (SESSION_SECRET) en una cookie httpOnly. proxy.ts filtra rápido por la firma; aquí
 * se vuelve a verificar en cada página y acción, contra la base (usuario activo y versión de sesión).
 */
export const SESSION_COOKIE = "vdj_admin";
const SESSION_DAYS = 7;
const MASTER = "master";

export interface PanelSession {
  /** null = entró con la contraseña única. */
  userId: string | null;
  name: string;
  role: Role;
}

const secretKey = () => {
  const s = process.env.SESSION_SECRET ?? "";
  return s.length >= 32 ? new TextEncoder().encode(s) : null;
};

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 10 && secretKey());
}

export const recoveryMode = () => process.env.ADMIN_RECOVERY === "1";

/** Comparación en tiempo constante (sobre hashes del mismo largo): no filtra cuántos caracteres coinciden. */
export function passwordMatches(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** ¿Todavía se entra con la contraseña única? Sí mientras no haya un dueño activo (o en modo recuperación). */
export async function masterPasswordEnabled(): Promise<boolean> {
  return recoveryMode() || !(await usersStore().hasActiveOwner());
}

async function readToken(token: string | undefined): Promise<JWTPayload | null> {
  const key = secretKey();
  if (!key || !token) return null;
  try {
    return (await jwtVerify(token, key, { algorithms: ["HS256"] })).payload;
  } catch {
    return null;
  }
}

/** Solo la firma (para el proxy, que no consulta la base). */
export async function verifyAdminToken(token: string | undefined): Promise<boolean> {
  return (await readToken(token)) != null;
}

async function setSession(claims: { uid: string; v: number }): Promise<void> {
  const key = secretKey();
  if (!key) throw new Error("Panel sin configurar");
  const token = await new SignJWT(claims).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${SESSION_DAYS}d`).sign(key);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export const createMasterSession = () => setSession({ uid: MASTER, v: 0 });
export const createUserSession = (u: PanelUser) => setSession({ uid: u.id, v: u.sessionVersion });

export async function deleteAdminSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Sesión vigente, o null. Una sesión de un usuario desactivado o con la contraseña cambiada ya no vale. */
export const getSession = cache(async (): Promise<PanelSession | null> => {
  const payload = await readToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  // Cookies de antes de los usuarios ({ role: "admin" }) cuentan como contraseña única.
  const uid = typeof payload.uid === "string" ? payload.uid : payload.role === "admin" ? MASTER : null;
  if (!uid) return null;
  if (uid === MASTER) return (await masterPasswordEnabled()) ? { userId: null, name: "Contraseña única", role: "dueno" } : null;
  const user = await usersStore().get(uid);
  if (!user || !user.active || user.sessionVersion !== payload.v) return null;
  return { userId: user.id, name: user.name, role: user.role };
});

/** Para páginas y acciones del panel: sin sesión válida, a la pantalla de ingreso. */
export async function requireAdmin(): Promise<PanelSession> {
  const s = await getSession();
  if (!s) redirect("/admin/ingresar");
  return s;
}

/** Solo el dueño: precios, catálogo, promociones, configuración, contenido, usuarios e historial. */
export async function requireOwner(): Promise<PanelSession> {
  const s = await requireAdmin();
  if (s.role !== "dueno") redirect("/admin?permiso=0");
  return s;
}

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

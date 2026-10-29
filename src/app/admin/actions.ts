"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminConfigured, clearLoginAttempts, createAdminSession, deleteAdminSession, loginBlocked, passwordMatches, recordFailedLogin, requireAdmin } from "@/lib/admin-auth";
import { guidesStore } from "@/lib/guides-store";
import {
  addManualStatus,
  createGuideCode,
  freezeToManual,
  isStatus,
  localInputToISO,
  orderTotals,
  parseCOP,
  STEPS,
  type Guide,
  type OrderLine,
  type Mode,
  type TrackingEvent,
} from "@/lib/tracking";

export type FormState = { error?: string; ok?: string } | undefined;

const text = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const optional = (fd: FormData, key: string, max: number) => text(fd, key, max) || null;
/** Celular en formato internacional para wa.me: 10 dígitos colombianos (3xx…) reciben el 57. */
function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 10 && d.startsWith("3")) return `57${d}`;
  return d.length >= 10 && d.length <= 15 ? d : null;
}

function storeOrFail() {
  const s = guidesStore();
  if (!s) throw new Error("La base de datos no está configurada.");
  return s;
}

/** Calendario desde el formulario: un campo datetime-local por paso; vacío = paso omitido. */
function scheduleFrom(fd: FormData): TrackingEvent[] | string {
  const events: TrackingEvent[] = [];
  for (const s of STEPS) {
    const raw = text(fd, `at_${s.id}`, 20);
    if (!raw) continue;
    const at = localInputToISO(raw);
    if (!at) return `Fecha inválida en "${s.label}".`;
    events.push({ status: s.id, at });
  }
  if (!events.length) return "El calendario necesita al menos una fecha.";
  // Las fechas deben avanzar con los pasos: un "Entregado" antes de "Enviado" confundiría al cliente.
  for (let i = 1; i < events.length; i++) {
    if (Date.parse(events[i].at) < Date.parse(events[i - 1].at)) return "Las fechas deben ir en orden: cada paso igual o después del anterior.";
  }
  return events;
}

// ---------- Sesión ----------

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  if (!adminConfigured()) return { error: "El panel no está configurado: faltan ADMIN_PASSWORD o SESSION_SECRET en Vercel." };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (loginBlocked(ip)) return { error: "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo." };
  if (!passwordMatches(String(fd.get("password") ?? ""))) {
    recordFailedLogin(ip);
    await new Promise((r) => setTimeout(r, 600)); // encarece probar contraseñas en serie
    return { error: "Contraseña incorrecta." };
  }
  clearLoginAttempts(ip);
  await createAdminSession();
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await deleteAdminSession();
  redirect("/admin/ingresar");
}

// ---------- Guías ----------

/**
 * Productos del pedido: el formulario los envía como JSON en un campo oculto. Se valida todo en
 * el servidor (cantidad, precio, nombre): el formulario ayuda, pero no es la fuente de verdad.
 */
function linesFrom(fd: FormData): OrderLine[] | string {
  let raw: unknown;
  try {
    raw = JSON.parse(String(fd.get("lines") ?? "[]"));
  } catch {
    return "No pudimos leer los productos del pedido.";
  }
  if (!Array.isArray(raw) || raw.length === 0) return "Agrega al menos un producto al pedido.";
  if (raw.length > 30) return "Máximo 30 productos por guía.";
  const lines: OrderLine[] = [];
  for (const l of raw as Record<string, unknown>[]) {
    const name = String(l?.name ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
    const qty = Number(l?.qty);
    const unitPrice = Number(l?.unitPrice);
    if (!name) return "Hay un producto sin nombre.";
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) return `La cantidad de "${name}" debe estar entre 1 y 99.`;
    if (!Number.isInteger(unitPrice) || unitPrice < 0 || unitPrice > 1_000_000_000) return `El precio de "${name}" no es válido.`;
    lines.push({ productId: typeof l.productId === "string" ? l.productId.slice(0, 80) : null, name, qty, unitPrice });
  }
  return lines;
}

function moneyFrom(fd: FormData, key: string, label: string): number | string {
  const v = parseCOP(String(fd.get(key) ?? ""));
  return v == null ? `"${label}" debe ser un valor en pesos, p. ej. 500.000.` : v;
}

type Details = Pick<Guide, "customerName" | "phone" | "city" | "lines" | "shipping" | "paid" | "carrier" | "trackingNumber" | "publicNote">;
function detailsFrom(fd: FormData): Details | string {
  const customerName = text(fd, "customerName", 80);
  if (!customerName) return "Escribe el nombre del cliente.";
  const rawPhone = text(fd, "phone", 25);
  const phone = normalizePhone(rawPhone);
  if (rawPhone && !phone) return "El celular no parece válido. Escribe 10 dígitos (p. ej. 3001234567).";
  const lines = linesFrom(fd);
  if (typeof lines === "string") return lines;
  const shipping = moneyFrom(fd, "shipping", "Envío");
  if (typeof shipping === "string") return shipping;
  const paid = moneyFrom(fd, "paid", "Pago recibido");
  if (typeof paid === "string") return paid;
  const { total } = orderTotals({ lines, shipping, paid: 0 });
  if (paid > total) return "El pago recibido no puede ser mayor que el total del pedido.";
  return {
    customerName,
    phone,
    city: optional(fd, "city", 60),
    lines,
    shipping,
    paid,
    carrier: optional(fd, "carrier", 40),
    trackingNumber: optional(fd, "trackingNumber", 40),
    publicNote: optional(fd, "publicNote", 200),
  };
}

export async function createGuide(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const details = detailsFrom(fd);
  if (typeof details === "string") return { error: details };
  const mode: Mode = fd.get("mode") === "manual" ? "manual" : "auto";
  let events: TrackingEvent[];
  if (mode === "auto") {
    const s = scheduleFrom(fd);
    if (typeof s === "string") return { error: s };
    events = s;
  } else {
    const status = fd.get("status");
    events = addManualStatus([], isStatus(status) ? status : "confirmado", new Date());
  }

  const store = storeOrFail();
  // Colisión prácticamente imposible (31^8), pero se verifica igual.
  let code = createGuideCode();
  while (await store.get(code)) code = createGuideCode();
  const now = new Date().toISOString();
  await store.create({ code, ...details, items: "", mode, events, createdAt: now, updatedAt: now });
  revalidatePath("/admin");
  redirect(`/admin/guias/${code}?creada=1`);
}

export async function updateDetails(code: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const details = detailsFrom(fd);
  if (typeof details === "string") return { error: details };
  await storeOrFail().update(code, details);
  revalidatePath(`/admin/guias/${code}`);
  return { ok: "Datos guardados." };
}

/** Registrar un abono: el monto es el total recibido hasta ahora, no lo que se suma. */
export async function savePayment(code: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const store = storeOrFail();
  const g = await store.get(code);
  if (!g) return { error: "La guía no existe." };
  const { total } = orderTotals(g);
  const paid = fd.get("full") ? total : moneyFrom(fd, "paid", "Pago recibido");
  if (typeof paid === "string") return { error: paid };
  if (paid > total) return { error: "El pago no puede ser mayor que el total del pedido." };
  await store.update(code, { paid });
  revalidatePath(`/admin/guias/${code}`);
  return { ok: paid === total ? "Pedido pagado por completo." : "Pago registrado." };
}

export async function setManualStatus(code: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const status = fd.get("status");
  if (!isStatus(status)) return { error: "Estado inválido." };
  const store = storeOrFail();
  const g = await store.get(code);
  if (!g) return { error: "La guía no existe." };
  // Un cambio manual congela el calendario: desde aquí manda el asesor.
  const base = g.mode === "auto" ? freezeToManual(g.events) : g.events;
  await store.update(code, { mode: "manual", events: addManualStatus(base, status, new Date(), optional(fd, "note", 160) ?? undefined) });
  revalidatePath(`/admin/guias/${code}`);
  return { ok: "Estado actualizado." };
}

export async function saveSchedule(code: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const s = scheduleFrom(fd);
  if (typeof s === "string") return { error: s };
  await storeOrFail().update(code, { mode: "auto", events: s });
  revalidatePath(`/admin/guias/${code}`);
  return { ok: "Calendario guardado: el estado avanzará solo en esas fechas." };
}

export async function deleteGuide(code: string): Promise<void> {
  await requireAdmin();
  await storeOrFail().remove(code);
  revalidatePath("/admin");
  redirect("/admin?eliminada=1");
}

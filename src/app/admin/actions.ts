"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminConfigured, clearLoginAttempts, createMasterSession, createUserSession, deleteAdminSession, loginBlocked, masterPasswordEnabled, passwordMatches, recordFailedLogin, requireAdmin } from "@/lib/admin-auth";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { usersStore } from "@/lib/users-store";
import { syncGuideStock } from "@/lib/guide-stock";
import { notifyGuide } from "@/lib/notifications";
import { EMAIL_RE } from "@/lib/notify-rules";
import { guidesStore, type GuidesStore } from "@/lib/guides-store";
import {
  addManualStatus,
  createGuideCode,
  currentStatus,
  freezeToManual,
  isOrderLocked,
  isStatus,
  validateRescheduleDay,
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

let dummy: Promise<string> | null = null;
const dummyHash = () => (dummy ??= hashPassword("contraseña que nadie usa"));

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  if (!adminConfigured()) return { error: "El panel no está configurado: faltan ADMIN_PASSWORD o SESSION_SECRET en Vercel." };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (loginBlocked(ip)) return { error: "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo." };
  const email = text(fd, "email", 160).toLowerCase();
  const password = String(fd.get("password") ?? "");
  const fail = async (message: string): Promise<FormState> => {
    recordFailedLogin(ip);
    await new Promise((r) => setTimeout(r, 600)); // encarece probar contraseñas en serie
    return { error: message };
  };

  if (email) {
    const user = await usersStore().byEmail(email);
    // El mismo mensaje y el mismo tiempo si el correo no existe o la clave no coincide: sin cuenta también se
    // calcula un hash, para no revelar por la demora qué correos están registrados.
    const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
    if (!user || !user.active || !ok) return fail("Correo o contraseña incorrectos.");
    clearLoginAttempts(ip);
    await usersStore().update(user.id, { lastLoginAt: new Date().toISOString() });
    await createUserSession(user);
    redirect("/admin");
  }

  // Contraseña única: solo mientras no exista un dueño (o en modo recuperación).
  if (!(await masterPasswordEnabled())) return fail("Escribe tu correo y tu contraseña.");
  if (!passwordMatches(password)) return fail("Contraseña incorrecta.");
  clearLoginAttempts(ip);
  await createMasterSession();
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

type Contact = Pick<Guide, "customerName" | "phone" | "email" | "city" | "carrier" | "trackingNumber" | "publicNote">;
/** Datos de contacto y envío: se pueden corregir en cualquier momento, incluso con el pedido bloqueado. */
function contactFrom(fd: FormData): Contact | string {
  const customerName = text(fd, "customerName", 80);
  if (!customerName) return "Escribe el nombre del cliente.";
  const rawPhone = text(fd, "phone", 25);
  const phone = normalizePhone(rawPhone);
  if (rawPhone && !phone) return "El celular no parece válido. Escribe 10 dígitos (p. ej. 3001234567).";
  const email = text(fd, "email", 160).toLowerCase();
  if (email && !EMAIL_RE.test(email)) return "El correo del cliente no parece válido.";
  return {
    customerName,
    phone,
    email: email || null,
    city: optional(fd, "city", 60),
    carrier: optional(fd, "carrier", 40),
    trackingNumber: optional(fd, "trackingNumber", 40),
    publicNote: optional(fd, "publicNote", 200),
  };
}

type Details = Contact & Pick<Guide, "lines" | "shipping" | "paid">;
function detailsFrom(fd: FormData): Details | string {
  const contact = contactFrom(fd);
  if (typeof contact === "string") return contact;
  const lines = linesFrom(fd);
  if (typeof lines === "string") return lines;
  const shipping = moneyFrom(fd, "shipping", "Envío");
  if (typeof shipping === "string") return shipping;
  const paid = moneyFrom(fd, "paid", "Pago recibido");
  if (typeof paid === "string") return paid;
  const { total } = orderTotals({ lines, shipping, paid: 0 });
  if (paid > total) return "El pago recibido no puede ser mayor que el total del pedido.";
  return { ...contact, lines, shipping, paid };
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
  await store.create({ code, ...details, items: "", mode, events, stockApplied: [], createdAt: now, updatedAt: now });
  const warnings = await stockAfter(store, code);
  revalidatePath("/admin");
  const mail = await notifyGuide(code);
  const mailParam = mail?.sent ? "&correo=1" : mail?.error ? "&correo=0" : "";
  redirect(`/admin/guias/${code}?creada=1${mailParam}${warnings ? `&stock=${encodeURIComponent(warnings.slice(0, 600))}` : ""}`);
}

/** Inventario al día con la guía. Devuelve los avisos de stock juntos, o "" si no hay. */
async function stockAfter(store: GuidesStore, code: string, opts?: { release?: boolean }): Promise<string> {
  const g = await store.get(code);
  if (!g) return "";
  try {
    return (await syncGuideStock(g, store, opts)).join(" ");
  } catch (e) {
    // El pedido ya quedó guardado: un fallo del inventario no lo deshace, se avisa para ajustarlo a mano.
    console.error("[panel] stock del pedido", code, e);
    return "No se pudo actualizar el inventario de este pedido. Revísalo en Inventario.";
  }
}

const withStock = (ok: string, warnings: string): FormState => (warnings ? { ok: `${ok} Inventario: ${warnings}` } : { ok });

/** Revisa si toca escribirle al cliente y suma el resultado al mensaje del panel. */
async function withMail(code: string, state: FormState): Promise<FormState> {
  const mail = await notifyGuide(code);
  if (!state?.ok || !mail) return state;
  return { ok: `${state.ok} ${mail.sent ? `Le escribimos a ${mail.sent}.` : mail.error}` };
}

export async function updateDetails(code: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const store = storeOrFail();
  const g = await store.get(code);
  if (!g) return { error: "La guía no existe." };
  // Pedido en reparto, entregado o cancelado: productos y montos no se tocan aunque el formulario
  // los enviara (defensa en el servidor, no solo en la interfaz).
  if (isOrderLocked(currentStatus(g)?.status)) {
    const contact = contactFrom(fd);
    if (typeof contact === "string") return { error: contact };
    await store.update(code, contact);
    revalidatePath(`/admin/guias/${code}`);
    return withMail(code, { ok: "Datos de contacto y envío guardados. Los productos y montos están bloqueados." });
  }
  const details = detailsFrom(fd);
  if (typeof details === "string") return { error: details };
  await store.update(code, details);
  const warnings = await stockAfter(store, code);
  revalidatePath(`/admin/guias/${code}`);
  return withMail(code, withStock("Datos guardados.", warnings));
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
  // Entrega fallida: el motivo es obligatorio, es lo que el cliente necesita saber.
  const reason = optional(fd, "reason", 120);
  if (status === "entrega_fallida" && !reason) return { error: "Elige el motivo de la entrega fallida." };
  const receivedBy = status === "entregado" ? (optional(fd, "receivedBy", 80) ?? undefined) : undefined;
  let rescheduledFor: string | undefined;
  if (status === "reprogramado") {
    const r = validateRescheduleDay(text(fd, "rescheduledFor", 10));
    if ("error" in r) return { error: r.error };
    rescheduledFor = r.day;
  }
  const note = status === "entrega_fallida" ? reason! : (optional(fd, "note", 160) ?? undefined);
  // Un cambio manual congela el calendario: desde aquí manda el asesor.
  const base = g.mode === "auto" ? freezeToManual(g.events) : g.events;
  await store.update(code, { mode: "manual", events: addManualStatus(base, status, new Date(), note, { receivedBy, rescheduledFor }) });
  // Cancelar devuelve las unidades al inventario; reactivar un pedido cancelado las vuelve a apartar.
  const warnings = await stockAfter(store, code);
  revalidatePath(`/admin/guias/${code}`);
  return withMail(code, withStock(status === "cancelado" ? "Pedido cancelado. Las unidades volvieron al inventario." : "Estado actualizado.", warnings));
}

export async function saveSchedule(code: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const s = scheduleFrom(fd);
  if (typeof s === "string") return { error: s };
  await storeOrFail().update(code, { mode: "auto", events: s });
  revalidatePath(`/admin/guias/${code}`);
  return withMail(code, { ok: "Calendario guardado: el estado avanzará solo en esas fechas." });
}

export async function deleteGuide(code: string): Promise<void> {
  await requireAdmin();
  const store = storeOrFail();
  // Eliminar un pedido no debe dejar unidades apartadas para siempre.
  await stockAfter(store, code, { release: true });
  await store.remove(code);
  revalidatePath("/admin");
  redirect("/admin?eliminada=1");
}

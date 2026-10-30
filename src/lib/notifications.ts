import "server-only";
import { SITE, type StoreSettings } from "@/config/store";
import type { PanelSession } from "./admin-auth";
import { audit } from "./audit";
import { lowStockEmail, orderEmail, testEmail, type EmailStore } from "./email-templates";
import { guidesStore } from "./guides-store";
import { mailer } from "./mailer";
import { isNotifyStatus, maskEmail, pendingNotice } from "./notify-rules";
import { settingsStore } from "./settings-store";

/**
 * Avisos por correo. Nunca bloquean al asesor ni la página del cliente: si el correo falla, el cambio ya
 * quedó guardado y el intento queda en el historial; el aviso se reintenta en la siguiente oportunidad.
 */
const SYSTEM: PanelSession = { userId: null, name: "Sistema", role: "dueno" };

const absolute = (src: string) => (/^https?:\/\//.test(src) ? src : new URL(src, SITE.url).toString());

function emailStore(s: StoreSettings): EmailStore {
  // El correo tiene fondo blanco: el logo para fondo claro, si existe.
  const logo = s.brand.logoOnLight ?? s.brand.logoOnDark;
  return { name: s.name, accent: s.brand.accent, logoUrl: logo ? absolute(logo.src) : null, whatsappNumber: s.whatsappNumber, phone: s.phone, address: s.address };
}

// Dos avisos del mismo pedido a la vez (la acción del asesor y la visita del cliente) no deben duplicarse.
const busy = new Set<string>();

/** Revisa la guía y, si toca, le escribe al cliente. Devuelve qué pasó, para mostrarlo en el panel. */
export async function notifyGuide(code: string): Promise<{ sent?: string; error?: string } | null> {
  const send = mailer();
  const guides = guidesStore();
  if (!send || !guides || busy.has(code)) return null;
  busy.add(code);
  try {
    const guide = await guides.get(code);
    if (!guide?.email) return null;
    const settings = await settingsStore().get();
    const { send: event, markAsNotified } = pendingNotice(guide, settings.notifications.statuses);
    if (!markAsNotified.length) return null;
    if (event && isNotifyStatus(event.status)) {
      const email = orderEmail(emailStore(settings), guide, { ...event, status: event.status }, absolute(`/seguimiento/${guide.code}`));
      try {
        await send.send(guide.email, email, { fromName: settings.name, replyTo: settings.notifications.replyTo });
      } catch (e) {
        console.error("[correo] pedido", code, e);
        await audit(SYSTEM, { entity: "correo", entityId: code, action: "error", summary: `No se pudo enviar "${email.subject}" a ${maskEmail(guide.email)}: ${e instanceof Error ? e.message : "error"}` });
        // No se marca como avisado: se reintenta en la siguiente acción, visita o revisión diaria.
        return { error: "No se pudo enviar el correo al cliente. Se reintentará; revisa Configuración → Notificaciones." };
      }
      await audit(SYSTEM, { entity: "correo", entityId: code, action: "enviado", summary: `"${email.subject}" a ${maskEmail(guide.email)} (${send.label})` });
    }
    await guides.update(code, { notified: markAsNotified });
    return event ? { sent: guide.email } : null;
  } catch (e) {
    console.error("[correo] revisar", code, e);
    return null;
  } finally {
    busy.delete(code);
  }
}

/** Revisión diaria (cron): los pedidos en modo automático avanzan solos y también deben avisar. */
export async function notifyDueGuides(): Promise<{ checked: number; sent: number }> {
  const guides = guidesStore();
  if (!mailer() || !guides) return { checked: 0, sent: 0 };
  const open = (await guides.list()).filter((g) => g.email);
  let sent = 0;
  for (const g of open) if ((await notifyGuide(g.code))?.sent) sent++;
  return { checked: open.length, sent };
}

/** Aviso al dueño cuando productos quedan en stock bajo o agotados. */
export async function notifyLowStock(items: { name: string; stock: number }[]): Promise<void> {
  const send = mailer();
  if (!send || !items.length) return;
  const settings = await settingsStore().get();
  const to = settings.notifications.ownerEmail;
  if (!settings.notifications.lowStock || !to) return;
  const email = lowStockEmail(emailStore(settings), items, absolute("/admin/inventario?ver=atencion"));
  try {
    await send.send(to, email, { fromName: settings.name, replyTo: null });
    await audit(SYSTEM, { entity: "correo", action: "enviado", summary: `"${email.subject}" a ${maskEmail(to)} (${send.label})` });
  } catch (e) {
    console.error("[correo] stock bajo", e);
    await audit(SYSTEM, { entity: "correo", action: "error", summary: `No se pudo enviar "${email.subject}": ${e instanceof Error ? e.message : "error"}` });
  }
}

export async function sendTest(session: PanelSession, to: string): Promise<string | null> {
  const send = mailer();
  if (!send) return "No hay proveedor de correo configurado.";
  const settings = await settingsStore().get();
  try {
    await send.send(to, testEmail(emailStore(settings), send.label), { fromName: settings.name, replyTo: settings.notifications.replyTo });
  } catch (e) {
    console.error("[correo] prueba", e);
    return `${send.label} rechazó el envío: ${e instanceof Error ? e.message : "error desconocido"}`;
  }
  await audit(session, { entity: "correo", action: "prueba", summary: `Correo de prueba a ${maskEmail(to)} (${send.label})` });
  return null;
}

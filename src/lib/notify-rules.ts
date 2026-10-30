import { currentStatus, type Guide, type StatusId, type TrackingEvent } from "./tracking";

/**
 * Cuándo se le escribe al cliente. Lógica pura, sin envíos: la usan las acciones del panel, la consulta
 * pública y la tarea diaria, así que un pedido en modo automático avisa aunque nadie lo toque.
 */
export const NOTIFY_STATUSES = ["confirmado", "enviado", "en_reparto", "entregado", "entrega_fallida", "reprogramado", "cancelado"] as const satisfies readonly StatusId[];
export type NotifyStatus = (typeof NOTIFY_STATUSES)[number];
export const isNotifyStatus = (s: StatusId): s is NotifyStatus => (NOTIFY_STATUSES as readonly string[]).includes(s);

export const NOTIFY_LABEL: Record<NotifyStatus, string> = {
  confirmado: "Pedido confirmado (al crear la guía)",
  enviado: "Pedido enviado",
  en_reparto: "En reparto",
  entregado: "Entregado",
  entrega_fallida: "Entrega fallida (con enlace para reprogramar)",
  reprogramado: "Entrega reprogramada",
  cancelado: "Pedido cancelado",
};

/** Identidad de un paso: el mismo estado puede repetirse (dos entregas fallidas) y cada una avisa una vez. */
export const eventKey = (e: Pick<TrackingEvent, "status" | "at">) => `${e.status}@${e.at}`;

/**
 * Qué correo toca ahora: el del paso más reciente que tenga aviso activo, entre los que aún no se avisaron.
 * Si el pedido pasó por varios pasos sin avisar (p. ej. la tarea diaria corre una vez al día), el cliente
 * recibe uno solo. Los pasos sin aviso (pago recibido, preparando) no tapan al anterior: el calendario
 * automático pone "confirmado" y "pago recibido" a la misma hora, y la confirmación debe salir igual.
 * `markAsNotified` son todos los pasos ya ocurridos: quedan como avisados, se haya enviado o no.
 */
export function pendingNotice(guide: Pick<Guide, "events" | "notified">, enabled: Partial<Record<NotifyStatus, boolean>>, now: Date = new Date()): { send: TrackingEvent | null; markAsNotified: string[] } {
  const done = new Set(guide.notified ?? []);
  const past = guide.events.filter((e) => Date.parse(e.at) <= now.getTime());
  const fresh = past.filter((e) => !done.has(eventKey(e)));
  if (!fresh.length) return { send: null, markAsNotified: [] };
  // Si el pedido está cancelado, solo cuenta el aviso de cancelación (nunca un "va en camino" atrasado).
  const latest = currentStatus(guide, now);
  const candidates = latest?.status === "cancelado" ? fresh.filter((e) => e.status === "cancelado") : fresh;
  const send = [...candidates].reverse().find((e) => isNotifyStatus(e.status) && enabled[e.status]) ?? null;
  return { send, markAsNotified: [...done, ...fresh.map(eventKey)] };
}

/** "laura@gmail.com" → "l***@gmail.com": el historial no guarda el correo completo de los clientes. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  return `${user.slice(0, 1)}***@${domain}`;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

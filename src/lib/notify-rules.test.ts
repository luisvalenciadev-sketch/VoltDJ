import { describe, expect, it } from "vitest";
import { eventKey, maskEmail, pendingNotice } from "./notify-rules";
import type { TrackingEvent } from "./tracking";

const ev = (status: TrackingEvent["status"], at: string): TrackingEvent => ({ status, at });
const all = { confirmado: true, enviado: true, en_reparto: true, entregado: true, entrega_fallida: true, reprogramado: true, cancelado: true };
const now = new Date("2026-11-10T15:00:00Z");

describe("avisos por correo", () => {
  it("avisa el paso más reciente una sola vez", () => {
    const events = [ev("confirmado", "2026-11-10T14:00:00Z")];
    const first = pendingNotice({ events, notified: [] }, all, now);
    expect(first.send?.status).toBe("confirmado");
    expect(pendingNotice({ events, notified: first.markAsNotified }, all, now).send).toBeNull();
  });

  it("si pasaron varios pasos sin avisar, manda solo el último", () => {
    const events = [ev("confirmado", "2026-11-08T14:00:00Z"), ev("enviado", "2026-11-09T14:00:00Z"), ev("en_reparto", "2026-11-10T14:00:00Z")];
    const r = pendingNotice({ events, notified: [] }, all, now);
    expect(r.send?.status).toBe("en_reparto");
    expect(r.markAsNotified).toHaveLength(3);
  });

  it("un paso sin aviso (pago recibido) no tapa la confirmación de la misma hora", () => {
    const events = [ev("confirmado", "2026-11-10T14:00:00Z"), ev("pago_recibido", "2026-11-10T14:00:00Z")];
    const r = pendingNotice({ events, notified: [] }, all, now);
    expect(r.send?.status).toBe("confirmado");
    expect(r.markAsNotified).toHaveLength(2);
  });

  it("si el pedido se canceló, solo sale el aviso de cancelación", () => {
    const events = [ev("confirmado", "2026-11-08T14:00:00Z"), ev("enviado", "2026-11-09T14:00:00Z"), ev("cancelado", "2026-11-10T14:00:00Z")];
    expect(pendingNotice({ events, notified: [] }, { ...all, cancelado: false }, now).send).toBeNull();
    expect(pendingNotice({ events, notified: [] }, all, now).send?.status).toBe("cancelado");
  });

  it("no avisa pasos futuros del calendario ni los desactivados", () => {
    const events = [ev("confirmado", "2026-11-10T14:00:00Z"), ev("enviado", "2026-11-12T14:00:00Z")];
    expect(pendingNotice({ events, notified: [] }, { ...all, confirmado: false }, now).send).toBeNull();
    expect(pendingNotice({ events, notified: [eventKey(events[0])] }, all, now).markAsNotified).toEqual([]);
  });

  it("una segunda entrega fallida vuelve a avisar", () => {
    const first = ev("entrega_fallida", "2026-11-09T14:00:00Z");
    const second = ev("entrega_fallida", "2026-11-10T14:00:00Z");
    expect(pendingNotice({ events: [first, second], notified: [eventKey(first)] }, all, now).send).toEqual(second);
  });

  it("el historial no guarda el correo completo", () => {
    expect(maskEmail("laura@gmail.com")).toBe("l***@gmail.com");
  });
});

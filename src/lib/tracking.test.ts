import { describe, expect, it } from "vitest";
import {
  addManualStatus,
  buildSchedule,
  createGuideCode,
  currentStatus,
  freezeToManual,
  isoToLocalInput,
  localInputToISO,
  nextScheduled,
  nextStep,
  orderTotals,
  parseCOP,
  normalizeGuideCode,
  timeline,
  type Guide,
} from "./tracking";

const start = new Date("2026-11-02T15:00:00Z");
const day = (n: number, h = 0) => new Date(start.getTime() + n * 86_400_000 + h * 3_600_000);
const auto = (): Pick<Guide, "events" | "mode"> => ({ mode: "auto", events: buildSchedule(start) });

describe("modo automático", () => {
  it("avanza solo según el calendario", () => {
    const g = auto();
    expect(currentStatus(g, day(0, -1))).toBeNull(); // antes de empezar
    expect(currentStatus(g, day(0, 1))?.status).toBe("pago_recibido"); // día 0 tiene dos pasos: vale el último
    expect(currentStatus(g, day(1, 1))?.status).toBe("preparando");
    expect(currentStatus(g, day(3))?.status).toBe("enviado");
    expect(currentStatus(g, day(6))?.status).toBe("entregado");
  });

  it("indica el siguiente paso programado", () => {
    expect(nextScheduled(auto(), day(1, 1))?.status).toBe("enviado");
    expect(nextScheduled(auto(), day(9))).toBeNull();
  });

  it("la línea de tiempo marca hechos, actual y pendientes sin mostrar fechas futuras", () => {
    const t = timeline(auto(), day(2, 1));
    expect(t.map((s) => s.state)).toEqual(["done", "done", "done", "current", "pending", "pending"]);
    expect(t[4].at).toBeNull();
    expect(t[3].at).toBe(day(2).toISOString());
  });
});

describe("modo manual", () => {
  it("al pasar a manual conserva lo ocurrido y descarta lo programado", () => {
    const frozen = freezeToManual(auto().events, day(1, 1));
    expect(frozen.map((e) => e.status)).toEqual(["confirmado", "pago_recibido", "preparando"]);
  });

  it("cada cambio queda en el historial y define el estado", () => {
    let events = freezeToManual(auto().events, day(1, 1));
    events = addManualStatus(events, "enviado", day(1, 2), "Guía Servientrega");
    expect(currentStatus({ events }, day(1, 3))).toMatchObject({ status: "enviado", note: "Guía Servientrega" });
    expect(nextScheduled({ events, mode: "manual" }, day(1, 3))).toBeNull();
  });

  it("si se salta un paso, los anteriores se ven hechos", () => {
    const events = addManualStatus([], "enviado", day(0));
    expect(timeline({ events }, day(0, 1)).slice(0, 4).map((s) => s.state)).toEqual(["done", "done", "done", "current"]);
  });

  it("cancelado muestra lo ocurrido y la cancelación al final", () => {
    const events = addManualStatus(buildSchedule(start, { confirmado: 0 }), "cancelado", day(1));
    const t = timeline({ events }, day(2));
    expect(t.map((s) => `${s.id}:${s.state}`)).toEqual(["confirmado:done", "cancelado:current"]);
  });
});

describe("códigos de guía", () => {
  it("genera VD-XXXX-XXXX sin caracteres confundibles", () => {
    for (let i = 0; i < 50; i++) expect(createGuideCode()).toMatch(/^VD-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
  });

  it("normaliza lo que escribe el cliente", () => {
    expect(normalizeGuideCode(" vd-7k4m q2x9 ")).toBe("VD-7K4M-Q2X9");
    expect(normalizeGuideCode("7k4mq2x9")).toBe("VD-7K4M-Q2X9");
    expect(normalizeGuideCode("VD-123")).toBeNull();
  });
});

describe("cuentas del pedido", () => {
  const lines = [
    { productId: "a", name: "DDJ-FLX4", qty: 1, unitPrice: 1_105_000 },
    { productId: null, name: "Cable RCA", qty: 2, unitPrice: 25_000 },
  ];
  it("suma productos y envío, y calcula lo pendiente para la entrega", () => {
    expect(orderTotals({ lines, shipping: 20_000, paid: 600_000 })).toMatchObject({ subtotal: 1_155_000, total: 1_175_000, paid: 600_000, pending: 575_000, state: "parcial", units: 3 });
  });
  it("distingue sin pago, parcial y pagado; nunca da pendiente negativo", () => {
    expect(orderTotals({ lines, shipping: 0, paid: 0 }).state).toBe("sin_pago");
    expect(orderTotals({ lines, shipping: 0, paid: 1_155_000 }).state).toBe("pagado");
    expect(orderTotals({ lines, shipping: 0, paid: 9_999_999 })).toMatchObject({ paid: 1_155_000, pending: 0 });
  });
  it("lee pesos escritos a mano", () => {
    expect(parseCOP("1.105.000")).toBe(1_105_000);
    expect(parseCOP("$ 800000")).toBe(800_000);
    expect(parseCOP("")).toBe(0);
    expect(parseCOP("mil")).toBeNull();
  });
});

describe("siguiente paso", () => {
  it("propone el paso que sigue y nada al terminar", () => {
    expect(nextStep(null)).toBe("confirmado");
    expect(nextStep("preparando")).toBe("enviado");
    expect(nextStep("entregado")).toBeNull();
    expect(nextStep("cancelado")).toBeNull();
  });
});

describe("fechas del panel (hora de Colombia)", () => {
  it("convierte datetime-local a ISO y de vuelta", () => {
    expect(localInputToISO("2026-11-03T14:00")).toBe("2026-11-03T19:00:00.000Z");
    expect(isoToLocalInput("2026-11-03T19:00:00.000Z")).toBe("2026-11-03T14:00");
    expect(localInputToISO("mañana")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import type { Promotion } from "@/data/types";
import { bestPromotion, promotionProblem, promotionState, storewidePromotion } from "./promotions";

const promo = (over: Partial<Promotion>): Promotion => ({
  id: "x", name: "P", percent: 10, scope: "tienda", targetId: null, startsAt: null, endsAt: null, active: true,
  createdAt: "", updatedAt: "", ...over,
});
const at = (iso: string) => new Date(iso);
const product = { id: "cdj", categoryId: "reproductores" };

describe("promotionState", () => {
  const p = promo({ startsAt: "2026-11-01", endsAt: "2026-11-30" });
  it("empieza a la medianoche de Colombia del primer día", () => {
    expect(promotionState(p, at("2026-11-01T04:59:00Z"))).toBe("programada"); // 31 oct, 23:59 en Bogotá
    expect(promotionState(p, at("2026-11-01T05:00:00Z"))).toBe("vigente");
  });
  it("incluye todo el último día y vence a la medianoche siguiente", () => {
    expect(promotionState(p, at("2026-12-01T04:59:00Z"))).toBe("vigente");
    expect(promotionState(p, at("2026-12-01T05:00:00Z"))).toBe("vencida");
  });
  it("pausada manda sobre las fechas; sin fechas, vigente siempre", () => {
    expect(promotionState({ ...p, active: false }, at("2026-11-10T12:00:00Z"))).toBe("pausada");
    expect(promotionState(promo({}), at("2030-01-01T00:00:00Z"))).toBe("vigente");
  });
});

describe("bestPromotion", () => {
  const now = at("2026-11-10T12:00:00Z");
  it("elige la más generosa que aplica al producto, por tienda, categoría o producto", () => {
    const list = [
      promo({ id: "t", percent: 10 }),
      promo({ id: "c", percent: 20, scope: "categoria", targetId: "reproductores" }),
      promo({ id: "otra", percent: 40, scope: "categoria", targetId: "parlantes" }),
      promo({ id: "p", percent: 15, scope: "producto", targetId: "cdj" }),
    ];
    expect(bestPromotion(product, list, now)?.id).toBe("c");
  });
  it("ignora las pausadas, vencidas o programadas", () => {
    const list = [promo({ id: "pausa", percent: 50, active: false }), promo({ id: "vieja", percent: 40, endsAt: "2026-11-01" }), promo({ id: "luego", percent: 30, startsAt: "2026-12-01" })];
    expect(bestPromotion(product, list, now)).toBeNull();
  });
  it("a igual porcentaje gana la que termina antes", () => {
    const list = [promo({ id: "larga", endsAt: "2026-12-31" }), promo({ id: "corta", endsAt: "2026-11-15" }), promo({ id: "sin-fin" })];
    expect(bestPromotion(product, list, now)?.id).toBe("corta");
  });
  it("la de toda la tienda se anuncia en la cinta", () => {
    expect(storewidePromotion([promo({ id: "c", scope: "categoria", targetId: "x", percent: 50 }), promo({ id: "t", percent: 15 })], now)?.id).toBe("t");
  });
});

describe("promotionProblem", () => {
  it("valida porcentaje, destino y fechas", () => {
    expect(promotionProblem(promo({ percent: 0 }))).toMatch(/entre 1 %/);
    expect(promotionProblem(promo({ percent: 95 }))).toMatch(/entre 1 %/);
    expect(promotionProblem(promo({ scope: "categoria" }))).toMatch(/categoría/);
    expect(promotionProblem(promo({ startsAt: "2026-11-10", endsAt: "2026-11-01" }))).toMatch(/anterior/);
    expect(promotionProblem(promo({}))).toBeNull();
  });
});

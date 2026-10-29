import { describe, expect, it } from "vitest";
import { initialStore, mergeStore, promoIsActive } from "./store";

describe("mergeStore", () => {
  it("lo guardado manda, campo por campo, y un campo nuevo del código toma su valor inicial", () => {
    const base = initialStore();
    const saved = { name: "Sonido X", phone: null, brand: { accent: "#ff5533" } } as unknown as Parameters<typeof mergeStore>[1];
    const s = mergeStore(base, saved);
    expect(s.name).toBe("Sonido X");
    expect(s.phone).toBeNull();
    expect(s.brand.accent).toBe("#ff5533");
    expect(s.brand.logoOnDark).toBeNull();
    expect(s.shipping).toEqual(base.shipping);
    expect(s.seo.title).toBe(base.seo.title);
  });

  it("sin nada guardado usa los valores iniciales", () => {
    expect(mergeStore(initialStore(), null)).toEqual(initialStore());
  });
});

describe("promoIsActive", () => {
  it("sin fecha de fin la promoción sigue vigente", () => {
    expect(promoIsActive(null, new Date("2030-01-01T00:00:00Z"))).toBe(true);
  });

  it("incluye todo el último día en hora de Colombia", () => {
    // 30 nov, 23:59 en Bogotá = 1 dic, 04:59 UTC
    expect(promoIsActive("2026-11-30", new Date("2026-12-01T04:59:00Z"))).toBe(true);
  });

  it("vence a la medianoche del día siguiente en Colombia", () => {
    // 1 dic, 00:00 en Bogotá = 1 dic, 05:00 UTC
    expect(promoIsActive("2026-11-30", new Date("2026-12-01T05:00:00Z"))).toBe(false);
  });
});

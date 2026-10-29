import { describe, expect, it } from "vitest";
import { BRANDS } from "@/data/brands";
import { CATEGORIES } from "@/data/categories";
import { DEMO_PRODUCTS } from "@/data/products.demo";
import { filterProducts, parseCatalogQuery, toSearchParams } from "./catalog-filter";
import { unitPrice } from "./pricing";

const ctx = { brands: BRANDS, categories: CATEGORIES };
const run = (params: Record<string, string>, cat: string | null = null) =>
  filterProducts(DEMO_PRODUCTS, parseCatalogQuery(params, cat), ctx).map((p) => p.id);

describe("parseCatalogQuery", () => {
  it("ignora valores inválidos y normaliza", () => {
    const q = parseCatalogQuery({ disponibilidad: "disponible,inventado", orden: "raro", min: "1.000", promo: "1" });
    expect(q.availability).toEqual(["disponible"]);
    expect(q.sort).toBe("relevancia");
    expect(q.min).toBe(1000);
    expect(q.promo).toBe(true);
  });
  it("ida y vuelta con toSearchParams", () => {
    const q = parseCatalogQuery({ q: "cable", marca: "marca-a,marca-b", orden: "precio-asc" });
    expect(parseCatalogQuery(Object.fromEntries(toSearchParams(q)))).toEqual(q);
  });
});

describe("filterProducts", () => {
  it("busca sin importar tildes ni mayúsculas, también por marca y referencia", () => {
    expect(run({ q: "AUDIFONOS" })).toEqual(["p08"]);
    expect(run({ q: "demo-mix" })).toEqual(["p03"]);
    expect(run({ q: "marca e" }).slice(0, 2).sort()).toEqual(["p06", "p07"]);
  });
  it("devuelve vacío cuando no hay coincidencias", () => {
    expect(run({ q: "sintetizador modular" })).toEqual([]);
  });
  it("filtra por categoría, marca, disponibilidad y promoción", () => {
    expect(run({}, "controladores").sort()).toEqual(["p01", "p02"]);
    expect(run({ marca: "marca-a" }).sort()).toEqual(["p01", "p11", "p14"]);
    expect(run({ disponibilidad: "agotado" })).toEqual(["p07"]);
    expect(run({ promo: "1" }).sort()).toEqual(["p01", "p06", "p08", "p14"]);
  });
  it("filtra por rango usando el precio vigente y excluye precios por confirmar", () => {
    const ids = run({ min: "100000", max: "600000" });
    expect(ids).not.toContain("p05");
    for (const id of ids) {
      const u = unitPrice(DEMO_PRODUCTS.find((p) => p.id === id)!)!;
      expect(u).toBeGreaterThanOrEqual(100000);
      expect(u).toBeLessThanOrEqual(600000);
    }
    expect(ids).toContain("p08"); // 690.000 normal, 590.000 en promoción
  });
  it("ordena por precio y deja los precios por confirmar al final", () => {
    const asc = run({ orden: "precio-asc" });
    expect(asc[0]).toBe("p12");
    expect(asc.at(-1)).toBe("p05");
    expect(run({ orden: "precio-desc" })[0]).toBe("p02");
  });
});

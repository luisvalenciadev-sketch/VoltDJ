import type { Availability, Brand, Category, Product } from "@/data/types";
import { hasPromo, unitPrice } from "./pricing";

export type SortKey = "relevancia" | "precio-asc" | "precio-desc" | "nombre";

export interface CatalogQuery {
  q: string;
  category: string | null;
  brands: string[];
  availability: Availability[];
  promo: boolean;
  min: number | null;
  max: number | null;
  sort: SortKey;
}

const AVAILABILITIES: Availability[] = ["disponible", "pocas", "bajo_pedido", "agotado", "consultar"];
const SORTS: SortKey[] = ["relevancia", "precio-asc", "precio-desc", "nombre"];

type RawParams = Record<string, string | string[] | undefined>;

const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? v.split(",") : []).filter(Boolean);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const num = (v: string | string[] | undefined) => {
  const n = parseInt(one(v).replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};

export function parseCatalogQuery(params: RawParams, category: string | null = null): CatalogQuery {
  const sort = one(params.orden) as SortKey;
  return {
    q: one(params.q).trim().slice(0, 80),
    category,
    brands: list(params.marca),
    availability: list(params.disponibilidad).filter((a): a is Availability => AVAILABILITIES.includes(a as Availability)),
    promo: one(params.promo) === "1",
    min: num(params.min),
    max: num(params.max),
    sort: SORTS.includes(sort) ? sort : "relevancia",
  };
}

/** Serializa la consulta a parámetros de URL (omite valores por defecto). */
export function toSearchParams(q: Partial<CatalogQuery>): URLSearchParams {
  const sp = new URLSearchParams();
  if (q.q) sp.set("q", q.q);
  if (q.brands?.length) sp.set("marca", q.brands.join(","));
  if (q.availability?.length) sp.set("disponibilidad", q.availability.join(","));
  if (q.promo) sp.set("promo", "1");
  if (q.min != null) sp.set("min", String(q.min));
  if (q.max != null) sp.set("max", String(q.max));
  if (q.sort && q.sort !== "relevancia") sp.set("orden", q.sort);
  return sp;
}

/** Quita tildes y pasa a minúsculas para que "audifonos" encuentre "Audífonos". */
export function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function filterProducts(products: Product[], query: CatalogQuery, ctx: { brands: Brand[]; categories: Category[] }): Product[] {
  const phrase = normalize(query.q).trim();
  // Las palabras de una letra ("y", "e", "a") coinciden con casi todo: solo cuentan dentro de la frase completa.
  const terms = phrase.split(/\s+/).filter((t) => t.length > 1);
  const brandName = (id: string) => ctx.brands.find((b) => b.id === id)?.name ?? "";
  const catName = (id: string) => ctx.categories.find((c) => c.id === id)?.name ?? "";

  const scored = products
    .filter((p) => !query.category || p.categoryId === query.category)
    .filter((p) => !query.brands.length || query.brands.includes(p.brandId))
    .filter((p) => !query.availability.length || query.availability.includes(p.availability))
    .filter((p) => !query.promo || hasPromo(p))
    .filter((p) => {
      if (query.min == null && query.max == null) return true;
      const u = unitPrice(p);
      if (u == null) return false;
      return (query.min == null || u >= query.min) && (query.max == null || u <= query.max);
    })
    .map((p) => {
      if (!phrase) return { p, score: 0 };
      const name = normalize(p.name);
      const hay = normalize([p.name, p.sku, brandName(p.brandId), catName(p.categoryId), p.description].join(" "));
      const phraseHit = hay.includes(phrase);
      if (!phraseHit && (!terms.length || !terms.every((t) => hay.includes(t)))) return null;
      const score = (phraseHit ? 10 : 0) + terms.reduce((s, t) => s + (name.includes(t) ? 2 : 1), 0);
      return { p, score };
    })
    .filter((x): x is { p: Product; score: number } => x !== null);

  const priceOr = (p: Product, fallback: number) => unitPrice(p) ?? fallback;
  const sorters: Record<SortKey, (a: { p: Product; score: number }, b: { p: Product; score: number }) => number> = {
    relevancia: (a, b) => b.score - a.score || Number(b.p.featured) - Number(a.p.featured),
    "precio-asc": (a, b) => priceOr(a.p, Infinity) - priceOr(b.p, Infinity),
    "precio-desc": (a, b) => priceOr(b.p, -1) - priceOr(a.p, -1),
    nombre: (a, b) => a.p.name.localeCompare(b.p.name, "es"),
  };
  return scored.sort(sorters[query.sort]).map((x) => x.p);
}

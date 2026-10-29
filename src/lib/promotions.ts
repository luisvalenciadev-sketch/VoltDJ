import type { Promotion, PromotionScope } from "@/data/types";

/**
 * Promociones: varias a la vez, por tienda, categoría o producto, con fechas en hora de Colombia.
 * Lógica pura: qué promociones están vigentes y cuál le toca a cada producto. Se evalúa al leer, no al
 * guardar, así que una promoción empieza y termina sola sin que nadie toque nada.
 */
export const SCOPE_LABEL: Record<PromotionScope, string> = { tienda: "Toda la tienda", categoria: "Una categoría", producto: "Un producto" };

/** Colombia: UTC−5, sin horario de verano. */
const COT = "-05:00";
const dayStart = (day: string) => Date.parse(`${day}T00:00:00${COT}`);

export type PromotionState = "vigente" | "programada" | "vencida" | "pausada";

/** `startsAt` y `endsAt` son días "AAAA-MM-DD", ambos incluidos; vacíos = sin límite. */
export function promotionState(p: Pick<Promotion, "active" | "startsAt" | "endsAt">, now: Date = new Date()): PromotionState {
  if (!p.active) return "pausada";
  const t = now.getTime();
  if (p.startsAt && t < dayStart(p.startsAt)) return "programada";
  if (p.endsAt && t >= dayStart(p.endsAt) + 86_400_000) return "vencida";
  return "vigente";
}

export const isLive = (p: Promotion, now: Date = new Date()) => promotionState(p, now) === "vigente" && p.percent > 0;

/** La promoción vigente más generosa para un producto; a igual porcentaje, la que termina antes (es la que apura). */
export function bestPromotion(product: { id: string; categoryId: string }, promotions: Promotion[], now: Date = new Date()): Promotion | null {
  let best: Promotion | null = null;
  for (const p of promotions) {
    if (!isLive(p, now)) continue;
    const applies = p.scope === "tienda" || (p.scope === "categoria" && p.targetId === product.categoryId) || (p.scope === "producto" && p.targetId === product.id);
    if (!applies) continue;
    if (!best || p.percent > best.percent || (p.percent === best.percent && (p.endsAt ?? "9999") < (best.endsAt ?? "9999"))) best = p;
  }
  return best;
}

/** Promoción de toda la tienda que se anuncia en la cinta superior, si hay una vigente. */
export function storewidePromotion(promotions: Promotion[], now: Date = new Date()): Promotion | null {
  return promotions.filter((p) => p.scope === "tienda" && isLive(p, now)).sort((a, b) => b.percent - a.percent)[0] ?? null;
}

/** Validación de lo que llega del panel: devuelve un mensaje para la tienda, o null si está bien. */
export function promotionProblem(p: Pick<Promotion, "name" | "percent" | "scope" | "targetId" | "startsAt" | "endsAt">): string | null {
  if (!p.name.trim()) return "Ponle un nombre a la promoción (lo ves tú en el panel).";
  if (!Number.isInteger(p.percent) || p.percent < 1 || p.percent > 90) return "El descuento debe ser un número entero entre 1 % y 90 %.";
  if (p.scope !== "tienda" && !p.targetId) return p.scope === "categoria" ? "Elige la categoría." : "Elige el producto.";
  if (p.startsAt && p.endsAt && p.endsAt < p.startsAt) return "La fecha de fin no puede ser anterior a la de inicio.";
  return null;
}

import type { CartProduct } from "@/data/types";
import { canAddToCart, unitPrice } from "./pricing";

/**
 * Lógica pura del carrito. El navegador guarda solo id, cantidad y el último
 * precio visto (para avisar cambios). Precio, disponibilidad y existencia se
 * resuelven SIEMPRE contra el catálogo vigente. El subtotal del navegador es
 * informativo y no sirve como fuente para cobros.
 */
export interface CartItem {
  id: string;
  qty: number;
  /** Precio unitario mostrado al añadir; solo para detectar cambios. */
  seenPrice: number | null;
}

export interface ProductLine {
  kind: "ok" | "soldout";
  product: CartProduct;
  qty: number;
  unit: number | null;
  total: number | null;
  priceChangedFrom: number | null;
  qtyClamped: boolean;
}

export type CartLine = { kind: "missing"; id: string; qty: number } | ProductLine;

export interface CartSummary {
  lines: CartLine[];
  subtotal: number;
  units: number;
  hasUnpriced: boolean;
  hasIssues: boolean;
  /** Líneas que pueden enviarse en el pedido. */
  orderable: ProductLine[];
}

export const MIN_QTY = 1;

export function clampQty(qty: number, max: number): number {
  if (!Number.isFinite(qty)) return MIN_QTY;
  return Math.max(MIN_QTY, Math.min(Math.trunc(qty), Math.max(MIN_QTY, max)));
}

export function addItem(items: CartItem[], product: CartProduct, qty = 1): CartItem[] {
  if (!canAddToCart(product.availability)) return items;
  const existing = items.find((i) => i.id === product.id);
  const seenPrice = unitPrice(product);
  if (existing) {
    return items.map((i) =>
      i.id === product.id ? { ...i, qty: clampQty(i.qty + qty, product.maxQtyPerOrder), seenPrice } : i,
    );
  }
  return [...items, { id: product.id, qty: clampQty(qty, product.maxQtyPerOrder), seenPrice }];
}

export function setItemQty(items: CartItem[], id: string, qty: number, max: number): CartItem[] {
  return items.map((i) => (i.id === id ? { ...i, qty: clampQty(qty, max) } : i));
}

export function removeItem(items: CartItem[], id: string): CartItem[] {
  return items.filter((i) => i.id !== id);
}

/** Marca como vistos los precios actuales (cuando el usuario ya fue avisado). */
export function acknowledgePrices(items: CartItem[], catalog: CartProduct[]): CartItem[] {
  return items.map((i) => {
    const p = catalog.find((c) => c.id === i.id);
    return p ? { ...i, seenPrice: unitPrice(p) } : i;
  });
}

export function summarize(items: CartItem[], catalog: CartProduct[]): CartSummary {
  const lines: CartLine[] = items.map((item) => {
    const product = catalog.find((p) => p.id === item.id);
    if (!product) return { kind: "missing", id: item.id, qty: item.qty };
    const qty = clampQty(item.qty, product.maxQtyPerOrder);
    const unit = unitPrice(product);
    return {
      kind: canAddToCart(product.availability) ? "ok" : "soldout",
      product,
      qty,
      unit,
      total: unit == null ? null : unit * qty,
      priceChangedFrom: item.seenPrice != null && unit != null && item.seenPrice !== unit ? item.seenPrice : null,
      qtyClamped: qty !== item.qty,
    };
  });
  const orderable = lines.filter((l): l is ProductLine => l.kind === "ok");
  return {
    lines,
    orderable,
    subtotal: orderable.reduce((sum, l) => sum + (l.total ?? 0), 0),
    units: orderable.reduce((sum, l) => sum + l.qty, 0),
    hasUnpriced: orderable.some((l) => l.unit == null),
    hasIssues: lines.some((l) => l.kind !== "ok" || l.priceChangedFrom != null || l.qtyClamped),
  };
}

/** Lee el carrito persistido descartando entradas corruptas o manipuladas. */
export function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const seen = new Set<string>();
    const out: CartItem[] = [];
    for (const entry of data) {
      if (!entry || typeof entry !== "object") continue;
      const { id, qty, seenPrice } = entry as Record<string, unknown>;
      if (typeof id !== "string" || id.length > 64 || seen.has(id)) continue;
      if (typeof qty !== "number" || !Number.isInteger(qty) || qty < MIN_QTY || qty > 999) continue;
      seen.add(id);
      out.push({ id, qty, seenPrice: typeof seenPrice === "number" && seenPrice >= 0 ? seenPrice : null });
    }
    return out;
  } catch {
    return [];
  }
}

import type { OrderLine } from "./tracking";

/**
 * Inventario conectado a los pedidos. Cada guía recuerda, por producto, cuántas unidades ya contó
 * (`qty`) y cuántas sacó de verdad de la bodega (`taken`); si no alcanzaba, `taken` es menor. Al crear,
 * editar, cancelar o eliminar la guía se compara lo contado con lo que pide el pedido y solo se mueve la
 * diferencia: repetir la operación no descuenta dos veces, y un faltante se avisa una sola vez.
 */
export interface StockHold {
  productId: string;
  qty: number;
  /** Unidades que salieron de la bodega; sin valor = igual a qty (guías de antes de este campo). */
  taken?: number;
}

/** Lo que el pedido debería tener contado: sus líneas del catálogo, o nada si está cancelado. */
export function wantedHolds(lines: OrderLine[], cancelled: boolean): Map<string, number> {
  const out = new Map<string, number>();
  if (cancelled) return out;
  for (const l of lines) if (l.productId && l.qty > 0) out.set(l.productId, (out.get(l.productId) ?? 0) + l.qty);
  return out;
}

/** Diferencia por producto: positivo = hay que tomar más unidades; negativo = hay que devolver. */
export function holdChanges(applied: StockHold[], wanted: Map<string, number>): { productId: string; change: number }[] {
  const ids = new Set([...applied.map((h) => h.productId), ...wanted.keys()]);
  const have = new Map(applied.map((h) => [h.productId, h.qty]));
  return [...ids].map((productId) => ({ productId, change: (wanted.get(productId) ?? 0) - (have.get(productId) ?? 0) })).filter((c) => c.change !== 0);
}

/**
 * Cuántas unidades devolver a la bodega cuando el pedido pasa a contar `nextQty`: solo las que sobran de
 * lo que realmente se sacó. Si faltaban unidades, lo que no se sacó no se devuelve.
 */
export const unitsToReturn = (taken: number, nextQty: number) => Math.max(0, taken - Math.max(0, nextQty));

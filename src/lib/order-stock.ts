import type { OrderLine } from "./tracking";

/**
 * Inventario conectado a los pedidos. Cada guía recuerda cuántas unidades de cada producto tiene
 * apartadas (`stockApplied`). Al crear, editar, cancelar o eliminar la guía se compara eso con lo que
 * debería tener apartado y solo se mueve la diferencia: repetir la operación no descuenta dos veces.
 */
export interface StockHold {
  productId: string;
  qty: number;
}

/** Lo que el pedido debería tener apartado: sus líneas del catálogo, o nada si está cancelado. */
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

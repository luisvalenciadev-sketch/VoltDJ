import "server-only";
import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/data/catalog";
import { catalogStore, ReadOnlyCatalogError } from "./catalog-store";
import type { GuidesStore } from "./guides-store";
import { holdChanges, unitsToReturn, wantedHolds, type StockHold } from "./order-stock";
import { currentStatus, type Guide } from "./tracking";

/**
 * Lleva el inventario al estado del pedido: aparta las unidades al crear o editar la guía, y las devuelve
 * al cancelarla o eliminarla. Nunca bloquea al asesor: si un producto no alcanza, aparta lo que hay y lo
 * avisa. Los productos sin control de inventario (stock vacío) no se tocan.
 * Devuelve los avisos para mostrar en el panel.
 */
export async function syncGuideStock(guide: Guide, guides: GuidesStore, opts: { release?: boolean } = {}): Promise<string[]> {
  const catalog = catalogStore();
  // Guías anteriores al inventario conectado: editarlas no debe descontar ahora un pedido ya entregado.
  if (!catalog.writable || !guide.stockApplied) return [];
  const cancelled = opts.release || currentStatus(guide)?.status === "cancelado";
  const holds = new Map((guide.stockApplied ?? []).map((h) => [h.productId, { qty: h.qty, taken: h.taken ?? h.qty }]));
  const changes = holdChanges(guide.stockApplied ?? [], wantedHolds(guide.lines, cancelled));
  if (!changes.length) return [];

  const warnings: string[] = [];
  for (const { productId, change } of changes) {
    const product = await catalog.getProduct(productId);
    const cur = holds.get(productId) ?? { qty: 0, taken: 0 };
    const qty = cur.qty + change;
    try {
      if (change > 0) {
        // Sin control de inventario (o producto borrado): se cuenta, pero no se saca nada de la bodega.
        if (!product || product.stock == null) {
          holds.set(productId, { qty, taken: cur.taken });
          continue;
        }
        const before = product.stock;
        const after = (await catalog.changeStock(productId, { mode: "add", delta: -change }, { reason: "pedido", ref: guide.code })) ?? 0;
        const taken = before - after;
        holds.set(productId, { qty, taken: cur.taken + taken });
        // Se avisa una sola vez: lo que faltó queda contado y no se vuelve a intentar en cada cambio de estado.
        if (taken < change) warnings.push(`${product.name}: el pedido pide ${change} y en bodega había ${before}. Quedó en 0; revisa el inventario.`);
      } else {
        const give = unitsToReturn(cur.taken, qty);
        if (give > 0 && product) {
          await catalog.changeStock(productId, { mode: "add", delta: give }, { reason: "cancelacion", ref: guide.code, note: cancelled ? "Pedido cancelado" : "Pedido modificado" });
        }
        holds.set(productId, { qty, taken: cur.taken - give });
      }
    } catch (e) {
      if (e instanceof ReadOnlyCatalogError) return [];
      throw e;
    }
  }
  const stockApplied: StockHold[] = [...holds].filter(([, h]) => h.qty > 0).map(([productId, h]) => ({ productId, qty: h.qty, taken: h.taken }));
  if (!opts.release) await guides.update(guide.code, { stockApplied });
  revalidateTag(CATALOG_TAG, { expire: 0 });
  return warnings;
}

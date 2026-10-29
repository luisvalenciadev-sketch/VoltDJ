import "server-only";
import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/data/catalog";
import { catalogStore, ReadOnlyCatalogError } from "./catalog-store";
import type { GuidesStore } from "./guides-store";
import { holdChanges, wantedHolds, type StockHold } from "./order-stock";
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
  const applied = new Map((guide.stockApplied ?? []).map((h) => [h.productId, h.qty]));
  const changes = holdChanges(guide.stockApplied ?? [], wantedHolds(guide.lines, cancelled));
  if (!changes.length) return [];

  const warnings: string[] = [];
  for (const { productId, change } of changes) {
    const product = await catalog.getProduct(productId);
    const held = applied.get(productId) ?? 0;
    try {
      if (change > 0) {
        if (!product || product.stock == null) continue; // sin control de inventario
        const before = product.stock;
        const after = (await catalog.changeStock(productId, { mode: "add", delta: -change }, { reason: "pedido", ref: guide.code })) ?? 0;
        const taken = before - after;
        applied.set(productId, held + taken);
        if (taken < change) warnings.push(`${product.name}: el pedido pide ${change} y en bodega había ${before}. Quedó en 0; revisa el inventario.`);
      } else {
        const give = Math.min(-change, held);
        if (give > 0 && product) {
          await catalog.changeStock(productId, { mode: "add", delta: give }, { reason: "cancelacion", ref: guide.code, note: cancelled ? "Pedido cancelado" : "Pedido modificado" });
        }
        applied.set(productId, held - give);
      }
    } catch (e) {
      if (e instanceof ReadOnlyCatalogError) return [];
      throw e;
    }
  }
  const stockApplied: StockHold[] = [...applied].filter(([, qty]) => qty > 0).map(([productId, qty]) => ({ productId, qty }));
  if (!opts.release) await guides.update(guide.code, { stockApplied });
  revalidateTag(CATALOG_TAG, { expire: 0 });
  return warnings;
}

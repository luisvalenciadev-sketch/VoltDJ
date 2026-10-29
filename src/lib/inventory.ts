import type { Availability, Product, ProductRecord, Promotion } from "@/data/types";

type StockFields = Pick<ProductRecord, "stock" | "lowStockAt" | "allowBackorder">;

/**
 * Disponibilidad que ve el cliente, calculada desde el stock (nunca escrita a mano):
 * sin control de inventario → Disponible · 0 unidades → Agotado o Bajo pedido · hasta el umbral → Pocas unidades.
 */
export function availabilityFor({ stock, lowStockAt, allowBackorder }: StockFields): Availability {
  if (stock == null) return "disponible";
  if (stock <= 0) return allowBackorder ? "bajo_pedido" : "agotado";
  if (lowStockAt > 0 && stock <= lowStockAt) return "pocas";
  return "disponible";
}

/** Estado de inventario para el panel: qué necesita atención. */
export type StockLevel = "sin-control" | "agotado" | "bajo" | "ok";
export function stockLevel({ stock, lowStockAt }: Pick<ProductRecord, "stock" | "lowStockAt">): StockLevel {
  if (stock == null) return "sin-control";
  if (stock <= 0) return "agotado";
  if (lowStockAt > 0 && stock <= lowStockAt) return "bajo";
  return "ok";
}

/** Redondeado al millar: en COP no se publican precios con centenas sueltas. */
const promoFrom = (price: number, percent: number) => Math.round((price * (1 - percent / 100)) / 1000) * 1000;

/**
 * Producto de la tienda a partir del registro del panel. `promo` es la mejor promoción vigente para este
 * producto (ya elegida con bestPromotion). Entre el precio rebajado propio y el de la promoción se
 * muestra el más bajo: al cliente nunca se le cobra de más porque haya dos descuentos.
 */
export function toPublicProduct(r: ProductRecord, promo: Pick<Promotion, "percent" | "endsAt"> | null): Product {
  const ownSale = r.price != null && r.salePrice != null && r.salePrice > 0 && r.salePrice < r.price ? r.salePrice : null;
  const fromPromo = promo && r.price != null ? promoFrom(r.price, promo.percent) : null;
  const general = fromPromo != null && (ownSale == null || fromPromo < ownSale) ? fromPromo : null;
  const tracked = r.stock != null && r.stock > 0;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    brandId: r.brandId,
    categoryId: r.categoryId,
    description: r.description,
    images: r.images,
    art: r.art,
    price: r.price,
    promoPrice: general ?? ownSale,
    promoEndsAt: general != null ? (promo?.endsAt ?? null) : null,
    sku: r.sku,
    availability: availabilityFor(r),
    // No se pueden pedir más unidades de las que hay en bodega (salvo bajo pedido).
    maxQtyPerOrder: Math.max(1, tracked && !r.allowBackorder ? Math.min(r.maxPerOrder, r.stock as number) : r.maxPerOrder),
    specs: r.specs,
    status: r.status,
    isDemo: false,
    featured: r.featured,
    keyFigure: r.keyFigure,
    updatedAt: r.updatedAt,
  };
}

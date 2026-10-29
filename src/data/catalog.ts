import "server-only";
import { unstable_cache } from "next/cache";
import { cacheScope } from "@/lib/cache-scope";
import { catalogStore } from "@/lib/catalog-store";
import { toPublicProduct } from "@/lib/inventory";
import { discountPercent } from "@/lib/pricing";
import { bestPromotion, storewidePromotion } from "@/lib/promotions";
import type { Brand, CartProduct, Category, Product } from "./types";

/**
 * Repositorio del catálogo de la tienda. Es la única puerta de entrada a los datos: lee del almacén
 * (Neon en producción) a través de una caché con la etiqueta CATALOG_TAG. El panel invalida esa
 * etiqueta al guardar, así que un cambio se ve en la siguiente visita sin consultar la base cada vez.
 */
export const CATALOG_TAG = "catalog";

const snapshot = unstable_cache(() => catalogStore().snapshot(), ["catalog-snapshot-v1", cacheScope()], { tags: [CATALOG_TAG] });

/**
 * Las promociones se aplican en cada lectura, no dentro de la caché: así empiezan y terminan a su hora
 * aunque el servidor siga encendido, sin que nadie guarde nada.
 */
async function published(now = new Date()): Promise<Product[]> {
  const { products, categories, brands, promotions } = await snapshot();
  const hiddenCat = new Set(categories.filter((c) => c.visible === false).map((c) => c.id));
  const hiddenBrand = new Set(brands.filter((b) => b.visible === false).map((b) => b.id));
  return products
    .filter((p) => p.status === "published" && !hiddenCat.has(p.categoryId) && !hiddenBrand.has(p.brandId))
    .map((p) => toPublicProduct(p, bestPromotion(p, promotions, now)));
}

/**
 * Titular de la cinta superior: la promoción de toda la tienda si hay una vigente; si no, el mayor
 * descuento que se puede encontrar hoy en el catálogo. null si no hay ofertas.
 */
export async function getDealHeadline(): Promise<string | null> {
  const store = storewidePromotion((await snapshot()).promotions);
  if (store) return `−${store.percent}% en todo el catálogo`;
  const max = Math.max(0, ...(await published()).map(discountPercent));
  return max > 0 ? `Ofertas de hasta −${max}%` : null;
}

export async function getProducts(): Promise<Product[]> {
  return published();
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return (await published()).find((p) => p.slug === slug) ?? null;
}

export async function getCategories(): Promise<Category[]> {
  return (await snapshot()).categories.filter((c) => c.visible !== false).sort((a, b) => a.order - b.order);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return (await getCategories()).find((c) => c.slug === slug) ?? null;
}

export async function getBrands(): Promise<Brand[]> {
  return (await snapshot()).brands.filter((b) => b.visible !== false);
}

/** Vista reducida para el carrito: lo justo para recalcular precios en el cliente. */
export function toCartProduct(p: Product, brands: Brand[]): CartProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: brands.find((b) => b.id === p.brandId)?.name ?? p.brandId,
    sku: p.sku,
    art: p.art,
    image: p.images[0] ?? null,
    price: p.price,
    promoPrice: p.promoPrice,
    availability: p.availability,
    maxQtyPerOrder: p.maxQtyPerOrder,
  };
}

export async function getCartCatalog(): Promise<CartProduct[]> {
  const [products, brands] = await Promise.all([getProducts(), getBrands()]);
  return products.map((p) => toCartProduct(p, brands));
}

import "server-only";
import { promoIsActive } from "@/config/store";
import { BRANDS } from "./brands";
import { CATEGORIES } from "./categories";
import { PRODUCTS } from "./products";
import type { Brand, CartProduct, Category, Product } from "./types";

/**
 * Repositorio del catálogo. Es la única puerta de entrada a los datos: hoy lee
 * archivos locales; para pasar a un CMS se reemplaza la implementación de estas
 * funciones sin tocar páginas ni componentes.
 */
const SOURCE: Product[] = PRODUCTS;

const isPublished = (p: Product) => p.status === "published";

/**
 * Las promociones vencidas se quitan en cada lectura, no al cargar el módulo: un servidor que
 * sigue encendido después de la fecha de fin no debe seguir sirviendo el precio rebajado.
 */
const withCurrentPromo = (p: Product): Product => (p.promoEndsAt && !promoIsActive(p.promoEndsAt) ? { ...p, promoPrice: null, promoEndsAt: null } : p);

export async function getProducts(): Promise<Product[]> {
  return SOURCE.filter(isPublished).map(withCurrentPromo);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const p = SOURCE.find((x) => x.slug === slug && isPublished(x));
  return p ? withCurrentPromo(p) : null;
}

export async function getCategories(): Promise<Category[]> {
  return [...CATEGORIES].sort((a, b) => a.order - b.order);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export async function getBrands(): Promise<Brand[]> {
  return BRANDS;
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

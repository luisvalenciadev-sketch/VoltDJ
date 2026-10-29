import "server-only";
import { BRANDS } from "./brands";
import { CATEGORIES } from "./categories";
import { DEMO_PRODUCTS } from "./products.demo";
import type { Brand, CartProduct, Category, Product } from "./types";

/**
 * Repositorio del catálogo. Es la única puerta de entrada a los datos: hoy lee
 * archivos locales; para pasar a un CMS se reemplaza la implementación de estas
 * funciones sin tocar páginas ni componentes.
 */
const SOURCE: Product[] = DEMO_PRODUCTS;

const isPublished = (p: Product) => p.status === "published";

export async function getProducts(): Promise<Product[]> {
  return SOURCE.filter(isPublished);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return SOURCE.find((p) => p.slug === slug && isPublished(p)) ?? null;
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
export async function getCartCatalog(): Promise<CartProduct[]> {
  const [products, brands] = await Promise.all([getProducts(), getBrands()]);
  return products.map((p) => ({
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
  }));
}

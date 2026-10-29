import "server-only";
import type { CatalogOption } from "@/components/admin/AdminForms";
import { getCategories, getProducts } from "@/data/catalog";
import { unitPrice } from "@/lib/pricing";

/** Catálogo para el selector del panel: precio vigente (con promoción si la hay), agrupado por categoría. */
export async function adminCatalog(): Promise<CatalogOption[]> {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "Otros";
  const order = (id: string) => categories.findIndex((c) => c.id === id);
  return products
    .slice()
    .sort((a, b) => order(a.categoryId) - order(b.categoryId) || a.name.localeCompare(b.name))
    .map((p) => ({ id: p.id, name: p.name, price: unitPrice(p), category: catName(p.categoryId) }));
}

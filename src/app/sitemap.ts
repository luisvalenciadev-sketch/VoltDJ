import type { MetadataRoute } from "next";
import { SITE } from "@/config/store";
import { getCategories, getProducts } from "@/data/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const url = (path: string) => new URL(path, SITE.url).toString();
  const pages = ["/", "/catalogo", "/ofertas", "/contacto", "/envios-y-garantias", "/preguntas-frecuentes", "/seguimiento", "/privacidad", "/terminos"];
  return [
    ...pages.map((p) => ({ url: url(p) })),
    ...categories.map((c) => ({ url: url(`/catalogo/${c.slug}`) })),
    // Los productos de demostración no se publican en el sitemap.
    ...products.filter((p) => !p.isDemo).map((p) => ({ url: url(`/producto/${p.slug}`), lastModified: p.updatedAt })),
  ];
}

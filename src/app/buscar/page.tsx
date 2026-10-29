import type { Metadata } from "next";
import { CatalogView } from "@/components/CatalogView";
import { parseCatalogQuery } from "@/lib/catalog-filter";

type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const { q } = parseCatalogQuery(await searchParams);
  return { title: q ? `Resultados para “${q}”` : "Buscar", robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const query = parseCatalogQuery(await searchParams);
  return (
    <CatalogView
      query={query}
      basePath="/buscar"
      title={query.q ? `Resultados para “${query.q}”` : "Buscar"}
      intro={query.q ? "Buscamos en nombre, marca, referencia, categoría y descripción." : "Escribe en el buscador el producto, la marca o la referencia."}
      crumbs={[{ label: "Inicio", href: "/" }, { label: "Búsqueda" }]}
    />
  );
}

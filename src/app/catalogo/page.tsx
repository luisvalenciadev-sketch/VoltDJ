import type { Metadata } from "next";
import { CatalogView } from "@/components/CatalogView";
import { parseCatalogQuery } from "@/lib/catalog-filter";

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Equipos DJ, audio profesional y accesorios. Filtra por categoría, marca, precio y disponibilidad.",
  alternates: { canonical: "/catalogo" },
};

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = parseCatalogQuery(await searchParams);
  return (
    <CatalogView
      query={query}
      basePath="/catalogo"
      title="Catálogo"
      intro="Todos los productos publicados. Filtra por marca, precio o disponibilidad."
      crumbs={[{ label: "Inicio", href: "/" }, { label: "Catálogo" }]}
    />
  );
}

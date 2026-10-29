import type { Metadata } from "next";
import { CatalogView } from "@/components/CatalogView";
import { parseCatalogQuery } from "@/lib/catalog-filter";

export const metadata: Metadata = {
  title: "Ofertas",
  description: "Productos con precio promocional vigente.",
  alternates: { canonical: "/ofertas" },
};

export default async function OffersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = parseCatalogQuery(await searchParams);
  return (
    <CatalogView
      query={query}
      basePath="/ofertas"
      lockedPromo
      title="Ofertas vigentes"
      intro="Solo aparecen productos con precio promocional cargado en el catálogo. El precio anterior es el precio normal publicado."
      crumbs={[{ label: "Inicio", href: "/" }, { label: "Ofertas" }]}
    />
  );
}

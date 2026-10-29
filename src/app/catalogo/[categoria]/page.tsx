import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/CatalogView";
import { getCategories, getCategoryBySlug } from "@/data/catalog";
import { parseCatalogQuery } from "@/lib/catalog-filter";

type Params = Promise<{ categoria: string }>;

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ categoria: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const category = await getCategoryBySlug((await params).categoria);
  if (!category) return {};
  return { title: category.name, description: category.description, alternates: { canonical: `/catalogo/${category.slug}` } };
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const category = await getCategoryBySlug((await params).categoria);
  if (!category) notFound();
  const query = parseCatalogQuery(await searchParams, category.id);
  return (
    <CatalogView
      query={query}
      basePath={`/catalogo/${category.slug}`}
      title={category.name}
      intro={category.description}
      crumbs={[{ label: "Inicio", href: "/" }, { label: "Catálogo", href: "/catalogo" }, { label: category.name }]}
    />
  );
}

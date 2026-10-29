import Link from "next/link";
import { getBrands, getCategories, getProducts } from "@/data/catalog";
import { getStore } from "@/data/store";
import { filterProducts, toSearchParams, type CatalogQuery } from "@/lib/catalog-filter";
import { AVAILABILITY_LABEL, formatCOP, hasPromo } from "@/lib/pricing";
import { buildGeneralMessage, buildWhatsAppLink } from "@/lib/whatsapp";
import { CatalogShell } from "./CatalogFilters";
import { SearchIcon, WhatsAppIcon } from "./icons";
import { ProductCard } from "./ProductCard";
import { Breadcrumbs } from "./ui";

interface Props {
  query: CatalogQuery;
  basePath: string;
  title: string;
  intro: string;
  crumbs: { label: string; href?: string }[];
  lockedPromo?: boolean;
}

export async function CatalogView({ query, basePath, title, intro, crumbs, lockedPromo }: Props) {
  const [all, categories, brands, store] = await Promise.all([getProducts(), getCategories(), getBrands(), getStore()]);
  const effective = lockedPromo ? { ...query, promo: true } : query;
  const results = filterProducts(all, effective, { brands, categories });
  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? id;

  // Conteos sobre el universo de la página (categoría / ofertas), sin filtros finos.
  const scope = all.filter((p) => (!query.category || p.categoryId === query.category) && (!lockedPromo || hasPromo(p)));
  const brandFacets = brands
    .map((b) => ({ id: b.id, name: b.name, count: scope.filter((p) => p.brandId === b.id).length }))
    .filter((b) => b.count > 0);
  const categoryFacets = categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name, count: all.filter((p) => p.categoryId === c.id).length }));

  const without = (patch: Partial<CatalogQuery>) => {
    const qs = toSearchParams({ ...query, ...patch }).toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const chips: { label: string; href: string }[] = [
    ...(query.q && basePath !== "/buscar" ? [{ label: `Búsqueda: ${query.q}`, href: without({ q: "" }) }] : []),
    ...query.brands.map((id) => ({ label: brandName(id), href: without({ brands: query.brands.filter((b) => b !== id) }) })),
    ...query.availability.map((a) => ({ label: AVAILABILITY_LABEL[a], href: without({ availability: query.availability.filter((x) => x !== a) }) })),
    ...(query.promo && !lockedPromo ? [{ label: "Con promoción", href: without({ promo: false }) }] : []),
    ...(query.min != null || query.max != null
      ? [{ label: `Precio ${query.min != null ? formatCOP(query.min) : "$ 0"} – ${query.max != null ? formatCOP(query.max) : "sin límite"}`, href: without({ min: null, max: null }) }]
      : []),
  ];
  const clearHref = basePath === "/buscar" && query.q ? `/buscar?q=${encodeURIComponent(query.q)}` : basePath;
  const wa = buildWhatsAppLink(buildGeneralMessage(store.name, query.q || undefined), store.whatsappNumber);

  return (
    <div className="wrap">
      <Breadcrumbs items={crumbs} />
      <div className="pagehead">
        <h1 className="disp">{title}</h1>
        <p>{intro}</p>
      </div>
      <CatalogShell
        query={query}
        categories={categoryFacets}
        brands={brandFacets}
        lockedPromo={lockedPromo}
        resultCount={results.length}
        chips={
          chips.length > 0 && (
            <div className="chips">
              {chips.map((c) => (
                <Link key={c.label} className="chip" href={c.href} scroll={false} aria-label={`Quitar filtro ${c.label}`}>
                  {c.label} <span aria-hidden="true">✕</span>
                </Link>
              ))}
              <Link className="link" href={clearHref} scroll={false}>Limpiar filtros</Link>
            </div>
          )
        }
      >
        {results.length > 0 ? (
          <div className="grid-p narrow">
            {results.map((p) => <ProductCard key={p.id} product={p} brand={brandName(p.brandId)} />)}
          </div>
        ) : (
          <div className="empty">
            <SearchIcon />
            <b>No encontramos productos con esos criterios</b>
            <p>Revisa la ortografía, quita algún filtro o pregúntanos por WhatsApp: también conseguimos equipos bajo pedido.</p>
            <div className="row-wrap" style={{ justifyContent: "center" }}>
              <Link className="btn btn-secondary btn-sm" href={basePath === "/buscar" ? "/catalogo" : basePath}>
                {basePath === "/buscar" ? "Ver todo el catálogo" : "Quitar filtros"}
              </Link>
              {wa && (
                <a className="btn btn-ghost btn-sm" href={wa} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon /> Preguntar por WhatsApp
                </a>
              )}
            </div>
          </div>
        )}
      </CatalogShell>
    </div>
  );
}

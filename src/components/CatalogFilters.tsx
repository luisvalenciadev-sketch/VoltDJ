"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import type { Availability } from "@/data/types";
import { toSearchParams, type CatalogQuery, type SortKey } from "@/lib/catalog-filter";
import { AVAILABILITY_LABEL } from "@/lib/pricing";
import { FilterIcon } from "./icons";

interface Props {
  query: CatalogQuery;
  categories: { id: string; slug: string; name: string; count: number }[];
  brands: { id: string; name: string; count: number }[];
  /** Filtros fijados por la ruta (p. ej. /ofertas siempre filtra promociones). */
  lockedPromo?: boolean;
  resultCount: number;
  chips: React.ReactNode;
  children: React.ReactNode;
}

const SORT_LABEL: Record<SortKey, string> = {
  relevancia: "Relevancia",
  "precio-asc": "Menor precio",
  "precio-desc": "Mayor precio",
  nombre: "Nombre (A–Z)",
};

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const parseNum = (s: string) => {
  const digits = s.replace(/\D/g, "");
  return digits === "" ? null : parseInt(digits, 10);
};

export function CatalogShell({ query: serverQuery, categories, brands, lockedPromo, resultCount, chips, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  // Los controles reflejan el cambio al instante mientras llega la página filtrada.
  const [query, setOptimisticQuery] = useOptimistic(serverQuery);
  const [open, setOpen] = useState(false);
  // Los controles se habilitan al hidratar: antes, un toque marcaría la casilla sin aplicar el filtro
  // (pasa en celulares lentos). Deshabilitados, el toque temprano simplemente no hace nada.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [min, setMin] = useState(query.min?.toString() ?? "");
  const [max, setMax] = useState(query.max?.toString() ?? "");
  useEffect(() => {
    setMin(query.min?.toString() ?? "");
    setMax(query.max?.toString() ?? "");
  }, [query.min, query.max]);

  const apply = (patch: Partial<CatalogQuery>) => {
    const next = { ...query, ...patch };
    if (lockedPromo) next.promo = false; // la ruta ya lo implica
    const qs = toSearchParams(next).toString();
    startTransition(() => {
      setOptimisticQuery(next);
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const activeCount = query.brands.length + query.availability.length + (query.promo && !lockedPromo ? 1 : 0) + (query.min != null || query.max != null ? 1 : 0);
  // Al cambiar de categoría se conservan búsqueda y orden, no los filtros finos.
  const keep = toSearchParams({ q: query.q, sort: query.sort }).toString();

  return (
    <div className="catlayout">
      <aside className={`filters${open ? " open" : ""}`} id="filtros" aria-label="Filtros">
        {!lockedPromo && (
          <nav className="fgroup" aria-label="Categoría">
            <span className="eyebrow">Categoría</span>
            <Link className="check" href={`/catalogo${keep ? `?${keep}` : ""}`} aria-current={!query.category ? "page" : undefined}>
              Todas
            </Link>
            {categories.map((c) => (
              <Link key={c.slug} className="check" href={`/catalogo/${c.slug}${keep ? `?${keep}` : ""}`} aria-current={query.category === c.id ? "page" : undefined}>
                {c.name}
                <span className="n">{c.count}</span>
              </Link>
            ))}
          </nav>
        )}

        {brands.length > 0 && (
          <fieldset className="fgroup">
            <legend>Marca</legend>
            {brands.map((b) => (
              <label key={b.id} className="check">
                <input type="checkbox" disabled={!ready} checked={query.brands.includes(b.id)} onChange={() => apply({ brands: toggle(query.brands, b.id) })} />
                {b.name}
                <span className="n">{b.count}</span>
              </label>
            ))}
          </fieldset>
        )}

        <fieldset className="fgroup">
          <legend>Precio (COP)</legend>
          <form
            className="stack"
            style={{ gap: "var(--s2)" }}
            onSubmit={(e) => {
              e.preventDefault();
              apply({ min: parseNum(min), max: parseNum(max) });
            }}
          >
            <div className="range">
              <div className="field">
                <label htmlFor="pmin">Mínimo</label>
                <input id="pmin" className="input num" inputMode="numeric" placeholder="0" value={min} onChange={(e) => setMin(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="pmax">Máximo</label>
                <input id="pmax" className="input num" inputMode="numeric" placeholder="Sin límite" value={max} onChange={(e) => setMax(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-secondary btn-sm" disabled={!ready}>Aplicar precio</button>
          </form>
        </fieldset>

        <fieldset className="fgroup">
          <legend>Disponibilidad</legend>
          {(Object.keys(AVAILABILITY_LABEL) as Availability[]).map((a) => (
            <label key={a} className="check">
              <input type="checkbox" disabled={!ready} checked={query.availability.includes(a)} onChange={() => apply({ availability: toggle(query.availability, a) })} />
              {AVAILABILITY_LABEL[a]}
            </label>
          ))}
        </fieldset>

        {!lockedPromo && (
          <fieldset className="fgroup">
            <legend>Promociones</legend>
            <label className="check">
              <input type="checkbox" disabled={!ready} checked={query.promo} onChange={() => apply({ promo: !query.promo })} />
              Solo con precio promocional
            </label>
          </fieldset>
        )}
      </aside>

      <div style={{ minWidth: 0, opacity: pending ? 0.6 : 1, transition: "opacity .15s" }} aria-busy={pending}>
        <div className="toolbar-c">
          <span className="count" role="status">
            {resultCount} {resultCount === 1 ? "producto" : "productos"}
          </span>
          <div className="r">
            <button type="button" className="btn btn-ghost btn-sm fbtn" disabled={!ready} aria-expanded={open} aria-controls="filtros" onClick={() => setOpen((o) => !o)}>
              <FilterIcon /> Filtros{activeCount ? ` (${activeCount})` : ""}
            </button>
            <label className="sr-only" htmlFor="orden">Ordenar por</label>
            <select id="orden" className="input" disabled={!ready} value={query.sort} onChange={(e) => apply({ sort: e.target.value as SortKey })}>
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <option key={k} value={k}>{SORT_LABEL[k]}</option>
              ))}
            </select>
          </div>
        </div>
        {chips}
        {children}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
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

/** Bajo este ancho los filtros son un panel inferior (sheet); arriba, la barra lateral. */
const SHEET_QUERY = "(max-width: 899px)";
/** Arrastre hacia abajo que cierra el panel: distancia en px o velocidad en px/ms (un gesto rápido basta). */
const DISMISS_DISTANCE = 90;
const DISMISS_VELOCITY = 0.5;

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

  const sheetRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  // Botón flotante: aparece cuando la barra con "Filtros" ya quedó arriba, fuera de la pantalla.
  const [toolbarGone, setToolbarGone] = useState(false);

  const openSheet = (from: HTMLElement) => {
    openerRef.current = from;
    setOpen(true);
  };
  const closeSheet = () => setOpen(false);

  // Con el panel abierto en celular: la página de atrás no se desplaza, Escape cierra y el foco entra al
  // panel; al cerrar vuelve al botón que lo abrió.
  useEffect(() => {
    if (!open || !matchMedia(SHEET_QUERY).matches) return;
    const root = document.documentElement;
    root.classList.add("sheet-open");
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      root.classList.remove("sheet-open");
      document.removeEventListener("keydown", onKey);
      openerRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    const el = toolbarRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setToolbarGone(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Arrastrar el panel hacia abajo desde su encabezado lo cierra; si no llega, vuelve a su sitio.
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const onDragStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a") || e.isPrimary === false || drag.current) return;
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    sheetRef.current?.classList.add("dragging");
  };
  const onDragMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const sheet = sheetRef.current;
    if (!d || !sheet) return;
    // Hacia arriba no se mueve más allá de su sitio: se frena (como un resorte), no se corta en seco.
    const raw = e.clientY - d.y;
    d.dy = raw > 0 ? raw : raw / 6;
    sheet.style.transform = `translateY(${d.dy}px)`;
  };
  const onDragEnd = () => {
    const d = drag.current;
    const sheet = sheetRef.current;
    drag.current = null;
    if (!d || !sheet) return;
    sheet.classList.remove("dragging");
    sheet.style.transform = "";
    const velocity = d.dy / (performance.now() - d.t);
    if (d.dy > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) closeSheet();
  };

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
  const countLabel = `${resultCount} ${resultCount === 1 ? "producto" : "productos"}`;

  return (
    <div className="catlayout">
      {/* Fondo oscuro del panel: tocarlo cierra (con teclado se cierra con Escape o con ✕). */}
      <div className={`fscrim${open ? " open" : ""}`} aria-hidden="true" onClick={closeSheet} />
      <aside
        ref={sheetRef}
        className={`filters${open ? " open" : ""}`}
        id="filtros"
        aria-label="Filtros"
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
      >
        <div className="fhead" onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}>
          <b>Filtros{activeCount ? ` (${activeCount})` : ""}</b>
          {activeCount > 0 && (
            <Link className="link" href={`${pathname}${keep ? `?${keep}` : ""}`} scroll={false}>
              Limpiar
            </Link>
          )}
          <button ref={closeRef} type="button" className="iconbtn" aria-label="Cerrar filtros" onClick={closeSheet}>
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="fbody">
          {!lockedPromo && (
            <nav className="fgroup" aria-label="Categoría">
              <span className="eyebrow">Categoría</span>
              <Link className="check" href={`/catalogo${keep ? `?${keep}` : ""}`} aria-current={!query.category ? "page" : undefined} onClick={closeSheet}>
                Todas
              </Link>
              {categories.map((c) => (
                <Link key={c.slug} className="check" href={`/catalogo/${c.slug}${keep ? `?${keep}` : ""}`} aria-current={query.category === c.id ? "page" : undefined} onClick={closeSheet}>
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
                  <input id="pmin" className="input num" inputMode="numeric" enterKeyHint="done" placeholder="0" value={min} onChange={(e) => setMin(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="pmax">Máximo</label>
                  <input id="pmax" className="input num" inputMode="numeric" enterKeyHint="done" placeholder="Sin límite" value={max} onChange={(e) => setMax(e.target.value)} />
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
        </div>

        {/* Los filtros se aplican al tocarlos; este botón solo cierra el panel y dice cuántos quedan. */}
        <div className="ffoot">
          <button type="button" className="btn btn-primary" onClick={closeSheet}>
            {pending ? "Actualizando…" : `Ver ${countLabel}`}
          </button>
        </div>
      </aside>

      <div style={{ minWidth: 0, opacity: pending ? 0.6 : 1, transition: "opacity .15s" }} aria-busy={pending}>
        <div className="toolbar-c" ref={toolbarRef}>
          <span className="count" role="status">
            {countLabel}
          </span>
          <div className="r">
            <button type="button" className="btn btn-ghost btn-sm fbtn" disabled={!ready} aria-expanded={open} aria-controls="filtros" onClick={(e) => openSheet(e.currentTarget)}>
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

      {/* Al bajar por la lista, los filtros siguen a un toque sin volver arriba. */}
      <button
        type="button"
        className={`ffab${toolbarGone && !open ? " show" : ""}`}
        disabled={!ready}
        aria-controls="filtros"
        aria-expanded={open}
        onClick={(e) => openSheet(e.currentTarget)}
      >
        <FilterIcon /> Filtrar{activeCount ? <span className="ffab-n">{activeCount}</span> : null}
      </button>
    </div>
  );
}

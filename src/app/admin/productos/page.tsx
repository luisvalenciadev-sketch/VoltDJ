import type { Metadata } from "next";
import Link from "next/link";
import { QuickEdit } from "@/components/admin/CatalogForms";
import { ProductArt } from "@/components/ProductArt";
import { requireAdmin } from "@/lib/admin-auth";
import { catalogStore } from "@/lib/catalog-store";
import { stockLevel } from "@/lib/inventory";

export const metadata: Metadata = { title: "Productos" };

type Search = Promise<Record<string, string | string[] | undefined>>;
type Tab = "activos" | "published" | "draft" | "archived";
const TABS: { id: Tab; label: string }[] = [
  { id: "activos", label: "Todos" },
  { id: "published", label: "Publicados" },
  { id: "draft", label: "Borradores" },
  { id: "archived", label: "Archivados" },
];
const STATUS_LABEL = { published: "Publicado", draft: "Borrador", archived: "Archivado" } as const;

export default async function ProductsPage({ searchParams }: { searchParams: Search }) {
  await requireAdmin();
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = one("q").trim().toLowerCase();
  const tab: Tab = TABS.some((t) => t.id === sp.ver) ? (sp.ver as Tab) : "activos";
  const cat = one("categoria");
  const brand = one("marca");
  const stock = one("stock");

  const store = catalogStore();
  const { products, categories, brands } = await store.snapshot();
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const brandName = new Map(brands.map((b) => [b.id, b.name]));

  const inTab = (s: string) => (tab === "activos" ? s !== "archived" : s === tab);
  const counts = {
    activos: products.filter((p) => p.status !== "archived").length,
    published: products.filter((p) => p.status === "published").length,
    draft: products.filter((p) => p.status === "draft").length,
    archived: products.filter((p) => p.status === "archived").length,
  };
  const live = products.filter((p) => p.status !== "archived");
  const soldOut = live.filter((p) => stockLevel(p) === "agotado").length;
  const low = live.filter((p) => stockLevel(p) === "bajo").length;

  const list = products
    .filter((p) => inTab(p.status))
    .filter((p) => !cat || p.categoryId === cat)
    .filter((p) => !brand || p.brandId === brand)
    .filter((p) => !stock || stockLevel(p) === stock)
    .filter((p) => !q || [p.name, p.sku, brandName.get(p.brandId) ?? ""].some((v) => v.toLowerCase().includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name));

  const href = (patch: Record<string, string>) => {
    const u = new URLSearchParams();
    const next = { ver: tab === "activos" ? "" : tab, q: one("q"), categoria: cat, marca: brand, stock, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) u.set(k, v);
    const s = u.toString();
    return s ? `/admin/productos?${s}` : "/admin/productos";
  };

  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Catálogo</span>
          <h1 className="disp">Productos</h1>
        </div>
        <div className="row-wrap">
          <Link className="btn btn-ghost" href="/admin/importar">
            Importar desde Excel
          </Link>
          <Link className="btn btn-primary" href="/admin/productos/nuevo">
            + Nuevo producto
          </Link>
        </div>
      </div>

      {sp.eliminado && (
        <p className="alert ok" role="status">
          <span>Producto eliminado.</span>
        </p>
      )}
      {!store.writable && (
        <div className="alert warn">
          <div>
            <b>Falta conectar la base de datos</b>
            <p>Se muestra el catálogo inicial, pero los cambios no se guardan. En Vercel: Storage → Neon → conectar al proyecto.</p>
          </div>
        </div>
      )}

      <div className="kpis kpis-4">
        <div>
          <span>Publicados</span>
          <b>{counts.published}</b>
        </div>
        <div>
          <span>Borradores</span>
          <b>{counts.draft}</b>
        </div>
        <Link href={href({ stock: "agotado" })}>
          <span>Agotados</span>
          <b className={soldOut ? "warn-text" : undefined}>{soldOut}</b>
        </Link>
        <Link href={href({ stock: "bajo" })}>
          <span>Stock bajo</span>
          <b className={low ? "warn-text" : undefined}>{low}</b>
        </Link>
      </div>

      <nav className="tabs" aria-label="Estado">
        {TABS.map((t) => (
          <Link key={t.id} href={href({ ver: t.id === "activos" ? "" : t.id })} aria-current={tab === t.id ? "page" : undefined}>
            {t.label}
            <span>{counts[t.id]}</span>
          </Link>
        ))}
      </nav>

      <form className="afilters" action="/admin/productos" role="search">
        {tab !== "activos" && <input type="hidden" name="ver" value={tab} />}
        <label className="sr-only" htmlFor="q">
          Buscar
        </label>
        <input id="q" name="q" className="input" placeholder="Buscar por nombre, SKU o marca" defaultValue={one("q")} />
        <label className="sr-only" htmlFor="categoria">
          Categoría
        </label>
        <select id="categoria" name="categoria" className="input" defaultValue={cat}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="marca">
          Marca
        </label>
        <select id="marca" name="marca" className="input" defaultValue={brand}>
          <option value="">Todas las marcas</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="stock">
          Stock
        </label>
        <select id="stock" name="stock" className="input" defaultValue={stock}>
          <option value="">Cualquier stock</option>
          <option value="agotado">Agotados</option>
          <option value="bajo">Stock bajo</option>
          <option value="ok">Con stock</option>
          <option value="sin-control">Sin control de stock</option>
        </select>
        <button type="submit" className="btn btn-secondary">
          Filtrar
        </button>
        {(q || cat || brand || stock) && (
          <Link className="textbtn" href={href({ q: "", categoria: "", marca: "", stock: "" })}>
            Quitar filtros
          </Link>
        )}
      </form>

      {list.length === 0 ? (
        <p className="empty-lines">{products.length ? "Ningún producto coincide con los filtros." : "Todavía no hay productos. Crea el primero o impórtalos desde Excel."}</p>
      ) : (
        <ul className="product-list" aria-label={`${list.length} productos`}>
          <li className="pl-head" aria-hidden="true">
            <span>Producto</span>
            <span>Precio · Stock</span>
          </li>
          {list.map((p) => {
            const level = stockLevel(p);
            return (
              <li key={p.id} className="pl-row">
                <Link className="pl-main" href={`/admin/productos/${p.id}`}>
                  <span className="pl-thumb">
                    {p.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element -- miniatura del panel
                      <img src={p.images[0].src} alt="" loading="lazy" />
                    ) : (
                      <ProductArt kind={p.art} />
                    )}
                  </span>
                  <span className="pl-text">
                    <b>{p.name}</b>
                    <span className="note">
                      {[p.sku, brandName.get(p.brandId), catName.get(p.categoryId)].filter(Boolean).join(" · ")}
                    </span>
                    <span className="pl-chips">
                      <span className="status-chip" data-s={p.status === "published" ? "entregado" : p.status === "archived" ? "cancelado" : undefined}>
                        {STATUS_LABEL[p.status]}
                      </span>
                      {level === "agotado" && <span className="status-chip" data-s="cancelado">Agotado</span>}
                      {level === "bajo" && <span className="status-chip" data-s="bajo">Stock bajo</span>}
                      {p.featured && <span className="status-chip">Destacado</span>}
                    </span>
                  </span>
                </Link>
                <QuickEdit product={p} writable={store.writable} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

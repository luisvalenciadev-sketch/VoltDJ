import type { Metadata } from "next";
import Link from "next/link";
import { StockAdjust } from "@/components/admin/CatalogForms";
import { MovementList } from "@/components/admin/MovementList";
import { requireAdmin } from "@/lib/admin-auth";
import { catalogStore } from "@/lib/catalog-store";
import { stockLevel, type StockLevel } from "@/lib/inventory";

export const metadata: Metadata = { title: "Inventario" };

type Search = Promise<Record<string, string | string[] | undefined>>;
type Tab = "atencion" | "todos" | "sin-control" | "movimientos";
const TABS: { id: Tab; label: string }[] = [
  { id: "atencion", label: "Agotados y stock bajo" },
  { id: "todos", label: "Todo el stock" },
  { id: "sin-control", label: "Sin control" },
  { id: "movimientos", label: "Movimientos" },
];
const LEVEL: Record<StockLevel, string> = { agotado: "Agotado", bajo: "Stock bajo", ok: "Con stock", "sin-control": "Sin control" };
const ORDER: Record<StockLevel, number> = { agotado: 0, bajo: 1, ok: 2, "sin-control": 3 };

export default async function InventoryPage({ searchParams }: { searchParams: Search }) {
  await requireAdmin();
  const sp = await searchParams;
  const productId = typeof sp.producto === "string" ? sp.producto : "";
  const tab: Tab = productId ? "movimientos" : TABS.some((t) => t.id === sp.ver) ? (sp.ver as Tab) : "atencion";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const store = catalogStore();
  const [{ products }, movements] = await Promise.all([store.snapshot(), tab === "movimientos" ? store.movements(productId || undefined, 200) : Promise.resolve([])]);
  const live = products.filter((p) => p.status !== "archived");
  const names = new Map(products.map((p) => [p.id, p.name]));
  const filtered = live
    .filter((p) => {
      const l = stockLevel(p);
      if (tab === "atencion") return l === "agotado" || l === "bajo";
      if (tab === "sin-control") return l === "sin-control";
      return l !== "sin-control";
    })
    .filter((p) => !q || [p.name, p.sku].some((v) => v.toLowerCase().includes(q)))
    .sort((a, b) => ORDER[stockLevel(a)] - ORDER[stockLevel(b)] || (a.stock ?? 0) - (b.stock ?? 0) || a.name.localeCompare(b.name));
  const units = live.reduce((s, p) => s + (p.stock ?? 0), 0);
  const count = (pred: (l: StockLevel) => boolean) => live.filter((p) => pred(stockLevel(p))).length;

  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Catálogo</span>
          <h1 className="disp">Inventario</h1>
        </div>
      </div>

      <div className="kpis kpis-4">
        <div>
          <span>Unidades en bodega</span>
          <b>{units}</b>
        </div>
        <div>
          <span>Agotados</span>
          <b className={count((l) => l === "agotado") ? "warn-text" : undefined}>{count((l) => l === "agotado")}</b>
        </div>
        <div>
          <span>Stock bajo</span>
          <b className={count((l) => l === "bajo") ? "warn-text" : undefined}>{count((l) => l === "bajo")}</b>
        </div>
        <div>
          <span>Sin control de stock</span>
          <b>{count((l) => l === "sin-control")}</b>
        </div>
      </div>

      <nav className="tabs" aria-label="Vista">
        {TABS.map((t) => (
          <Link key={t.id} href={t.id === "atencion" ? "/admin/inventario" : `/admin/inventario?ver=${t.id}`} aria-current={tab === t.id ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "movimientos" ? (
        <>
          {productId && (
            <p className="row-wrap">
              <span>
                Historial de <b>{names.get(productId) ?? productId}</b>
              </span>
              <Link className="textbtn" href="/admin/inventario?ver=movimientos">
                Ver todos los productos
              </Link>
            </p>
          )}
          {movements.length ? <MovementList movements={movements} names={productId ? undefined : names} /> : <p className="empty-lines">Todavía no hay movimientos de stock.</p>}
        </>
      ) : (
        <>
          <form className="afilters" action="/admin/inventario" role="search">
            {tab !== "atencion" && <input type="hidden" name="ver" value={tab} />}
            <label className="sr-only" htmlFor="q">
              Buscar
            </label>
            <input id="q" name="q" className="input" placeholder="Buscar por nombre o SKU" defaultValue={q} />
            <button type="submit" className="btn btn-secondary">
              Buscar
            </button>
          </form>
          {filtered.length === 0 ? (
            <p className="empty-lines">{tab === "atencion" ? "Nada agotado ni con stock bajo." : "No hay productos en esta vista."}</p>
          ) : (
            <ul className="stock-list">
              {filtered.map((p) => {
                const level = stockLevel(p);
                return (
                  <li key={p.id} className="stock-row" data-level={level}>
                    <div className="sr-main">
                      <Link href={`/admin/productos/${p.id}`}>
                        <b>{p.name}</b>
                      </Link>
                      <span className="note">
                        {p.sku && <span className="mono">{p.sku} · </span>}
                        <Link className="textbtn" href={`/admin/inventario?producto=${p.id}`}>
                          Historial
                        </Link>
                      </span>
                    </div>
                    <div className="sr-qty">
                      <b className="mono">{p.stock ?? "—"}</b>
                      <span className="status-chip" data-s={level === "agotado" ? "cancelado" : level === "bajo" ? "bajo" : level === "ok" ? "entregado" : undefined}>
                        {LEVEL[level]}
                      </span>
                    </div>
                    <StockAdjust product={p} writable={store.writable} />
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </>
  );
}

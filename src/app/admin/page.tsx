import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { guidesStore } from "@/lib/guides-store";
import { formatCOP } from "@/lib/pricing";
import { currentStatus, formatTrackingDate, nextScheduled, orderTotals, STATUS_LABEL, type Guide } from "@/lib/tracking";

export const metadata: Metadata = { title: "Guías" };

type Search = Promise<Record<string, string | string[] | undefined>>;
type Tab = "curso" | "entregados" | "cancelados" | "todas";
const TABS: { id: Tab; label: string }[] = [
  { id: "curso", label: "En curso" },
  { id: "entregados", label: "Entregados" },
  { id: "cancelados", label: "Cancelados" },
  { id: "todas", label: "Todas" },
];

export default async function AdminHome({ searchParams }: { searchParams: Search }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const tab: Tab = TABS.some((t) => t.id === sp.ver) ? (sp.ver as Tab) : "curso";
  const store = guidesStore();
  const all = store ? await store.list() : [];
  const now = new Date();

  const tabOf = (g: Guide): Exclude<Tab, "todas"> => {
    const s = currentStatus(g, now)?.status;
    return s === "entregado" ? "entregados" : s === "cancelado" ? "cancelados" : "curso";
  };
  const counts = { curso: 0, entregados: 0, cancelados: 0, todas: all.length };
  for (const g of all) counts[tabOf(g)]++;
  const matches = (g: Guide) => !q || [g.code, g.customerName, g.city ?? "", g.trackingNumber ?? ""].some((v) => v.toLowerCase().includes(q));
  const guides = all.filter((g) => (tab === "todas" || tabOf(g) === tab) && matches(g));
  // Lo que falta por cobrar en pedidos activos: el número que más le importa a la tienda a diario.
  const toCollect = all.filter((g) => tabOf(g) === "curso").reduce((s, g) => s + orderTotals(g).pending, 0);
  const href = (t: Tab) => `/admin?ver=${t}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Panel</span>
          <h1 className="disp">Guías de pedidos</h1>
        </div>
        <Link className="btn btn-primary" href="/admin/guias/nueva">
          + Nueva guía
        </Link>
      </div>

      {sp.eliminada && (
        <p className="alert ok" role="status">
          <span>Guía eliminada.</span>
        </p>
      )}
      {!store ? (
        <div className="alert warn">
          <div>
            <b>Falta conectar la base de datos</b>
            <p>En Vercel → Storage → crea una base Neon Postgres y conéctala a este proyecto. Eso agrega DATABASE_URL; luego vuelve a desplegar.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="kpis">
            <div>
              <span>En curso</span>
              <b className="num">{counts.curso}</b>
            </div>
            <div>
              <span>Por cobrar al entregar</span>
              <b className="num">{formatCOP(toCollect)}</b>
            </div>
            <div>
              <span>Entregados</span>
              <b className="num">{counts.entregados}</b>
            </div>
          </div>

          <div className="list-tools">
            <nav className="tabs" aria-label="Filtrar guías">
              {TABS.map((t) => (
                <Link key={t.id} href={href(t.id)} aria-current={tab === t.id ? "page" : undefined}>
                  {t.label} <span className="num">{counts[t.id]}</span>
                </Link>
              ))}
            </nav>
            <form className="track-form" method="get" role="search">
              <input type="hidden" name="ver" value={tab} />
              <label className="sr-only" htmlFor="q">
                Buscar guías
              </label>
              <input id="q" name="q" className="input" placeholder="Código, cliente, ciudad o n.º de guía" defaultValue={q} />
              <button type="submit" className="btn btn-secondary">
                Buscar
              </button>
            </form>
          </div>

          {guides.length === 0 ? (
            <div className="empty">
              <p>{q ? "Ninguna guía coincide con la búsqueda." : all.length === 0 ? "Aún no hay guías. Crea la primera cuando confirmes un pedido por WhatsApp." : "No hay guías en esta pestaña."}</p>
              {all.length === 0 && (
                <Link className="btn btn-primary" href="/admin/guias/nueva">
                  Crear la primera guía
                </Link>
              )}
            </div>
          ) : (
            <ul className="guide-list">
              {guides.map((g) => {
                const cur = currentStatus(g, now);
                const next = nextScheduled(g, now);
                const t = orderTotals(g);
                return (
                  <li key={g.code}>
                    <Link href={`/admin/guias/${g.code}`} className="guide-row">
                      <span className="gr-main">
                        <b>{g.customerName}</b>
                        <span className="mono">{g.code}</span>
                        {g.city && <span className="note">{g.city}</span>}
                      </span>
                      <span className="gr-status">
                        <span className="status-chip" data-s={cur?.status ?? "none"}>
                          {cur ? STATUS_LABEL[cur.status] : "Sin iniciar"}
                        </span>
                        <span className="note">{g.mode === "auto" ? (next ? `Auto · ${STATUS_LABEL[next.status]} el ${formatTrackingDate(next.at)}` : "Auto · completo") : "Manual"}</span>
                      </span>
                      <span className="gr-money">
                        <b className="num">{formatCOP(t.total)}</b>
                        <span className={`note${t.pending > 0 ? " owed" : ""}`}>{t.pending > 0 ? `Pendiente ${formatCOP(t.pending)}` : t.total ? "Pagado" : "—"}</span>
                      </span>
                    </Link>
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

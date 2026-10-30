import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { draftsStore } from "@/lib/drafts-store";
import { guidesStore } from "@/lib/guides-store";
import { draftSubtotal, draftUnits, type OrderDraft } from "@/lib/order-drafts";
import { formatCOP } from "@/lib/pricing";
import { currentStatus, formatTrackingDate, nextScheduled, orderTotals, STATUS_LABEL, type Guide } from "@/lib/tracking";

export const metadata: Metadata = { title: "Guías" };

type Search = Promise<Record<string, string | string[] | undefined>>;
type Tab = "borradores" | "curso" | "entregados" | "cancelados" | "todas";
const TABS: { id: Tab; label: string }[] = [
  { id: "borradores", label: "Borradores" },
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

  // Pedidos enviados desde el carrito que aún no son guía: van en la misma lista como "Borrador". Al crear la
  // guía conservan el código, así que un pedido nunca aparece dos veces (borrador convertido = solo la guía).
  const pendingDrafts = ((await draftsStore()?.list()) ?? []).filter((d) => d.status === "pendiente" && !all.some((g) => g.code === d.code));

  const tabOf = (g: Guide): Exclude<Tab, "todas" | "borradores"> => {
    const s = currentStatus(g, now)?.status;
    return s === "entregado" ? "entregados" : s === "cancelado" ? "cancelados" : "curso";
  };
  const counts = { borradores: pendingDrafts.length, curso: 0, entregados: 0, cancelados: 0, todas: all.length + pendingDrafts.length };
  for (const g of all) counts[tabOf(g)]++;
  const matches = (v: (string | null | undefined)[]) => !q || v.some((x) => (x ?? "").toLowerCase().includes(q));
  type Row = { kind: "draft"; d: OrderDraft; at: string } | { kind: "guide"; g: Guide; at: string };
  const rows: Row[] = [
    ...(tab === "borradores" || tab === "todas" ? pendingDrafts.filter((d) => matches([d.code, d.customerName, d.city, d.phone])).map((d) => ({ kind: "draft" as const, d, at: d.createdAt })) : []),
    ...all.filter((g) => (tab === "todas" || tabOf(g) === tab) && matches([g.code, g.customerName, g.city, g.trackingNumber])).map((g) => ({ kind: "guide" as const, g, at: g.createdAt })),
  ].sort((a, b) => b.at.localeCompare(a.at));
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

      {sp.permiso === "0" && (
        <p className="alert warn" role="alert">
          <span>Tu usuario de asesor no puede abrir esa sección. Pídele al dueño de la tienda el cambio que necesitas.</span>
        </p>
      )}
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
            <Link href={href("borradores")} className="kpi-link">
              <span>Borradores por confirmar</span>
              <b className="num">{counts.borradores}</b>
            </Link>
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

          {tab === "borradores" && rows.length > 0 && (
            <p className="note" style={{ marginBottom: "var(--s3)" }}>
              Pedidos enviados desde el carrito. Ábrelos cuando el cliente te escriba por WhatsApp: la guía se crea con sus datos y conserva el mismo código.
            </p>
          )}
          {rows.length === 0 ? (
            <div className="empty">
              <p>
                {q
                  ? "Ningún pedido coincide con la búsqueda."
                  : tab === "borradores"
                    ? "No hay borradores por confirmar. Los pedidos que los clientes envían desde el carrito aparecen aquí."
                    : counts.todas === 0
                      ? "Aún no hay guías. Crea la primera cuando confirmes un pedido por WhatsApp."
                      : "No hay guías en esta pestaña."}
              </p>
              {counts.todas === 0 && (
                <Link className="btn btn-primary" href="/admin/guias/nueva">
                  Crear la primera guía
                </Link>
              )}
            </div>
          ) : (
            <ul className="guide-list">
              {rows.map((r) => {
                if (r.kind === "draft") {
                  const d = r.d;
                  return (
                    <li key={d.code}>
                      <Link href={`/admin/guias/nueva?pedido=${d.code}`} className="guide-row" data-draft>
                        <span className="gr-main">
                          <b>{d.customerName}</b>
                          <span className="mono">{d.code}</span>
                          <span className="note">
                            {d.city}
                            {d.zone ? ` · ${d.zone.name}` : ""}
                          </span>
                        </span>
                        <span className="gr-status">
                          <span className="status-chip" data-s="borrador">
                            Borrador
                          </span>
                          <span className="note">Pedido web · {formatTrackingDate(d.createdAt)}</span>
                        </span>
                        <span className="gr-money">
                          <b className="num">{formatCOP(draftSubtotal(d))}</b>
                          <span className="note">
                            {draftUnits(d)} {draftUnits(d) === 1 ? "unidad" : "unidades"} · Crear guía →
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                }
                const g = r.g;
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

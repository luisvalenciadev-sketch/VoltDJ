import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "./actions";
import { requireAdmin } from "@/lib/admin-auth";
import { guidesStore } from "@/lib/guides-store";
import { currentStatus, formatTrackingDate, nextScheduled, STATUS_LABEL } from "@/lib/tracking";

export const metadata: Metadata = { title: "Guías" };

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminHome({ searchParams }: { searchParams: Search }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const store = guidesStore();
  const all = store ? await store.list() : [];
  const guides = q ? all.filter((g) => [g.code, g.customerName, g.city ?? "", g.trackingNumber ?? ""].some((v) => v.toLowerCase().includes(q))) : all;
  const now = new Date();

  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Panel</span>
          <h1 className="disp">Guías de pedidos</h1>
        </div>
        <div className="row-wrap">
          <Link className="btn btn-primary" href="/admin/guias/nueva">
            Nueva guía
          </Link>
          <form action={logout}>
            <button type="submit" className="textbtn">
              Cerrar sesión
            </button>
          </form>
        </div>
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
          <form className="track-form" method="get" role="search">
            <label className="sr-only" htmlFor="q">
              Buscar guías
            </label>
            <input id="q" name="q" className="input" placeholder="Buscar por código, cliente, ciudad o n.º de guía" defaultValue={q} />
            <button type="submit" className="btn btn-secondary">
              Buscar
            </button>
          </form>
          {guides.length === 0 ? (
            <div className="empty">
              <p>{q ? "Ninguna guía coincide con la búsqueda." : "Aún no hay guías. Crea la primera cuando confirmes un pedido por WhatsApp."}</p>
            </div>
          ) : (
            <ul className="guide-list">
              {guides.map((g) => {
                const cur = currentStatus(g, now);
                const next = nextScheduled(g, now);
                return (
                  <li key={g.code}>
                    <Link href={`/admin/guias/${g.code}`} className="guide-row">
                      <span className="mono">{g.code}</span>
                      <b>{g.customerName}</b>
                      <span className="status-chip" data-s={cur?.status ?? "none"}>
                        {cur ? STATUS_LABEL[cur.status] : "Sin iniciar"}
                      </span>
                      <span className="note">
                        {g.mode === "auto" ? (next ? `Auto · ${STATUS_LABEL[next.status]} el ${formatTrackingDate(next.at)}` : "Auto · completo") : "Manual"}
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

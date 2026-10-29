import type { Metadata } from "next";
import Link from "next/link";
import { UndoButton } from "@/components/admin/UserForms";
import { requireOwner } from "@/lib/admin-auth";
import { formatTrackingDate } from "@/lib/tracking";
import { usersStore, type AuditEntity, type AuditEntry } from "@/lib/users-store";

export const metadata: Metadata = { title: "Historial" };

const FILTERS: { id: AuditEntity | "todo"; label: string }[] = [
  { id: "todo", label: "Todo" },
  { id: "producto", label: "Productos y precios" },
  { id: "stock", label: "Stock" },
  { id: "promocion", label: "Promociones" },
  { id: "configuracion", label: "Configuración" },
  { id: "contenido", label: "Contenido" },
  { id: "usuario", label: "Usuarios" },
];

/** Se pueden deshacer los cambios de precio y de stock hechos a mano (no las ventas ni las guías). */
const undoable = (e: AuditEntry) => !e.undoneAt && ((e.entity === "producto" && e.action === "precio") || (e.entity === "stock" && e.action !== "control" && e.before != null && "stock" in e.before));

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  await requireOwner();
  const ver = (await searchParams).ver;
  const filter = FILTERS.find((f) => f.id === ver)?.id ?? "todo";
  const entries = await usersStore().auditList({ limit: 300, entity: filter === "todo" ? undefined : filter });
  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Equipo</span>
          <h1 className="disp">Historial</h1>
          <p className="note">Quién cambió qué y cuándo. Los cambios de precio y de stock se pueden deshacer mientras nadie los haya cambiado después.</p>
        </div>
      </div>
      <nav className="tabs" aria-label="Filtrar historial">
        {FILTERS.map((f) => (
          <Link key={f.id} href={f.id === "todo" ? "/admin/historial" : `/admin/historial?ver=${f.id}`} aria-current={filter === f.id ? "page" : undefined}>
            {f.label}
          </Link>
        ))}
      </nav>
      {entries.length === 0 ? (
        <p className="note">Todavía no hay cambios registrados{filter === "todo" ? "" : " de este tipo"}.</p>
      ) : (
        <div className="table-wrap">
          <table className="atable history">
            <caption className="sr-only">Historial de cambios del panel</caption>
            <thead>
              <tr>
                <th scope="col">Cuándo</th>
                <th scope="col">Quién</th>
                <th scope="col">Cambio</th>
                <th scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} data-undone={e.undoneAt ? "" : undefined}>
                  <td className="note">{formatTrackingDate(e.at)}</td>
                  <td>{e.userName}</td>
                  <td>
                    {e.summary}
                    {e.undoneAt && <span className="note"> · deshecho por {e.undoneBy}</span>}
                  </td>
                  <td>{undoable(e) && <UndoButton id={e.id} label={e.summary} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

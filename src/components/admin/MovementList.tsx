import Link from "next/link";
import type { StockMovement } from "@/data/types";
import { formatTrackingDate } from "@/lib/tracking";

const REASON: Record<StockMovement["reason"], string> = { ajuste: "Ajuste", pedido: "Venta / pedido", cancelacion: "Devolución", importacion: "Importación", inicial: "Stock inicial" };

/** Historial de stock: cada cambio con su motivo y lo que quedó. Con `names`, muestra también el producto. */
export function MovementList({ movements, names }: { movements: StockMovement[]; names?: Map<string, string> }) {
  return (
    <div className="table-wrap">
      <table className="atable">
        <thead>
          <tr>
            <th>Fecha</th>
            {names && <th>Producto</th>}
            <th>Motivo</th>
            <th className="num">Cambio</th>
            <th className="num">Queda</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((m) => (
            <tr key={m.id}>
              <td className="note">{formatTrackingDate(m.createdAt)}</td>
              {names && (
                <td>
                  <Link href={`/admin/productos/${m.productId}`}>{names.get(m.productId) ?? m.productId}</Link>
                </td>
              )}
              <td>
                {REASON[m.reason]}
                {m.note && <span className="note"> · {m.note}</span>}
                {m.ref && <span className="mono note"> · {m.ref}</span>}
              </td>
              <td className={`num mono ${m.delta < 0 ? "neg" : "pos"}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
              <td className="num mono">{m.stockAfter ?? "Sin control"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

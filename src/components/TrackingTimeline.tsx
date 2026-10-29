import { formatTrackingDate, type TimelineItem } from "@/lib/tracking";

/**
 * Línea de tiempo vertical: hecho (lleno), actual (anillo con pulso) y pendiente (contorno).
 * La línea que une los puntos se rellena hasta el paso actual: el avance se lee de un vistazo.
 */
export function TrackingTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="timeline">
      {items.map((s) => (
        <li key={s.id} className="tl-step" data-state={s.state} data-cancel={s.id === "cancelado" || undefined} aria-current={s.state === "current" ? "step" : undefined}>
          <span className="tl-dot" aria-hidden="true">
            {s.state === "done" && (
              <svg viewBox="0 0 16 16">
                <path d="m4 8.5 2.5 2.5L12 5.5" />
              </svg>
            )}
          </span>
          <div className="tl-body">
            <b>
              {s.label}
              {s.state !== "pending" && <span className="sr-only">{s.state === "current" ? " (estado actual)" : " (completado)"}</span>}
            </b>
            {s.state !== "pending" && <span className="tl-detail">{s.detail}</span>}
            {s.at && <time dateTime={s.at}>{formatTrackingDate(s.at)}</time>}
            {s.note && <span className="tl-note">{s.note}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}

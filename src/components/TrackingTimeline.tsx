import { formatTrackingDate, isException, shownState, type TimelineItem } from "@/lib/tracking";

/**
 * Progreso horizontal para el cliente: los pasos en una fila, el riel se pinta hasta el actual.
 * Cabe en un celular con etiquetas cortas; la fecha de cada paso hecho va debajo (en pantallas
 * anchas) y el detalle del actual se muestra aparte, en grande.
 */
export function TrackingStepper({ items }: { items: TimelineItem[] }) {
  const i = items.findIndex((s) => s.state === "current");
  return (
    <>
    {i >= 0 && (
      <p className="st-count" aria-hidden="true">
        Paso {i + 1} de {items.length} · <span>{items[i].short}</span>
      </p>
    )}
    <ol className="steps-h" style={{ "--n": items.length } as React.CSSProperties}>
      {items.map((s) => {
        const state = shownState(s);
        return (
          <li key={s.id} className="st-step" data-state={state} data-cancel={s.id === "cancelado" || undefined} data-exc={isException(s.id) ? s.id : undefined} aria-current={s.state === "current" ? "step" : undefined}>
            <span className="tl-dot" aria-hidden="true">
              {state === "done" && (
                <svg viewBox="0 0 16 16">
                  <path d="m4 8.5 2.5 2.5L12 5.5" />
                </svg>
              )}
            </span>
            <span className="st-label">
              {s.short}
              {state !== "pending" && <span className="sr-only">{state === "current" ? " (estado actual)" : " (completado)"}</span>}
            </span>
            {state === "done" && s.at && (
              <time className="st-date" dateTime={s.at}>
                {formatTrackingDate(s.at)}
              </time>
            )}
            {/* Cada paso dice en qué está: lo que falta se lee como pendiente, no como apagado. */}
            {state === "current" && <span className="st-sub now-tag">En curso</span>}
            {state === "pending" && <span className="st-sub">Pendiente</span>}
          </li>
        );
      })}
    </ol>
    </>
  );
}

/**
 * Línea de tiempo vertical: hecho (lleno), actual (anillo con pulso) y pendiente (contorno).
 * La línea que une los puntos se rellena hasta el paso actual: el avance se lee de un vistazo.
 */
export function TrackingTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="timeline">
      {items.map((s) => {
        const state = shownState(s);
        return (
          <li key={s.id} className="tl-step" data-state={state} data-cancel={s.id === "cancelado" || undefined} data-exc={isException(s.id) ? s.id : undefined} aria-current={s.state === "current" ? "step" : undefined}>
            <span className="tl-dot" aria-hidden="true">
              {state === "done" && (
                <svg viewBox="0 0 16 16">
                  <path d="m4 8.5 2.5 2.5L12 5.5" />
                </svg>
              )}
            </span>
            <div className="tl-body">
              <b>
                {s.label}
                {state !== "pending" && <span className="sr-only">{state === "current" ? " (estado actual)" : " (completado)"}</span>}
              </b>
              {state !== "pending" ? <span className="tl-detail">{s.detail}</span> : <span className="tl-pending">Pendiente</span>}
              {s.at && <time dateTime={s.at}>{formatTrackingDate(s.at)}</time>}
              {s.note && <span className="tl-note">{s.note}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

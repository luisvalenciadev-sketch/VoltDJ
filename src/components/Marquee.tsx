"use client";

import { useState } from "react";

/**
 * Cinta con desplazamiento infinito. El contenido se repite dos veces y la pista se mueve
 * -50% con velocidad lineal: al terminar, la segunda copia está justo donde empezó la primera,
 * así el salto es invisible. La copia es inert + aria-hidden: el lector de pantalla y el teclado
 * recorren cada elemento una sola vez.
 * Todo lo que se mueve solo por más de 5 s necesita forma de detenerlo (WCAG 2.2.2): botón de
 * pausa; además se detiene con el puntero encima y no se mueve con movimiento reducido.
 */
export function Marquee({ label, seconds = 40, className, children }: { label: string; seconds?: number; className?: string; children: React.ReactNode }) {
  const [paused, setPaused] = useState(false);
  return (
    <div className={`marquee${className ? ` ${className}` : ""}`} data-paused={paused || undefined} style={{ "--marquee-s": `${seconds}s` } as React.CSSProperties}>
      <div className="marquee-viewport">
        <div className="marquee-track">
          <div className="marquee-group">{children}</div>
          <div className="marquee-group" aria-hidden="true" inert>
            {children}
          </div>
        </div>
      </div>
      <button type="button" className="marquee-toggle" aria-pressed={paused} aria-label={`${paused ? "Reanudar" : "Pausar"} ${label}`} onClick={() => setPaused((p) => !p)}>
        <svg viewBox="0 0 16 16" aria-hidden="true">{paused ? <path d="M4 2.5v11l9-5.5z" fill="currentColor" /> : <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor" />}</svg>
      </button>
    </div>
  );
}

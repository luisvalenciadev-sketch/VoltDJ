"use client";

import { useEffect, useRef } from "react";

/**
 * Inclinación 3D que sigue al puntero con un resorte (interpolación por frame), no 1:1:
 * atado directo al mouse se siente mecánico; con inercia se siente un objeto físico.
 * Escucha en el padre para que toda la tarjeta sea zona activa y escribe `transform`
 * directo en el elemento (no variables CSS en un ancestro, que recalculan a todos los hijos).
 * Solo con puntero fino y sin movimiento reducido: es decorativo, en táctil no aporta.
 */
export function Tilt({ max = 8, lift = 0, host: hostSelector, className, children }: { max?: number; lift?: number; host?: string; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const host = (hostSelector && el?.closest<HTMLElement>(hostSelector)) || el?.parentElement;
    if (!el || !host || typeof matchMedia !== "function") return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const glare = el.querySelector<HTMLElement>(".glare");
    const STIFFNESS = 0.12; // fracción del camino restante por frame: ~resorte críticamente amortiguado
    let tx = 0, ty = 0, tz = 0, ts = 1;
    let x = 0, y = 0, z = 0, s = 1;
    let raf = 0;

    const tick = () => {
      x += (tx - x) * STIFFNESS;
      y += (ty - y) * STIFFNESS;
      z += (tz - z) * STIFFNESS;
      s += (ts - s) * 0.3; // la presión responde más rápido que la inclinación
      el.style.transform = `rotateX(${y.toFixed(2)}deg) rotateY(${x.toFixed(2)}deg) translateZ(${z.toFixed(1)}px) scale(${s.toFixed(3)})`;
      if (glare) glare.style.transform = `translate(${(x / max) * 30}%, ${(-y / max) * 30}%)`;
      const settled = Math.abs(tx - x) < 0.01 && Math.abs(ty - y) < 0.01 && Math.abs(tz - z) < 0.05 && Math.abs(ts - s) < 0.001;
      raf = settled ? 0 : requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const move = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * max * 2;
      ty = -((e.clientY - r.top) / r.height - 0.5) * max * 2;
      tz = lift;
      host.dataset.tilting = "";
      kick();
    };
    const leave = () => {
      tx = ty = tz = 0;
      ts = 1;
      delete host.dataset.tilting;
      kick();
    };
    const down = () => {
      ts = 0.97;
      kick();
    };
    const up = () => {
      ts = 1;
      kick();
    };

    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    host.addEventListener("pointerdown", down);
    host.addEventListener("pointerup", up);
    return () => {
      cancelAnimationFrame(raf);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
      host.removeEventListener("pointerdown", down);
      host.removeEventListener("pointerup", up);
    };
  }, [max, lift, hostSelector]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Pausa animaciones infinitas cuando el bloque sale de pantalla: no gastar GPU en lo que nadie ve. */
export function PauseOffscreen({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver !== "function") return;
    const io = new IntersectionObserver(([e]) => el.toggleAttribute("data-paused", !e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Visor interactivo del producto: girar en 3D, acercar y desplazarse.
 *
 * Física: el gesto mueve un objetivo y lo dibujado lo persigue con un resorte (interpolación
 * por frame). Al soltar, el giro conserva la inercia y pierde velocidad por fricción; si se pasó
 * del límite, vuelve con un rebote elástico en vez de chocar contra una pared invisible.
 * Las transformaciones se escriben directo en el elemento (no variables CSS en un ancestro).
 *
 * Con una sola foto por producto el giro es una inclinación limitada (±RY/±RX): más allá, una
 * foto plana deja de parecer un objeto. El reflejo enmascarado con la silueta vende el volumen.
 */
const RY = 38;
const RX = 20;
const POSE = { rx: 8, ry: -14 };

type V = { rx: number; ry: number; z: number; px: number; py: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Fuera del límite el arrastre rinde cada vez menos (como estirar una goma). */
const resist = (value: number, delta: number, limit: number) => (Math.abs(value) > limit && Math.sign(delta) === Math.sign(value) ? value + delta * 0.25 : value + delta);

export function ProductViewer({
  label,
  maskSrc,
  expanded = false,
  onExpand,
  onClose,
  children,
}: {
  label: string;
  /** Imagen con transparencia para recortar el reflejo a la silueta del producto. */
  maskSrc?: string;
  expanded?: boolean;
  onExpand?: () => void;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const objRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const api = useRef<{ zoomBy: (f: number) => void; reset: () => void } | null>(null);
  const [touched, setTouched] = useState(false);
  const [zoom, setZoom] = useState(1);
  const hintId = useId();
  const maxZoom = expanded ? 3 : 2.5;

  useEffect(() => {
    const stage = stageRef.current;
    const obj = objRef.current;
    if (!stage || !obj) return;
    const calm = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const K = calm ? 1 : 0.2; // calma = sin resorte, la imagen sigue al gesto sin inercia

    const t: V = { ...POSE, z: 1, px: 0, py: 0 };
    const c: V = { ...t };
    const vel = { rx: 0, ry: 0 };
    const pointers = new Map<number, { x: number; y: number }>();
    let dragging = false;
    let pinch: { dist: number; z: number } | null = null;
    let lastTap = { time: 0, x: 0, y: 0 };
    let downAt = { x: 0, y: 0 };
    let raf = 0;
    let reportedZoom = 1;

    const size = () => stage.getBoundingClientRect();
    const clampPan = () => {
      const r = size();
      const mx = ((t.z - 1) * r.width) / 2;
      const my = ((t.z - 1) * r.height) / 2;
      t.px = clamp(t.px, -mx, mx);
      t.py = clamp(t.py, -my, my);
    };
    const zoomAt = (z: number, clientX?: number, clientY?: number) => {
      const r = size();
      const nz = clamp(z, 1, maxZoom);
      // El punto bajo el cursor se queda quieto: el zoom "va hacia" donde miras.
      const ox = clientX == null ? 0 : clientX - (r.left + r.width / 2);
      const oy = clientY == null ? 0 : clientY - (r.top + r.height / 2);
      t.px = ox - (ox - t.px) * (nz / t.z);
      t.py = oy - (oy - t.py) * (nz / t.z);
      t.z = nz;
      if (nz > 1.01) {
        // Para ver detalle el producto se pone de frente; inclinado y ampliado se lee mal.
        t.rx = 0;
        t.ry = 0;
        vel.rx = vel.ry = 0;
      } else {
        t.px = t.py = 0;
      }
      clampPan();
      kick();
    };
    const reset = () => {
      Object.assign(t, POSE, { z: 1, px: 0, py: 0 });
      vel.rx = vel.ry = 0;
      kick();
    };

    const tick = () => {
      if (!dragging) {
        // Inercia con fricción y regreso elástico a los límites.
        t.ry += vel.ry;
        t.rx += vel.rx;
        vel.ry *= 0.9;
        vel.rx *= 0.9;
        if (Math.abs(t.ry) > RY) t.ry += (Math.sign(t.ry) * RY - t.ry) * 0.18;
        if (Math.abs(t.rx) > RX) t.rx += (Math.sign(t.rx) * RX - t.rx) * 0.18;
      }
      for (const k of ["rx", "ry", "z", "px", "py"] as const) c[k] += (t[k] - c[k]) * K;
      obj.style.transform = `translate3d(${c.px.toFixed(1)}px, ${c.py.toFixed(1)}px, 0) scale(${c.z.toFixed(3)}) rotateX(${c.rx.toFixed(2)}deg) rotateY(${c.ry.toFixed(2)}deg)`;
      if (shineRef.current) shineRef.current.style.transform = `translate(${(-c.ry * 0.9).toFixed(1)}%, ${(c.rx * 1.2).toFixed(1)}%)`;
      if (floorRef.current) floorRef.current.style.transform = `translateX(${(c.ry * 0.6).toFixed(1)}%) scaleX(${(1 - Math.abs(c.ry) / 160).toFixed(3)})`;
      const roundedZ = Math.round(t.z * 100) / 100;
      if (roundedZ !== reportedZoom) {
        reportedZoom = roundedZ;
        setZoom(roundedZ);
      }
      stage.toggleAttribute("data-zoomed", t.z > 1.01);
      const moving = dragging || Math.abs(vel.ry) > 0.01 || Math.abs(vel.rx) > 0.01 || (["rx", "ry", "z", "px", "py"] as const).some((k) => Math.abs(t[k] - c[k]) > 0.01);
      raf = moving ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      stage.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) downAt = { x: e.clientX, y: e.clientY };
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), z: t.z };
      }
      dragging = true;
      vel.rx = vel.ry = 0;
      stage.setAttribute("data-dragging", "");
      setTouched(true);
      kick();
    };
    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const p = { x: e.clientX, y: e.clientY };
      pointers.set(e.pointerId, p);
      if (pinch && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        zoomAt((pinch.z * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.dist, (a.x + b.x) / 2, (a.y + b.y) / 2);
        return;
      }
      if (pointers.size !== 1) return;
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      if (t.z > 1.01) {
        t.px += dx;
        t.py += dy;
        clampPan();
      } else {
        const dry = dx * 0.4;
        const drx = -dy * 0.3;
        t.ry = resist(t.ry, dry, RY);
        t.rx = resist(t.rx, drx, RX);
        vel.ry = calm ? 0 : dry;
        vel.rx = calm ? 0 : drx;
      }
      kick();
    };
    const onUp = (e: PointerEvent) => {
      if (!pointers.delete(e.pointerId)) return;
      if (pointers.size < 2) pinch = null;
      if (pointers.size > 0) return;
      dragging = false;
      stage.removeAttribute("data-dragging");
      // Doble toque / doble clic sin arrastre: alterna el zoom en ese punto.
      const still = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 8;
      if (still) {
        vel.rx = vel.ry = 0;
        const now = performance.now();
        if (now - lastTap.time < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
          zoomAt(t.z > 1.01 ? 1 : 2.2, e.clientX, e.clientY);
          lastTap.time = 0;
        } else {
          lastTap = { time: now, x: e.clientX, y: e.clientY };
        }
      }
      kick();
    };
    // La rueda no se secuestra en la página (impediría hacer scroll): solo en pantalla completa
    // o con Ctrl/⌘, que es lo que envía el gesto de pellizco del trackpad.
    const onWheel = (e: WheelEvent) => {
      if (!expanded && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setTouched(true);
      zoomAt(t.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX, e.clientY);
    };
    const onKey = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 20 : 8;
      const keys: Record<string, () => void> = {
        ArrowLeft: () => (t.ry = clamp(t.ry - step, -RY, RY)),
        ArrowRight: () => (t.ry = clamp(t.ry + step, -RY, RY)),
        ArrowUp: () => (t.rx = clamp(t.rx + step, -RX, RX)),
        ArrowDown: () => (t.rx = clamp(t.rx - step, -RX, RX)),
        "+": () => zoomAt(t.z * 1.25),
        "=": () => zoomAt(t.z * 1.25),
        "-": () => zoomAt(t.z / 1.25),
        "0": reset,
      };
      const fn = keys[e.key];
      if (!fn) return;
      e.preventDefault();
      setTouched(true);
      if (t.z > 1.01 && e.key.startsWith("Arrow")) {
        // Ampliado, las flechas desplazan en lugar de girar.
        const d = 40;
        if (e.key === "ArrowLeft") t.px += d;
        if (e.key === "ArrowRight") t.px -= d;
        if (e.key === "ArrowUp") t.py += d;
        if (e.key === "ArrowDown") t.py -= d;
        clampPan();
      } else fn();
      kick();
    };

    api.current = { zoomBy: (f) => zoomAt(t.z * f), reset };
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("keydown", onKey);
    kick();
    return () => {
      cancelAnimationFrame(raf);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("keydown", onKey);
    };
  }, [expanded, maxZoom]);

  return (
    <div className="viewer" data-expanded={expanded || undefined}>
      <div
        ref={stageRef}
        className="viewer-stage"
        tabIndex={0}
        role="group"
        aria-roledescription="visor del producto"
        aria-label={label}
        aria-describedby={hintId}
      >
        <div ref={floorRef} className="viewer-floor" aria-hidden="true" />
        <div ref={objRef} className="viewer-obj">
          {children}
          {maskSrc && (
            <span className="viewer-shine" aria-hidden="true" style={{ maskImage: `url(${maskSrc})`, WebkitMaskImage: `url(${maskSrc})` }}>
              <i ref={shineRef} />
            </span>
          )}
        </div>
      </div>
      <p id={hintId} className="viewer-hint" data-hidden={touched || undefined}>
        {expanded ? (
          "Arrastra para girar · rueda o pellizca para acercar"
        ) : (
          <>
            Arrastra para girar · <span className="on-mouse">doble clic</span>
            <span className="on-touch">doble toque o pellizca</span> para acercar
          </>
        )}
        <span className="sr-only">. Con el teclado: flechas para girar, + y − para acercar, 0 para restablecer.</span>
      </p>
      <div className="viewer-tools">
        <button type="button" onClick={() => api.current?.zoomBy(1 / 1.4)} disabled={zoom <= 1} aria-label="Alejar">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" /></svg>
        </button>
        <button type="button" onClick={() => api.current?.zoomBy(1.4)} disabled={zoom >= maxZoom} aria-label="Acercar">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M8 3v10" /></svg>
        </button>
        <button type="button" onClick={() => api.current?.reset()} aria-label="Restablecer vista">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 6.5A5 5 0 1 1 3 9" /><path d="M3 3v3.5h3.5" /></svg>
        </button>
        {expanded ? (
          <button type="button" onClick={onClose} aria-label="Cerrar vista ampliada">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        ) : (
          onExpand && (
            <button type="button" onClick={onExpand} aria-label="Ver en pantalla completa">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" /></svg>
            </button>
          )
        )}
      </div>
    </div>
  );
}

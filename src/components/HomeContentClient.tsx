"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Carrusel de banners con scroll nativo (se desliza con el dedo, con el trackpad y con las flechas).
 * Sin avance automático: un texto que se mueve solo no deja leerlo y falla WCAG 2.2.2.
 */
export function BannerTrack({ count, children }: { count: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || count < 2) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [count]);

  const go = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const next = (i + count) % count;
    const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: next * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  };

  return (
    <div className="banner-carousel">
      <div className="banner-track" ref={ref} tabIndex={count > 1 ? 0 : undefined} aria-label={count > 1 ? "Banners, desliza para ver más" : undefined}>
        {children}
      </div>
      {count > 1 && (
        <div className="banner-nav">
          <button type="button" className="iconbtn" onClick={() => go(index - 1)} aria-label="Banner anterior">
            ←
          </button>
          <span className="banner-dots" aria-hidden="true">
            {Array.from({ length: count }, (_, i) => (
              <i key={i} data-on={i === index || undefined} />
            ))}
          </span>
          <span className="sr-only" aria-live="polite">
            Banner {index + 1} de {count}
          </span>
          <button type="button" className="iconbtn" onClick={() => go(index + 1)} aria-label="Banner siguiente">
            →
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * YouTube sin cargar YouTube: muestra la portada y solo al pulsar inserta el reproductor (dominio
 * youtube-nocookie). Así el inicio no descarga ~1 MB de scripts ni pone cookies de terceros por cada video.
 */
export function LiteYouTube({ id, title, poster }: { id: string; title: string; poster: string | null }) {
  const [on, setOn] = useState(false);
  if (on) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <button type="button" className="yt-lite" onClick={() => setOn(true)} aria-label={`Reproducir: ${title}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- portada externa de YouTube o subida por la tienda */}
      <img src={poster ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
      <span className="yt-play" aria-hidden="true">▶</span>
    </button>
  );
}

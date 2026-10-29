import type { Banner, Video } from "@/config/content";
import { promotionState } from "./promotions";

/** Banners que se ven hoy: activos y dentro de sus fechas (las mismas reglas de hora de Colombia que las promociones). */
export const liveBanners = (banners: Banner[], now: Date = new Date()) => banners.filter((b) => promotionState(b, now) === "vigente");

export const liveVideos = (videos: Video[]) => videos.filter((v) => v.active && (v.src || v.youtubeId));

/**
 * Id de un video de YouTube a partir de lo que la tienda pega: enlace normal, corto (youtu.be), de Shorts
 * o el id solo. null si no lo reconoce.
 */
export function youtubeId(input: string): string | null {
  const v = input.trim();
  if (/^[\w-]{11}$/.test(v)) return v;
  try {
    const url = new URL(v);
    const host = url.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return /^[\w-]{11}$/.test(url.pathname.slice(1)) ? url.pathname.slice(1) : null;
    if (host !== "youtube.com" && host !== "youtube-nocookie.com") return null;
    const id = url.searchParams.get("v") ?? /^\/(?:shorts|embed|live)\/([\w-]{11})/.exec(url.pathname)?.[1] ?? null;
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Promedio con una cifra decimal a la colombiana: 4.8 → "4,8". */
export const formatRating = (n: number) => n.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Enlace del botón de un banner: solo rutas internas o http(s); cualquier otra cosa se descarta. */
export function safeHref(raw: string): string | null {
  const v = raw.trim();
  if (/^\/(?!\/)/.test(v)) return v;
  return /^https?:\/\/\S+\.\S+/.test(v) ? v : null;
}

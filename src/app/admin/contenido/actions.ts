"use server";

import { revalidateTag } from "next/cache";
import { HOME_SECTION_IDS, type Banner, type FaqItem, type HomeContent, type HomeSectionId, type Review, type Video } from "@/config/content";
import { CONTENT_TAG } from "@/data/content";
import type { ProductImage } from "@/data/types";
import { requireAdmin } from "@/lib/admin-auth";
import { catalogStore, ReadOnlyCatalogError } from "@/lib/catalog-store";
import { safeHref, youtubeId } from "@/lib/home-content";
import { deleteMedia } from "@/lib/media";
import { contentStore, settingsStore } from "@/lib/settings-store";

export type ContentState = { error?: string; ok?: string } | undefined;

const clean = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const longClean = (v: unknown, max: number) => String(v ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);
const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const id = (v: unknown, prefix: string, i: number) => clean(v, 40) || `${prefix}-${Date.now().toString(36)}-${i}`;

function image(v: unknown): ProductImage | null {
  const x = v as ProductImage | null;
  if (!x || typeof x.src !== "string" || !/^(\/|https:\/\/)/.test(x.src)) return null;
  return { src: x.src, alt: clean(x.alt, 120), width: Number(x.width) || 0, height: Number(x.height) || 0, fit: "cover" };
}

function list<T>(fd: FormData, key: string): T[] | null {
  try {
    const v = JSON.parse(String(fd.get(key) ?? "[]"));
    return Array.isArray(v) ? (v as T[]) : null;
  } catch {
    return null;
  }
}

const mediaOf = (c: HomeContent) => [
  ...c.banners.flatMap((b) => (b.image ? [b.image.src] : [])),
  ...c.videos.flatMap((v) => [v.src, v.poster?.src].filter((s): s is string => Boolean(s))),
];

/** Borra del almacenamiento las fotos y videos que el contenido dejó de usar, salvo que los use otra parte. */
async function releaseRemoved(before: HomeContent, after: HomeContent) {
  const kept = new Set(mediaOf(after));
  const gone = mediaOf(before).filter((s) => !kept.has(s) && !s.startsWith("/img/"));
  if (!gone.length) return;
  const [{ products, categories, brands }, store] = await Promise.all([catalogStore().snapshot(), settingsStore().get()]);
  const inUse = new Set([
    ...products.flatMap((p) => p.images.map((i) => i.src)),
    ...categories.flatMap((c) => (c.image ? [c.image.src] : [])),
    ...brands.flatMap((b) => (b.logo ? [b.logo.src] : [])),
    ...[store.brand.logoOnDark, store.brand.logoOnLight, store.brand.favicon, store.seo.image].flatMap((i) => (i ? [i.src] : [])),
  ]);
  await deleteMedia(gone.filter((s) => !inUse.has(s))).catch((e) => console.error("[panel] liberar contenido", e));
}

async function save(patch: (c: HomeContent) => HomeContent, what: string): Promise<ContentState> {
  await requireAdmin();
  const store = contentStore();
  try {
    const before = await store.get();
    const after = patch(before);
    await store.save(after);
    await releaseRemoved(before, after);
  } catch (e) {
    if (e instanceof ReadOnlyCatalogError) return { error: "Falta conectar la base de datos: los cambios no se pueden guardar todavía." };
    console.error(`[panel] guardar ${what}`, e);
    return { error: `No se pudo guardar ${what}. Intenta de nuevo en un momento.` };
  }
  revalidateTag(CONTENT_TAG, { expire: 0 });
  return { ok: "Guardado. Ya se ve en la tienda." };
}

export async function saveHome(_: ContentState, fd: FormData): Promise<ContentState> {
  const ctaHref = clean(fd.get("ctaHref"), 300);
  if (ctaHref && !safeHref(ctaHref)) return { error: "El enlace del botón debe empezar por / (una página de la tienda) o por https://." };
  const sections = list<{ id: HomeSectionId; enabled: boolean }>(fd, "sections");
  if (!sections) return { error: "No se pudo leer el orden de las secciones. Recarga la página." };
  const known = new Set<string>(HOME_SECTION_IDS);
  const order = sections.filter((s) => known.has(s.id)).map((s) => ({ id: s.id, enabled: Boolean(s.enabled) }));
  return save(
    (c) => ({
      ...c,
      hero: { eyebrow: clean(fd.get("eyebrow"), 60), lead: clean(fd.get("lead"), 260), ctaLabel: clean(fd.get("ctaLabel"), 30), ctaHref: ctaHref || "/catalogo" },
      sections: order,
    }),
    "el inicio",
  );
}

export async function saveBanners(_: ContentState, fd: FormData): Promise<ContentState> {
  const raw = list<Banner>(fd, "banners");
  if (!raw) return { error: "No se pudieron leer los banners. Recarga la página." };
  const banners: Banner[] = raw.slice(0, 8).map((b, i) => ({
    id: id(b.id, "banner", i),
    title: clean(b.title, 80),
    subtitle: clean(b.subtitle, 160),
    ctaLabel: clean(b.ctaLabel, 30),
    ctaHref: clean(b.ctaHref, 300),
    image: image(b.image),
    startsAt: day(b.startsAt),
    endsAt: day(b.endsAt),
    active: Boolean(b.active),
  }));
  const bad = banners.find((b) => !b.title);
  if (bad) return { error: "Cada banner necesita un título: es lo que se lee sobre la foto." };
  const badLink = banners.find((b) => b.ctaHref && !safeHref(b.ctaHref));
  if (badLink) return { error: `El enlace del banner "${badLink.title}" debe empezar por / o por https://.` };
  const badDates = banners.find((b) => b.startsAt && b.endsAt && b.endsAt < b.startsAt);
  if (badDates) return { error: `En "${badDates.title}" la fecha de fin es anterior a la de inicio.` };
  return save((c) => ({ ...c, banners }), "los banners");
}

export async function saveVideos(_: ContentState, fd: FormData): Promise<ContentState> {
  const raw = list<Video & { youtube?: string }>(fd, "videos");
  if (!raw) return { error: "No se pudieron leer los videos. Recarga la página." };
  const videos: Video[] = [];
  for (const [i, v] of raw.slice(0, 12).entries()) {
    const title = clean(v.title, 80);
    if (!title) return { error: "Cada video necesita un título." };
    const yt = v.youtube ? youtubeId(v.youtube) : v.youtubeId;
    if (v.youtube && !yt) return { error: `No reconocemos el enlace de YouTube de "${title}". Pega el enlace del video o del Short.` };
    const src = typeof v.src === "string" && /^(\/|https:\/\/)/.test(v.src) ? v.src : null;
    if (!src && !yt) return { error: `Sube el video de "${title}" o pega su enlace de YouTube.` };
    videos.push({ id: id(v.id, "video", i), title, src: yt ? null : src, youtubeId: yt ?? null, poster: image(v.poster), productId: clean(v.productId, 120) || null, active: Boolean(v.active) });
  }
  return save((c) => ({ ...c, videos }), "los videos");
}

export async function saveFaqs(_: ContentState, fd: FormData): Promise<ContentState> {
  const raw = list<FaqItem>(fd, "faqs");
  if (!raw) return { error: "No se pudieron leer las preguntas. Recarga la página." };
  const faqs = raw.slice(0, 40).map((f, i) => ({ id: id(f.id, "faq", i), q: clean(f.q, 160), a: longClean(f.a, 1200) })).filter((f) => f.q || f.a);
  const bad = faqs.find((f) => !f.q || !f.a);
  if (bad) return { error: `A la pregunta "${bad.q || bad.a.slice(0, 40)}" le falta ${bad.q ? "la respuesta" : "la pregunta"}.` };
  return save((c) => ({ ...c, faqs }), "las preguntas frecuentes");
}

export async function saveReviews(_: ContentState, fd: FormData): Promise<ContentState> {
  const ratingRaw = clean(fd.get("rating"), 4).replace(",", ".");
  const rating = ratingRaw ? Number(ratingRaw) : null;
  if (rating != null && (!Number.isFinite(rating) || rating < 1 || rating > 5)) return { error: "La calificación debe estar entre 1 y 5, por ejemplo 4,8." };
  const countRaw = clean(fd.get("count"), 7).replace(/\D/g, "");
  const url = clean(fd.get("url"), 400);
  if (url && !/^https:\/\/\S+\.\S+/.test(url)) return { error: "El enlace a las reseñas debe empezar por https://." };
  const raw = list<Review>(fd, "items");
  if (!raw) return { error: "No se pudieron leer las reseñas. Recarga la página." };
  const items = raw
    .slice(0, 12)
    .map((r, i) => ({ id: id(r.id, "resena", i), author: clean(r.author, 60), text: longClean(r.text, 500), rating: Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5))) }))
    .filter((r) => r.author || r.text);
  const bad = items.find((r) => !r.author || !r.text);
  if (bad) return { error: "Cada reseña necesita el nombre de quien la escribió y el texto." };
  return save((c) => ({ ...c, reviews: { rating: rating == null ? null : Math.round(rating * 10) / 10, count: countRaw ? Number(countRaw) : null, url: url || null, items } }), "las reseñas");
}

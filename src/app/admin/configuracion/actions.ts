"use server";

import { revalidateTag } from "next/cache";
import type { SocialLink, StoreSettings } from "@/config/store";
import { SETTINGS_TAG } from "@/data/store";
import type { ProductImage } from "@/data/types";
import { requireAdmin } from "@/lib/admin-auth";
import { catalogStore, ReadOnlyCatalogError } from "@/lib/catalog-store";
import { contrast, MIN_ACCENT_CONTRAST, normalizeHex, readableAccent, STORE_BG } from "@/lib/color";
import { deleteMedia } from "@/lib/media";
import { settingsStore } from "@/lib/settings-store";
import { normalizeWhatsApp } from "@/lib/whatsapp";

export type SettingsState = { error?: string; ok?: string; field?: string } | undefined;

const text = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const longText = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);
const orNull = (v: string) => v || null;
/** Una línea por punto; vacío = pendiente. */
const lines = (fd: FormData, key: string) => {
  const list = longText(fd, key, 4000).split("\n").map((l) => l.replace(/^[-*•]\s*/, "").trim()).filter(Boolean).slice(0, 20);
  return list.length ? list : null;
};

function parseImage(raw: FormDataEntryValue | null): ProductImage | null {
  try {
    const v = JSON.parse(String(raw ?? "null")) as ProductImage | null;
    if (!v || typeof v.src !== "string" || !/^(\/|https:\/\/)/.test(v.src)) return null;
    return { src: v.src, alt: String(v.alt ?? "").slice(0, 120), width: Number(v.width) || 0, height: Number(v.height) || 0 };
  } catch {
    return null;
  }
}

async function save(patch: (current: StoreSettings) => StoreSettings | SettingsState, what: string): Promise<SettingsState> {
  await requireAdmin();
  const store = settingsStore();
  try {
    const current = await store.get();
    const next = patch(current);
    if (!next || !("name" in next)) return next as SettingsState;
    await store.save(next);
    await releaseReplaced(current, next);
  } catch (e) {
    if (e instanceof ReadOnlyCatalogError) return { error: "Falta conectar la base de datos: los cambios no se pueden guardar todavía." };
    console.error(`[panel] guardar ${what}`, e);
    return { error: `No se pudo guardar ${what}. Intenta de nuevo en un momento.` };
  }
  // Expiración inmediata: el dueño recarga la tienda y ve su cambio.
  revalidateTag(SETTINGS_TAG, { expire: 0 });
  return { ok: "Guardado. Ya se ve en la tienda." };
}

const imagesOf = (s: StoreSettings) => [s.brand.logoOnDark, s.brand.logoOnLight, s.brand.favicon, s.seo.image].flatMap((i) => (i ? [i.src] : []));

/** Borra del almacenamiento los logos e imágenes reemplazados, salvo que el catálogo los use. */
async function releaseReplaced(before: StoreSettings, after: StoreSettings) {
  const kept = new Set(imagesOf(after));
  const gone = imagesOf(before).filter((s) => !kept.has(s));
  if (!gone.length) return;
  const { products, categories, brands } = await catalogStore().snapshot();
  const inUse = new Set([
    ...products.flatMap((p) => p.images.map((i) => i.src)),
    ...categories.flatMap((c) => (c.image ? [c.image.src] : [])),
    ...brands.flatMap((b) => (b.logo ? [b.logo.src] : [])),
  ]);
  await deleteMedia(gone.filter((s) => !inUse.has(s))).catch((e) => console.error("[panel] liberar imágenes", e));
}

export async function saveStoreData(_: SettingsState, fd: FormData): Promise<SettingsState> {
  const name = text(fd, "name", 60);
  if (!name) return { error: "Escribe el nombre de la tienda.", field: "name" };
  const whatsapp = normalizeWhatsApp(text(fd, "whatsappNumber", 30));
  if (whatsapp === null) return { error: "El WhatsApp debe ser un celular (300 123 4567) o un número con indicativo de país (57…).", field: "whatsappNumber" };
  const email = text(fd, "email", 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "El correo no parece válido.", field: "email" };
  const prefix = text(fd, "orderIdPrefix", 4).toUpperCase();
  if (!/^[A-Z]{2,4}$/.test(prefix)) return { error: "El prefijo de pedidos debe tener de 2 a 4 letras, por ejemplo VD.", field: "orderIdPrefix" };
  let social: SocialLink[];
  try {
    social = (JSON.parse(String(fd.get("social") ?? "[]")) as SocialLink[])
      .map((s) => ({ label: String(s.label ?? "").trim().slice(0, 60), url: String(s.url ?? "").trim().slice(0, 300) }))
      .filter((s) => s.label || s.url)
      .slice(0, 8);
  } catch {
    social = [];
  }
  const badSocial = social.find((s) => !s.label || !/^https?:\/\/\S+\.\S+/.test(s.url));
  if (badSocial) return { error: `Revisa la red "${badSocial.label || badSocial.url}": necesita un nombre y un enlace que empiece por https://.`, field: "social" };

  return save(
    (s) => ({
      ...s,
      name,
      tagline: text(fd, "tagline", 120),
      description: text(fd, "description", 300),
      whatsappNumber: whatsapp,
      orderIdPrefix: prefix,
      phone: orNull(text(fd, "phone", 30)),
      email: orNull(email),
      address: orNull(text(fd, "address", 160)),
      hours: orNull(text(fd, "hours", 200)),
      legalName: orNull(text(fd, "legalName", 120)),
      taxId: orNull(text(fd, "taxId", 30)),
      topbar: [0, 1, 2].map((i) => orNull(text(fd, `topbar${i}`, 90))),
      social,
    }),
    "los datos de la tienda",
  );
}

export async function saveBrandSettings(_: SettingsState, fd: FormData): Promise<SettingsState> {
  const rawAccent = text(fd, "accent", 20);
  const accent = rawAccent ? normalizeHex(rawAccent) : null;
  if (rawAccent && !accent) return { error: "El color debe escribirse como #RRGGBB, por ejemplo #B8FF32.", field: "accent" };
  if (accent && contrast(accent, STORE_BG) < MIN_ACCENT_CONTRAST) {
    return { error: `Ese color no se lee sobre el fondo oscuro de la tienda. Prueba con ${readableAccent(accent)?.toUpperCase()}, el mismo tono más claro.`, field: "accent" };
  }
  return save(
    (s) => ({
      ...s,
      brand: { logoOnDark: parseImage(fd.get("logoOnDark")), logoOnLight: parseImage(fd.get("logoOnLight")), favicon: parseImage(fd.get("favicon")), accent },
    }),
    "la marca",
  );
}

export async function savePolicies(_: SettingsState, fd: FormData): Promise<SettingsState> {
  return save(
    (s) => ({
      ...s,
      shipping: { summary: orNull(text(fd, "shippingSummary", 300)), details: lines(fd, "shippingDetails") },
      warranty: { summary: orNull(text(fd, "warrantySummary", 300)), details: lines(fd, "warrantyDetails") },
      returnsPolicy: orNull(text(fd, "returnsPolicy", 400)),
      paymentMethods: orNull(text(fd, "paymentMethods", 200)),
      privacyText: orNull(longText(fd, "privacyText", 20000)),
      termsText: orNull(longText(fd, "termsText", 20000)),
    }),
    "las políticas",
  );
}

export async function saveSeo(_: SettingsState, fd: FormData): Promise<SettingsState> {
  return save(
    (s) => ({
      ...s,
      seo: { title: orNull(text(fd, "seoTitle", 70)), description: orNull(text(fd, "seoDescription", 160)), image: parseImage(fd.get("seoImage")) },
    }),
    "el SEO",
  );
}

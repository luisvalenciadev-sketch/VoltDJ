import "server-only";
import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import sharp from "sharp";
import type { ProductImage } from "@/data/types";

/**
 * Fotos subidas desde el panel. Producción: Vercel Blob (BLOB_READ_WRITE_TOKEN, lo crea la integración).
 * Desarrollo y pruebas sin Blob: memoria del proceso, servida por /media/[archivo]. Nunca en Vercel.
 */
export type UploadMode = "blob" | "local" | "off";

export function uploadMode(): UploadMode {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  if (process.env.VERCEL !== "1") return "local";
  return "off";
}

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
/** Lado mayor de las fotos guardadas: suficiente para el visor con zoom, liviano para el celular. */
export const MAX_IMAGE_SIDE = 1600;

type LocalFile = { bytes: Uint8Array; type: string };
const localFiles = () => {
  const g = globalThis as unknown as { __voltMedia?: Map<string, LocalFile> };
  return (g.__voltMedia ??= new Map());
};

export function saveLocalMedia(bytes: Uint8Array, type: string): string {
  const ext = type === "image/png" ? "png" : type === "image/jpeg" ? "jpg" : "webp";
  const name = `${randomUUID()}.${ext}`;
  localFiles().set(name, { bytes, type });
  return `/media/${name}`;
}

export function getLocalMedia(name: string): LocalFile | null {
  return localFiles().get(name) ?? null;
}

const isBlobUrl = (src: string) => /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(src);

/** Borra las fotos que ya no usa ningún producto. Las de /img (las del repositorio) nunca se tocan. */
export async function deleteMedia(srcs: string[]): Promise<void> {
  const blobs = srcs.filter(isBlobUrl);
  for (const src of srcs) if (src.startsWith("/media/")) localFiles().delete(src.slice("/media/".length));
  if (blobs.length && process.env.BLOB_READ_WRITE_TOKEN) {
    // Si el borrado falla, la foto queda huérfana en Blob: ocupa espacio, pero no rompe la tienda.
    await del(blobs).catch(() => undefined);
  }
}

/** Optimiza y guarda una imagen: máximo 1600 px de lado, WebP. Devuelve lo que necesita next/image. */
export async function storeImage(input: Uint8Array, baseName: string): Promise<Omit<ProductImage, "alt">> {
  const { data, info } = await sharp(input).rotate().resize({ width: MAX_IMAGE_SIDE, height: MAX_IMAGE_SIDE, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const bytes = new Uint8Array(data);
  const mode = uploadMode();
  if (mode === "off") throw new Error("Falta conectar el almacenamiento de fotos (Vercel Blob).");
  const src = mode === "blob" ? (await put(`productos/${baseName || "foto"}.webp`, Buffer.from(bytes), { access: "public", addRandomSuffix: true, contentType: "image/webp" })).url : saveLocalMedia(bytes, "image/webp");
  return { src, width: info.width, height: info.height, fit: "contain" };
}

/**
 * Descarga una foto de otra tienda (importación de WooCommerce) y la guarda en la nuestra.
 * Con límite de tiempo y de tamaño: una URL lenta o enorme no debe colgar la importación.
 */
export async function importRemoteImage(url: string, baseName: string): Promise<Omit<ProductImage, "alt">> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error("La dirección de la foto no es válida.");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("La dirección de la foto no es válida.");
  const res = await fetch(u, { signal: AbortSignal.timeout(20_000), redirect: "follow" }).catch(() => null);
  if (!res || !res.ok) throw new Error(`No se pudo descargar (${res ? res.status : "sin respuesta"}).`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) throw new Error("La dirección no es una imagen.");
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > 15 * 1024 * 1024) throw new Error("La foto pesa más de 15 MB.");
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > 15 * 1024 * 1024) throw new Error("La foto pesa más de 15 MB.");
  return storeImage(bytes, baseName);
}

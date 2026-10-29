import generated from "./images.generated.json";
import type { ProductImage } from "./types";

/**
 * Fotos de referencia descargadas de Pexels con scripts/fetch-images.mjs.
 * No muestran el producto exacto: se reemplazan por fotos del catálogo real.
 */
type Entry = { src: string; width: number; height: number; credit: ProductImage["credit"] };
const IMAGES = generated as Record<string, Entry>;

export function stockImage(key: string, alt: string): ProductImage | undefined {
  const img = IMAGES[key];
  if (!img) return undefined;
  return { src: img.src, width: img.width, height: img.height, alt, fit: "cover", credit: img.credit };
}

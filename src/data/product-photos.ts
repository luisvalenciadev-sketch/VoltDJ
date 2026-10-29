import generated from "./product-photos.generated.json";
import type { ProductImage } from "./types";

/**
 * Fotos de producto en public/img/productos, registradas por
 * scripts/optimize-photos.mjs (el nombre del archivo es el id del producto).
 * Para cambiar una foto: reemplazar el archivo y volver a ejecutar el script.
 */
type Entry = { src: string; width: number; height: number };
const PHOTOS = generated as Record<string, Entry>;

export function productPhoto(id: string, alt: string): ProductImage | undefined {
  const p = PHOTOS[id];
  return p ? { ...p, alt, fit: "contain" } : undefined;
}

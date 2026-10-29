import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { defaultContent, mergeContent, type HomeContent } from "@/config/content";
import { cacheScope } from "@/lib/cache-scope";
import { contentStore } from "@/lib/settings-store";

/**
 * Contenido del inicio (héroe, banners, secciones, videos, reseñas) y preguntas frecuentes. Caché con la
 * etiqueta CONTENT_TAG, que el panel invalida al guardar. Como con los datos de la tienda: versión en la
 * clave (la caché de Vercel sobrevive a los despliegues) y lo que falte se completa con lo inicial.
 */
export const CONTENT_TAG = "content";

const read = unstable_cache(() => contentStore().get(), ["home-content-v1", cacheScope()], { tags: [CONTENT_TAG] });

export const getContent = cache(async (): Promise<HomeContent> => mergeContent(defaultContent(), await read()));

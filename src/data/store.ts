import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { StoreSettings } from "@/config/store";
import { cacheScope } from "@/lib/cache-scope";
import { settingsStore } from "@/lib/settings-store";
import type { StoreInfo } from "@/store/store-info";

/**
 * Datos de la tienda para las páginas. Igual que el catálogo: caché con la etiqueta SETTINGS_TAG, que el
 * panel invalida al guardar. `cache` evita leer la caché varias veces en la misma petición (cabecera, pie y página).
 */
export const SETTINGS_TAG = "settings";

const read = unstable_cache(() => settingsStore().get(), ["store-settings-v1", cacheScope()], { tags: [SETTINGS_TAG] });

export const getStore = cache((): Promise<StoreSettings> => read());

export const toStoreInfo = (s: StoreSettings): StoreInfo => ({ name: s.name, whatsappNumber: s.whatsappNumber, orderIdPrefix: s.orderIdPrefix });

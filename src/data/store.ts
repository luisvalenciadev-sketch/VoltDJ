import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { defaultStore, mergeStore, type StoreSettings } from "@/config/store";
import { cacheScope } from "@/lib/cache-scope";
import { settingsStore } from "@/lib/settings-store";
import type { StoreInfo } from "@/store/store-info";

/**
 * Datos de la tienda para las páginas. Igual que el catálogo: caché con la etiqueta SETTINGS_TAG, que el
 * panel invalida al guardar. `cache` evita leer la caché varias veces en la misma petición (cabecera, pie y página).
 */
export const SETTINGS_TAG = "settings";

// La caché de Vercel sobrevive a los despliegues: versión en la clave y, por si llega una entrada vieja,
// se completa con los valores iniciales (un campo nuevo nunca llega vacío a la página).
const read = unstable_cache(() => settingsStore().get(), ["store-settings-v3", cacheScope()], { tags: [SETTINGS_TAG] });

export const getStore = cache(async (): Promise<StoreSettings> => mergeStore(defaultStore(), await read()));

export const toStoreInfo = (s: StoreSettings): StoreInfo => ({
  name: s.name,
  whatsappNumber: s.whatsappNumber,
  orderIdPrefix: s.orderIdPrefix,
  // Solo lo activo viaja al navegador: las instrucciones (cuentas, números) se ven en Envíos y pagos.
  payments: s.payments.filter((p) => p.enabled).map((p) => ({ ...p, instructions: null })),
  shippingZones: s.shippingZones,
  sameDay: s.sameDay,
});

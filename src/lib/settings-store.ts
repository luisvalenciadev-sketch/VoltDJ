import "server-only";
import { defaultStore, mergeStore, type StoreSettings } from "@/config/store";
import { ReadOnlyCatalogError } from "./catalog-store";
import { db, migrate, type Sql } from "./db";

/**
 * Almacén de los datos de la tienda (una fila "store" en la tabla settings). Sigue los mismos modos que
 * el catálogo: Neon en producción, memoria con CATALOG_STORE=memory en pruebas, y solo lectura con los
 * valores iniciales cuando no hay base.
 */
export interface SettingsStore {
  readonly writable: boolean;
  /** Datos completos: lo guardado sobre los valores iniciales. */
  get(): Promise<StoreSettings>;
  save(value: StoreSettings): Promise<void>;
}

const KEY = "store";

function neonStore(sql: Sql): SettingsStore {
  return {
    writable: true,
    async get() {
      await migrate(sql);
      const rows = (await sql`select value from settings where key = ${KEY}`) as { value: Partial<StoreSettings> }[];
      return mergeStore(defaultStore(), rows[0]?.value);
    },
    async save(value) {
      await migrate(sql);
      await sql`
        insert into settings (key, value, updated_at) values (${KEY}, ${JSON.stringify(value)}::jsonb, now())
        on conflict (key) do update set value = excluded.value, updated_at = now()`;
    },
  };
}

function memoryStore(holder: { value?: StoreSettings }, writable: boolean): SettingsStore {
  return {
    writable,
    async get() {
      return structuredClone(holder.value ?? defaultStore());
    },
    async save(value) {
      if (!writable) throw new ReadOnlyCatalogError();
      holder.value = structuredClone(value);
    },
  };
}

let store: SettingsStore | undefined;
export function settingsStore(): SettingsStore {
  if (store) return store;
  const sql = db();
  if (sql) return (store = neonStore(sql));
  if (process.env.CATALOG_STORE === "memory" && process.env.VERCEL !== "1") {
    const g = globalThis as unknown as { __voltSettings?: { value?: StoreSettings } };
    return (store = memoryStore((g.__voltSettings ??= {}), true));
  }
  return (store = memoryStore({}, false));
}

import "server-only";
import { defaultContent, mergeContent, type HomeContent } from "@/config/content";
import { defaultStore, mergeStore, type StoreSettings } from "@/config/store";
import { ReadOnlyCatalogError } from "./catalog-store";
import { db, migrate, type Sql } from "./db";

/**
 * Documentos de configuración (una fila por documento en la tabla settings): "store" (datos de la tienda)
 * y "content" (contenido del inicio). Siguen los mismos modos que el catálogo: Neon en producción, memoria
 * con CATALOG_STORE=memory en pruebas, y solo lectura con los valores iniciales cuando no hay base.
 */
export interface DocStore<T> {
  readonly writable: boolean;
  /** Documento completo: lo guardado sobre los valores iniciales. */
  get(): Promise<T>;
  save(value: T): Promise<void>;
}

function neonStore<T>(sql: Sql, key: string, initial: () => T, merge: (base: T, saved: Partial<T> | undefined) => T): DocStore<T> {
  return {
    writable: true,
    async get() {
      await migrate(sql);
      const rows = (await sql`select value from settings where key = ${key}`) as { value: Partial<T> }[];
      return merge(initial(), rows[0]?.value);
    },
    async save(value) {
      await migrate(sql);
      await sql`
        insert into settings (key, value, updated_at) values (${key}, ${JSON.stringify(value)}::jsonb, now())
        on conflict (key) do update set value = excluded.value, updated_at = now()`;
    },
  };
}

function memoryStore<T>(holder: { value?: T }, initial: () => T, writable: boolean): DocStore<T> {
  return {
    writable,
    async get() {
      return structuredClone(holder.value ?? initial());
    },
    async save(value) {
      if (!writable) throw new ReadOnlyCatalogError();
      holder.value = structuredClone(value);
    },
  };
}

const stores = new Map<string, DocStore<unknown>>();
function docStore<T>(key: string, initial: () => T, merge: (base: T, saved: Partial<T> | undefined) => T): DocStore<T> {
  const cached = stores.get(key) as DocStore<T> | undefined;
  if (cached) return cached;
  const sql = db();
  let store: DocStore<T>;
  if (sql) store = neonStore(sql, key, initial, merge);
  else if (process.env.CATALOG_STORE === "memory" && process.env.VERCEL !== "1") {
    // En globalThis para sobrevivir recargas en desarrollo.
    const g = globalThis as unknown as { __voltDocs?: Record<string, { value?: unknown }> };
    const docs = (g.__voltDocs ??= {});
    store = memoryStore((docs[key] ??= {}) as { value?: T }, initial, true);
  } else store = memoryStore({}, initial, false);
  stores.set(key, store as DocStore<unknown>);
  return store;
}

export const settingsStore = () => docStore<StoreSettings>("store", defaultStore, mergeStore);
export const contentStore = () => docStore<HomeContent>("content", defaultContent, mergeContent);

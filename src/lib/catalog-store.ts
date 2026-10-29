import "server-only";
import { BRANDS } from "@/data/brands";
import { CATEGORIES } from "@/data/categories";
import { SEED_PRODUCTS } from "@/data/products";
import type { Brand, Category, ProductImage, ProductRecord, Spec, StockMovement, StockReason } from "@/data/types";
import { db, migrate, type Sql } from "./db";

/**
 * Almacén del catálogo. Producción: Neon (DATABASE_URL). Pruebas: CATALOG_STORE=memory, en memoria del
 * proceso. Sin base configurada: solo lectura desde el catálogo inicial del código, para que la tienda
 * nunca quede vacía; el panel lo explica en lugar de fallar.
 */
export interface CatalogSnapshot {
  products: ProductRecord[];
  categories: Category[];
  brands: Brand[];
}

export type StockChange = { mode: "add"; delta: number } | { mode: "set"; value: number | null };
export interface StockMeta {
  reason: StockReason;
  ref?: string | null;
  note?: string | null;
}

export interface CatalogStore {
  readonly writable: boolean;
  snapshot(): Promise<CatalogSnapshot>;
  getProduct(id: string): Promise<ProductRecord | null>;
  createProduct(p: ProductRecord): Promise<void>;
  /** Reemplaza todo menos el stock, que solo cambia con `changeStock` para dejar historial. */
  updateProduct(p: ProductRecord): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  changeStock(id: string, change: StockChange, meta: StockMeta): Promise<number | null>;
  movements(productId?: string, limit?: number): Promise<StockMovement[]>;
  saveCategory(c: Category): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  saveBrand(b: Brand): Promise<void>;
  deleteBrand(id: string): Promise<void>;
}

export class ReadOnlyCatalogError extends Error {
  constructor() {
    super("La base de datos no está configurada: el catálogo es de solo lectura.");
  }
}

const seedCategories = (): Category[] => CATEGORIES.map((c) => ({ ...c, visible: true }));
const seedBrands = (): Brand[] => BRANDS.map((b, i) => ({ ...b, order: i + 1, visible: true }));

// ---------- Neon ----------

type ProductRow = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  brand_id: string;
  category_id: string;
  description: string;
  price: string | number | null;
  sale_price: string | number | null;
  key_figure: string | null;
  specs: Spec[] | null;
  images: ProductImage[] | null;
  art: ProductRecord["art"];
  stock: number | null;
  low_stock_at: number;
  allow_backorder: boolean;
  max_per_order: number;
  featured: boolean;
  status: ProductRecord["status"];
  created_at: string | Date;
  updated_at: string | Date;
};
type CategoryRow = { id: string; slug: string; name: string; description: string; art: Category["art"]; image: ProductImage | null; sort: number; visible: boolean };
type BrandRow = { id: string; name: string; logo: Brand["logo"] | null; authorized: boolean; sort: number; visible: boolean };
type MovementRow = { id: string | number; product_id: string; delta: number; stock_after: number | null; reason: StockReason; ref: string | null; note: string | null; created_at: string | Date };

const iso = (d: string | Date) => new Date(d).toISOString();
// bigint llega como texto desde Postgres
const money = (v: string | number | null) => (v == null ? null : Number(v));

const toProduct = (r: ProductRow): ProductRecord => ({
  id: r.id,
  slug: r.slug,
  sku: r.sku,
  name: r.name,
  brandId: r.brand_id,
  categoryId: r.category_id,
  description: r.description,
  price: money(r.price),
  salePrice: money(r.sale_price),
  keyFigure: r.key_figure,
  specs: r.specs ?? [],
  images: r.images ?? [],
  art: r.art,
  stock: r.stock,
  lowStockAt: r.low_stock_at,
  allowBackorder: r.allow_backorder,
  maxPerOrder: r.max_per_order,
  featured: r.featured,
  status: r.status,
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
});
const toCategory = (r: CategoryRow): Category => ({ id: r.id, slug: r.slug, name: r.name, description: r.description, art: r.art, image: r.image ?? undefined, order: r.sort, visible: r.visible });
const toBrand = (r: BrandRow): Brand => ({ id: r.id, name: r.name, logo: r.logo ?? undefined, authorized: r.authorized, isDemo: false, order: r.sort, visible: r.visible });
const toMovement = (r: MovementRow): StockMovement => ({ id: String(r.id), productId: r.product_id, delta: r.delta, stockAfter: r.stock_after, reason: r.reason, ref: r.ref, note: r.note, createdAt: iso(r.created_at) });

function neonStore(sql: Sql): CatalogStore {
  const ready = () => migrate(sql);
  return {
    writable: true,
    async snapshot() {
      await ready();
      const [p, c, b] = await Promise.all([
        sql`select * from products order by updated_at desc`,
        sql`select * from categories order by sort, name`,
        sql`select * from brands order by sort, name`,
      ]);
      return { products: (p as ProductRow[]).map(toProduct), categories: (c as CategoryRow[]).map(toCategory), brands: (b as BrandRow[]).map(toBrand) };
    },
    async getProduct(id) {
      await ready();
      const rows = (await sql`select * from products where id = ${id}`) as ProductRow[];
      return rows[0] ? toProduct(rows[0]) : null;
    },
    async createProduct(p) {
      await ready();
      await sql`
        insert into products (id, slug, sku, name, brand_id, category_id, description, price, sale_price, key_figure, specs, images, art,
          stock, low_stock_at, allow_backorder, max_per_order, featured, status)
        values (${p.id}, ${p.slug}, ${p.sku}, ${p.name}, ${p.brandId}, ${p.categoryId}, ${p.description}, ${p.price}, ${p.salePrice}, ${p.keyFigure},
          ${JSON.stringify(p.specs)}::jsonb, ${JSON.stringify(p.images)}::jsonb, ${p.art}, ${p.stock}, ${p.lowStockAt}, ${p.allowBackorder},
          ${p.maxPerOrder}, ${p.featured}, ${p.status})`;
      if (p.stock != null && p.stock !== 0) {
        await sql`insert into stock_movements (product_id, delta, stock_after, reason) values (${p.id}, ${p.stock}, ${p.stock}, 'inicial')`;
      }
    },
    async updateProduct(p) {
      await ready();
      await sql`
        update products set
          slug = ${p.slug}, sku = ${p.sku}, name = ${p.name}, brand_id = ${p.brandId}, category_id = ${p.categoryId},
          description = ${p.description}, price = ${p.price}, sale_price = ${p.salePrice}, key_figure = ${p.keyFigure},
          specs = ${JSON.stringify(p.specs)}::jsonb, images = ${JSON.stringify(p.images)}::jsonb, art = ${p.art},
          low_stock_at = ${p.lowStockAt}, allow_backorder = ${p.allowBackorder}, max_per_order = ${p.maxPerOrder},
          featured = ${p.featured}, status = ${p.status}, updated_at = now()
        where id = ${p.id}`;
    },
    async deleteProduct(id) {
      await ready();
      await sql`delete from products where id = ${id}`;
    },
    async changeStock(id, change, meta) {
      await ready();
      const ref = meta.ref ?? null;
      const note = meta.note ?? null;
      // Una sola sentencia: el cambio y su movimiento quedan juntos aunque dos personas ajusten a la vez.
      const rows = (
        change.mode === "add"
          ? await sql`
              with u as (
                update products set stock = greatest(coalesce(stock, 0) + ${change.delta}, 0), updated_at = now()
                where id = ${id} returning stock
              )
              insert into stock_movements (product_id, delta, stock_after, reason, ref, note)
              select ${id}, ${change.delta}, u.stock, ${meta.reason}, ${ref}, ${note} from u
              returning stock_after`
          : await sql`
              with old as (select stock as s from products where id = ${id}),
              u as (update products set stock = ${change.value}, updated_at = now() where id = ${id} returning stock)
              insert into stock_movements (product_id, delta, stock_after, reason, ref, note)
              select ${id}, coalesce(u.stock, 0) - coalesce(old.s, 0), u.stock, ${meta.reason}, ${ref}, ${note} from u, old
              returning stock_after`
      ) as { stock_after: number | null }[];
      return rows[0]?.stock_after ?? null;
    },
    async movements(productId, limit = 100) {
      await ready();
      const rows = productId
        ? await sql`select * from stock_movements where product_id = ${productId} order by created_at desc, id desc limit ${limit}`
        : await sql`select * from stock_movements order by created_at desc, id desc limit ${limit}`;
      return (rows as MovementRow[]).map(toMovement);
    },
    async saveCategory(c) {
      await ready();
      await sql`
        insert into categories (id, slug, name, description, art, image, sort, visible)
        values (${c.id}, ${c.slug}, ${c.name}, ${c.description}, ${c.art}, ${c.image ? JSON.stringify(c.image) : null}::jsonb, ${c.order}, ${c.visible ?? true})
        on conflict (id) do update set
          slug = excluded.slug, name = excluded.name, description = excluded.description, art = excluded.art,
          image = excluded.image, sort = excluded.sort, visible = excluded.visible, updated_at = now()`;
    },
    async deleteCategory(id) {
      await ready();
      await sql`delete from categories where id = ${id}`;
    },
    async saveBrand(b) {
      await ready();
      await sql`
        insert into brands (id, name, logo, authorized, sort, visible)
        values (${b.id}, ${b.name}, ${b.logo ? JSON.stringify(b.logo) : null}::jsonb, ${b.authorized}, ${b.order ?? 0}, ${b.visible ?? true})
        on conflict (id) do update set
          name = excluded.name, logo = excluded.logo, authorized = excluded.authorized, sort = excluded.sort,
          visible = excluded.visible, updated_at = now()`;
    },
    async deleteBrand(id) {
      await ready();
      await sql`delete from brands where id = ${id}`;
    },
  };
}

// ---------- Memoria (pruebas) y solo lectura ----------

interface MemoryState {
  products: Map<string, ProductRecord>;
  categories: Map<string, Category>;
  brands: Map<string, Brand>;
  movements: StockMovement[];
  seq: number;
}

function seedState(): MemoryState {
  return {
    products: new Map(SEED_PRODUCTS.map((p) => [p.id, structuredClone(p)])),
    categories: new Map(seedCategories().map((c) => [c.id, structuredClone(c)])),
    brands: new Map(seedBrands().map((b) => [b.id, structuredClone(b)])),
    movements: [],
    seq: 0,
  };
}

function memoryStore(state: MemoryState, writable: boolean): CatalogStore {
  const now = () => new Date().toISOString();
  const guard = () => {
    if (!writable) throw new ReadOnlyCatalogError();
  };
  const byOrder = <T extends { order?: number; name: string }>(a: T, b: T) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name);
  const record = (productId: string, delta: number, stockAfter: number | null, meta: StockMeta) => {
    state.movements.unshift({ id: String(++state.seq), productId, delta, stockAfter, reason: meta.reason, ref: meta.ref ?? null, note: meta.note ?? null, createdAt: now() });
  };
  return {
    writable,
    async snapshot() {
      return {
        products: [...state.products.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((p) => structuredClone(p)),
        categories: [...state.categories.values()].sort(byOrder).map((c) => structuredClone(c)),
        brands: [...state.brands.values()].sort(byOrder).map((b) => structuredClone(b)),
      };
    },
    async getProduct(id) {
      const p = state.products.get(id);
      return p ? structuredClone(p) : null;
    },
    async createProduct(p) {
      guard();
      if (state.products.has(p.id) || [...state.products.values()].some((x) => x.slug === p.slug)) throw new Error("duplicate key value violates unique constraint");
      state.products.set(p.id, { ...structuredClone(p), createdAt: now(), updatedAt: now() });
      if (p.stock != null && p.stock !== 0) record(p.id, p.stock, p.stock, { reason: "inicial" });
    },
    async updateProduct(p) {
      guard();
      const cur = state.products.get(p.id);
      if (!cur) return;
      if ([...state.products.values()].some((x) => x.slug === p.slug && x.id !== p.id)) throw new Error("duplicate key value violates unique constraint");
      state.products.set(p.id, { ...structuredClone(p), stock: cur.stock, createdAt: cur.createdAt, updatedAt: now() });
    },
    async deleteProduct(id) {
      guard();
      state.products.delete(id);
      state.movements = state.movements.filter((m) => m.productId !== id);
    },
    async changeStock(id, change, meta) {
      guard();
      const cur = state.products.get(id);
      if (!cur) return null;
      const next = change.mode === "add" ? Math.max((cur.stock ?? 0) + change.delta, 0) : change.value;
      const delta = change.mode === "add" ? change.delta : (next ?? 0) - (cur.stock ?? 0);
      state.products.set(id, { ...cur, stock: next, updatedAt: now() });
      record(id, delta, next, meta);
      return next;
    },
    async movements(productId, limit = 100) {
      return state.movements.filter((m) => !productId || m.productId === productId).slice(0, limit).map((m) => ({ ...m }));
    },
    async saveCategory(c) {
      guard();
      state.categories.set(c.id, structuredClone(c));
    },
    async deleteCategory(id) {
      guard();
      state.categories.delete(id);
    },
    async saveBrand(b) {
      guard();
      state.brands.set(b.id, structuredClone(b));
    },
    async deleteBrand(id) {
      guard();
      state.brands.delete(id);
    },
  };
}

let store: CatalogStore | undefined;
export function catalogStore(): CatalogStore {
  if (store) return store;
  const sql = db();
  if (sql) return (store = neonStore(sql));
  if (process.env.CATALOG_STORE === "memory" && process.env.VERCEL !== "1") {
    // En globalThis para sobrevivir recargas en desarrollo.
    const g = globalThis as unknown as { __voltCatalog?: MemoryState };
    return (store = memoryStore((g.__voltCatalog ??= seedState()), true));
  }
  return (store = memoryStore(seedState(), false));
}

/** Error de clave única de Postgres (o del almacén en memoria): slug repetido. */
export const isDuplicate = (e: unknown) => e instanceof Error && /duplicate key|unique constraint/i.test(e.message);

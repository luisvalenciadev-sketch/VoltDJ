import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { BRANDS } from "@/data/brands";
import { CATEGORIES } from "@/data/categories";
import { SEED_PRODUCTS } from "@/data/products";

/**
 * Conexión a Neon y migraciones del catálogo. Igual que las guías, el esquema se crea solo en la
 * primera petición después de conectar la base: no hay que correr nada a mano en cada tienda nueva.
 * Cada migración es idempotente (if not exists / on conflict do nothing): si dos instancias arrancan
 * a la vez y ambas la corren, el resultado es el mismo.
 */
export type Sql = NeonQueryFunction<false, false>;

let client: Sql | null | undefined;
export function db(): Sql | null {
  if (client !== undefined) return client;
  const url = process.env.DATABASE_URL;
  client = url ? neon(url) : null;
  return client;
}

interface Migration {
  id: string;
  run(sql: Sql): Promise<void>;
}

const MIGRATIONS: Migration[] = [
  {
    id: "001_catalogo",
    async run(sql) {
      await sql`
        create table if not exists categories (
          id text primary key,
          slug text not null unique,
          name text not null,
          description text not null default '',
          art text not null default 'controller',
          image jsonb,
          sort int not null default 0,
          visible boolean not null default true,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )`;
      await sql`
        create table if not exists brands (
          id text primary key,
          name text not null,
          logo jsonb,
          authorized boolean not null default false,
          sort int not null default 0,
          visible boolean not null default true,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )`;
      await sql`
        create table if not exists products (
          id text primary key,
          slug text not null unique,
          sku text not null default '',
          name text not null,
          brand_id text not null references brands(id),
          category_id text not null references categories(id),
          description text not null default '',
          price bigint,
          sale_price bigint,
          key_figure text,
          specs jsonb not null default '[]'::jsonb,
          images jsonb not null default '[]'::jsonb,
          art text not null default 'controller',
          stock int,
          low_stock_at int not null default 0,
          allow_backorder boolean not null default false,
          max_per_order int not null default 1,
          featured boolean not null default false,
          status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )`;
      await sql`create index if not exists products_sku_idx on products (lower(sku))`;
      await sql`
        create table if not exists stock_movements (
          id bigserial primary key,
          product_id text not null references products(id) on delete cascade,
          delta int not null,
          stock_after int,
          reason text not null,
          ref text,
          note text,
          created_at timestamptz not null default now()
        )`;
      await sql`create index if not exists stock_movements_product_idx on stock_movements (product_id, created_at desc)`;
    },
  },
  {
    // Copia el catálogo del código a la base una sola vez. Una tienda nueva arranca vacía con CATALOG_SEED=none.
    id: "002_semilla_catalogo",
    async run(sql) {
      if (process.env.CATALOG_SEED === "none") return;
      await sql.transaction([
        ...CATEGORIES.map(
          (c) => sql`
            insert into categories (id, slug, name, description, art, image, sort)
            values (${c.id}, ${c.slug}, ${c.name}, ${c.description}, ${c.art}, ${c.image ? JSON.stringify(c.image) : null}::jsonb, ${c.order})
            on conflict (id) do nothing`,
        ),
        ...BRANDS.map(
          (b, i) => sql`
            insert into brands (id, name, logo, authorized, sort)
            values (${b.id}, ${b.name}, ${b.logo ? JSON.stringify(b.logo) : null}::jsonb, ${b.authorized}, ${i + 1})
            on conflict (id) do nothing`,
        ),
        ...SEED_PRODUCTS.map(
          (p) => sql`
            insert into products (id, slug, sku, name, brand_id, category_id, description, price, sale_price, key_figure, specs, images, art,
              stock, low_stock_at, allow_backorder, max_per_order, featured, status, created_at, updated_at)
            values (${p.id}, ${p.slug}, ${p.sku}, ${p.name}, ${p.brandId}, ${p.categoryId}, ${p.description}, ${p.price}, ${p.salePrice}, ${p.keyFigure},
              ${JSON.stringify(p.specs)}::jsonb, ${JSON.stringify(p.images)}::jsonb, ${p.art}, ${p.stock}, ${p.lowStockAt}, ${p.allowBackorder},
              ${p.maxPerOrder}, ${p.featured}, ${p.status}, ${p.createdAt}, ${p.updatedAt})
            on conflict (id) do nothing`,
        ),
      ]);
    },
  },
  {
    // Datos de la tienda, marca, políticas y SEO. Sin fila, la tienda usa los valores iniciales del código.
    id: "003_ajustes",
    async run(sql) {
      await sql`
        create table if not exists settings (
          key text primary key,
          value jsonb not null,
          updated_at timestamptz not null default now()
        )`;
    },
  },
];

let ready: Promise<void> | null = null;
/** Aplica las migraciones pendientes una vez por proceso. Si Neon estaba despertando, reintenta en la siguiente petición. */
export function migrate(sql: Sql): Promise<void> {
  return (ready ??= (async () => {
    await sql`create table if not exists schema_migrations (id text primary key, applied_at timestamptz not null default now())`;
    const done = new Set(((await sql`select id from schema_migrations`) as { id: string }[]).map((r) => r.id));
    for (const m of MIGRATIONS) {
      if (done.has(m.id)) continue;
      await m.run(sql);
      await sql`insert into schema_migrations (id) values (${m.id}) on conflict (id) do nothing`;
    }
  })().catch((e) => {
    ready = null;
    throw e;
  }));
}

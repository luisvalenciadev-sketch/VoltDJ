import "server-only";
import { neon } from "@neondatabase/serverless";
import type { Guide } from "./tracking";

/**
 * Almacén de guías. Producción: Neon Postgres (DATABASE_URL, la crea la integración de Vercel).
 * Pruebas locales: GUIDES_STORE=memory guarda en memoria del proceso (nunca en producción).
 * Las páginas y acciones solo usan estas funciones; cambiar de base no toca la UI.
 */
export interface GuidesStore {
  list(): Promise<Guide[]>;
  get(code: string): Promise<Guide | null>;
  create(guide: Guide): Promise<void>;
  update(code: string, patch: Partial<Omit<Guide, "code" | "createdAt">>): Promise<void>;
  remove(code: string): Promise<void>;
}

type Row = {
  code: string;
  customer_name: string;
  phone: string | null;
  city: string | null;
  items: string;
  lines: Guide["lines"] | null;
  shipping: string | number | null;
  paid: string | number | null;
  carrier: string | null;
  tracking_number: string | null;
  mode: Guide["mode"];
  events: Guide["events"];
  public_note: string | null;
  stock_applied: Guide["stockApplied"] | null;
  email: string | null;
  notified: string[] | null;
  created_at: string | Date;
  updated_at: string | Date;
};

const toGuide = (r: Row): Guide => ({
  code: r.code,
  customerName: r.customer_name,
  phone: r.phone,
  city: r.city,
  items: r.items,
  lines: r.lines ?? [],
  // bigint llega como texto desde Postgres
  shipping: Number(r.shipping ?? 0),
  paid: Number(r.paid ?? 0),
  carrier: r.carrier,
  trackingNumber: r.tracking_number,
  mode: r.mode,
  events: r.events ?? [],
  publicNote: r.public_note,
  stockApplied: r.stock_applied ?? undefined,
  email: r.email ?? null,
  notified: r.notified ?? [],
  createdAt: new Date(r.created_at).toISOString(),
  updatedAt: new Date(r.updated_at).toISOString(),
});

function neonStore(url: string): GuidesStore {
  const sql = neon(url);
  // La tabla se crea sola la primera vez: no hay que correr migraciones a mano tras conectar Neon.
  let ready: Promise<unknown> | null = null;
  const schema = () =>
    (ready ??= (async () => {
      await sql`
      create table if not exists guides (
        code text primary key,
        customer_name text not null,
        phone text,
        city text,
        items text not null default '',
        carrier text,
        tracking_number text,
        mode text not null check (mode in ('auto', 'manual')),
        events jsonb not null default '[]'::jsonb,
        public_note text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )`;
      // Columnas agregadas después: se suman solas sin perder las guías existentes.
      await sql`
        alter table guides
          add column if not exists lines jsonb not null default '[]'::jsonb,
          add column if not exists shipping bigint not null default 0,
          add column if not exists paid bigint not null default 0,
          add column if not exists stock_applied jsonb,
          add column if not exists email text,
          add column if not exists notified jsonb not null default '[]'::jsonb`; // sin valor = guía anterior al inventario conectado
    })().catch((e) => {
      ready = null; // reintenta en la siguiente petición si Neon estaba despertando
      throw e;
    }));

  return {
    async list() {
      await schema();
      return ((await sql`select * from guides order by created_at desc limit 500`) as Row[]).map(toGuide);
    },
    async get(code) {
      await schema();
      const rows = (await sql`select * from guides where code = ${code}`) as Row[];
      return rows[0] ? toGuide(rows[0]) : null;
    },
    async create(g) {
      await schema();
      await sql`
        insert into guides (code, customer_name, phone, city, items, lines, shipping, paid, carrier, tracking_number, mode, events, public_note, stock_applied, email, notified)
        values (${g.code}, ${g.customerName}, ${g.phone}, ${g.city}, ${g.items}, ${JSON.stringify(g.lines)}::jsonb, ${g.shipping}, ${g.paid}, ${g.carrier}, ${g.trackingNumber}, ${g.mode}, ${JSON.stringify(g.events)}::jsonb, ${g.publicNote}, ${g.stockApplied ? JSON.stringify(g.stockApplied) : null}::jsonb, ${g.email ?? null}, ${JSON.stringify(g.notified ?? [])}::jsonb)`;
    },
    async update(code, p) {
      await schema();
      const cur = (await sql`select * from guides where code = ${code}`) as Row[];
      if (!cur[0]) return;
      const g = { ...toGuide(cur[0]), ...p };
      await sql`
        update guides set
          customer_name = ${g.customerName}, phone = ${g.phone}, city = ${g.city}, items = ${g.items},
          lines = ${JSON.stringify(g.lines)}::jsonb, shipping = ${g.shipping}, paid = ${g.paid},
          carrier = ${g.carrier}, tracking_number = ${g.trackingNumber}, mode = ${g.mode},
          events = ${JSON.stringify(g.events)}::jsonb, public_note = ${g.publicNote},
          stock_applied = ${g.stockApplied ? JSON.stringify(g.stockApplied) : null}::jsonb, email = ${g.email ?? null},
          notified = ${JSON.stringify(g.notified ?? [])}::jsonb, updated_at = now()
        where code = ${code}`;
    },
    async remove(code) {
      await schema();
      await sql`delete from guides where code = ${code}`;
    },
  };
}

function memoryStore(): GuidesStore {
  // En globalThis para sobrevivir recargas en desarrollo.
  const g = globalThis as unknown as { __voltGuides?: Map<string, Guide> };
  const map = (g.__voltGuides ??= new Map());
  return {
    async list() {
      return [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async get(code) {
      return map.get(code) ?? null;
    },
    async create(guide) {
      map.set(guide.code, guide);
    },
    async update(code, patch) {
      const cur = map.get(code);
      if (cur) map.set(code, { ...cur, ...patch, updatedAt: new Date().toISOString() });
    },
    async remove(code) {
      map.delete(code);
    },
  };
}

let store: GuidesStore | null | undefined;
/** null cuando no hay base configurada: la UI lo explica en lugar de fallar. */
export function guidesStore(): GuidesStore | null {
  if (store !== undefined) return store;
  const url = process.env.DATABASE_URL;
  if (url) store = neonStore(url);
  else if (process.env.GUIDES_STORE === "memory" && process.env.VERCEL !== "1") store = memoryStore();
  else store = null;
  return store;
}

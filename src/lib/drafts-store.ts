import "server-only";
import { neon } from "@neondatabase/serverless";
import type { OrderDraft } from "./order-drafts";

/**
 * Almacén de pedidos de la web (borradores). Igual que las guías: Neon en producción, memoria del
 * proceso con GUIDES_STORE=memory en pruebas locales, y null sin base (el carrito sigue funcionando).
 */
export interface DraftsStore {
  /** Los más recientes primero, de cualquier estado. */
  list(): Promise<OrderDraft[]>;
  get(code: string): Promise<OrderDraft | null>;
  create(draft: OrderDraft): Promise<void>;
  update(code: string, patch: Partial<Omit<OrderDraft, "code" | "createdAt">>): Promise<void>;
}

type Row = {
  code: string;
  customer_name: string;
  phone: string;
  email: string | null;
  city: string;
  address: string | null;
  zone: OrderDraft["zone"];
  lines: OrderDraft["lines"] | null;
  status: OrderDraft["status"];
  guide_code: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

const toDraft = (r: Row): OrderDraft => ({
  code: r.code,
  customerName: r.customer_name,
  phone: r.phone,
  email: r.email,
  city: r.city,
  address: r.address,
  zone: r.zone ?? null,
  lines: r.lines ?? [],
  status: r.status,
  guideCode: r.guide_code,
  createdAt: new Date(r.created_at).toISOString(),
  updatedAt: new Date(r.updated_at).toISOString(),
});

function neonStore(url: string): DraftsStore {
  const sql = neon(url);
  let ready: Promise<unknown> | null = null;
  const schema = () =>
    (ready ??= sql`
      create table if not exists order_drafts (
        code text primary key,
        customer_name text not null,
        phone text not null,
        email text,
        city text not null,
        address text,
        zone jsonb,
        lines jsonb not null default '[]'::jsonb,
        status text not null default 'pendiente' check (status in ('pendiente', 'convertido', 'descartado')),
        guide_code text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )`.catch((e) => {
      ready = null;
      throw e;
    }));

  return {
    async list() {
      await schema();
      return ((await sql`select * from order_drafts order by created_at desc limit 300`) as Row[]).map(toDraft);
    },
    async get(code) {
      await schema();
      const rows = (await sql`select * from order_drafts where code = ${code}`) as Row[];
      return rows[0] ? toDraft(rows[0]) : null;
    },
    async create(d) {
      await schema();
      await sql`
        insert into order_drafts (code, customer_name, phone, email, city, address, zone, lines, status, guide_code)
        values (${d.code}, ${d.customerName}, ${d.phone}, ${d.email}, ${d.city}, ${d.address}, ${d.zone ? JSON.stringify(d.zone) : null}::jsonb,
          ${JSON.stringify(d.lines)}::jsonb, ${d.status}, ${d.guideCode})`;
    },
    async update(code, p) {
      await schema();
      const cur = (await sql`select * from order_drafts where code = ${code}`) as Row[];
      if (!cur[0]) return;
      const d = { ...toDraft(cur[0]), ...p };
      await sql`
        update order_drafts set
          customer_name = ${d.customerName}, phone = ${d.phone}, email = ${d.email}, city = ${d.city}, address = ${d.address},
          zone = ${d.zone ? JSON.stringify(d.zone) : null}::jsonb, lines = ${JSON.stringify(d.lines)}::jsonb,
          status = ${d.status}, guide_code = ${d.guideCode}, updated_at = now()
        where code = ${code}`;
    },
  };
}

function memoryStore(): DraftsStore {
  const g = globalThis as unknown as { __voltDrafts?: Map<string, OrderDraft> };
  const map = (g.__voltDrafts ??= new Map());
  return {
    async list() {
      return [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async get(code) {
      return map.get(code) ?? null;
    },
    async create(d) {
      map.set(d.code, d);
    },
    async update(code, patch) {
      const cur = map.get(code);
      if (cur) map.set(code, { ...cur, ...patch, updatedAt: new Date().toISOString() });
    },
  };
}

let store: DraftsStore | null | undefined;
export function draftsStore(): DraftsStore | null {
  if (store !== undefined) return store;
  const url = process.env.DATABASE_URL;
  if (url) store = neonStore(url);
  else if (process.env.GUIDES_STORE === "memory" && process.env.VERCEL !== "1") store = memoryStore();
  else store = null;
  return store;
}

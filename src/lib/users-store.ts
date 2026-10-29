import "server-only";
import { ReadOnlyCatalogError } from "./catalog-store";
import { db, migrate, type Sql } from "./db";
import type { Role } from "./permissions";

/**
 * Usuarios del panel y su historial de cambios. Mismos modos que el catálogo: Neon en producción, memoria
 * con CATALOG_STORE=memory en pruebas; sin base no hay usuarios y el panel usa la contraseña única.
 */
export interface PanelUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
  active: boolean;
  sessionVersion: number;
  lastLoginAt: string | null;
  createdAt: string;
}

export type AuditEntity = "producto" | "stock" | "promocion" | "categoria" | "marca" | "configuracion" | "contenido" | "usuario" | "importacion";

export interface AuditEntry {
  id: string;
  at: string;
  userId: string | null;
  userName: string;
  entity: AuditEntity;
  entityId: string | null;
  /** "precio", "estado", "ajuste", "crear", "eliminar", "editar"… */
  action: string;
  /** Frase para leer: "Precio de Pioneer DJ DDJ-FLX4: $ 1.300.000 → $ 1.250.000". */
  summary: string;
  /** Valores para deshacer (solo precio y stock). */
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  undoneAt: string | null;
  undoneBy: string | null;
}

export type NewAuditEntry = Omit<AuditEntry, "id" | "at" | "undoneAt" | "undoneBy">;

export interface UsersStore {
  readonly writable: boolean;
  list(): Promise<PanelUser[]>;
  get(id: string): Promise<PanelUser | null>;
  byEmail(email: string): Promise<PanelUser | null>;
  /** ¿Hay al menos un dueño activo? Mientras no, se entra con la contraseña única. */
  hasActiveOwner(): Promise<boolean>;
  create(u: PanelUser): Promise<void>;
  update(id: string, patch: Partial<Omit<PanelUser, "id" | "createdAt">>): Promise<void>;
  audit(e: NewAuditEntry): Promise<void>;
  auditList(opts?: { limit?: number; entity?: AuditEntity }): Promise<AuditEntry[]>;
  auditGet(id: string): Promise<AuditEntry | null>;
  markUndone(id: string, by: string): Promise<boolean>;
}

type UserRow = { id: string; email: string; name: string; role: Role; password_hash: string; active: boolean; session_version: number; last_login_at: string | Date | null; created_at: string | Date };
type AuditRow = { id: string | number; at: string | Date; user_id: string | null; user_name: string; entity: AuditEntity; entity_id: string | null; action: string; summary: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null; undone_at: string | Date | null; undone_by: string | null };

const iso = (d: string | Date | null) => (d == null ? null : new Date(d).toISOString());
const toUser = (r: UserRow): PanelUser => ({ id: r.id, email: r.email, name: r.name, role: r.role, passwordHash: r.password_hash, active: r.active, sessionVersion: r.session_version, lastLoginAt: iso(r.last_login_at), createdAt: iso(r.created_at)! });
const toAudit = (r: AuditRow): AuditEntry => ({ id: String(r.id), at: iso(r.at)!, userId: r.user_id, userName: r.user_name, entity: r.entity, entityId: r.entity_id, action: r.action, summary: r.summary, before: r.before, after: r.after, undoneAt: iso(r.undone_at), undoneBy: r.undone_by });

function neonStore(sql: Sql): UsersStore {
  const ready = () => migrate(sql);
  return {
    writable: true,
    async list() {
      await ready();
      return ((await sql`select * from users order by active desc, role, name`) as UserRow[]).map(toUser);
    },
    async get(id) {
      await ready();
      const rows = (await sql`select * from users where id = ${id}`) as UserRow[];
      return rows[0] ? toUser(rows[0]) : null;
    },
    async byEmail(email) {
      await ready();
      const rows = (await sql`select * from users where lower(email) = ${email.toLowerCase()}`) as UserRow[];
      return rows[0] ? toUser(rows[0]) : null;
    },
    async hasActiveOwner() {
      await ready();
      return ((await sql`select 1 from users where role = 'dueno' and active limit 1`) as unknown[]).length > 0;
    },
    async create(u) {
      await ready();
      await sql`
        insert into users (id, email, name, role, password_hash, active, session_version)
        values (${u.id}, ${u.email}, ${u.name}, ${u.role}, ${u.passwordHash}, ${u.active}, ${u.sessionVersion})`;
    },
    async update(id, p) {
      await ready();
      const cur = await this.get(id);
      if (!cur) return;
      const u = { ...cur, ...p };
      await sql`
        update users set email = ${u.email}, name = ${u.name}, role = ${u.role}, password_hash = ${u.passwordHash}, active = ${u.active},
          session_version = ${u.sessionVersion}, last_login_at = ${u.lastLoginAt}, updated_at = now()
        where id = ${id}`;
    },
    async audit(e) {
      await ready();
      await sql`
        insert into audit_log (user_id, user_name, entity, entity_id, action, summary, before, after)
        values (${e.userId}, ${e.userName}, ${e.entity}, ${e.entityId}, ${e.action}, ${e.summary},
          ${e.before ? JSON.stringify(e.before) : null}::jsonb, ${e.after ? JSON.stringify(e.after) : null}::jsonb)`;
    },
    async auditList({ limit = 200, entity } = {}) {
      await ready();
      const rows = entity
        ? await sql`select * from audit_log where entity = ${entity} order by at desc, id desc limit ${limit}`
        : await sql`select * from audit_log order by at desc, id desc limit ${limit}`;
      return (rows as AuditRow[]).map(toAudit);
    },
    async auditGet(id) {
      await ready();
      const rows = (await sql`select * from audit_log where id = ${Number(id)}`) as AuditRow[];
      return rows[0] ? toAudit(rows[0]) : null;
    },
    async markUndone(id, by) {
      await ready();
      // Solo la primera vez: dos clics seguidos en "Deshacer" no deshacen dos veces.
      const rows = (await sql`update audit_log set undone_at = now(), undone_by = ${by} where id = ${Number(id)} and undone_at is null returning id`) as unknown[];
      return rows.length > 0;
    },
  };
}

interface MemoryState {
  users: Map<string, PanelUser>;
  audit: AuditEntry[];
  seq: number;
}

function memoryStore(state: MemoryState, writable: boolean): UsersStore {
  const guard = () => {
    if (!writable) throw new ReadOnlyCatalogError();
  };
  return {
    writable,
    async list() {
      return [...state.users.values()].map((u) => ({ ...u }));
    },
    async get(id) {
      const u = state.users.get(id);
      return u ? { ...u } : null;
    },
    async byEmail(email) {
      const u = [...state.users.values()].find((x) => x.email.toLowerCase() === email.toLowerCase());
      return u ? { ...u } : null;
    },
    async hasActiveOwner() {
      return [...state.users.values()].some((u) => u.role === "dueno" && u.active);
    },
    async create(u) {
      guard();
      if ([...state.users.values()].some((x) => x.email.toLowerCase() === u.email.toLowerCase())) throw new Error("duplicate key value violates unique constraint");
      state.users.set(u.id, { ...u });
    },
    async update(id, p) {
      guard();
      const cur = state.users.get(id);
      if (cur) state.users.set(id, { ...cur, ...p });
    },
    async audit(e) {
      if (!writable) return;
      state.audit.unshift({ ...e, id: String(++state.seq), at: new Date().toISOString(), undoneAt: null, undoneBy: null });
    },
    async auditList({ limit = 200, entity } = {}) {
      return state.audit.filter((a) => !entity || a.entity === entity).slice(0, limit).map((a) => ({ ...a }));
    },
    async auditGet(id) {
      const a = state.audit.find((x) => x.id === id);
      return a ? { ...a } : null;
    },
    async markUndone(id, by) {
      const a = state.audit.find((x) => x.id === id);
      if (!a || a.undoneAt) return false;
      a.undoneAt = new Date().toISOString();
      a.undoneBy = by;
      return true;
    },
  };
}

let store: UsersStore | undefined;
export function usersStore(): UsersStore {
  if (store) return store;
  const sql = db();
  if (sql) return (store = neonStore(sql));
  if (process.env.CATALOG_STORE === "memory" && process.env.VERCEL !== "1") {
    const g = globalThis as unknown as { __voltUsers?: MemoryState };
    return (store = memoryStore((g.__voltUsers ??= { users: new Map(), audit: [], seq: 0 }), true));
  }
  return (store = memoryStore({ users: new Map(), audit: [], seq: 0 }, false));
}

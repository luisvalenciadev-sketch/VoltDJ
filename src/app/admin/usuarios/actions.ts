"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { CATALOG_TAG } from "@/data/catalog";
import { createUserSession, deleteAdminSession, requireAdmin, requireOwner } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { catalogStore, ReadOnlyCatalogError } from "@/lib/catalog-store";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/passwords";
import { isRole, ROLE_LABEL } from "@/lib/permissions";
import { formatCOP } from "@/lib/pricing";
import { usersStore } from "@/lib/users-store";

export type UserFormState = { error?: string; ok?: string } | undefined;

const clean = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function failure(e: unknown, what: string): UserFormState {
  if (e instanceof ReadOnlyCatalogError) return { error: "Falta conectar la base de datos: los usuarios no se pueden guardar todavía." };
  if (e instanceof Error && /duplicate key|unique constraint/i.test(e.message)) return { error: "Ya existe un usuario con ese correo." };
  console.error(`[panel] ${what}`, e);
  return { error: `No se pudo ${what}. Intenta de nuevo en un momento.` };
}

/** ¿Quedaría algún dueño activo si este usuario deja de serlo? */
async function lastOwner(id: string): Promise<boolean> {
  const owners = (await usersStore().list()).filter((u) => u.role === "dueno" && u.active);
  return owners.length === 1 && owners[0].id === id;
}

export async function createUser(_: UserFormState, fd: FormData): Promise<UserFormState> {
  const session = await requireOwner();
  const name = clean(fd, "name", 60);
  const email = clean(fd, "email", 160).toLowerCase();
  const role = fd.get("role");
  const password = String(fd.get("password") ?? "");
  if (!name) return { error: "Escribe el nombre." };
  if (!EMAIL.test(email)) return { error: "El correo no parece válido." };
  if (!isRole(role)) return { error: "Elige el rol." };
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  const store = usersStore();
  const firstOwner = !session.userId && role === "dueno";
  try {
    const now = new Date().toISOString();
    // El primer dueño ya está adentro (entró con la contraseña única y sigue como él): cuenta como su ingreso.
    const user = { id: randomUUID(), email, name, role, passwordHash: await hashPassword(password), active: true, sessionVersion: 1, lastLoginAt: firstOwner ? now : null, createdAt: now };
    await store.create(user);
    await audit(session, { entity: "usuario", entityId: user.id, action: "crear", summary: `Creó el usuario ${name} (${email}, ${ROLE_LABEL[role]})` });
    // El primer dueño: la contraseña única deja de servir y quien la usaba sigue como ese dueño.
    if (firstOwner) await createUserSession(user);
  } catch (e) {
    return failure(e, "crear el usuario");
  }
  revalidatePath("/admin/usuarios");
  if (firstOwner) redirect("/admin/usuarios?primero=1");
  return { ok: `Usuario creado. Comparte con ${name} su correo y la contraseña por un medio privado; podrá cambiarla en Mi cuenta.` };
}

export async function updateUser(id: string, _: UserFormState, fd: FormData): Promise<UserFormState> {
  const session = await requireOwner();
  const store = usersStore();
  const user = await store.get(id);
  if (!user) return { error: "Este usuario ya no existe." };
  const name = clean(fd, "name", 60);
  const role = fd.get("role");
  const active = fd.get("active") === "on";
  if (!name) return { error: "Escribe el nombre." };
  if (!isRole(role)) return { error: "Elige el rol." };
  const self = session.userId === id;
  if (self && (!active || role !== "dueno")) return { error: "No puedes quitarte el acceso de dueño a ti mismo: pídeselo a otro dueño." };
  if ((role !== "dueno" || !active) && user.role === "dueno" && (await lastOwner(id))) return { error: "Es el único dueño activo: crea otro dueño antes de cambiarlo." };
  const lostAccess = user.active !== active || user.role !== role;
  try {
    // Si cambia el rol o se desactiva, sus sesiones abiertas dejan de valer al instante.
    await store.update(id, { name, role, active, sessionVersion: lostAccess ? user.sessionVersion + 1 : user.sessionVersion });
    const changes = [user.name !== name && `nombre "${name}"`, user.role !== role && `rol ${ROLE_LABEL[role]}`, user.active !== active && (active ? "reactivado" : "desactivado")].filter(Boolean);
    if (changes.length) await audit(session, { entity: "usuario", entityId: id, action: "editar", summary: `Usuario ${user.email}: ${changes.join(", ")}` });
  } catch (e) {
    return failure(e, "guardar el usuario");
  }
  revalidatePath("/admin/usuarios");
  return { ok: "Usuario guardado." };
}

export async function resetPassword(id: string, _: UserFormState, fd: FormData): Promise<UserFormState> {
  const session = await requireOwner();
  const password = String(fd.get("password") ?? "");
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  const store = usersStore();
  const user = await store.get(id);
  if (!user) return { error: "Este usuario ya no existe." };
  try {
    await store.update(id, { passwordHash: await hashPassword(password), sessionVersion: user.sessionVersion + 1 });
    await audit(session, { entity: "usuario", entityId: id, action: "clave", summary: `Cambió la contraseña de ${user.email}` });
    if (session.userId === id) await createUserSession({ ...user, sessionVersion: user.sessionVersion + 1 });
  } catch (e) {
    return failure(e, "cambiar la contraseña");
  }
  return { ok: "Contraseña cambiada. Las sesiones abiertas de ese usuario se cerraron." };
}

/** Mi cuenta: cualquier usuario cambia su propia contraseña con la actual. */
export async function changeOwnPassword(_: UserFormState, fd: FormData): Promise<UserFormState> {
  const session = await requireAdmin();
  if (!session.userId) return { error: "Entraste con la contraseña única: crea tu usuario en Usuarios." };
  const store = usersStore();
  const user = await store.get(session.userId);
  if (!user) return { error: "Tu usuario ya no existe." };
  if (!(await verifyPassword(String(fd.get("current") ?? ""), user.passwordHash))) return { error: "La contraseña actual no coincide." };
  const next = String(fd.get("password") ?? "");
  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  if (next !== String(fd.get("confirm") ?? "")) return { error: "La confirmación no coincide con la nueva contraseña." };
  try {
    const sessionVersion = user.sessionVersion + 1;
    await store.update(user.id, { passwordHash: await hashPassword(next), sessionVersion });
    // Cierra las demás sesiones (otro celular, otro computador) y deja esta abierta.
    await createUserSession({ ...user, sessionVersion });
    await audit(session, { entity: "usuario", entityId: user.id, action: "clave", summary: `${user.name} cambió su contraseña` });
  } catch (e) {
    return failure(e, "cambiar la contraseña");
  }
  return { ok: "Contraseña cambiada. Se cerraron tus sesiones en otros dispositivos." };
}

/**
 * Deshacer un cambio de precio o de stock del historial. Solo si nadie lo cambió después: si el valor
 * actual ya no es el que dejó ese cambio, deshacer pisaría un cambio más reciente.
 */
export async function undoChange(entryId: string): Promise<UserFormState> {
  const session = await requireOwner();
  const users = usersStore();
  const entry = await users.auditGet(entryId);
  if (!entry || entry.undoneAt) return { error: "Este cambio ya se deshizo o no existe." };
  const catalog = catalogStore();
  const p = entry.entityId ? await catalog.getProduct(entry.entityId) : null;
  if (!p) return { error: "El producto ya no existe." };
  const before = entry.before ?? {};
  const after = entry.after ?? {};
  try {
    if (entry.entity === "producto" && entry.action === "precio") {
      if (p.price !== after.price || p.salePrice !== after.salePrice) return { error: "El precio cambió después de ese cambio: deshacerlo pisaría el más reciente." };
      if (!(await users.markUndone(entryId, session.name))) return { error: "Este cambio ya se deshizo." };
      const price = (before.price as number | null) ?? null;
      const salePrice = (before.salePrice as number | null) ?? null;
      await catalog.updateProduct({ ...p, price, salePrice });
      await audit(session, { entity: "producto", entityId: p.id, action: "deshacer", summary: `Deshizo el cambio de precio de ${p.name}: vuelve a ${price == null ? "por confirmar" : formatCOP(price)}` });
    } else if (entry.entity === "stock" && "stock" in before) {
      if (p.stock !== after.stock) return { error: "El stock cambió después de ese ajuste (otra venta o ajuste): corrígelo en Inventario." };
      if (!(await users.markUndone(entryId, session.name))) return { error: "Este cambio ya se deshizo." };
      const value = (before.stock as number | null) ?? null;
      await catalog.changeStock(p.id, { mode: "set", value }, { reason: "ajuste", note: `Deshacer ajuste (${session.name})` });
      await audit(session, { entity: "stock", entityId: p.id, action: "deshacer", summary: `Deshizo el ajuste de ${p.name}: vuelve a ${value == null ? "sin control" : value} unidades` });
    } else {
      return { error: "Solo se pueden deshacer cambios de precio y de stock." };
    }
  } catch (e) {
    return failure(e, "deshacer el cambio");
  }
  revalidateTag(CATALOG_TAG, { expire: 0 });
  revalidatePath("/admin/historial");
  return { ok: "Cambio deshecho." };
}

export async function logoutEverywhere(): Promise<void> {
  const session = await requireAdmin();
  if (session.userId) {
    const user = await usersStore().get(session.userId);
    if (user) await usersStore().update(user.id, { sessionVersion: user.sessionVersion + 1 });
  }
  await deleteAdminSession();
  redirect("/admin/ingresar");
}

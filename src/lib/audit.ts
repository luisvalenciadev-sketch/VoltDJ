import "server-only";
import type { PanelSession } from "./admin-auth";
import { usersStore, type AuditEntity } from "./users-store";

/**
 * Historial de cambios del panel: quién cambió qué y cuándo. Nunca bloquea la acción que registra: si el
 * historial falla, el cambio ya quedó hecho y solo se avisa en el registro del servidor.
 */
export async function audit(
  session: PanelSession,
  e: { entity: AuditEntity; entityId?: string | null; action: string; summary: string; before?: Record<string, unknown> | null; after?: Record<string, unknown> | null },
): Promise<void> {
  try {
    await usersStore().audit({
      userId: session.userId,
      userName: session.name,
      entity: e.entity,
      entityId: e.entityId ?? null,
      action: e.action,
      summary: e.summary,
      before: e.before ?? null,
      after: e.after ?? null,
    });
  } catch (err) {
    console.error("[panel] historial", e.summary, err);
  }
}

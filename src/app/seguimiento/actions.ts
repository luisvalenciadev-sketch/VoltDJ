"use server";

import { revalidatePath } from "next/cache";
import { guidesStore } from "@/lib/guides-store";
import { addManualStatus, currentStatus, freezeToManual, normalizeGuideCode, validateRescheduleDay } from "@/lib/tracking";

export type RescheduleState = { error?: string; ok?: string } | undefined;

const SLOTS: Record<string, string> = { manana: "en la mañana", tarde: "en la tarde", cualquiera: "a cualquier hora" };

/**
 * El cliente reprograma su entrega desde la página de seguimiento. Es una acción pública (sin
 * sesión), así que solo puede hacer una cosa: si la guía está en "Entrega fallida", pasarla a
 * "Entrega reprogramada" con una fecha válida. Cualquier otro estado la rechaza, lo que también
 * impide reprogramar dos veces la misma falla.
 */
export async function rescheduleDelivery(rawCode: string, _: RescheduleState, fd: FormData): Promise<RescheduleState> {
  const code = normalizeGuideCode(rawCode);
  const store = guidesStore();
  if (!code || !store) return { error: "No pudimos encontrar tu guía." };
  const g = await store.get(code);
  if (!g) return { error: "No pudimos encontrar tu guía." };
  if (currentStatus(g)?.status !== "entrega_fallida") return { error: "Esta entrega ya no se puede reprogramar desde aquí. Escríbenos por WhatsApp." };

  const r = validateRescheduleDay(String(fd.get("day") ?? ""));
  if ("error" in r) return { error: r.error };
  const slot = SLOTS[String(fd.get("slot") ?? "")] ?? SLOTS.cualquiera;
  const base = g.mode === "auto" ? freezeToManual(g.events) : g.events;
  await store.update(code, {
    mode: "manual",
    events: addManualStatus(base, "reprogramado", new Date(), `Reprogramada por ti para recibir ${slot}.`, { rescheduledFor: r.day }),
  });
  revalidatePath(`/seguimiento/${code}`);
  revalidatePath(`/admin/guias/${code}`);
  return { ok: "¡Listo! Tu entrega quedó reprogramada." };
}

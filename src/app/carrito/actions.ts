"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCartCatalog } from "@/data/catalog";
import { getStore } from "@/data/store";
import { parseStoredCart, summarize } from "@/lib/cart";
import { draftsStore } from "@/lib/drafts-store";
import { guidesStore } from "@/lib/guides-store";
import { draftLines, validateCustomer, type CustomerField } from "@/lib/order-drafts";
import { createGuideCode, normalizeGuideCode } from "@/lib/tracking";
import { createOrderId } from "@/lib/whatsapp";

export type SubmitOrderResult =
  | { code: string; saved: boolean }
  | { error: string; fields?: Partial<Record<CustomerField, string>> };

/**
 * Freno al abuso: es una acción pública que escribe en la base. Memoria del proceso (en Vercel, por
 * instancia): frena envíos en serie, no garantiza. Un cliente real envía uno o dos pedidos.
 */
const sends = new Map<string, { n: number; until: number }>();
function tooMany(ip: string): boolean {
  const now = Date.now();
  const s = sends.get(ip);
  if (!s || now >= s.until) {
    sends.set(ip, { n: 1, until: now + 10 * 60_000 });
    return false;
  }
  s.n++;
  return s.n > 20;
}

/**
 * Guarda el pedido del carrito como borrador antes de abrir WhatsApp. Productos, precios y zona se
 * recalculan aquí con el catálogo vigente: el navegador solo aporta ids, cantidades y los datos del
 * cliente. Si el mismo carrito se envía otra vez (p. ej. corrigió la dirección), se actualiza el
 * mismo borrador mientras siga pendiente. Sin base de datos, el pedido sale igual con un código provisional.
 */
export async function submitOrder(input: { items: unknown; customer: unknown; code?: string | null }): Promise<SubmitOrderResult> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (tooMany(ip)) return { error: "Enviaste muchos pedidos seguidos. Espera unos minutos o escríbenos directo por WhatsApp." };

  const [catalog, shop] = await Promise.all([getCartCatalog(), getStore()]);
  const summary = summarize(parseStoredCart(JSON.stringify(input.items ?? [])), catalog);
  if (!summary.orderable.length) return { error: "Tu carrito no tiene productos disponibles para pedir." };
  const checked = validateCustomer((input.customer ?? {}) as Record<string, unknown>, shop.shippingZones);
  if ("errors" in checked) return { error: "Revisa tus datos.", fields: checked.errors };
  const { zoneId, ...customer } = checked.customer;
  const z = shop.shippingZones.find((s) => s.id === zoneId);
  const details = { ...customer, zone: z ? { name: z.name, days: z.days, cost: z.cost } : null, lines: draftLines(summary).slice(0, 30) };

  const drafts = draftsStore();
  const guides = guidesStore();
  if (!drafts) return { code: createOrderId(shop.orderIdPrefix), saved: false };
  try {
    const previous = input.code ? normalizeGuideCode(input.code) : null;
    const existing = previous ? await drafts.get(previous) : null;
    if (existing?.status === "pendiente") {
      await drafts.update(existing.code, details);
    } else {
      // El código será también el de la guía: no puede chocar con ninguno de los dos.
      let code = createGuideCode();
      while ((await drafts.get(code)) || (guides && (await guides.get(code)))) code = createGuideCode();
      const now = new Date().toISOString();
      await drafts.create({ code, ...details, status: "pendiente", guideCode: null, createdAt: now, updatedAt: now });
      revalidatePath("/admin");
      return { code, saved: true };
    }
    revalidatePath("/admin");
    return { code: existing.code, saved: true };
  } catch (e) {
    // Si la base falla, el cliente no se queda sin pedir: el asesor recibe el mensaje completo por WhatsApp.
    console.error("[carrito] guardar pedido", e);
    return { code: createOrderId(shop.orderIdPrefix), saved: false };
  }
}

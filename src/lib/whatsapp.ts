import { STORE } from "@/config/store";
import type { CartSummary } from "./cart";
import { discountPercent, formatCOP, unitPrice } from "./pricing";

/**
 * Servicio centralizado de WhatsApp. Construye mensajes legibles y enlaces
 * wa.me (válidos en móvil y escritorio). No incluye datos personales: solo
 * productos, cantidades y, si el cliente lo escribe, la ciudad de envío.
 */
export const MAX_CITY_LENGTH = 60;

export function isWhatsAppConfigured(number = STORE.whatsappNumber): boolean {
  return /^\d{10,15}$/.test(number);
}

export function buildWhatsAppLink(text: string, number = STORE.whatsappNumber): string | null {
  if (!isWhatsAppConfigured(number)) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function sanitizeCity(city: string | undefined): string {
  return (city ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, MAX_CITY_LENGTH);
}

export function buildOrderMessage(
  summary: Pick<CartSummary, "orderable" | "subtotal" | "hasUnpriced"> & Partial<Pick<CartSummary, "listSubtotal" | "savings">>,
  opts: { orderId: string; city?: string; storeName?: string },
): string {
  const storeName = opts.storeName ?? STORE.name;
  const out: string[] = [`Hola ${storeName}, quiero consultar este pedido.`, `Pedido provisional: ${opts.orderId}`, ""];
  summary.orderable.forEach((line, i) => {
    out.push(`${i + 1}. ${line.product.name}`);
    out.push(`   Ref.: ${line.product.sku}`);
    out.push(`   Cantidad: ${line.qty}`);
    out.push(
      line.unit == null
        ? "   Precio: por confirmar"
        : `   Precio unitario: ${formatCOP(line.unit)} · Total: ${formatCOP(line.total as number)}`,
    );
    // El asesor ve de dónde sale el precio: sin esto, el valor rebajado parece un error.
    if (line.listUnit != null && line.discount > 0) out.push(`   Precio normal: ${formatCOP(line.listUnit)} (−${line.discount}% de descuento)`);
  });
  out.push("");
  if (summary.savings && summary.listSubtotal) {
    out.push(`Precio normal: ${formatCOP(summary.listSubtotal)}`);
    out.push(`Descuento: −${formatCOP(summary.savings)}`);
  }
  out.push(
    `Subtotal estimado: ${formatCOP(summary.subtotal)}${summary.hasUnpriced ? " (sin incluir productos con precio por confirmar)" : ""}`,
  );
  out.push("No incluye envío.");
  const city = sanitizeCity(opts.city);
  if (city) out.push(`Ciudad de envío: ${city}`);
  out.push("", "¿Me confirman disponibilidad, costo de envío y tiempo de entrega?");
  return out.join("\n");
}

export function buildProductMessage(
  p: { name: string; sku: string; price: number | null; promoPrice: number | null },
  storeName = STORE.name,
): string {
  const u = unitPrice(p);
  return [
    `Hola ${storeName}, quiero información sobre este producto:`,
    p.name,
    `Ref.: ${p.sku}`,
    u == null
      ? "Precio: por confirmar"
      : `Precio publicado: ${formatCOP(u)}${p.price != null && u < p.price ? ` (precio normal ${formatCOP(p.price)}, −${discountPercent(p)}%)` : ""}`,
    "",
    "¿Está disponible y cuánto cuesta el envío?",
  ].join("\n");
}

export function buildGeneralMessage(topic?: string, storeName = STORE.name): string {
  return topic ? `Hola ${storeName}, busco: ${topic.slice(0, 80)}. ¿Lo tienen o lo pueden conseguir?` : `Hola ${storeName}, quiero hacer una consulta.`;
}

/** Identificador provisional legible, p. ej. VD-261028-4F7K. No es una confirmación. */
export function createOrderId(date = new Date(), random = Math.random): string {
  const ymd =
    String(date.getFullYear()).slice(2) +
    String(date.getMonth() + 1).padStart(2, "0") +
    String(date.getDate()).padStart(2, "0");
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += alphabet[Math.floor(random() * alphabet.length)];
  return `${STORE.orderIdPrefix}-${ymd}-${code}`;
}

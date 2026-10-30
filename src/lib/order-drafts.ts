import type { CartSummary } from "./cart";
import { EMAIL_RE } from "./notify-rules";
import type { ShippingZone } from "./shipping";
import type { OrderLine } from "./tracking";
import { MAX_CITY_LENGTH, normalizeWhatsApp, sanitizeCity } from "./whatsapp";

/**
 * Pedido de la web: lo que el cliente arma en el carrito y envía por WhatsApp. Queda guardado como
 * borrador con el mismo código que tendrá su guía, así el asesor lo convierte en guía sin volver a
 * escribir productos ni datos. Lógica pura: la usan el carrito (validar antes de enviar) y el servidor.
 */
export type DraftStatus = "pendiente" | "convertido" | "descartado";

export interface OrderDraft {
  /** Mismo formato que la guía (VD-XXXX-XXXX): al confirmarlo, la guía conserva este código. */
  code: string;
  customerName: string;
  /** Formato internacional (573001234567). */
  phone: string;
  email: string | null;
  city: string;
  address: string | null;
  /** Zona elegida tal como la vio el cliente; el costo puede haber cambiado después. */
  zone: Pick<ShippingZone, "name" | "days" | "cost"> | null;
  /** Precio congelado al enviar el pedido; 0 = precio por confirmar. */
  lines: OrderLine[];
  status: DraftStatus;
  /** Guía creada a partir del borrador. */
  guideCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export const MAX_NAME_LENGTH = 80;
export const MAX_ADDRESS_LENGTH = 120;
export const MAX_EMAIL_LENGTH = 160;

export interface CustomerInput {
  name: string;
  phone: string;
  city: string;
  address: string;
  email: string;
  zoneId: string;
}

export type CustomerField = keyof CustomerInput;
export type Customer = Pick<OrderDraft, "customerName" | "phone" | "email" | "city" | "address"> & { zoneId: string | null };

export const EMPTY_CUSTOMER: CustomerInput = { name: "", phone: "", city: "", address: "", email: "", zoneId: "" };

const clean = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Datos del cliente: los mismos mensajes en el navegador (antes de abrir WhatsApp) y en el servidor. */
export function validateCustomer(raw: Partial<Record<CustomerField, unknown>>, zones: Pick<ShippingZone, "id">[] = []): { customer: Customer } | { errors: Partial<Record<CustomerField, string>> } {
  const errors: Partial<Record<CustomerField, string>> = {};
  const name = clean(raw.name, MAX_NAME_LENGTH);
  if (name.length < 3) errors.name = "Escribe tu nombre y apellido.";
  const phone = normalizeWhatsApp(clean(raw.phone, 25));
  if (!phone) errors.phone = "Escribe un celular válido, p. ej. 300 123 4567.";
  const city = sanitizeCity(clean(raw.city, MAX_CITY_LENGTH));
  if (!city) errors.city = "Escribe la ciudad de entrega.";
  const email = clean(raw.email, MAX_EMAIL_LENGTH).toLowerCase();
  if (email && !EMAIL_RE.test(email)) errors.email = "El correo no parece válido.";
  const zoneId = clean(raw.zoneId, 40);
  if (zoneId && !zones.some((z) => z.id === zoneId)) errors.zoneId = "Elige una zona de la lista.";
  if (Object.keys(errors).length) return { errors };
  return { customer: { customerName: name, phone: phone as string, city, email: email || null, address: clean(raw.address, MAX_ADDRESS_LENGTH) || null, zoneId: zoneId || null } };
}

/** Líneas del pedido con el precio vigente; los productos sin precio quedan en 0 para que el asesor lo ponga. */
export function draftLines(summary: Pick<CartSummary, "orderable">): OrderLine[] {
  return summary.orderable.map((l) => ({ productId: l.product.id, name: l.product.name, qty: l.qty, unitPrice: l.unit ?? 0 }));
}

export const draftSubtotal = (d: Pick<OrderDraft, "lines">) => d.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
export const draftUnits = (d: Pick<OrderDraft, "lines">) => d.lines.reduce((s, l) => s + l.qty, 0);

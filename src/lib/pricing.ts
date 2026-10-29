import { STORE } from "@/config/store";
import type { Availability } from "@/data/types";

interface Priced {
  price: number | null;
  promoPrice: number | null;
}

const currency = new Intl.NumberFormat(STORE.locale, {
  style: "currency",
  currency: STORE.currency,
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function formatCOP(value: number): string {
  // Intl usa un espacio duro entre "$" y la cifra; se normaliza para el texto de WhatsApp.
  return currency.format(value).replace(/ /g, " ");
}

/** Precio vigente: promocional si existe una promoción válida, si no el normal. */
export function unitPrice(p: Priced): number | null {
  if (p.price == null) return null;
  if (p.promoPrice != null && p.promoPrice > 0 && p.promoPrice < p.price) return p.promoPrice;
  return p.price;
}

export function hasPromo(p: Priced): boolean {
  return p.price != null && unitPrice(p) !== p.price;
}

/** Porcentaje de descuento calculado a partir de los datos, nunca escrito a mano. */
export function discountPercent(p: Priced): number {
  if (!hasPromo(p)) return 0;
  return Math.round((1 - (unitPrice(p) as number) / (p.price as number)) * 100);
}

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  disponible: "Disponible",
  pocas: "Pocas unidades",
  bajo_pedido: "Bajo pedido",
  agotado: "Agotado",
  consultar: "Consultar disponibilidad",
};

export function canAddToCart(availability: Availability): boolean {
  return availability !== "agotado";
}

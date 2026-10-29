import { PAYMENT_IDS, PAYMENT_METHODS, type PaymentSetting } from "@/config/payments";

/** Medios activos, en el orden del catálogo de medios. */
export function enabledPayments(settings: PaymentSetting[]): PaymentSetting[] {
  const byId = new Map(settings.map((s) => [s.id, s]));
  return PAYMENT_IDS.map((id) => byId.get(id)).filter((s): s is PaymentSetting => Boolean(s?.enabled));
}

/** Nombre para mostrar, con las cuotas si aplica: "Addi (hasta 6 cuotas)". */
export function paymentLabel(s: PaymentSetting): string {
  const m = PAYMENT_METHODS[s.id];
  return m.installments && s.installments && s.installments > 1 ? `${m.name} (hasta ${s.installments} cuotas)` : m.name;
}

export interface InstallmentOffer {
  /** Cuota mensual de referencia, redondeada al millar hacia arriba. */
  monthly: number;
  months: number;
  /** Medio que da esa cuota. */
  method: string;
}

/**
 * "Desde $X al mes": la cuota más baja posible con los medios a cuotas activos. Es una referencia, sin
 * intereses: el valor real lo define la entidad (por eso la interfaz dice "sujeto a aprobación").
 */
export function installmentOffer(price: number | null, settings: PaymentSetting[]): InstallmentOffer | null {
  if (price == null || price <= 0) return null;
  let best: InstallmentOffer | null = null;
  for (const s of enabledPayments(settings)) {
    if (!PAYMENT_METHODS[s.id].installments || !s.installments || s.installments < 2) continue;
    const monthly = Math.ceil(price / s.installments / 1000) * 1000;
    if (!best || monthly < best.monthly) best = { monthly, months: s.installments, method: PAYMENT_METHODS[s.id].name };
  }
  return best;
}

/**
 * Medios de pago que una tienda de sonido en Colombia suele ofrecer. Cada tienda activa los suyos en
 * /admin/configuracion?s=pagos; la tienda solo muestra los activos. Los nombres se muestran como texto
 * (sin logos de las marcas: usarlos requiere permiso de cada una).
 */
export const PAYMENT_IDS = ["transferencia", "nequi", "daviplata", "bancolombia", "pse", "tarjeta", "mercadopago", "addi", "sistecredito", "contraentrega"] as const;
export type PaymentId = (typeof PAYMENT_IDS)[number];

export interface PaymentMethodInfo {
  id: PaymentId;
  name: string;
  /** Qué escribir en las instrucciones (lo ve el asesor como guía; el cliente ve lo que escriba la tienda). */
  hint: string;
  /** Permite pagar a cuotas: la tienda define el máximo. */
  installments: boolean;
}

export const PAYMENT_METHODS: Record<PaymentId, PaymentMethodInfo> = {
  transferencia: { id: "transferencia", name: "Transferencia bancaria", hint: "Banco, tipo y número de cuenta, titular y NIT o cédula.", installments: false },
  nequi: { id: "nequi", name: "Nequi", hint: "Número Nequi y titular.", installments: false },
  daviplata: { id: "daviplata", name: "Daviplata", hint: "Número Daviplata y titular.", installments: false },
  bancolombia: { id: "bancolombia", name: "Bancolombia (QR o botón)", hint: "Cómo encontrar el QR o el botón de pago.", installments: false },
  pse: { id: "pse", name: "PSE", hint: "El asesor envía el enlace de pago por WhatsApp.", installments: false },
  tarjeta: { id: "tarjeta", name: "Tarjeta de crédito", hint: "Datáfono en el local o enlace de pago.", installments: true },
  mercadopago: { id: "mercadopago", name: "Mercado Pago", hint: "El asesor envía el enlace de pago.", installments: true },
  addi: { id: "addi", name: "Addi", hint: "Crédito sujeto a aprobación de Addi; el cliente lo solicita con su cédula.", installments: true },
  sistecredito: { id: "sistecredito", name: "Sistecrédito", hint: "Crédito sujeto a aprobación de Sistecrédito.", installments: true },
  contraentrega: { id: "contraentrega", name: "Pago contra entrega", hint: "Ciudades donde aplica y si tiene recargo.", installments: false },
};

export interface PaymentSetting {
  id: PaymentId;
  enabled: boolean;
  /** Lo que el cliente ve en Envíos y pagos. */
  instructions: string | null;
  /** Máximo de cuotas (solo medios a cuotas). */
  installments: number | null;
}

export const defaultPayments = (enabled: PaymentId[] = []): PaymentSetting[] =>
  PAYMENT_IDS.map((id) => ({ id, enabled: enabled.includes(id), instructions: null, installments: PAYMENT_METHODS[id].installments ? 6 : null }));

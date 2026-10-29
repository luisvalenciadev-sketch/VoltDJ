/**
 * Configuración comercial central. Todo dato de la tienda que aparece en la
 * interfaz sale de aquí. Los valores `null` son datos pendientes: la interfaz
 * los muestra como marcadores "pendiente" en lugar de inventarlos.
 */
export interface StoreConfig {
  name: string;
  tagline: string;
  description: string;
  siteUrl: string;
  locale: string;
  currency: string;
  /** Solo dígitos, formato internacional sin "+". Vacío = no configurado. */
  whatsappNumber: string;
  orderIdPrefix: string;
  topbar: (string | null)[];
  legalName: string | null;
  taxId: string | null;
  email: string | null;
  address: string | null;
  hours: string | null;
  social: { label: string; url: string }[];
  shipping: { summary: string | null; details: string[] | null };
  warranty: { summary: string | null; details: string[] | null };
  paymentMethods: string | null;
}

export const STORE: StoreConfig = {
  name: "VOLT DJ",
  tagline: "Tu sonido. Tu energía. Tu escenario.",
  description:
    "Tienda especializada en equipos DJ, audio profesional y accesorios en Colombia. Arma tu pedido y confírmalo con un asesor por WhatsApp.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "es-CO",
  currency: "COP",
  whatsappNumber: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, ""),
  orderIdPrefix: "VD",
  topbar: ["Envíos a todo Colombia", null, null],
  legalName: null,
  taxId: null,
  email: null,
  address: null,
  hours: null,
  social: [],
  shipping: {
    summary: "Envíos a todo Colombia. El costo y el tiempo de entrega se confirman por WhatsApp según tu ciudad.",
    details: [
      "Cobertura: todo Colombia.",
      "Costo y tiempo de entrega: se cotizan por WhatsApp según la ciudad y el pedido.",
      "El envío no está incluido en el subtotal del carrito.",
    ],
  },
  warranty: {
    summary: "Garantía de 12 meses en los equipos.",
    details: [
      "12 meses de garantía en los equipos.",
      "Para solicitarla, escríbenos por WhatsApp con tu número de pedido.",
    ],
  },
  paymentMethods: "Transferencia bancaria",
};

/** Etiquetas de los marcadores para datos pendientes, en el mismo orden que `topbar`. */
export const TOPBAR_PLACEHOLDERS = ["Cobertura de envíos", "Horario de atención", "Ciudad / showroom"];

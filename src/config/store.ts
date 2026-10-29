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
  /** Teléfono de contacto (llamadas). El de pedidos es whatsappNumber. */
  phone: string | null;
  address: string | null;
  hours: string | null;
  social: { label: string; url: string }[];
  shipping: { summary: string | null; details: string[] | null };
  warranty: { summary: string | null; details: string[] | null };
  paymentMethods: string | null;
  returnsPolicy: string | null;
}

export const STORE: StoreConfig = {
  name: "VOLT DJ",
  tagline: "Tu sonido. Tu energía. Tu escenario.",
  description:
    "Tienda de equipos DJ y audio profesional en Ibagué, con envíos a todo Colombia. Arma tu pedido y confírmalo con un asesor por WhatsApp.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "es-CO",
  currency: "COP",
  whatsappNumber: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, ""),
  orderIdPrefix: "VD",
  topbar: ["Envíos a todo Colombia", "Online 24/7 · Local L–V 8 a. m.–5 p. m., S–D 9 a. m.–2 p. m.", "Tienda en Ibagué · Calle 17 #4-91, Centro"],
  legalName: "CD-R SDJ COLOMBIA",
  taxId: "1110518122-5",
  email: "cdr.sdjcolombia@gmail.com",
  phone: "324 203 8766",
  address: "Calle 17 #4-91, Centro, Ibagué, Tolima",
  hours: "Tienda online 24/7. Local: lunes a viernes de 8:00 a. m. a 5:00 p. m.; sábados y domingos de 9:00 a. m. a 2:00 p. m.",
  returnsPolicy: "Cambios y devoluciones dentro de los 5 días hábiles siguientes a la entrega.",
  social: [{ label: "Instagram @cdrsdjcolombia", url: "https://www.instagram.com/cdrsdjcolombia" }],
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

/**
 * Promoción global: descuento sobre el precio de lista en todo el catálogo.
 * `null` desactiva la promoción en toda la tienda (precios, cinta superior y página de ofertas).
 * `endsAt` (ISO, p. ej. "2026-11-30") es opcional; sin fecha, la ficha la marca como pendiente.
 */
export const PROMO: { percent: number; endsAt: string | null } | null = { percent: 15, endsAt: null };

/** Etiquetas de los marcadores para datos pendientes, en el mismo orden que `topbar`. */
export const TOPBAR_PLACEHOLDERS = ["Cobertura de envíos", "Horario de atención", "Ciudad / showroom"];

/** Enlace tel: con indicativo de Colombia a partir de un número escrito con espacios. */
export function phoneHref(phone: string): string {
  return `tel:+57${phone.replace(/\D/g, "")}`;
}

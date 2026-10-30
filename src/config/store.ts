import type { ProductImage } from "@/data/types";
import type { NotifyStatus } from "@/lib/notify-rules";
import type { SameDay, ShippingZone } from "@/lib/shipping";
import { defaultPayments, type PaymentSetting } from "./payments";
import { DEFAULT_THEME, type ThemeId } from "./themes";

/**
 * Datos de la tienda. Se editan en el panel (/admin/configuracion) y se guardan en la base; lo que hay
 * aquí es solo el valor inicial de una tienda recién conectada. Los valores `null` son datos pendientes:
 * la interfaz los muestra como marcadores "pendiente" en lugar de inventarlos.
 */

/** Lo que no cambia por tienda desde el panel: sale del despliegue. */
export const SITE = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "es-CO",
  currency: "COP",
};

export interface SocialLink {
  label: string;
  url: string;
}

export interface Policy {
  summary: string | null;
  details: string[] | null;
}

export interface BrandSettings {
  /** Uno de los cinco temas (src/config/themes.ts). */
  theme: ThemeId;
  /** Logo para fondos oscuros (el tema actual). */
  logoOnDark: ProductImage | null;
  /** Logo para fondos claros (temas claros, fase 2b). */
  logoOnLight: ProductImage | null;
  favicon: ProductImage | null;
  /** Color de acento "#rrggbb"; null = el del tema. */
  accent: string | null;
}

export interface SeoSettings {
  title: string | null;
  description: string | null;
  image: ProductImage | null;
}

/** Avisos por correo. El proveedor (Gmail o Resend) y sus claves van en variables de Vercel, no aquí. */
export interface NotificationSettings {
  /** Qué pasos del pedido le avisan al cliente. */
  statuses: Record<NotifyStatus, boolean>;
  /** Aviso al dueño cuando un producto queda en stock bajo o agotado. */
  lowStock: boolean;
  /** A dónde llegan los avisos para la tienda (stock bajo, prueba). */
  ownerEmail: string | null;
  /** Si el cliente responde el correo, a dónde llega. */
  replyTo: string | null;
}

const allStatuses = (on: boolean): Record<NotifyStatus, boolean> => ({ confirmado: on, enviado: on, en_reparto: on, entregado: on, entrega_fallida: on, reprogramado: on, cancelado: on });

export interface StoreSettings {
  name: string;
  tagline: string;
  description: string;
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
  social: SocialLink[];
  shipping: Policy;
  warranty: Policy;
  /** Texto libre de los términos. Los medios que ve el cliente salen de `payments`. */
  paymentMethods: string | null;
  payments: PaymentSetting[];
  shippingZones: ShippingZone[];
  sameDay: SameDay;
  notifications: NotificationSettings;
  returnsPolicy: string | null;
  /** Texto propio de las páginas legales; null = la página explica cómo funciona el sitio y marca lo pendiente. */
  privacyText: string | null;
  termsText: string | null;
  brand: BrandSettings;
  seo: SeoSettings;
}

const envWhatsApp = () => (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");

/** VOLT DJ / CD-R SDJ COLOMBIA: los datos con los que nació la tienda. */
export function initialStore(): StoreSettings {
  return {
    name: "VOLT DJ",
    tagline: "Tu sonido. Tu energía. Tu escenario.",
    description:
      "Tienda de equipos DJ y audio profesional en Ibagué, con envíos a todo Colombia. Arma tu pedido y confírmalo con un asesor por WhatsApp.",
    whatsappNumber: envWhatsApp(),
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
      details: ["12 meses de garantía en los equipos.", "Para solicitarla, escríbenos por WhatsApp con tu número de pedido."],
    },
    paymentMethods: "Transferencia bancaria",
    payments: defaultPayments(["transferencia"]),
    shippingZones: [],
    sameDay: { enabled: false, cutoff: "14:00", area: "Ibagué" },
    notifications: { statuses: allStatuses(true), lowStock: true, ownerEmail: "cdr.sdjcolombia@gmail.com", replyTo: "cdr.sdjcolombia@gmail.com" },
    privacyText: null,
    termsText: null,
    brand: { theme: DEFAULT_THEME, logoOnDark: null, logoOnLight: null, favicon: null, accent: null },
    seo: { title: "VOLT DJ · Equipos DJ y audio profesional", description: null, image: null },
  };
}

/** Tienda nueva (CATALOG_SEED=none): todo pendiente hasta que la tienda lo llene en el panel. */
export function blankStore(): StoreSettings {
  return {
    name: "Mi tienda",
    tagline: "",
    description: "",
    whatsappNumber: envWhatsApp(),
    orderIdPrefix: "PD",
    topbar: [null, null, null],
    legalName: null,
    taxId: null,
    email: null,
    phone: null,
    address: null,
    hours: null,
    social: [],
    shipping: { summary: null, details: null },
    warranty: { summary: null, details: null },
    paymentMethods: null,
    payments: defaultPayments(),
    shippingZones: [],
    sameDay: { enabled: false, cutoff: "14:00", area: "" },
    notifications: { statuses: allStatuses(true), lowStock: true, ownerEmail: null, replyTo: null },
    returnsPolicy: null,
    privacyText: null,
    termsText: null,
    brand: { theme: DEFAULT_THEME, logoOnDark: null, logoOnLight: null, favicon: null, accent: null },
    seo: { title: null, description: null, image: null },
  };
}

export const defaultStore = () => (process.env.CATALOG_SEED === "none" ? blankStore() : initialStore());

/**
 * Lo guardado manda sobre los valores iniciales, campo por campo: un campo nuevo del código aparece con
 * su valor inicial en tiendas que guardaron antes de que existiera, y un campo vaciado en el panel sigue vacío.
 */
export function mergeStore(base: StoreSettings, saved: Partial<StoreSettings> | null | undefined): StoreSettings {
  if (!saved) return base;
  return {
    ...base,
    ...saved,
    shipping: { ...base.shipping, ...saved.shipping },
    warranty: { ...base.warranty, ...saved.warranty },
    brand: { ...base.brand, ...saved.brand },
    sameDay: { ...base.sameDay, ...saved.sameDay },
    notifications: { ...base.notifications, ...saved.notifications, statuses: { ...base.notifications.statuses, ...saved.notifications?.statuses } },
    // Un medio de pago que el código agregue después aparece (apagado) también en tiendas que ya guardaron.
    payments: base.payments.map((p) => ({ ...p, ...saved.payments?.find((x) => x.id === p.id) })),
    seo: { ...base.seo, ...saved.seo },
  };
}

/** Etiquetas de los marcadores para datos pendientes, en el mismo orden que `topbar`. */
export const TOPBAR_PLACEHOLDERS = ["Cobertura de envíos", "Horario de atención", "Ciudad / showroom"];

/** Enlace tel: con indicativo de Colombia a partir de un número escrito con espacios. */
export function phoneHref(phone: string): string {
  return `tel:+57${phone.replace(/\D/g, "")}`;
}

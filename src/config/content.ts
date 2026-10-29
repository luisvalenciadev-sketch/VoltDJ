import type { ProductImage } from "@/data/types";

/**
 * Contenido del inicio y de las preguntas frecuentes. Se edita en el panel (/admin/contenido) y se guarda
 * en la base (fila "content" de settings); lo de aquí es solo el valor inicial de una tienda recién conectada.
 */
export interface FaqItem {
  id: string;
  q: string;
  a: string;
}

/** Banner del carrusel: el texto va escrito aparte, nunca dentro de la imagen (se lee, se traduce y se indexa). */
export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  /** Ruta interna ("/catalogo/parlantes") o enlace completo. */
  ctaHref: string;
  image: ProductImage | null;
  /** "AAAA-MM-DD", hora de Colombia, ambos incluidos. null = sin límite. */
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
}

/** "Mira cómo suena": un MP4 subido al almacenamiento o un video de YouTube. */
export interface Video {
  id: string;
  title: string;
  /** MP4 subido (Vercel Blob o /media en pruebas). */
  src: string | null;
  youtubeId: string | null;
  poster: ProductImage | null;
  /** Producto que se ve en el video: el video enlaza a su ficha. */
  productId: string | null;
  active: boolean;
}

export interface Review {
  id: string;
  author: string;
  text: string;
  /** 1 a 5. */
  rating: number;
}

export const HOME_SECTION_IDS = ["banners", "categorias", "destacados", "ofertas", "accesorios", "videos", "resenas", "marcas", "como-compras", "preguntas"] as const;
export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];
export const HOME_SECTION_LABEL: Record<HomeSectionId, string> = {
  banners: "Banners",
  categorias: "Categorías",
  destacados: "Destacados",
  ofertas: "Ofertas vigentes",
  accesorios: "Accesorios",
  videos: "Mira cómo suena (videos)",
  resenas: "Reseñas de clientes",
  marcas: "Marcas",
  "como-compras": "Cómo compras aquí",
  preguntas: "Preguntas frecuentes",
};

export interface HomeContent {
  hero: { eyebrow: string; lead: string; ctaLabel: string; ctaHref: string };
  banners: Banner[];
  /** Orden de las secciones del inicio debajo del héroe; las apagadas no se muestran. */
  sections: { id: HomeSectionId; enabled: boolean }[];
  faqs: FaqItem[];
  videos: Video[];
  reviews: { rating: number | null; count: number | null; url: string | null; items: Review[] };
}

const INITIAL_FAQ: Omit<FaqItem, "id">[] = [
  { q: "¿Cómo hago un pedido?",
    a: "Agrega productos al carrito, revisa el resumen y pulsa “Enviar pedido por WhatsApp”. Se abre una conversación con el detalle ya escrito. El pedido queda confirmado cuando un asesor te responda con disponibilidad, envío y forma de pago.",
  },
  { q: "¿El precio del carrito es el precio final?",
    a: "El subtotal es una estimación con los precios publicados y no incluye envío. El asesor confirma el valor final antes de que pagues.",
  },
  { q: "¿Tengo que pagar en la página?",
    a: "No. La tienda no cobra en línea: acuerdas la forma de pago con el asesor por WhatsApp.",
  },
  { q: "¿Qué significa “bajo pedido”?",
    a: "Que el producto no está en inventario inmediato y se solicita al proveedor. El asesor te confirma el tiempo de llegada antes de cerrar la compra.",
  },
  { q: "¿Necesito crear una cuenta?",
    a: "No. El carrito se guarda en este navegador y no pedimos datos personales en la página.",
  },
  { q: "¿Los equipos son nuevos?", a: "Sí, todos los equipos del catálogo son nuevos." },
  { q: "¿Puedo cambiar o devolver un producto?", a: "Sí, dentro de los 5 días hábiles siguientes a la entrega. Escríbenos por WhatsApp con tu número de pedido para gestionarlo." },
  { q: "¿Qué formas de pago aceptan?", a: "Transferencia bancaria. El asesor te comparte los datos por WhatsApp cuando confirme tu pedido." },
  { q: "¿Hacen envíos a todo el país?", a: "Sí, enviamos a todo Colombia. El costo y el tiempo de entrega se confirman por WhatsApp según tu ciudad." },
  { q: "¿Los productos tienen garantía?", a: "Sí, los equipos tienen 12 meses de garantía. Para solicitarla, escríbenos por WhatsApp con tu número de pedido." },
];

export function initialContent(): HomeContent {
  return {
    hero: {
      eyebrow: "Equipos DJ y audio profesional",
      lead: "Sistemas todo en uno, controladores, reproductores, parlantes y monitores para cabina, estudio y eventos. Arma tu pedido y confírmalo con un asesor por WhatsApp.",
      ctaLabel: "Explorar productos",
      ctaHref: "/catalogo",
    },
    banners: [],
    sections: HOME_SECTION_IDS.map((id) => ({ id, enabled: true })),
    faqs: INITIAL_FAQ.map((f, i) => ({ id: `faq-${i + 1}`, ...f })),
    videos: [],
    reviews: { rating: null, count: null, url: null, items: [] },
  };
}

/** Tienda nueva (CATALOG_SEED=none): las preguntas generales del modelo de venta se conservan; lo propio de VOLT DJ no. */
export function blankContent(): HomeContent {
  const c = initialContent();
  return { ...c, hero: { ...c.hero, eyebrow: "", lead: "" }, faqs: c.faqs.slice(0, 5) };
}

export const defaultContent = () => (process.env.CATALOG_SEED === "none" ? blankContent() : initialContent());

/**
 * Lo guardado manda. Una sección nueva del código aparece al final (encendida) en tiendas que ya ordenaron
 * las suyas; una sección que el código quitó desaparece.
 */
export function mergeContent(base: HomeContent, saved: Partial<HomeContent> | null | undefined): HomeContent {
  if (!saved) return base;
  const known = new Set<string>(HOME_SECTION_IDS);
  const sections = (saved.sections ?? base.sections).filter((s) => known.has(s.id));
  for (const id of HOME_SECTION_IDS) if (!sections.some((s) => s.id === id)) sections.push({ id, enabled: true });
  return {
    ...base,
    ...saved,
    hero: { ...base.hero, ...saved.hero },
    reviews: { ...base.reviews, ...saved.reviews },
    sections,
  };
}

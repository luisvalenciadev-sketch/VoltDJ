import type { Brand, Product, Spec } from "./types";

export const DEMO_BRANDS: Brand[] = ["a", "b", "c", "d", "e", "f"].map((l) => ({ id: `marca-${l}`, name: `Marca ${l.toUpperCase()}`, authorized: false, isDemo: true }));

/**
 * CATÁLOGO DE DEMOSTRACIÓN: solo se usa como datos de prueba (tests), no en la tienda. Marcas, precios, referencias y disponibilidad son
 * ficticios (`isDemo: true`, SKU con prefijo VD-). No usar como datos comerciales.
 */
const s = (pairs: [string, string][]): Spec[] => pairs.map(([label, value]) => ({ label, value }));
const UPDATED = "2026-10-28";

type Seed = Omit<Product, "images" | "status" | "isDemo" | "updatedAt" | "promoEndsAt"> & { promoEndsAt?: string | null };
const demo = (p: Seed): Product => ({
  images: [],
  status: "published",
  isDemo: true,
  updatedAt: UPDATED,
  ...p,
  promoEndsAt: p.promoEndsAt ?? null,
});

export const DEMO_PRODUCTS: Product[] = [
  demo({ id: "p01", slug: "controlador-dj-2-canales-pads", name: "Controlador DJ 2 canales con pads de rendimiento", brandId: "marca-a", categoryId: "controladores", art: "controller",
    price: 1890000, promoPrice: 1690000, sku: "VD-CTR-002", availability: "disponible", maxQtyPerOrder: 5, featured: true,
    description: "Controlador compacto para empezar a mezclar con software. Dos decks, mezclador integrado y pads por canal para hot cues, loops y samples.",
    specs: s([["Canales", "2"], ["Jog wheels", "2 × 5,5 in"], ["Pads", "8 por deck"], ["Salidas", "Master RCA · Audífonos 3,5 mm"], ["Conexión", "USB-B"], ["Alimentación", "Bus USB 5 V"], ["Peso", "2,1 kg"]]) }),
  demo({ id: "p02", slug: "controlador-standalone-4-canales", name: "Controlador standalone 4 canales con pantalla", brandId: "marca-b", categoryId: "controladores", art: "controller",
    price: 6490000, promoPrice: null, sku: "VD-CTR-004", availability: "pocas", maxQtyPerOrder: 2, featured: true,
    description: "Sistema todo en uno que funciona sin computador. Lectura desde USB, pantalla táctil y mezclador de cuatro canales.",
    specs: s([["Canales", "4"], ["Pantalla", "7 in táctil"], ["Jog wheels", "2 × 6 in"], ["Salidas", "Master XLR + RCA · Booth TRS"], ["Entradas", "2 × Phono/Line · Mic XLR/TRS"], ["Alimentación", "100–240 V AC"], ["Peso", "5,8 kg"]]) }),
  demo({ id: "p03", slug: "mezclador-2-canales-efectos", name: "Mezclador 2 canales con efectos", brandId: "marca-c", categoryId: "mezcladores", art: "mixer",
    price: 2750000, promoPrice: null, sku: "VD-MIX-201", availability: "disponible", maxQtyPerOrder: 5, featured: false,
    description: "Mezclador de club para dos decks con efectos por canal y crossfader reemplazable.",
    specs: s([["Canales", "2"], ["Ecualizador", "3 bandas, –26 / +6 dB"], ["Respuesta", "20 Hz – 20 kHz"], ["Salidas", "Master XLR · Booth TRS"], ["Interfaz de audio", "USB 24 bit / 48 kHz"]]) }),
  demo({ id: "p04", slug: "tornamesa-traccion-directa", name: "Tornamesa de tracción directa", brandId: "marca-d", categoryId: "reproductores", art: "turntable",
    price: 2190000, promoPrice: null, sku: "VD-TT-110", availability: "bajo_pedido", maxQtyPerOrder: 4, featured: true,
    description: "Motor de tracción directa con alto torque y control de pitch para scratch y mezcla en vinilo.",
    specs: s([["Tracción", "Directa"], ["Velocidades", "33⅓ · 45 · 78 rpm"], ["Pitch", "±8 % / ±16 %"], ["Arranque", "< 0,3 s a 33⅓ rpm"], ["Salida", "Phono RCA"]]) }),
  demo({ id: "p05", slug: "reproductor-multimedia-dj", name: "Reproductor multimedia DJ profesional", brandId: "marca-b", categoryId: "reproductores", art: "turntable",
    price: null, promoPrice: null, sku: "VD-PLY-300", availability: "consultar", maxQtyPerOrder: 4, featured: false,
    description: "Reproductor de cabina para USB y streaming. Precio sujeto a confirmación del distribuidor.",
    specs: s([["Formatos", "MP3 · AAC · WAV · AIFF · FLAC"], ["Pantalla", "9 in táctil"], ["Salidas", "Digital coaxial · RCA"]]) }),
  demo({ id: "p06", slug: "parlante-activo-12-pulgadas", name: "Parlante activo 12 in bi-amplificado", brandId: "marca-e", categoryId: "parlantes", art: "speaker",
    price: 2390000, promoPrice: 2090000, sku: "VD-SPK-12A", availability: "disponible", maxQtyPerOrder: 6, featured: true,
    description: "Parlante de dos vías para eventos y cabina. Montaje en trípode y DSP con presets.",
    specs: s([["Woofer", "12 in"], ["Tweeter", "1 in"], ["Potencia", "500 W RMS"], ["SPL máx.", "126 dB"], ["Respuesta", "50 Hz – 20 kHz (–10 dB)"], ["Entradas", "XLR/TRS combo · RCA"], ["Peso", "15,4 kg"]]) }),
  demo({ id: "p07", slug: "monitores-estudio-5-pulgadas-par", name: "Monitores de estudio 5 in (par)", brandId: "marca-e", categoryId: "parlantes", art: "speaker",
    price: 1590000, promoPrice: null, sku: "VD-MON-05P", availability: "agotado", maxQtyPerOrder: 3, featured: false,
    description: "Par de monitores activos de campo cercano para producción y práctica.",
    specs: s([["Woofer", "5 in"], ["Potencia", "2 × 35 W"], ["Respuesta", "54 Hz – 30 kHz"], ["Entradas", "XLR · TRS · RCA"]]) }),
  demo({ id: "p08", slug: "audifonos-dj-cerrados-plegables", name: "Audífonos DJ cerrados y plegables", brandId: "marca-f", categoryId: "audifonos", art: "headphones",
    price: 690000, promoPrice: 590000, sku: "VD-HP-500", availability: "disponible", maxQtyPerOrder: 6, featured: true,
    description: "Audífonos de monitoreo con copas giratorias, cable en espiral desmontable y alto aislamiento.",
    specs: s([["Driver", "50 mm"], ["Impedancia", "32 Ω"], ["Respuesta", "5 Hz – 30 kHz"], ["Sensibilidad", "107 dB SPL/mW"], ["Cable", "Espiral desmontable 1,2–3 m"]]) }),
  demo({ id: "p09", slug: "microfono-dinamico-vocal-cardioide", name: "Micrófono dinámico vocal cardioide", brandId: "marca-c", categoryId: "microfonos", art: "mic",
    price: 420000, promoPrice: null, sku: "VD-MIC-58", availability: "disponible", maxQtyPerOrder: 8, featured: false,
    description: "Micrófono de mano para voz en vivo y anuncios desde cabina.",
    specs: s([["Tipo", "Dinámico"], ["Patrón", "Cardioide"], ["Respuesta", "50 Hz – 15 kHz"], ["Conector", "XLR 3 pines"]]) }),
  demo({ id: "p10", slug: "luz-par-led-rgbw", name: "Luz PAR LED RGBW", brandId: "marca-d", categoryId: "iluminacion", art: "light",
    price: 380000, promoPrice: null, sku: "VD-LGT-PAR", availability: "pocas", maxQtyPerOrder: 2, featured: false,
    description: "Proyector PAR con mezcla RGBW, control DMX y modo automático por sonido.",
    specs: s([["LED", "12 × 10 W RGBW"], ["Control", "DMX 512 · auto · sonido"], ["Canales DMX", "4 / 8"], ["Consumo", "130 W"]]) }),
  demo({ id: "p11", slug: "estuche-rigido-controlador-mediano", name: "Estuche rígido para controlador mediano", brandId: "marca-a", categoryId: "accesorios", art: "case",
    price: 520000, promoPrice: null, sku: "VD-ACC-CASE", availability: "disponible", maxQtyPerOrder: 6, featured: false,
    description: "Estuche con interior en espuma y cierres metálicos. Verifica la compatibilidad de medidas antes de pedir.",
    specs: s([["Medidas internas", "56 × 34 × 8 cm"], ["Material", "Contrachapado + aluminio"], ["Peso", "4,2 kg"]]) }),
  demo({ id: "p12", slug: "cable-rca-rca-1-5-m", name: "Cable RCA a RCA 1,5 m", brandId: "marca-f", categoryId: "accesorios", art: "cable",
    price: 45000, promoPrice: null, sku: "VD-ACC-RCA15", availability: "disponible", maxQtyPerOrder: 20, featured: false,
    description: "Cable estéreo blindado para conectar reproductores y mezcladores.",
    specs: s([["Largo", "1,5 m"], ["Conectores", "2 × RCA a 2 × RCA"], ["Blindaje", "Malla de cobre"]]) }),
  demo({ id: "p13", slug: "capsula-aguja-tornamesa", name: "Cápsula y aguja para tornamesa", brandId: "marca-d", categoryId: "accesorios", art: "needle",
    price: 260000, promoPrice: null, sku: "VD-ACC-STY", availability: "disponible", maxQtyPerOrder: 6, featured: false,
    description: "Cápsula de imán móvil para scratch con aguja esférica de repuesto.",
    specs: s([["Tipo", "Imán móvil (MM)"], ["Aguja", "Esférica"], ["Fuerza de tracking", "3–5 g"]]) }),
  demo({ id: "p14", slug: "soporte-laptop-plegable", name: "Soporte para laptop plegable", brandId: "marca-a", categoryId: "accesorios", art: "stand",
    price: 150000, promoPrice: 129000, sku: "VD-ACC-STD", availability: "disponible", maxQtyPerOrder: 6, featured: false,
    description: "Soporte de aluminio con altura regulable para cabina.",
    specs: s([["Material", "Aluminio"], ["Altura", "Regulable, 6 posiciones"], ["Carga máx.", "8 kg"]]) }),
];

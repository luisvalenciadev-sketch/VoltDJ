import { productPhoto } from "./product-photos";
import type { ArtKind, Product } from "./types";

/**
 * CATÁLOGO REAL de la tienda (lista entregada el 2026-10-28).
 * Precios en COP, sin precios de oferta. Una unidad de cada producto. Todos nuevos.
 * Fotos: las del fabricante en public/img/productos; sin foto se muestra la ilustración del tipo de equipo.
 */
interface Seed {
  model: string;
  brandId: string;
  categoryId: string;
  type: string;
  price: number;
  art: ArtKind;
  featured?: boolean;
  extra?: [string, string][];
}

const UPDATED = "2026-10-28";

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const BRAND_NAME: Record<string, string> = {
  "pioneer-dj": "Pioneer DJ",
  alphatheta: "AlphaTheta",
  "electro-voice": "Electro-Voice",
  "beta-three": "Beta Three",
  krk: "KRK",
  yamaha: "Yamaha",
};

const SEEDS: Seed[] = [
  // Parlantes y bajos
  { model: "ZLX-15P-G2", brandId: "electro-voice", categoryId: "parlantes", type: "Parlante activo 15\"", price: 2300000, art: "speaker", extra: [["Woofer", "15\""]] },
  { model: "B3 MU18BA", brandId: "beta-three", categoryId: "parlantes", type: "Bajo activo 18\"", price: 2000000, art: "speaker", extra: [["Woofer", "18\""], ["Potencia", "500 W RMS"]] },
  { model: "B3 N15A/MP3-II", brandId: "beta-three", categoryId: "parlantes", type: "Parlante activo 15\"", price: 1800000, art: "speaker", extra: [["Woofer", "15\""]] },
  // Monitores de estudio
  { model: "VXT8", brandId: "krk", categoryId: "monitores", type: "Monitor de estudio", price: 1600000, art: "speaker" },
  { model: "HS5", brandId: "yamaha", categoryId: "monitores", type: "Monitor de estudio", price: 1600000, art: "speaker" },
  // Reproductores
  { model: "CDJ-3000", brandId: "pioneer-dj", categoryId: "reproductores", type: "Reproductor multimedia DJ", price: 10000000, art: "turntable", featured: true },
  // Sistemas todo en uno
  { model: "XDJ-AZ", brandId: "alphatheta", categoryId: "standalone", type: "Sistema DJ todo en uno", price: 9000000, art: "controller", featured: true },
  { model: "Opus Quad", brandId: "pioneer-dj", categoryId: "standalone", type: "Sistema DJ todo en uno", price: 8000000, art: "controller", featured: true },
  { model: "XDJ-RX3", brandId: "pioneer-dj", categoryId: "standalone", type: "Sistema DJ todo en uno", price: 7800000, art: "controller" },
  { model: "XDJ-XZ", brandId: "pioneer-dj", categoryId: "standalone", type: "Sistema DJ todo en uno", price: 7000000, art: "controller" },
  { model: "OMNIS-DUO", brandId: "alphatheta", categoryId: "standalone", type: "Sistema DJ todo en uno", price: 4500000, art: "controller" },
  { model: "XDJ-RX2 Edición Limitada", brandId: "pioneer-dj", categoryId: "standalone", type: "Sistema DJ todo en uno", price: 4500000, art: "controller" },
  { model: "XDJ-RX2", brandId: "pioneer-dj", categoryId: "standalone", type: "Sistema DJ todo en uno", price: 4200000, art: "controller" },
  { model: "XDJ-AN", brandId: "alphatheta", categoryId: "standalone", type: "Sistema DJ todo en uno", price: 3800000, art: "controller" },
  { model: "XDJ-RR", brandId: "pioneer-dj", categoryId: "standalone", type: "Sistema DJ todo en uno", price: 3800000, art: "controller" },
  { model: "XDJ-RX", brandId: "pioneer-dj", categoryId: "standalone", type: "Sistema DJ todo en uno", price: 3500000, art: "controller" },
  // Controladores
  { model: "DDJ-FLX10", brandId: "pioneer-dj", categoryId: "controladores", type: "Controlador DJ", price: 4500000, art: "controller", featured: true },
  { model: "DDJ-RX", brandId: "pioneer-dj", categoryId: "controladores", type: "Controlador DJ", price: 4000000, art: "controller" },
  { model: "DDJ-FLX6-GT", brandId: "pioneer-dj", categoryId: "controladores", type: "Controlador DJ", price: 3100000, art: "controller" },
  { model: "DDJ-1000", brandId: "pioneer-dj", categoryId: "controladores", type: "Controlador DJ", price: 3000000, art: "controller" },
  { model: "DDJ-FLX6-W", brandId: "pioneer-dj", categoryId: "controladores", type: "Controlador DJ", price: 3000000, art: "controller" },
  { model: "DDJ-FLX6 Black", brandId: "pioneer-dj", categoryId: "controladores", type: "Controlador DJ", price: 2900000, art: "controller" },
  { model: "DDJ-FLX4-N", brandId: "pioneer-dj", categoryId: "controladores", type: "Controlador DJ", price: 1400000, art: "controller" },
  { model: "DDJ-FLX4-W", brandId: "pioneer-dj", categoryId: "controladores", type: "Controlador DJ", price: 1400000, art: "controller" },
  { model: "DDJ-FLX4", brandId: "pioneer-dj", categoryId: "controladores", type: "Controlador DJ", price: 1300000, art: "controller" },
  { model: "DDJ-400", brandId: "pioneer-dj", categoryId: "controladores", type: "Controlador DJ", price: 1000000, art: "controller" },
  { model: "DDJ-FLX2", brandId: "pioneer-dj", categoryId: "controladores", type: "Controlador DJ", price: 800000, art: "controller" },
  // Efectos
  { model: "RMX-1000", brandId: "pioneer-dj", categoryId: "efectos", type: "Estación de efectos y remix", price: 3000000, art: "mixer" },
];

export const PRODUCTS: Product[] = SEEDS.map((s) => {
  const brand = BRAND_NAME[s.brandId];
  const name = `${brand} ${s.model}`;
  const photo = productPhoto(slugify(name), name);
  return {
    id: slugify(name),
    slug: slugify(name),
    name,
    brandId: s.brandId,
    categoryId: s.categoryId,
    description: `${s.type} ${brand} ${s.model}, nuevo. Escríbenos por WhatsApp para confirmar disponibilidad, estado y costo de envío a tu ciudad.`,
    images: photo ? [photo] : [],
    art: s.art,
    price: s.price,
    promoPrice: null,
    promoEndsAt: null,
    sku: s.model,
    availability: "disponible",
    maxQtyPerOrder: 1,
    specs: [
      { label: "Marca", value: brand },
      { label: "Modelo", value: s.model },
      { label: "Tipo", value: s.type },
      { label: "Estado", value: "Nuevo" },
      ...(s.extra ?? []).map(([label, value]) => ({ label, value })),
    ],
    status: "published",
    isDemo: false,
    featured: s.featured ?? false,
    updatedAt: UPDATED,
  };
});

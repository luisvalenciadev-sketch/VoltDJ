import { stockImage } from "./stock-images";
import type { Category } from "./types";

const CATEGORY_LIST: Omit<Category, "image">[] = [
  { id: "controladores", slug: "controladores", name: "Controladores", description: "Controladores DJ para software y sistemas standalone.", art: "controller", order: 1 },
  { id: "mezcladores", slug: "mezcladores", name: "Mezcladores", description: "Mezcladores de club y de batalla.", art: "mixer", order: 2 },
  { id: "reproductores", slug: "reproductores", name: "Reproductores y tornamesas", description: "Reproductores multimedia y tornamesas para vinilo.", art: "turntable", order: 3 },
  { id: "parlantes", slug: "parlantes", name: "Parlantes y monitores", description: "Parlantes activos para eventos y monitores de estudio.", art: "speaker", order: 4 },
  { id: "audifonos", slug: "audifonos", name: "Audífonos", description: "Audífonos de monitoreo para cabina y estudio.", art: "headphones", order: 5 },
  { id: "microfonos", slug: "microfonos", name: "Micrófonos", description: "Micrófonos para voz en vivo y cabina.", art: "mic", order: 6 },
  { id: "iluminacion", slug: "iluminacion", name: "Iluminación", description: "Luces para eventos y cabina.", art: "light", order: 7 },
  { id: "accesorios", slug: "accesorios", name: "Accesorios", description: "Cables, estuches, cápsulas y soportes.", art: "case", order: 8 },
];

export const CATEGORIES: Category[] = CATEGORY_LIST.map((c) => ({ ...c, image: stockImage(`cat/${c.id}`, c.name) }));

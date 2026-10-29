import { stockImage } from "./stock-images";
import type { Category } from "./types";

const CATEGORY_LIST: Omit<Category, "image">[] = [
  { id: "standalone", slug: "sistemas-todo-en-uno", name: "Sistemas todo en uno", description: "Sistemas DJ standalone: mezcla sin computador desde USB.", art: "controller", order: 1 },
  { id: "controladores", slug: "controladores", name: "Controladores", description: "Controladores DJ para software.", art: "controller", order: 2 },
  { id: "reproductores", slug: "reproductores", name: "Reproductores", description: "Reproductores multimedia para cabina.", art: "turntable", order: 3 },
  { id: "efectos", slug: "efectos", name: "Efectos", description: "Estaciones de efectos y remix.", art: "mixer", order: 4 },
  { id: "parlantes", slug: "parlantes-y-bajos", name: "Parlantes y bajos", description: "Parlantes activos y bajos para eventos.", art: "speaker", order: 5 },
  { id: "monitores", slug: "monitores-de-estudio", name: "Monitores de estudio", description: "Monitores para producción y práctica.", art: "speaker", order: 6 },
];

export const CATEGORIES: Category[] = CATEGORY_LIST.map((c) => ({ ...c, image: stockImage(`cat/${c.id}`, c.name) }));

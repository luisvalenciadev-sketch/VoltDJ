import type { Promotion } from "./types";

/**
 * Promoción con la que nació la tienda (antes era la constante PROMO del código): se copia a la base
 * una sola vez, igual que el catálogo inicial, y desde ahí se edita en /admin/promociones.
 */
export const SEED_PROMOTIONS: Promotion[] = [
  {
    id: "temporada",
    name: "Promoción de temporada",
    percent: 15,
    scope: "tienda",
    targetId: null,
    startsAt: null,
    endsAt: "2026-11-30",
    active: true,
    createdAt: "2026-10-28T00:00:00.000Z",
    updatedAt: "2026-10-28T00:00:00.000Z",
  },
];

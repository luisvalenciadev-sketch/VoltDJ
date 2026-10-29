import type { Brand } from "./types";

/**
 * Marcas del catálogo. `authorized: true` solo para marcas con distribución o
 * autorización confirmada por la tienda (habilita mostrarlas como "autorizadas").
 */
export const BRANDS: Brand[] = [
  { id: "pioneer-dj", name: "Pioneer DJ", authorized: false, isDemo: false },
  { id: "alphatheta", name: "AlphaTheta", authorized: false, isDemo: false },
  { id: "electro-voice", name: "Electro-Voice", authorized: false, isDemo: false },
  { id: "beta-three", name: "Beta Three", authorized: false, isDemo: false },
  { id: "krk", name: "KRK", authorized: false, isDemo: false },
  { id: "yamaha", name: "Yamaha", authorized: false, isDemo: false },
];

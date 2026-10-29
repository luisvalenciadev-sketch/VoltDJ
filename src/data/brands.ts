import type { Brand } from "./types";

/**
 * Marcas del catálogo. `authorized: true` solo para marcas con distribución o
 * autorización confirmada por la tienda (habilita mostrarlas como "autorizadas").
 * Logos: archivos de Wikimedia Commons marcados como dominio público (siguen siendo marcas
 * registradas de sus dueños; se usan solo para identificar lo que vende la tienda).
 * KRK y Beta Three no tienen un logo verificable en Commons: se muestran como texto.
 */
export const BRANDS: Brand[] = [
  { id: "pioneer-dj", name: "Pioneer DJ", authorized: false, isDemo: false, logo: { src: "/img/marcas/pioneer-dj.svg", width: 1152, height: 154 } },
  { id: "alphatheta", name: "AlphaTheta", authorized: false, isDemo: false, logo: { src: "/img/marcas/alphatheta.svg", width: 1115, height: 178 } },
  { id: "electro-voice", name: "Electro-Voice", authorized: false, isDemo: false, logo: { src: "/img/marcas/electro-voice.svg", width: 1024, height: 211 } },
  { id: "beta-three", name: "Beta Three", authorized: false, isDemo: false },
  { id: "krk", name: "KRK", authorized: false, isDemo: false },
  { id: "yamaha", name: "Yamaha", authorized: false, isDemo: false, logo: { src: "/img/marcas/yamaha.svg", width: 663, height: 150 } },
];

import type { Brand } from "./types";

/**
 * Marcas del catálogo. `authorized: true` solo para marcas con distribución o
 * autorización confirmada por la tienda (habilita mostrarlas como "autorizadas").
 * Logos de Pioneer DJ, AlphaTheta, Electro-Voice y Yamaha: Wikimedia Commons, dominio público (siguen siendo marcas
 * registradas de sus dueños; se usan solo para identificar lo que vende la tienda).
 * KRK y Beta Three: logos tomados de sus sitios oficiales (krkmusic.com, beta3pro.com); el de KRK
 * se convirtió a letras blancas sobre transparente para la cinta monocroma.
 */
export const BRANDS: Brand[] = [
  { id: "pioneer-dj", name: "Pioneer DJ", authorized: false, isDemo: false, logo: { src: "/img/marcas/pioneer-dj.svg", width: 1152, height: 154 } },
  { id: "alphatheta", name: "AlphaTheta", authorized: false, isDemo: false, logo: { src: "/img/marcas/alphatheta.svg", width: 1115, height: 178 } },
  { id: "electro-voice", name: "Electro-Voice", authorized: false, isDemo: false, logo: { src: "/img/marcas/electro-voice.svg", width: 1024, height: 211 } },
  { id: "beta-three", name: "Beta Three", authorized: false, isDemo: false, logo: { src: "/img/marcas/beta-three.webp", width: 120, height: 120, withName: true } },
  { id: "krk", name: "KRK", authorized: false, isDemo: false, logo: { src: "/img/marcas/krk.png", width: 353, height: 240 } },
  { id: "yamaha", name: "Yamaha", authorized: false, isDemo: false, logo: { src: "/img/marcas/yamaha.svg", width: 663, height: 150 } },
];

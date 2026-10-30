import { Archivo, Barlow, Barlow_Condensed, Big_Shoulders, Bricolage_Grotesque, Hanken_Grotesk, IBM_Plex_Sans, JetBrains_Mono, Nunito_Sans, Space_Grotesk } from "next/font/google";

/*
 * Familias de los cinco temas (src/config/themes.ts). Todas declaran su @font-face, pero el navegador
 * solo descarga las que usa el tema activo. Se precargan solo las del tema base (Escenario) y la mono,
 * que comparten todos: precargar las demás haría bajar fuentes que la mayoría de tiendas no usa.
 */
export const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
export const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
export const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const barlowCondensed = Barlow_Condensed({ subsets: ["latin"], display: "swap", preload: false, weight: ["600", "700", "800"], variable: "--font-barlow-condensed" });
export const barlow = Barlow({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"], variable: "--font-barlow" });
export const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-space-grotesk" });
// Letra de rótulo de bodega; el eje opsz la afina sola en los tamaños grandes.
export const bigShoulders = Big_Shoulders({ subsets: ["latin"], display: "swap", preload: false, axes: ["opsz"], variable: "--font-big-shoulders" });
export const plex = IBM_Plex_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-plex" });
export const bricolage = Bricolage_Grotesque({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-bricolage" });
export const nunito = Nunito_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-nunito" });

export const fontVariables = [archivo, hanken, mono, barlowCondensed, barlow, spaceGrotesk, bigShoulders, plex, bricolage, nunito].map((f) => f.variable).join(" ");

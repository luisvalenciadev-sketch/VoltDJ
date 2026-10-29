import { inkFor, readableAccent } from "@/lib/color";

/**
 * Los cinco temas de la tienda. Comparten datos, lógica y componentes; cambian las variables de diseño
 * (aquí) y algunas variantes de forma (src/styles/themes.css, por `[data-theme]`). El color de acento
 * que elige la tienda se aplica encima de cualquier tema, ajustado para leerse sobre su fondo.
 *
 * Los valores viven en TypeScript, no solo en CSS, para que las pruebas verifiquen el contraste de
 * cada tema (src/config/themes.test.ts).
 */
export const THEME_IDS = ["escenario", "vitrina", "estudio", "bodega", "barrio"] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export const DEFAULT_THEME: ThemeId = "escenario";
export const isThemeId = (v: unknown): v is ThemeId => typeof v === "string" && (THEME_IDS as readonly string[]).includes(v);

export interface ThemeColors {
  bg: string;
  surface: string;
  surface2: string;
  surfaceHover: string;
  fg: string;
  fg2: string;
  accent: string;
  border: string;
  borderStrong: string;
  photo: string;
  ok: string;
  warn: string;
  info: string;
  off: string;
  danger: string;
  placeholder: string;
}

export interface Theme {
  id: ThemeId;
  name: string;
  idea: string;
  forWho: string;
  scheme: "dark" | "light";
  colors: ThemeColors;
  /** Variables de next/font (src/app/fonts.ts). */
  fonts: { display: string; body: string };
  /** Títulos grandes (.disp). */
  display: { case: "uppercase" | "none"; stretch: string; weight: number; tracking: string };
  radius: { r: string; rLg: string };
  /** Escala de espaciado grande: los temas densos la reducen. */
  space: { s7: string; s8: string; s9: string };
  /** Inclinación 3D de las tarjetas al pasar el puntero (1 sí, 0 no). */
  tilt: 0 | 1;
}

const STATUS_LIGHT = { ok: "#146c3a", warn: "#8a4b00", info: "#1d5fc2", off: "#646a73", danger: "#b42318", placeholder: "#8a4b00" };

export const THEMES: Record<ThemeId, Theme> = {
  escenario: {
    id: "escenario",
    name: "Escenario",
    idea: "Oscuro, acento brillante y el producto estrella en 3D sobre un espectro de audio.",
    forWho: "Tiendas DJ y de iluminación",
    scheme: "dark",
    colors: {
      bg: "#101114",
      surface: "#191b20",
      surface2: "#22252b",
      surfaceHover: "#2b2e35",
      fg: "#f5f5f5",
      fg2: "#a7a9b0",
      accent: "#b8ff32",
      border: "#30323a",
      borderStrong: "#474a54",
      photo: "#e7e8eb",
      ok: "#5bd28a",
      warn: "#f2b544",
      info: "#7db4ff",
      off: "#8f929b",
      danger: "#ff6b5e",
      placeholder: "#f2b544",
    },
    fonts: { display: "--font-archivo", body: "--font-hanken" },
    display: { case: "uppercase", stretch: "115%", weight: 800, tracking: "-0.005em" },
    radius: { r: "4px", rLg: "6px" },
    space: { s7: "48px", s8: "72px", s9: "120px" },
    tilt: 1,
  },
  vitrina: {
    id: "vitrina",
    name: "Vitrina",
    idea: "Claro, precios grandes en rojo y tarjetas en caja: se ve mucho catálogo de un vistazo.",
    forWho: "Parlantes y car audio con mucho catálogo y ofertas",
    scheme: "light",
    colors: {
      bg: "#ffffff",
      surface: "#f3f4f6",
      surface2: "#e8eaee",
      surfaceHover: "#dfe2e7",
      fg: "#111318",
      fg2: "#535966",
      accent: "#c8102e",
      border: "#dcdfe4",
      borderStrong: "#b4b9c2",
      photo: "#ffffff",
      ...STATUS_LIGHT,
    },
    fonts: { display: "--font-barlow-condensed", body: "--font-barlow" },
    display: { case: "uppercase", stretch: "100%", weight: 800, tracking: "0" },
    radius: { r: "2px", rLg: "4px" },
    space: { s7: "40px", s8: "56px", s9: "88px" },
    tilt: 0,
  },
  estudio: {
    id: "estudio",
    name: "Estudio",
    idea: "Claro y sobrio, títulos con serifa, fichas técnicas amplias y mucho aire.",
    forWho: "Audio profesional, estudios e instalaciones",
    scheme: "light",
    colors: {
      bg: "#f6f4ef",
      surface: "#fffdf8",
      surface2: "#ece8df",
      surfaceHover: "#e4dfd3",
      fg: "#1f1d1a",
      fg2: "#5c574e",
      accent: "#1f4ed8",
      border: "#ddd7cb",
      borderStrong: "#b9b1a2",
      photo: "#ffffff",
      ...STATUS_LIGHT,
      info: "#1f4ed8",
    },
    fonts: { display: "--font-fraunces", body: "--font-plex" },
    display: { case: "none", stretch: "100%", weight: 600, tracking: "-0.02em" },
    radius: { r: "6px", rLg: "10px" },
    space: { s7: "56px", s8: "88px", s9: "136px" },
    tilt: 0,
  },
  bodega: {
    id: "bodega",
    name: "Bodega",
    idea: "Denso: listas compactas con precio y disponibilidad al frente, sin adornos.",
    forWho: "Mayoristas y tiendas con cientos de referencias",
    scheme: "light",
    colors: {
      bg: "#eceef1",
      surface: "#ffffff",
      surface2: "#e1e4e8",
      surfaceHover: "#d6dae0",
      fg: "#15181d",
      fg2: "#4b5260",
      accent: "#b54708",
      border: "#cfd4db",
      borderStrong: "#a6adb8",
      photo: "#ffffff",
      ...STATUS_LIGHT,
    },
    fonts: { display: "--font-plex-condensed", body: "--font-plex" },
    display: { case: "uppercase", stretch: "100%", weight: 700, tracking: "0.01em" },
    radius: { r: "2px", rLg: "3px" },
    space: { s7: "28px", s8: "40px", s9: "56px" },
    tilt: 0,
  },
  barrio: {
    id: "barrio",
    name: "Barrio",
    idea: "Cálido y cercano: esquinas redondas, tonos tierra y letra amable.",
    forWho: "Tiendas pequeñas que venden por confianza",
    scheme: "light",
    colors: {
      bg: "#fbf6ee",
      surface: "#fffaf3",
      surface2: "#f3e9da",
      surfaceHover: "#ecdfcb",
      fg: "#2a1f17",
      fg2: "#68574a",
      accent: "#b3401b",
      border: "#e6d8c4",
      borderStrong: "#c9b394",
      photo: "#ffffff",
      ...STATUS_LIGHT,
    },
    fonts: { display: "--font-bricolage", body: "--font-nunito" },
    display: { case: "none", stretch: "100%", weight: 800, tracking: "-0.02em" },
    radius: { r: "12px", rLg: "20px" },
    space: { s7: "48px", s8: "72px", s9: "112px" },
    tilt: 0,
  },
};

const FALLBACK: Record<"display" | "body", string> = {
  display: `"Arial Narrow", system-ui, sans-serif`,
  body: `system-ui, -apple-system, "Segoe UI", sans-serif`,
};

function block(t: Theme): string {
  const c = t.colors;
  const vars: Record<string, string> = {
    "--bg": c.bg,
    "--surface": c.surface,
    "--surface-2": c.surface2,
    "--surface-hover": c.surfaceHover,
    "--fg": c.fg,
    "--fg-2": c.fg2,
    "--accent": c.accent,
    "--accent-ink": inkFor(c.accent),
    "--border": c.border,
    "--border-strong": c.borderStrong,
    "--photo": c.photo,
    "--ok": c.ok,
    "--warn": c.warn,
    "--info": c.info,
    "--off": c.off,
    "--danger": c.danger,
    "--placeholder": c.placeholder,
    "--f-display": `var(${t.fonts.display}), ${FALLBACK.display}`,
    "--f-body": `var(${t.fonts.body}), ${FALLBACK.body}`,
    "--disp-case": t.display.case,
    "--disp-stretch": t.display.stretch,
    "--disp-weight": String(t.display.weight),
    "--disp-tracking": t.display.tracking,
    "--r": t.radius.r,
    "--r-lg": t.radius.rLg,
    "--s7": t.space.s7,
    "--s8": t.space.s8,
    "--s9": t.space.s9,
    "--tilt": String(t.tilt),
    // Logos de marcas en un solo tono: blancos sobre oscuro, negros sobre claro.
    "--logo-filter": t.scheme === "dark" ? "brightness(0) invert(1)" : "brightness(0)",
    "color-scheme": t.scheme,
  };
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

/** Acento de la tienda llevado a cada tema: el mismo tono, aclarado u oscurecido lo justo para leerse. */
export function accentFor(theme: Theme, brandAccent: string | null): string {
  if (!brandAccent) return theme.colors.accent;
  return readableAccent(brandAccent, theme.colors.bg) ?? brandAccent;
}

/**
 * Hoja de variables de todos los temas. Van todos (no solo el elegido) para que la vista previa y las
 * miniaturas del panel funcionen sin recargar; son unos pocos cientos de bytes por tema.
 * `brandAccent` debe venir validado (#rrggbb): es lo único del panel que llega a esta hoja.
 */
export function themeCss(brandAccent: string | null): string {
  return THEME_IDS.map((id) => {
    const t = THEMES[id];
    const sel = id === DEFAULT_THEME ? `:root,[data-theme="${id}"]` : `[data-theme="${id}"]`;
    const accent = accentFor(t, brandAccent);
    return `${sel}{${block(t)};--accent:${accent};--accent-ink:${inkFor(accent)}}`;
  }).join("\n");
}

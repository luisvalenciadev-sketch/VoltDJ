/**
 * Contraste del color de acento (WCAG 2). El acento se usa como texto pequeño sobre el fondo de la tienda
 * (precios rebajados, pasos activos) y como fondo de botones, así que se exige 4,5:1 contra el fondo
 * y el texto del botón se elige solo (oscuro o blanco, el que más contraste dé).
 */
export const STORE_BG = "#101114";
export const INK_DARK = "#101114";
export const INK_LIGHT = "#ffffff";
export const MIN_ACCENT_CONTRAST = 4.5;

export function normalizeHex(raw: string): string | null {
  const v = raw.trim().toLowerCase().replace(/^#?/, "#");
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return null;
}

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Texto para un botón con fondo de acento. */
export function inkFor(accent: string): string {
  return contrast(accent, INK_DARK) >= contrast(accent, INK_LIGHT) ? INK_DARK : INK_LIGHT;
}

/**
 * El mismo tono, llevado lo mínimo hacia el blanco (fondo oscuro) o hacia el negro (fondo claro)
 * para leerse sobre `bg`; null si ya se lee.
 */
export function readableAccent(hex: string, bg = STORE_BG): string | null {
  if (contrast(hex, bg) >= MIN_ACCENT_CONTRAST) return null;
  const toward = luminance(bg) > 0.4 ? 0 : 255;
  const [r, g, b] = channels(hex);
  for (let t = 0.05; t <= 1.001; t += 0.05) {
    const mix = (c: number) => Math.round(c + (toward - c) * t).toString(16).padStart(2, "0");
    const next = `#${mix(r)}${mix(g)}${mix(b)}`;
    if (contrast(next, bg) >= MIN_ACCENT_CONTRAST) return next;
  }
  return toward ? "#ffffff" : "#000000";
}

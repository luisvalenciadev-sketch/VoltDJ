import { describe, expect, it } from "vitest";
import { contrast, inkFor, MIN_ACCENT_CONTRAST } from "@/lib/color";
import { accentFor, isThemeId, THEME_IDS, themeCss, THEMES } from "./themes";

/** Texto normal: 4,5:1 (WCAG AA). Cada par es "color de texto" sobre "fondo donde aparece". */
const TEXT_PAIRS = [
  ["fg", "bg"],
  ["fg", "surface"],
  ["fg", "surface2"],
  ["fg2", "bg"],
  ["fg2", "surface"],
  ["accent", "bg"],
  ["accent", "surface"],
  ["ok", "bg"],
  ["ok", "surface"],
  ["warn", "bg"],
  ["warn", "surface"],
  ["info", "bg"],
  ["off", "bg"],
  ["danger", "bg"],
  ["danger", "surface"],
  ["placeholder", "bg"],
] as const;

describe.each(THEME_IDS)("tema %s", (id) => {
  const c = THEMES[id].colors;

  it.each(TEXT_PAIRS)("%s se lee sobre %s", (text, bg) => {
    expect(contrast(c[text], c[bg]), `${c[text]} sobre ${c[bg]}`).toBeGreaterThanOrEqual(4.5);
  });

  it("el texto de los botones de acento se lee", () => {
    expect(contrast(inkFor(c.accent), c.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it("un acento de marca cualquiera queda legible en este tema", () => {
    for (const brand of ["#b8ff32", "#c8102e", "#ffd400", "#1d4ed8", "#00a86b"]) {
      const a = accentFor(THEMES[id], brand);
      expect(contrast(a, c.bg), `${brand} → ${a}`).toBeGreaterThanOrEqual(MIN_ACCENT_CONTRAST);
    }
  });
});

describe("themeCss", () => {
  it("declara todos los temas, el de base también en :root, y solo acepta ids conocidos", () => {
    const css = themeCss(null);
    for (const id of THEME_IDS) expect(css).toContain(`[data-theme="${id}"]`);
    expect(css.startsWith(':root,[data-theme="escenario"]')).toBe(true);
    expect(isThemeId("vitrina")).toBe(true);
    expect(isThemeId("otro")).toBe(false);
  });
});

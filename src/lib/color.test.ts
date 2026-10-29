import { describe, expect, it } from "vitest";
import { contrast, INK_DARK, INK_LIGHT, inkFor, MIN_ACCENT_CONTRAST, normalizeHex, readableAccent, STORE_BG } from "./color";

describe("normalizeHex", () => {
  it("acepta #rgb y #rrggbb, con o sin numeral, y rechaza lo demás", () => {
    expect(normalizeHex("#B8FF32")).toBe("#b8ff32");
    expect(normalizeHex("b8ff32")).toBe("#b8ff32");
    expect(normalizeHex("#f00")).toBe("#ff0000");
    expect(normalizeHex("red")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex("#123456;}body{")).toBeNull();
  });
});

describe("contraste del acento", () => {
  it("calcula la razón WCAG", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrast("#777777", "#777777")).toBe(1);
  });

  it("elige texto oscuro sobre acentos claros y blanco sobre los oscuros", () => {
    expect(inkFor("#b8ff32")).toBe(INK_DARK);
    expect(inkFor("#1d4ed8")).toBe(INK_LIGHT);
  });

  it("el acento actual se lee sobre el fondo y no necesita ajuste", () => {
    expect(readableAccent("#b8ff32")).toBeNull();
  });

  it("aclara un rojo de marca lo justo para llegar a 4,5:1", () => {
    const fixed = readableAccent("#c8102e")!;
    expect(fixed).not.toBe("#c8102e");
    expect(contrast(fixed, STORE_BG)).toBeGreaterThanOrEqual(MIN_ACCENT_CONTRAST);
    expect(contrast(fixed, STORE_BG)).toBeLessThan(6);
  });
});

import { describe, expect, it } from "vitest";
import { initialContent, mergeContent, type Banner } from "@/config/content";
import { formatRating, liveBanners, safeHref, youtubeId } from "./home-content";

const banner = (over: Partial<Banner>): Banner => ({ id: "b", title: "T", subtitle: "", ctaLabel: "", ctaHref: "", image: null, startsAt: null, endsAt: null, active: true, ...over });

describe("contenido del inicio", () => {
  it("reconoce videos de YouTube en sus formatos habituales", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://youtube.com/shorts/dQw4w9WgXcQ?feature=share")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://vimeo.com/123")).toBeNull();
    expect(youtubeId("hola")).toBeNull();
  });

  it("muestra solo los banners activos dentro de sus fechas", () => {
    const now = new Date("2026-11-10T12:00:00Z");
    const list = [banner({ id: "ok" }), banner({ id: "off", active: false }), banner({ id: "old", endsAt: "2026-11-01" }), banner({ id: "later", startsAt: "2026-12-01" })];
    expect(liveBanners(list, now).map((b) => b.id)).toEqual(["ok"]);
  });

  it("solo acepta enlaces internos o web en los botones", () => {
    expect(safeHref("/catalogo/parlantes")).toBe("/catalogo/parlantes");
    expect(safeHref("https://wa.me/57300")).toBe("https://wa.me/57300");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("//evil.com")).toBeNull();
  });

  it("escribe la calificación con coma decimal", () => {
    expect(formatRating(4.8)).toBe("4,8");
    expect(formatRating(5)).toBe("5,0");
  });

  it("una sección nueva del código aparece al final en tiendas que ya ordenaron las suyas", () => {
    const saved = { sections: [{ id: "preguntas" as const, enabled: false }, { id: "categorias" as const, enabled: true }] };
    const merged = mergeContent(initialContent(), saved);
    expect(merged.sections.slice(0, 2)).toEqual(saved.sections);
    expect(merged.sections).toHaveLength(initialContent().sections.length);
    expect(merged.faqs.length).toBeGreaterThan(0);
  });
});

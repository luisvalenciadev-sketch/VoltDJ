import { describe, expect, it } from "vitest";
import { initialStore, mergeStore } from "./store";

describe("mergeStore", () => {
  it("lo guardado manda, campo por campo, y un campo nuevo del código toma su valor inicial", () => {
    const base = initialStore();
    const saved = { name: "Sonido X", phone: null, brand: { accent: "#ff5533" } } as unknown as Parameters<typeof mergeStore>[1];
    const s = mergeStore(base, saved);
    expect(s.name).toBe("Sonido X");
    expect(s.phone).toBeNull();
    expect(s.brand.accent).toBe("#ff5533");
    expect(s.brand.logoOnDark).toBeNull();
    expect(s.shipping).toEqual(base.shipping);
    expect(s.seo.title).toBe(base.seo.title);
  });

  it("sin nada guardado usa los valores iniciales", () => {
    expect(mergeStore(initialStore(), null)).toEqual(initialStore());
  });
});

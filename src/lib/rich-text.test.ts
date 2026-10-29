import { describe, expect, it } from "vitest";
import { parseRichText } from "./rich-text";

describe("parseRichText", () => {
  it("arma subtítulos, listas y párrafos", () => {
    const blocks = parseRichText("## Garantía\nCubre defectos\nde fábrica.\n\n- 12 meses\n- Con factura\nOtro párrafo");
    expect(blocks).toEqual([
      { type: "h", text: "Garantía" },
      { type: "p", text: "Cubre defectos de fábrica." },
      { type: "ul", items: ["12 meses", "Con factura"] },
      { type: "p", text: "Otro párrafo" },
    ]);
  });

  it("no interpreta HTML ni deja bloques vacíos", () => {
    expect(parseRichText("\n\n<b>hola</b>\n\n")).toEqual([{ type: "p", text: "<b>hola</b>" }]);
    expect(parseRichText("")).toEqual([]);
  });
});

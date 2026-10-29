import { describe, expect, it } from "vitest";
import { holdChanges, wantedHolds } from "./order-stock";

const line = (productId: string | null, qty: number) => ({ productId, name: "x", qty, unitPrice: 1 });

describe("stock apartado por un pedido", () => {
  it("suma las líneas del mismo producto e ignora las escritas a mano", () => {
    expect([...wantedHolds([line("a", 1), line("a", 2), line(null, 5), line("b", 1)], false)]).toEqual([["a", 3], ["b", 1]]);
  });

  it("un pedido cancelado no aparta nada", () => {
    expect(wantedHolds([line("a", 2)], true).size).toBe(0);
  });

  it("solo mueve la diferencia: tomar al crear, ajustar al editar, devolver al cancelar", () => {
    expect(holdChanges([], wantedHolds([line("a", 2)], false))).toEqual([{ productId: "a", change: 2 }]);
    expect(holdChanges([{ productId: "a", qty: 2 }], wantedHolds([line("a", 3), line("b", 1)], false))).toEqual([
      { productId: "a", change: 1 },
      { productId: "b", change: 1 },
    ]);
    expect(holdChanges([{ productId: "a", qty: 2 }], wantedHolds([line("a", 2)], true))).toEqual([{ productId: "a", change: -2 }]);
  });

  it("repetir la misma operación no mueve nada", () => {
    expect(holdChanges([{ productId: "a", qty: 2 }], wantedHolds([line("a", 2)], false))).toEqual([]);
  });
});

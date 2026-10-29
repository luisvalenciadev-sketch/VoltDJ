import { describe, expect, it } from "vitest";
import { holdChanges, unitsToReturn, wantedHolds } from "./order-stock";

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

  it("un faltante queda contado: cambiar de estado no vuelve a pedir unidades", () => {
    // Pedía 1, la bodega tenía 0: contó 1 y sacó 0.
    expect(holdChanges([{ productId: "a", qty: 1, taken: 0 }], wantedHolds([line("a", 1)], false))).toEqual([]);
  });

  it("al devolver solo vuelve lo que de verdad salió de la bodega", () => {
    expect(unitsToReturn(1, 0)).toBe(1); // cancelado: vuelve lo sacado
    expect(unitsToReturn(0, 0)).toBe(0); // nunca hubo unidades: no se inventan
    expect(unitsToReturn(1, 1)).toBe(0); // pedía 2, sacó 1, ahora pide 1: esa unidad sigue apartada
    expect(unitsToReturn(3, 1)).toBe(2);
  });
});

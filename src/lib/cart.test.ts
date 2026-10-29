import { describe, expect, it } from "vitest";
import type { CartProduct } from "@/data/types";
import { acknowledgePrices, addItem, clampQty, parseStoredCart, removeItem, setItemQty, summarize, type CartItem } from "./cart";

const product = (over: Partial<CartProduct> = {}): CartProduct => ({
  id: "a", slug: "a", name: "Producto A", brand: "Marca", sku: "SKU-A", art: "controller", image: null,
  price: 100000, promoPrice: null, availability: "disponible", maxQtyPerOrder: 5, ...over,
});

describe("clampQty", () => {
  it("limita entre 1 y el máximo y trunca decimales", () => {
    expect(clampQty(0, 5)).toBe(1);
    expect(clampQty(-3, 5)).toBe(1);
    expect(clampQty(9, 5)).toBe(5);
    expect(clampQty(2.7, 5)).toBe(2);
    expect(clampQty(Number.NaN, 5)).toBe(1);
  });
});

describe("addItem", () => {
  it("añade y acumula cantidades respetando el máximo por pedido", () => {
    const p = product({ maxQtyPerOrder: 3 });
    let items = addItem([], p, 2);
    expect(items).toEqual([{ id: "a", qty: 2, seenPrice: 100000 }]);
    items = addItem(items, p, 2);
    expect(items[0].qty).toBe(3);
  });

  it("no añade productos agotados", () => {
    expect(addItem([], product({ availability: "agotado" }))).toEqual([]);
  });

  it("guarda el precio promocional como precio visto", () => {
    expect(addItem([], product({ promoPrice: 80000 }))[0].seenPrice).toBe(80000);
  });
});

describe("setItemQty / removeItem", () => {
  const items: CartItem[] = [{ id: "a", qty: 1, seenPrice: 1 }, { id: "b", qty: 2, seenPrice: 1 }];
  it("modifica solo la línea indicada y valida la cantidad", () => {
    expect(setItemQty(items, "b", 50, 4)).toEqual([items[0], { id: "b", qty: 4, seenPrice: 1 }]);
    expect(setItemQty(items, "a", 0, 4)[0].qty).toBe(1);
  });
  it("elimina por id", () => {
    expect(removeItem(items, "a")).toEqual([items[1]]);
  });
});

describe("summarize", () => {
  const catalog = [
    product({ id: "a", price: 1890000, promoPrice: 1690000 }),
    product({ id: "b", price: 590000 }),
    product({ id: "c", price: null, availability: "consultar" }),
    product({ id: "d", price: 200000, availability: "agotado" }),
  ];

  it("calcula subtotal con precio vigente y cantidades", () => {
    const s = summarize([{ id: "a", qty: 1, seenPrice: 1690000 }, { id: "b", qty: 2, seenPrice: 590000 }], catalog);
    expect(s.subtotal).toBe(1690000 + 2 * 590000);
    expect(s.units).toBe(3);
    expect(s.hasIssues).toBe(false);
  });

  it("excluye productos sin precio del subtotal y lo indica", () => {
    const s = summarize([{ id: "b", qty: 1, seenPrice: 590000 }, { id: "c", qty: 1, seenPrice: null }], catalog);
    expect(s.subtotal).toBe(590000);
    expect(s.hasUnpriced).toBe(true);
    expect(s.orderable).toHaveLength(2);
  });

  it("marca descontinuados y agotados y no los incluye en el pedido", () => {
    const s = summarize([{ id: "zzz", qty: 1, seenPrice: 5 }, { id: "d", qty: 1, seenPrice: 200000 }, { id: "b", qty: 1, seenPrice: 590000 }], catalog);
    expect(s.lines.map((l) => l.kind)).toEqual(["missing", "soldout", "ok"]);
    expect(s.orderable.map((l) => l.product.id)).toEqual(["b"]);
    expect(s.subtotal).toBe(590000);
    expect(s.hasIssues).toBe(true);
  });

  it("detecta cambios de precio y deja de avisar al reconocerlos", () => {
    const items = [{ id: "a", qty: 1, seenPrice: 1890000 }];
    const s = summarize(items, catalog);
    expect(s.lines[0]).toMatchObject({ kind: "ok", priceChangedFrom: 1890000, unit: 1690000 });
    expect(summarize(acknowledgePrices(items, catalog), catalog).hasIssues).toBe(false);
  });

  it("recorta cantidades que superan el nuevo máximo", () => {
    const s = summarize([{ id: "a", qty: 9, seenPrice: 1690000 }], catalog);
    expect(s.lines[0]).toMatchObject({ qty: 5, qtyClamped: true });
    expect(s.subtotal).toBe(5 * 1690000);
  });
});

describe("parseStoredCart", () => {
  it("descarta datos corruptos, duplicados y cantidades inválidas", () => {
    const raw = JSON.stringify([
      { id: "a", qty: 2, seenPrice: 10 },
      { id: "a", qty: 1 },
      { id: "b", qty: -1 },
      { id: "c", qty: 1.5 },
      { id: 5, qty: 1 },
      null,
      { id: "d", qty: 1, seenPrice: "x" },
    ]);
    expect(parseStoredCart(raw)).toEqual([{ id: "a", qty: 2, seenPrice: 10 }, { id: "d", qty: 1, seenPrice: null }]);
    expect(parseStoredCart("{no json")).toEqual([]);
    expect(parseStoredCart(null)).toEqual([]);
  });
});

import { SEED_PRODUCTS } from "@/data/products";
import type { ProductRecord } from "@/data/types";
import { availabilityFor, stockLevel, toPublicProduct } from "./inventory";

const base: ProductRecord = { ...SEED_PRODUCTS.find((p) => p.id === "pioneer-dj-ddj-flx4")! };
const rec = (patch: Partial<ProductRecord>): ProductRecord => ({ ...base, ...patch });

describe("disponibilidad desde el stock", () => {
  it("sin control de inventario se muestra disponible", () => {
    expect(availabilityFor({ stock: null, lowStockAt: 3, allowBackorder: false })).toBe("disponible");
  });
  it("sin unidades: agotado, o bajo pedido si la tienda lo permite", () => {
    expect(availabilityFor({ stock: 0, lowStockAt: 0, allowBackorder: false })).toBe("agotado");
    expect(availabilityFor({ stock: 0, lowStockAt: 0, allowBackorder: true })).toBe("bajo_pedido");
  });
  it("hasta el umbral muestra pocas unidades; con umbral 0 nunca", () => {
    expect(availabilityFor({ stock: 3, lowStockAt: 3, allowBackorder: false })).toBe("pocas");
    expect(availabilityFor({ stock: 4, lowStockAt: 3, allowBackorder: false })).toBe("disponible");
    expect(availabilityFor({ stock: 1, lowStockAt: 0, allowBackorder: false })).toBe("disponible");
  });
  it("el panel marca agotados y stock bajo", () => {
    expect(stockLevel({ stock: 0, lowStockAt: 2 })).toBe("agotado");
    expect(stockLevel({ stock: 2, lowStockAt: 2 })).toBe("bajo");
    expect(stockLevel({ stock: null, lowStockAt: 2 })).toBe("sin-control");
  });
});

describe("producto de la tienda", () => {
  const promo = { percent: 15, endsAt: "2026-11-30" };

  it("aplica la promoción general redondeada al millar", () => {
    const p = toPublicProduct(rec({ price: 1300000 }), promo);
    expect(p.promoPrice).toBe(1105000);
    expect(p.promoEndsAt).toBe("2026-11-30");
  });
  it("el precio rebajado propio gana sobre la promoción general y no tiene fecha", () => {
    const p = toPublicProduct(rec({ price: 1300000, salePrice: 1000000 }), promo);
    expect(p.promoPrice).toBe(1000000);
    expect(p.promoEndsAt).toBeNull();
  });
  it("ignora un precio rebajado mayor o igual al de lista", () => {
    expect(toPublicProduct(rec({ price: 1300000, salePrice: 1400000 }), null).promoPrice).toBeNull();
  });
  it("sin promoción vigente no hay precio rebajado", () => {
    expect(toPublicProduct(rec({ price: 1300000 }), null).promoPrice).toBeNull();
  });
  it("no deja pedir más unidades de las que hay, salvo bajo pedido", () => {
    expect(toPublicProduct(rec({ stock: 2, maxPerOrder: 5 }), null).maxQtyPerOrder).toBe(2);
    expect(toPublicProduct(rec({ stock: 2, maxPerOrder: 5, allowBackorder: true }), null).maxQtyPerOrder).toBe(5);
    expect(toPublicProduct(rec({ stock: null, maxPerOrder: 3 }), null).maxQtyPerOrder).toBe(3);
  });
});

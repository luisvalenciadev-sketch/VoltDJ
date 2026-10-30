import { describe, expect, it } from "vitest";
import type { CartProduct } from "@/data/types";
import { summarize } from "./cart";
import { draftLines, draftSubtotal, draftUnits, validateCustomer } from "./order-drafts";

const p = (id: string, over: Partial<CartProduct> = {}): CartProduct => ({
  id, slug: id, name: `Producto ${id}`, brand: "M", sku: `REF-${id}`, art: "mic", image: null,
  price: 100000, promoPrice: null, availability: "disponible", maxQtyPerOrder: 9, ...over,
});

describe("validateCustomer", () => {
  it("normaliza nombre, celular, ciudad y correo", () => {
    const r = validateCustomer({ name: "  Ana   Gómez ", phone: "300 123 4567", city: "Cali\n", address: " Cra 1 ", email: "ANA@Correo.co", zoneId: "z1" }, [{ id: "z1" }]);
    expect(r).toEqual({ customer: { customerName: "Ana Gómez", phone: "573001234567", city: "Cali", address: "Cra 1", email: "ana@correo.co", zoneId: "z1" } });
  });

  it("exige nombre, celular y ciudad; dirección y correo son opcionales", () => {
    expect(validateCustomer({})).toEqual({
      errors: { name: "Escribe tu nombre y apellido.", phone: "Escribe un celular válido, p. ej. 300 123 4567.", city: "Escribe la ciudad de entrega." },
    });
    const ok = validateCustomer({ name: "Ana", phone: "3001234567", city: "Cali" });
    expect(ok).toMatchObject({ customer: { address: null, email: null, zoneId: null } });
  });

  it("rechaza correos inválidos y zonas que la tienda no tiene", () => {
    const r = validateCustomer({ name: "Ana", phone: "3001234567", city: "Cali", email: "ana@", zoneId: "inventada" }, [{ id: "z1" }]);
    expect(r).toEqual({ errors: { email: "El correo no parece válido.", zoneId: "Elige una zona de la lista." } });
  });
});

describe("draftLines", () => {
  it("congela el precio vigente, deja en 0 los productos sin precio y omite agotados", () => {
    const catalog = [p("a", { price: 200000, promoPrice: 150000 }), p("b", { price: null }), p("c", { availability: "agotado" })];
    const lines = draftLines(summarize([{ id: "a", qty: 2, seenPrice: null }, { id: "b", qty: 1, seenPrice: null }, { id: "c", qty: 1, seenPrice: null }], catalog));
    expect(lines).toEqual([
      { productId: "a", name: "Producto a", qty: 2, unitPrice: 150000 },
      { productId: "b", name: "Producto b", qty: 1, unitPrice: 0 },
    ]);
    expect(draftSubtotal({ lines })).toBe(300000);
    expect(draftUnits({ lines })).toBe(3);
  });
});

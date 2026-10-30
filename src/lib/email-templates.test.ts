import { describe, expect, it } from "vitest";
import { lowStockEmail, orderEmail, type EmailStore } from "./email-templates";

const store: EmailStore = { name: "VOLT DJ", accent: "#b8ff32", logoUrl: null, whatsappNumber: "573001234567", phone: "324 203 8766", address: "Calle 17 #4-91, Ibagué" };
const guide = {
  code: "VD-ABCD-1234",
  customerName: "Laura Gómez",
  lines: [{ productId: "x", name: "Pioneer DJ DDJ-FLX4", qty: 1, unitPrice: 1_105_000 }],
  shipping: 15_000,
  paid: 500_000,
  carrier: "Servientrega",
  trackingNumber: "123456",
};
const url = "https://volt-dj.vercel.app/seguimiento/VD-ABCD-1234";

describe("correos de pedido", () => {
  it("la confirmación trae productos, total, saldo y el enlace de seguimiento", () => {
    const e = orderEmail(store, guide, { status: "confirmado", at: "2026-11-10T14:00:00Z" }, url);
    expect(e.subject).toBe("Tu pedido VD-ABCD-1234 está confirmado");
    expect(e.text).toContain("1 × Pioneer DJ DDJ-FLX4: $ 1.105.000");
    expect(e.text).toContain("Total del pedido: $ 1.120.000");
    expect(e.text).toContain("Saldo pendiente: $ 620.000");
    expect(e.html).toContain(`href="${url}"`);
  });

  it("la entrega fallida lleva el motivo y el botón para reprogramar", () => {
    const e = orderEmail(store, guide, { status: "entrega_fallida", at: "2026-11-10T14:00:00Z", note: "No había nadie en la dirección" }, url);
    expect(e.text).toContain("pero no fue posible. Motivo: No había nadie en la dirección.");
    expect(e.text).toContain(`Elegir nueva fecha: ${url}`);
  });

  it("escapa lo que viene de los datos: un nombre con HTML no inyecta nada", () => {
    const e = orderEmail(store, { ...guide, customerName: '<img src=x onerror="alert(1)">' }, { status: "confirmado", at: "2026-11-10T14:00:00Z" }, url);
    expect(e.html).not.toContain("<img src=x");
    expect(e.html).toContain("&lt;img");
  });

  it("el botón usa el color de la marca con texto legible", () => {
    const e = orderEmail(store, guide, { status: "enviado", at: "2026-11-10T14:00:00Z" }, url);
    expect(e.html).toContain("background:#b8ff32;color:#101114");
  });

  it("el aviso al dueño distingue agotado de stock bajo", () => {
    expect(lowStockEmail(store, [{ name: "CDJ-3000", stock: 0 }], "https://x/admin/inventario").subject).toBe("Se agotó: CDJ-3000");
    expect(lowStockEmail(store, [{ name: "CDJ-3000", stock: 1 }], "https://x/admin/inventario").subject).toBe("Stock bajo: CDJ-3000");
  });
});

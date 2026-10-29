import { describe, expect, it } from "vitest";
import type { CartProduct } from "@/data/types";
import { summarize } from "./cart";
import { formatCOP } from "./pricing";
import { buildOrderMessage, buildProductMessage, buildWhatsAppLink, createOrderId, isWhatsAppConfigured, sanitizeCity } from "./whatsapp";

const p = (id: string, over: Partial<CartProduct> = {}): CartProduct => ({
  id, slug: id, name: `Producto ${id}`, brand: "M", sku: `REF-${id}`, art: "mic", image: null,
  price: 100000, promoPrice: null, availability: "disponible", maxQtyPerOrder: 9, ...over,
});

describe("formatCOP", () => {
  it("formatea pesos colombianos sin decimales y con separador de miles", () => {
    expect(formatCOP(1690000)).toBe("$ 1.690.000");
    expect(formatCOP(45000)).toBe("$ 45.000");
  });
});

describe("configuración del número", () => {
  it("acepta solo dígitos de 10 a 15 caracteres", () => {
    expect(isWhatsAppConfigured("")).toBe(false);
    expect(isWhatsAppConfigured("57300")).toBe(false);
    expect(isWhatsAppConfigured("+573001234567")).toBe(false);
    expect(isWhatsAppConfigured("573001234567")).toBe(true);
  });
  it("no genera enlace si el número no está configurado", () => {
    expect(buildWhatsAppLink("hola", "")).toBeNull();
  });
});

describe("buildWhatsAppLink", () => {
  it("codifica saltos de línea, tildes, símbolos y caracteres reservados", () => {
    const text = "Hola VOLT DJ\nAudífonos & cables: $ 1.690.000 · ¿envío? #1 50%";
    const link = buildWhatsAppLink(text, "573001234567")!;
    expect(link.startsWith("https://wa.me/573001234567?text=")).toBe(true);
    const encoded = link.split("?text=")[1];
    expect(encoded).not.toMatch(/[\s&#?\n]/);
    expect(decodeURIComponent(encoded)).toBe(text);
    expect(new URL(link).searchParams.get("text")).toBe(text);
  });
});

describe("buildOrderMessage", () => {
  const catalog = [p("a", { name: "Controlador DJ", sku: "VD-CTR-002", price: 1890000, promoPrice: 1690000 }), p("b", { price: 590000 }), p("c", { price: null }), p("d", { availability: "agotado" })];

  it("incluye tienda, ID, nombre, referencia, cantidad, precios, subtotal y consulta de envío", () => {
    const summary = summarize([{ id: "a", qty: 1, seenPrice: null }, { id: "b", qty: 2, seenPrice: null }], catalog);
    const msg = buildOrderMessage(summary, { orderId: "VD-261028-ABCD", storeName: "VOLT DJ", city: "Medellín" });
    expect(msg).toBe(
      [
        "Hola VOLT DJ, quiero consultar este pedido.",
        "Pedido provisional: VD-261028-ABCD",
        "",
        "1. Controlador DJ",
        "   Ref.: VD-CTR-002",
        "   Cantidad: 1",
        "   Precio unitario: $ 1.690.000 · Total: $ 1.690.000",
        "   Precio normal: $ 1.890.000 (−11% de descuento)",
        "2. Producto b",
        "   Ref.: REF-b",
        "   Cantidad: 2",
        "   Precio unitario: $ 590.000 · Total: $ 1.180.000",
        "",
        "Precio normal: $ 3.070.000",
        "Descuento: −$ 200.000",
        "Subtotal estimado: $ 2.870.000",
        "No incluye envío.",
        "Ciudad de envío: Medellín",
        "",
        "¿Me confirman disponibilidad, costo de envío y tiempo de entrega?",
      ].join("\n"),
    );
  });

  it("sin promociones no agrega líneas de descuento", () => {
    const summary = summarize([{ id: "b", qty: 1, seenPrice: null }], catalog);
    expect(summary.savings).toBe(0);
    expect(buildOrderMessage(summary, { orderId: "VD-261028-ABCD", storeName: "VOLT DJ" })).not.toMatch(/Precio normal|Descuento/);
  });

  it("marca precio por confirmar y omite agotados", () => {
    const summary = summarize([{ id: "c", qty: 1, seenPrice: null }, { id: "d", qty: 1, seenPrice: null }], catalog);
    const msg = buildOrderMessage(summary, { orderId: "X", storeName: "S" });
    expect(msg).toContain("Precio: por confirmar");
    expect(msg).toContain("(sin incluir productos con precio por confirmar)");
    expect(msg).not.toContain("Producto d");
    expect(msg).not.toContain("Ciudad de envío");
  });

  it("no afirma que el pedido esté confirmado", () => {
    const msg = buildOrderMessage(summarize([{ id: "b", qty: 1, seenPrice: null }], catalog), { orderId: "X" });
    expect(msg.toLowerCase()).not.toMatch(/confirmado|recibido/);
  });
});

describe("sanitizeCity", () => {
  it("elimina saltos de línea y limita la longitud", () => {
    expect(sanitizeCity("  Bogotá\n\nD.C.  ")).toBe("Bogotá D.C.");
    expect(sanitizeCity("x".repeat(100))).toHaveLength(60);
  });
});

describe("buildProductMessage", () => {
  it("usa el precio vigente o indica por confirmar", () => {
    expect(buildProductMessage({ name: "N", sku: "S", price: 100, promoPrice: 90 }, "T")).toContain("Precio publicado: $ 90");
    expect(buildProductMessage({ name: "N", sku: "S", price: null, promoPrice: null }, "T")).toContain("Precio: por confirmar");
  });
});

describe("createOrderId", () => {
  it("genera un identificador con prefijo, fecha y código", () => {
    expect(createOrderId(new Date(2026, 9, 28), () => 0)).toBe("VD-261028-AAAA");
    expect(createOrderId()).toMatch(/^VD-\d{6}-[A-Z2-9]{4}$/);
  });
});

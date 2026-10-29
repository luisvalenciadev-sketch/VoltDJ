import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CartProduct } from "@/data/types";
import { CART_STORAGE_KEY, CartProvider } from "@/store/cart-store";
import { ToastProvider } from "@/store/toast";

// Número ficticio solo para pruebas: activa el enlace de WhatsApp.
vi.mock("@/config/store", async (orig) => {
  const mod = await orig<typeof import("@/config/store")>();
  return { ...mod, STORE: { ...mod.STORE, whatsappNumber: "570000000000" } };
});

const { AddToCart } = await import("./AddToCart");
const { CartView } = await import("./CartView");
const { OrderView } = await import("./OrderView");

const catalog: CartProduct[] = [
  { id: "a", slug: "a", name: "Controlador A", brand: "Marca", sku: "REF-A", art: "controller", image: null, price: 1890000, promoPrice: 1690000, availability: "disponible", maxQtyPerOrder: 3 },
  { id: "b", slug: "b", name: "Audífonos B", brand: "Marca", sku: "REF-B", art: "headphones", image: null, price: 590000, promoPrice: null, availability: "disponible", maxQtyPerOrder: 6 },
  { id: "c", slug: "c", name: "Monitores C", brand: "Marca", sku: "REF-C", art: "speaker", image: null, price: 100000, promoPrice: null, availability: "agotado", maxQtyPerOrder: 2 },
];

const wrap = (ui: React.ReactNode) => (
  <CartProvider>
    <ToastProvider>{ui}</ToastProvider>
  </CartProvider>
);

describe("AddToCart", () => {
  it("añade la cantidad elegida, respeta el máximo y persiste en localStorage", async () => {
    const user = userEvent.setup();
    render(wrap(<AddToCart product={catalog[0]} />));
    await user.click(screen.getByRole("button", { name: "Aumentar cantidad" }));
    await user.click(screen.getByRole("button", { name: /Añadir al carrito/ }));
    expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY)!)).toEqual([{ id: "a", qty: 2, seenPrice: 1690000 }]);
    expect(screen.getByRole("status")).toHaveTextContent("2 unidades añadidas al carrito");

    await user.click(screen.getByRole("button", { name: "Aumentar cantidad" }));
    await user.click(screen.getByRole("button", { name: /Añadir al carrito/ }));
    expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY)!)[0].qty).toBe(3);
    expect(screen.getByRole("status")).toHaveTextContent("Añadimos 1. El máximo por pedido es 3.");
  });

  it("no ofrece añadir productos agotados", () => {
    render(wrap(<AddToCart product={catalog[2]} />));
    expect(screen.queryByRole("button", { name: /Añadir/ })).toBeNull();
  });
});

describe("CartView", () => {
  it("muestra el estado vacío", async () => {
    render(wrap(<CartView catalog={catalog} />));
    expect(await screen.findByText("Tu carrito está vacío")).toBeInTheDocument();
  });

  it("calcula el subtotal, cambia cantidades, elimina y deshace", async () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ id: "a", qty: 1, seenPrice: 1690000 }, { id: "b", qty: 2, seenPrice: 590000 }]));
    const user = userEvent.setup();
    render(wrap(<CartView catalog={catalog} />));
    expect(await screen.findByTestId("subtotal")).toHaveTextContent("$ 2.870.000");

    const lineB = screen.getByRole("link", { name: "Audífonos B" }).closest("li")!;
    await user.click(within(lineB).getByRole("button", { name: "Aumentar cantidad" }));
    expect(screen.getByTestId("subtotal")).toHaveTextContent("$ 3.460.000");

    await user.click(within(lineB).getByRole("button", { name: "Eliminar Audífonos B" }));
    expect(screen.getByTestId("subtotal")).toHaveTextContent("$ 1.690.000");
    await user.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(screen.getByTestId("subtotal")).toHaveTextContent("$ 3.460.000");

    await user.click(screen.getByRole("button", { name: "Vaciar carrito" }));
    expect(screen.getByText("Tu carrito está vacío")).toBeInTheDocument();
    expect(localStorage.getItem(CART_STORAGE_KEY)).toBe("[]");
  });

  it("avisa de productos retirados, agotados y precios cambiados", async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ id: "zzz", qty: 1, seenPrice: 5 }, { id: "c", qty: 1, seenPrice: 100000 }, { id: "a", qty: 1, seenPrice: 1890000 }]),
    );
    const user = userEvent.setup();
    render(wrap(<CartView catalog={catalog} />));
    expect(await screen.findByText("Revisa tu carrito")).toBeInTheDocument();
    expect(screen.getByText("Producto ya no disponible")).toBeInTheDocument();
    expect(screen.getByText(/Se agotó después de añadirlo/)).toBeInTheDocument();
    expect(screen.getByText("El precio cambió: antes $ 1.890.000, ahora $ 1.690.000.")).toBeInTheDocument();
    expect(screen.getByTestId("subtotal")).toHaveTextContent("$ 1.690.000");
    await user.click(screen.getByRole("button", { name: "Entendido, usar precios actuales" }));
    expect(screen.queryByText(/El precio cambió/)).toBeNull();
  });
});

describe("OrderView", () => {
  it("genera el mensaje y un enlace wa.me codificado con el número configurado", async () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ id: "a", qty: 1, seenPrice: 1690000 }, { id: "c", qty: 1, seenPrice: 100000 }]));
    const user = userEvent.setup();
    render(wrap(<OrderView catalog={catalog} />));
    const preview = await screen.findByTestId("message-preview");
    expect(preview.textContent).toContain("1. Controlador A");
    expect(preview.textContent).toContain("Ref.: REF-A");
    expect(preview.textContent).not.toContain("Monitores C");

    await user.type(screen.getByLabelText(/Ciudad de envío/), "Cali");
    expect(screen.getByTestId("message-preview").textContent).toContain("Ciudad de envío: Cali");

    const link = screen.getByTestId("send-whatsapp") as HTMLAnchorElement;
    const url = new URL(link.href);
    expect(url.origin + url.pathname).toBe("https://wa.me/570000000000");
    expect(url.searchParams.get("text")).toBe(screen.getByTestId("message-preview").textContent);
    expect(url.searchParams.get("text")).toMatch(/^Hola VOLT DJ.*\nPedido provisional: VD-\d{6}-[A-Z2-9]{4}\n/s);

    await act(async () => {
      link.addEventListener("click", (e) => e.preventDefault(), { once: true });
      await user.click(link);
    });
    expect(screen.getByText(/Abrimos WhatsApp con tu pedido VD-/)).toBeInTheDocument();
    expect(screen.queryByText(/pedido (recibido|confirmado)/i)).toBeNull();
  });

  it("no permite enviar si no hay productos pedibles", async () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ id: "c", qty: 1, seenPrice: 100000 }]));
    render(wrap(<OrderView catalog={catalog} />));
    expect(await screen.findByText("No hay productos para enviar")).toBeInTheDocument();
  });
});

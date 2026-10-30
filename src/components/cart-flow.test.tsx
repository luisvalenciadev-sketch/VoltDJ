import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CartProduct } from "@/data/types";
import { CART_STORAGE_KEY, CartProvider } from "@/store/cart-store";
import { StoreInfoProvider } from "@/store/store-info";
import { ToastProvider } from "@/store/toast";
import { AddToCart } from "./AddToCart";
import { CartView, CUSTOMER_KEY } from "./CartView";

// La acción del servidor (guarda el pedido en la base) se simula: aquí se prueba el carrito.
const { submitOrder } = vi.hoisted(() => ({ submitOrder: vi.fn() }));
vi.mock("@/app/carrito/actions", () => ({ submitOrder }));

const catalog: CartProduct[] = [
  { id: "a", slug: "a", name: "Controlador A", brand: "Marca", sku: "REF-A", art: "controller", image: null, price: 1890000, promoPrice: 1690000, availability: "disponible", maxQtyPerOrder: 3 },
  { id: "b", slug: "b", name: "Audífonos B", brand: "Marca", sku: "REF-B", art: "headphones", image: null, price: 590000, promoPrice: null, availability: "disponible", maxQtyPerOrder: 6 },
  { id: "c", slug: "c", name: "Monitores C", brand: "Marca", sku: "REF-C", art: "speaker", image: null, price: 100000, promoPrice: null, availability: "agotado", maxQtyPerOrder: 2 },
];

// Número ficticio solo para pruebas: activa el enlace de WhatsApp.
const wrap = (ui: React.ReactNode) => (
  <StoreInfoProvider value={{ name: "VOLT DJ", whatsappNumber: "570000000000", orderIdPrefix: "VD", payments: [], shippingZones: [], sameDay: { enabled: false, cutoff: "", area: "" } }}>
    <CartProvider>
      <ToastProvider>{ui}</ToastProvider>
    </CartProvider>
  </StoreInfoProvider>
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

describe("Pedido desde el carrito", () => {
  beforeEach(() => {
    submitOrder.mockReset();
    sessionStorage.clear();
  });

  it("pide los datos antes de enviar y no abre WhatsApp si faltan", async () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ id: "a", qty: 1, seenPrice: 1690000 }]));
    const open = vi.spyOn(window, "open");
    const user = userEvent.setup();
    render(wrap(<CartView catalog={catalog} />));
    await user.click(await screen.findByTestId("send-whatsapp"));
    expect(screen.getByText("Escribe tu nombre y apellido.")).toBeInTheDocument();
    expect(screen.getByText(/Escribe un celular válido/)).toBeInTheDocument();
    expect(screen.getByText("Escribe la ciudad de entrega.")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre y apellido *")).toHaveFocus();
    expect(submitOrder).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it("guarda el pedido, abre WhatsApp con su código y recuerda los datos del cliente", async () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ id: "a", qty: 1, seenPrice: 1690000 }, { id: "c", qty: 1, seenPrice: 100000 }]));
    submitOrder.mockResolvedValue({ code: "VD-AB2C-DE3F", saved: true });
    const win = { opener: {}, location: { href: "" }, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(win as unknown as Window);
    const user = userEvent.setup();
    render(wrap(<CartView catalog={catalog} />));

    const preview = await screen.findByTestId("message-preview");
    expect(preview.textContent).toContain("1. Controlador A");
    expect(preview.textContent).not.toContain("Monitores C");

    await user.type(screen.getByLabelText("Nombre y apellido *"), "Ana Gómez");
    await user.type(screen.getByLabelText("Celular (WhatsApp) *"), "300 123 4567");
    await user.type(screen.getByLabelText("Ciudad *"), "Cali");
    await user.type(screen.getByLabelText("Dirección de entrega"), "Cra 1 # 2-3");
    await act(async () => {
      await user.click(screen.getByTestId("send-whatsapp"));
    });

    expect(submitOrder).toHaveBeenCalledWith({
      items: [{ id: "a", qty: 1, seenPrice: 1690000 }, { id: "c", qty: 1, seenPrice: 100000 }],
      customer: expect.objectContaining({ name: "Ana Gómez", phone: "300 123 4567", city: "Cali" }),
      code: null,
    });
    const url = new URL(win.location.href);
    expect(url.origin + url.pathname).toBe("https://wa.me/570000000000");
    const text = url.searchParams.get("text")!;
    expect(text).toBe(screen.getByTestId("message-preview").textContent);
    expect(text).toMatch(/^Hola VOLT DJ, quiero hacer este pedido\.\nCódigo de pedido: VD-AB2C-DE3F\nA nombre de: Ana Gómez\n/);
    expect(text).toContain("Ciudad de envío: Cali\nDirección: Cra 1 # 2-3");
    expect(win.opener).toBeNull();
    expect(screen.getByTestId("order-code")).toHaveTextContent("VD-AB2C-DE3F");
    expect(screen.queryByText(/pedido (recibido|confirmado)/i)).toBeNull();
    expect(JSON.parse(localStorage.getItem(CUSTOMER_KEY)!)).toMatchObject({ name: "Ana Gómez", city: "Cali" });

    // Reenviar el mismo carrito actualiza el pedido guardado en vez de crear otro.
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Enviar de nuevo/ }));
    });
    expect(submitOrder).toHaveBeenLastCalledWith(expect.objectContaining({ code: "VD-AB2C-DE3F" }));
  });

  it("si el servidor rechaza los datos, cierra la pestaña y muestra el error", async () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ id: "a", qty: 1, seenPrice: 1690000 }]));
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name: "Ana Gómez", phone: "3001234567", city: "Cali" }));
    submitOrder.mockResolvedValue({ error: "Revisa tus datos.", fields: { city: "Escribe la ciudad de entrega." } });
    const win = { opener: {}, location: { href: "" }, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(win as unknown as Window);
    const user = userEvent.setup();
    render(wrap(<CartView catalog={catalog} />));
    expect(await screen.findByLabelText("Nombre y apellido *")).toHaveValue("Ana Gómez");
    await act(async () => {
      await user.click(screen.getByTestId("send-whatsapp"));
    });
    expect(win.close).toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Revisa tus datos.");
    expect(screen.getByText("Escribe la ciudad de entrega.")).toBeInTheDocument();
  });

  it("no permite enviar si no hay productos pedibles", async () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ id: "c", qty: 1, seenPrice: 100000 }]));
    render(wrap(<CartView catalog={catalog} />));
    expect(await screen.findByTestId("send-whatsapp")).toBeDisabled();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DEMO_PRODUCTS } from "@/data/products.demo";
import { ProductCard } from "./ProductCard";

const byId = (id: string) => DEMO_PRODUCTS.find((p) => p.id === id)!;

describe("ProductCard", () => {
  it("muestra marca, nombre, precio promocional, precio anterior y descuento calculado", () => {
    render(<ProductCard product={byId("p01")} brand="Marca A" />);
    expect(screen.getByText("Marca A")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Controlador DJ 2 canales con pads de rendimiento" })).toHaveAttribute("href", "/producto/controlador-dj-2-canales-pads");
    expect(screen.getByText("$ 1.690.000")).toBeInTheDocument();
    expect(screen.getByText("$ 1.890.000")).toBeInTheDocument();
    expect(screen.getByText("−11%")).toBeInTheDocument();
    expect(screen.getByText("Disponible")).toBeInTheDocument();
  });

  it("no muestra precio anterior sin promoción y marca precio por confirmar", () => {
    const { container } = render(<ProductCard product={byId("p05")} brand="Marca B" />);
    expect(screen.getByText("Precio por confirmar")).toBeInTheDocument();
    expect(container.querySelector("s")).toBeNull();
    expect(screen.getByText("Consultar disponibilidad")).toBeInTheDocument();
  });

  it("oculta la acción de WhatsApp si el número no está configurado", () => {
    render(<ProductCard product={byId("p02")} brand="Marca B" />);
    expect(screen.queryByRole("link", { name: /por WhatsApp/ })).toBeNull();
  });
});

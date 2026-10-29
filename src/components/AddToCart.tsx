"use client";

import { useState } from "react";
import type { CartProduct } from "@/data/types";
import { clampQty } from "@/lib/cart";
import { canAddToCart } from "@/lib/pricing";
import { useCart } from "@/store/cart-store";
import { useToast } from "@/store/toast";
import { CartIcon } from "./icons";
import { Price } from "./ui";

export function QtyStepper({ value, max, onChange, label, size }: { value: number; max: number; onChange: (n: number) => void; label: string; size?: "sm" }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (raw: string) => {
    setDraft(null);
    onChange(clampQty(parseInt(raw, 10), max));
  };
  return (
    <div className={`stepper${size === "sm" ? " sm" : ""}`} role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(clampQty(value - 1, max))} disabled={value <= 1} aria-label="Disminuir cantidad">
        −
      </button>
      <input
        className="num"
        inputMode="numeric"
        aria-label="Cantidad"
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 3))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
        }}
      />
      <button type="button" onClick={() => onChange(clampQty(value + 1, max))} disabled={value >= max} aria-label="Aumentar cantidad">
        +
      </button>
    </div>
  );
}

function useAddWithFeedback(product: CartProduct) {
  const cart = useCart();
  const toast = useToast();
  return (n: number) => {
    const { added, limited } = cart.add(product, n);
    const action = { label: "Ver carrito", href: "/carrito" };
    if (added === 0) toast(`Ya tienes el máximo de ${product.maxQtyPerOrder} unidades en el carrito.`, action);
    else if (limited) toast(`Añadimos ${added}. El máximo por pedido es ${product.maxQtyPerOrder}.`, action);
    else toast(added === 1 ? "Añadido al carrito" : `${added} unidades añadidas al carrito`, action);
  };
}

/** Barra de compra fija para móvil; se coloca al final de la página, no dentro del bloque de compra. */
export function StickyAddBar({ product }: { product: CartProduct }) {
  const add = useAddWithFeedback(product);
  if (!canAddToCart(product.availability)) return null;
  return (
    <div className="stickybuy">
      <Price price={product.price} promoPrice={product.promoPrice} />
      <button type="button" className="btn btn-primary btn-sm" onClick={() => add(1)}>
        <CartIcon /> Añadir
      </button>
    </div>
  );
}

export function AddToCart({ product }: { product: CartProduct }) {
  const cart = useCart();
  const addWithFeedback = useAddWithFeedback(product);
  const [qty, setQty] = useState(1);
  if (!canAddToCart(product.availability)) return null;

  const inCart = cart.items.find((i) => i.id === product.id)?.qty ?? 0;
  const label = product.availability === "bajo_pedido" ? "Añadir al carrito (bajo pedido)" : "Añadir al carrito";
  const add = (n: number) => {
    addWithFeedback(n);
    setQty(1);
  };

  return (
    <>
      <div className="qtyrow">
        <QtyStepper value={qty} max={product.maxQtyPerOrder} onChange={setQty} label="Cantidad a añadir" />
        <button type="button" className="btn btn-primary" onClick={() => add(qty)}>
          <CartIcon />
          {label}
        </button>
      </div>
      <p className="note">
        Máximo {product.maxQtyPerOrder} por pedido.
        {cart.ready && inCart > 0 && ` Ya tienes ${inCart} en el carrito.`}
      </p>
    </>
  );
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CartProduct } from "@/data/types";
import { acknowledgePrices, addItem, parseStoredCart, removeItem, setItemQty, type CartItem } from "@/lib/cart";

export const CART_STORAGE_KEY = "voltdj.cart.v1";

interface CartContextValue {
  items: CartItem[];
  /** false hasta leer el almacenamiento local; evita parpadeos de "carrito vacío". */
  ready: boolean;
  count: number;
  add: (product: CartProduct, qty?: number) => { added: number; limited: boolean };
  setQty: (id: string, qty: number, max: number) => void;
  remove: (id: string) => CartItem | undefined;
  clear: () => CartItem[];
  restore: (items: CartItem[]) => void;
  acknowledge: (catalog: CartProduct[]) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartItem[] {
  try {
    return parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    setItems(readStorage());
    setReady(true);
    // Sincroniza el carrito entre pestañas abiertas.
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY) setItems(parseStoredCart(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const commit = useCallback((next: CartItem[]) => {
    itemsRef.current = next;
    setItems(next);
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Almacenamiento bloqueado (modo privado): el carrito funciona en memoria.
    }
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const get = () => itemsRef.current;
    return {
      items,
      ready,
      count: items.reduce((s, i) => s + i.qty, 0),
      add(product, qty = 1) {
        const before = get().find((i) => i.id === product.id)?.qty ?? 0;
        const next = addItem(get(), product, qty);
        commit(next);
        const after = next.find((i) => i.id === product.id)?.qty ?? 0;
        return { added: after - before, limited: after - before < qty };
      },
      setQty(id, qty, max) {
        commit(setItemQty(get(), id, qty, max));
      },
      remove(id) {
        const removed = get().find((i) => i.id === id);
        commit(removeItem(get(), id));
        return removed;
      },
      clear() {
        const prev = get();
        commit([]);
        return prev;
      },
      restore(restored) {
        const current = get();
        const merged = [...current, ...restored.filter((r) => !current.some((c) => c.id === r.id))];
        commit(merged);
      },
      acknowledge(catalog) {
        commit(acknowledgePrices(get(), catalog));
      },
    };
  }, [items, ready, commit]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}

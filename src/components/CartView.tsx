"use client";

import Link from "next/link";
import type { CartProduct } from "@/data/types";
import { summarize } from "@/lib/cart";
import { formatCOP } from "@/lib/pricing";
import { useCart } from "@/store/cart-store";
import { useToast } from "@/store/toast";
import { CartLines, SavingsRows, Steps } from "./CartLines";
import { CartIcon, WarnIcon } from "./icons";

export function CartSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando carrito" className="stack">
      {[0, 1].map((i) => (
        <div key={i} className="line">
          <div className="thumb sk" />
          <div className="info">
            <div className="sk" style={{ height: 10, width: "30%" }} />
            <div className="sk" style={{ height: 14, width: "80%" }} />
            <div className="sk" style={{ height: 12, width: "40%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyCart({ title = "Tu carrito está vacío", text = "Explora el catálogo y añade los equipos que quieres consultar." }) {
  return (
    <div className="empty" style={{ marginBottom: "var(--s7)" }}>
      <CartIcon />
      <b>{title}</b>
      <p>{text}</p>
      <Link className="btn btn-primary" href="/catalogo">Ir al catálogo</Link>
    </div>
  );
}

export function CartView({ catalog }: { catalog: CartProduct[] }) {
  const cart = useCart();
  const toast = useToast();

  if (!cart.ready) return <><Steps current={0} /><div className="pagehead"><h1 className="disp">Carrito</h1></div><CartSkeleton /></>;
  if (!cart.items.length) return <><Steps current={0} /><div className="pagehead"><h1 className="disp">Carrito</h1></div><EmptyCart /></>;

  const s = summarize(cart.items, catalog);
  const priceChanges = s.lines.some((l) => l.kind !== "missing" && l.priceChangedFrom != null);

  const remove = (id: string) => {
    const removed = cart.remove(id);
    if (removed) toast("Producto eliminado", { label: "Deshacer", onClick: () => cart.restore([removed]) });
  };
  const clear = () => {
    const prev = cart.clear();
    toast("Carrito vaciado", { label: "Deshacer", onClick: () => cart.restore(prev) });
  };

  return (
    <>
      <Steps current={0} />
      <div className="pagehead">
        <h1 className="disp">Carrito</h1>
        <p>
          {s.units} {s.units === 1 ? "unidad" : "unidades"} · los precios se recalculan con el catálogo actual.
        </p>
      </div>
      <div className="cartlayout">
        <div className="stack">
          {s.hasIssues && (
            <div className="alert warn" role="alert">
              <WarnIcon />
              <div>
                <b>Revisa tu carrito</b>
                <p>Algunos productos cambiaron desde que los añadiste. Los productos retirados o agotados no se incluirán en el pedido.</p>
                {priceChanges && (
                  <button type="button" className="link" style={{ marginTop: 8 }} onClick={() => cart.acknowledge(catalog)}>
                    Entendido, usar precios actuales
                  </button>
                )}
              </div>
            </div>
          )}
          <CartLines lines={s.lines} editable onQty={cart.setQty} onRemove={remove} />
          <div className="row-wrap" style={{ justifyContent: "space-between" }}>
            <Link className="link" href="/catalogo">Seguir comprando</Link>
            <button type="button" className="textbtn danger" onClick={clear}>Vaciar carrito</button>
          </div>
        </div>
        <aside className="summary" aria-labelledby="h-sum">
          <h2 className="disp" id="h-sum">Resumen</h2>
          {s.orderable.map((l) => (
            <div className="sumrow" key={l.product.id}>
              <span>{l.qty} × {l.product.name}</span>
              <span>{l.total == null ? "Por confirmar" : formatCOP(l.total)}</span>
            </div>
          ))}
          <SavingsRows summary={s} />
          <p className="note">
            No incluye envío.{s.hasUnpriced && " Hay productos con precio por confirmar."} El asesor confirma el valor final por WhatsApp.
          </p>
          {/* En celular este bloque queda fijo abajo: el siguiente paso siempre está al alcance del pulgar. */}
          <div className="dock">
            <div className="sumrow total">
              <span>Subtotal estimado</span>
              <span data-testid="subtotal">{formatCOP(s.subtotal)}</span>
            </div>
            {s.orderable.length > 0 ? (
              <Link className="btn btn-primary btn-block" href="/pedido">Revisar pedido</Link>
            ) : (
              <button type="button" className="btn btn-primary btn-block" disabled>Revisar pedido</button>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

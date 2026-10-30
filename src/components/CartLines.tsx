"use client";

import Link from "next/link";
import type { CartLine, CartSummary } from "@/lib/cart";
import { formatCOP } from "@/lib/pricing";
import { QtyStepper } from "./AddToCart";
import { AvailabilityBadge, ProductMedia } from "./ui";

interface Props {
  lines: CartLine[];
  editable: boolean;
  onQty?: (id: string, qty: number, max: number) => void;
  onRemove?: (id: string) => void;
}

export function CartLines({ lines, editable, onQty, onRemove }: Props) {
  return (
    <ul className="lines" aria-label="Productos del pedido">
      {lines.map((l) => {
        if (l.kind === "missing") {
          return (
            <li className="line" key={l.id}>
              <div className="thumb" />
              <div className="info">
                <b>Producto ya no disponible</b>
                <span className="note">Este producto fue retirado del catálogo y no se incluirá en el pedido.</span>
              </div>
              {editable && (
                <div className="ctrl">
                  <button type="button" className="textbtn danger" onClick={() => onRemove?.(l.id)}>Eliminar</button>
                </div>
              )}
            </li>
          );
        }
        const p = l.product;
        return (
          <li className="line" key={p.id}>
            <Link className="thumb" href={`/producto/${p.slug}`} tabIndex={-1} aria-hidden="true">
              <ProductMedia image={p.image} art={p.art} sizes="112px" />
            </Link>
            <div className="info">
              <span className="brand">{p.brand}</span>
              <Link href={`/producto/${p.slug}`}>{p.name}</Link>
              <span className="note mono">Ref. {p.sku}</span>
              <AvailabilityBadge value={p.availability} />
              {l.unit == null ? (
                <span className="note">Precio por confirmar · no suma al subtotal</span>
              ) : (
                <span className="note num unitp">
                  {formatCOP(l.unit)} c/u
                  {l.listUnit != null && (
                    <>
                      {" "}
                      <s>
                        <span className="sr-only">Precio normal: </span>
                        {formatCOP(l.listUnit)}
                      </s>{" "}
                      <span className="save">−{l.discount}%</span>
                    </>
                  )}
                </span>
              )}
              {l.kind === "soldout" && <span className="warn-text">Se agotó después de añadirlo. No se incluirá en el pedido.</span>}
              {l.priceChangedFrom != null && l.unit != null && (
                <span className="warn-text">
                  El precio cambió: antes {formatCOP(l.priceChangedFrom)}, ahora {formatCOP(l.unit)}.
                </span>
              )}
              {l.qtyClamped && <span className="warn-text">Ajustamos la cantidad al máximo por pedido ({p.maxQtyPerOrder}).</span>}
            </div>
            <div className="ctrl">
              {editable && l.kind === "ok" ? (
                <QtyStepper size="sm" value={l.qty} max={p.maxQtyPerOrder} onChange={(n) => onQty?.(p.id, n, p.maxQtyPerOrder)} label={`Cantidad de ${p.name}`} />
              ) : (
                <span className="note num">× {l.qty}</span>
              )}
              <span className="lt">{l.kind === "ok" && l.total != null ? formatCOP(l.total) : "—"}</span>
              {l.kind === "ok" && l.saving > 0 && <span className="saving-text num">Ahorras {formatCOP(l.saving)}</span>}
              {editable && (
                <button type="button" className="textbtn danger" onClick={() => onRemove?.(p.id)} aria-label={`Eliminar ${p.name}`}>
                  Eliminar
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Filas de precio normal y descuento del resumen; no aparecen si no hay promociones en el pedido. */
export function SavingsRows({ summary: s }: { summary: Pick<CartSummary, "listSubtotal" | "savings"> }) {
  if (s.savings <= 0) return null;
  return (
    <>
      <div className="sumrow">
        <span>Precio normal</span>
        <s>
          <span className="sr-only">Precio normal: </span>
          {formatCOP(s.listSubtotal)}
        </s>
      </div>
      <div className="sumrow saving">
        <span>Descuento</span>
        <span data-testid="savings">−{formatCOP(s.savings)}</span>
      </div>
    </>
  );
}

"use client";

import { installmentOffer } from "@/lib/payments";
import { formatCOP } from "@/lib/pricing";
import { useStoreInfo } from "@/store/store-info";

/** "o $X/mes" bajo el precio de la tarjeta, solo si la tienda tiene un medio a cuotas activo. */
export function ProductInstallments({ price }: { price: number | null }) {
  const offer = installmentOffer(price, useStoreInfo().payments);
  if (!offer) return null;
  return (
    <span className="installments-mini">
      o {formatCOP(offer.monthly)}/mes con {offer.method}
    </span>
  );
}

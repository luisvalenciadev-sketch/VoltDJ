"use client";

import type { Product } from "@/data/types";
import { buildProductMessage, buildWhatsAppLink } from "@/lib/whatsapp";
import { useStoreInfo } from "@/store/store-info";
import { WhatsAppIcon } from "./icons";

/** Botón de WhatsApp de la tarjeta: toma el número guardado en el panel, sin pasarlo por cada lista. */
export function ProductWhatsApp({ product: p }: { product: Pick<Product, "name" | "sku" | "price" | "promoPrice"> }) {
  const store = useStoreInfo();
  const wa = buildWhatsAppLink(buildProductMessage(p, store.name), store.whatsappNumber);
  if (!wa) return null;
  return (
    <a className="iconbtn wa" href={wa} target="_blank" rel="noopener noreferrer" aria-label={`Consultar ${p.name} por WhatsApp`}>
      <WhatsAppIcon />
    </a>
  );
}

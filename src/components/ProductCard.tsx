import Link from "next/link";
import type { Product } from "@/data/types";
import { discountPercent } from "@/lib/pricing";
import { buildProductMessage, buildWhatsAppLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "./icons";
import { AvailabilityBadge, Price, ProductMedia } from "./ui";

export function ProductCard({ product: p, brand }: { product: Product; brand: string }) {
  const off = discountPercent(p);
  const href = `/producto/${p.slug}`;
  const wa = buildWhatsAppLink(buildProductMessage(p));
  return (
    <article className="card" aria-labelledby={`pc-${p.id}`}>
      <div className="img">
        <ProductMedia image={p.images[0] ?? null} art={p.art} sizes="(min-width: 1080px) 25vw, (min-width: 720px) 33vw, 50vw" />
        {off > 0 && <span className="flag">−{off}%</span>}
      </div>
      <div className="body">
        <span className="brand">{brand}</span>
        <Link href={href} className="name" id={`pc-${p.id}`}>
          {p.name}
        </Link>
        <Price price={p.price} promoPrice={p.promoPrice} />
        <AvailabilityBadge value={p.availability} />
        <div className="foot">
          <Link href={href} className="btn btn-secondary" tabIndex={-1} aria-hidden="true">
            Ver detalles
          </Link>
          {wa && (
            <a className="btn btn-ghost wa" href={wa} target="_blank" rel="noopener noreferrer" aria-label={`Consultar ${p.name} por WhatsApp`}>
              <WhatsAppIcon />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

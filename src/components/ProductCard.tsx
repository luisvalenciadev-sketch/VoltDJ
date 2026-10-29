import Link from "next/link";
import type { Product } from "@/data/types";
import { discountPercent } from "@/lib/pricing";
import { ProductWhatsApp } from "./ProductWhatsApp";
import { Tilt } from "./Tilt";
import { AvailabilityBadge, Price, ProductMedia } from "./ui";

export function ProductCard({ product: p, brand }: { product: Product; brand: string }) {
  const off = discountPercent(p);
  const href = `/producto/${p.slug}`;
  return (
    <article className="card" aria-labelledby={`pc-${p.id}`}>
      <Tilt className="img" max={6}>
        <ProductMedia image={p.images[0] ?? null} art={p.art} sizes="(min-width: 1080px) 25vw, (min-width: 720px) 33vw, 50vw" />
        {off > 0 && <span className="flag">−{off}%</span>}
        <span className="glare" aria-hidden="true" />
      </Tilt>
      <div className="body">
        <span className="brand">{brand}</span>
        <Link href={href} className="name" id={`pc-${p.id}`}>
          {p.name}
        </Link>
        <AvailabilityBadge value={p.availability} />
        <div className="foot">
          <Price price={p.price} promoPrice={p.promoPrice} />
          <ProductWhatsApp product={{ name: p.name, sku: p.sku, price: p.price, promoPrice: p.promoPrice }} />
        </div>
      </div>
    </article>
  );
}

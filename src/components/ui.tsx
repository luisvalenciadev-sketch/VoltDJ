import Image from "next/image";
import Link from "next/link";
import type { Availability, ArtKind, ProductImage } from "@/data/types";
import { AVAILABILITY_LABEL, formatCOP, hasPromo, unitPrice } from "@/lib/pricing";
import { ProductArt } from "./ProductArt";

/** Marca visual para datos comerciales que la tienda aún no ha entregado. */
export function Pending({ children }: { children: React.ReactNode }) {
  return <em className="pending" title="Dato pendiente de la tienda">{children}</em>;
}

export function AvailabilityBadge({ value }: { value: Availability }) {
  return (
    <span className="avail" data-a={value}>
      {AVAILABILITY_LABEL[value]}
    </span>
  );
}

export function Price({ price, promoPrice }: { price: number | null; promoPrice: number | null }) {
  const current = unitPrice({ price, promoPrice });
  if (current == null) {
    return (
      <div className="price">
        <span className="tbc">Precio por confirmar</span>
      </div>
    );
  }
  return (
    <div className="price">
      <b>{formatCOP(current)}</b>
      {hasPromo({ price, promoPrice }) && price != null && (
        <s>
          <span className="sr-only">Precio anterior: </span>
          {formatCOP(price)}
        </s>
      )}
    </div>
  );
}

export function ProductMedia({ image, art, sizes, priority }: { image: ProductImage | null; art: ArtKind; sizes: string; priority?: boolean }) {
  if (image) {
    return (
      <Image
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        sizes={sizes}
        priority={priority}
        className={image.fit === "cover" ? "cover" : undefined}
      />
    );
  }
  return <ProductArt kind={art} />;
}

/** Crédito obligatorio para fotos de banco de imágenes (Pexels). */
export function PhotoCredit({ image }: { image: ProductImage | null | undefined }) {
  if (!image?.credit) return null;
  return (
    <p className="note">
      Foto de referencia, no del producto exacto:{" "}
      <a href={image.credit.source} target="_blank" rel="noopener noreferrer">
        {image.credit.name}
      </a>{" "}
      en{" "}
      <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">
        Pexels
      </a>
    </p>
  );
}

export function Meter() {
  const on = 5;
  return (
    <span className="meter" aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => (
        <i key={i} className={i === on ? "pk" : i < on ? "on" : undefined} style={{ height: `${30 + i * 10}%` }} />
      ))}
    </span>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="crumbs" aria-label="Ruta de navegación">
      <ol>
        {items.map((it, i) => (
          <li key={i}>{it.href ? <Link href={it.href}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}</li>
        ))}
      </ol>
    </nav>
  );
}

"use client";

import Image from "next/image";
import { useState } from "react";
import type { ArtKind, ProductImage } from "@/data/types";
import { ProductArt } from "./ProductArt";
import { PhotoCredit } from "./ui";

export function Gallery({ images, art, name, discount }: { images: ProductImage[]; art: ArtKind; name: string; discount: number }) {
  const [index, setIndex] = useState(0);
  const current = images[index];
  return (
    <div className="gallery">
      <div className="main">
        {current ? (
          <Image src={current.src} alt={current.alt} width={current.width} height={current.height} sizes="(min-width: 900px) 50vw, 100vw" priority className={current.fit === "cover" ? "cover" : undefined} />
        ) : (
          <ProductArt kind={art} />
        )}
        {discount > 0 && <span className="flag">−{discount}%</span>}
      </div>
      {images.length > 1 && (
        <div className="thumbs">
          {images.map((img, i) => (
            <button key={img.src} type="button" aria-pressed={i === index} aria-label={`Ver foto ${i + 1} de ${images.length} de ${name}`} onClick={() => setIndex(i)}>
              <Image src={img.src} alt="" width={120} height={120} sizes="120px" className={img.fit === "cover" ? "cover" : undefined} />
            </button>
          ))}
        </div>
      )}
      {!images.length && <p className="note">Ilustración de referencia: la fotografía del producto está pendiente.</p>}
      <PhotoCredit image={current} />
    </div>
  );
}

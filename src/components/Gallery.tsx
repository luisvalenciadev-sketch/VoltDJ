"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ArtKind, ProductImage } from "@/data/types";
import { ProductArt } from "./ProductArt";
import { ProductViewer } from "./ProductViewer";
import { LicenseCredit } from "./ui";

export function Gallery({ images, art, name, discount }: { images: ProductImage[]; art: ArtKind; name: string; discount: number }) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const current = images[index];

  // <dialog> modal: Escape, foco atrapado y fondo inerte vienen del navegador.
  // Solo falta bloquear el scroll de la página mientras está abierto.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (expanded && !d.open) d.showModal();
    if (!expanded && d.open) d.close();
    document.documentElement.style.overflow = expanded ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [expanded]);

  const label = `${name}: vista interactiva. Arrastra o usa las flechas para girarlo, acerca con doble clic, pellizco o las teclas + y −.`;
  // Se sirve la foto original (WebP de 1200 px ya optimizado por scripts/optimize-photos.mjs):
  // al ampliar 2,5× no debe verse borrosa, y re-procesarla en el optimizador de Next solo gasta CPU.
  const media = (priority: boolean) =>
    current ? (
      <Image key={current.src} src={current.src} alt={current.alt} width={current.width} height={current.height} unoptimized priority={priority} draggable={false} className={current.fit === "cover" ? "cover" : undefined} />
    ) : (
      <ProductArt kind={art} />
    );
  const mask = current && current.fit !== "cover" ? current.src : undefined;

  return (
    <div className="gallery">
      <div className="main">
        <ProductViewer key={current?.src ?? "art"} label={label} maskSrc={mask} onExpand={() => setExpanded(true)}>
          {media(true)}
        </ProductViewer>
        {discount > 0 && <span className="flag">−{discount}%</span>}
      </div>
      <LicenseCredit image={current} />
      {images.length > 1 && (
        <div className="thumbs">
          {images.map((img, i) => (
            <button key={img.src} type="button" aria-pressed={i === index} aria-label={`Ver foto ${i + 1} de ${images.length} de ${name}`} onClick={() => setIndex(i)}>
              <Image src={img.src} alt="" width={120} height={120} sizes="120px" className={img.fit === "cover" ? "cover" : undefined} />
            </button>
          ))}
        </div>
      )}
      <dialog ref={dialogRef} className="viewer-dialog" aria-label={`${name} en pantalla completa`} onClose={() => setExpanded(false)}>
        {expanded && (
          <ProductViewer label={label} maskSrc={mask} expanded onClose={() => setExpanded(false)}>
            {media(false)}
          </ProductViewer>
        )}
      </dialog>
    </div>
  );
}

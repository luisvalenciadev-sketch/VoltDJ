import Image from "next/image";
import Link from "next/link";
import type { Banner, HomeContent, Video } from "@/config/content";
import type { Product } from "@/data/types";
import { formatRating, safeHref } from "@/lib/home-content";
import { BannerTrack, LiteYouTube } from "./HomeContentClient";

/**
 * Banners del inicio. El texto va en HTML sobre la foto (no dentro de la imagen): se lee en celular,
 * lo encuentra Google y la tienda lo cambia sin diseñar otra imagen.
 */
export function BannerCarousel({ banners }: { banners: Banner[] }) {
  return (
    <section className="sec banners" aria-label="Novedades de la tienda">
      <div className="wrap">
        <BannerTrack count={banners.length}>
          {banners.map((b, i) => {
            const href = safeHref(b.ctaHref);
            const external = href?.startsWith("http");
            return (
              <article key={b.id} className="banner" aria-roledescription="banner" aria-label={`${i + 1} de ${banners.length}: ${b.title}`}>
                {b.image && <Image src={b.image.src} alt="" fill sizes="100vw" className="banner-img" priority={i === 0} />}
                <div className="banner-txt">
                  <h2 className="disp">{b.title}</h2>
                  {b.subtitle && <p>{b.subtitle}</p>}
                  {href && b.ctaLabel && (
                    <Link className="btn btn-primary" href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                      {b.ctaLabel}
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </BannerTrack>
      </div>
    </section>
  );
}

/** "Mira cómo suena": videos cortos verticales. Ninguno se descarga hasta que el cliente le da play. */
export function VideoSection({ videos, products }: { videos: Video[]; products: Product[] }) {
  return (
    <section className="sec" aria-labelledby="h-videos">
      <div className="wrap">
        <div className="sechead">
          <div>
            <span className="eyebrow">En la tienda</span>
            <h2 className="disp" id="h-videos">Mira cómo suena</h2>
          </div>
        </div>
        <ul className="videos">
          {videos.map((v) => {
            const product = v.productId ? products.find((p) => p.id === v.productId) : undefined;
            return (
              <li key={v.id} className="video">
                <div className="video-frame">
                  {v.youtubeId ? (
                    <LiteYouTube id={v.youtubeId} title={v.title} poster={v.poster?.src ?? null} />
                  ) : (
                    <video src={v.src!} poster={v.poster?.src} controls playsInline preload="none" aria-label={v.title} />
                  )}
                </div>
                <b>{v.title}</b>
                {product && (
                  <Link className="link" href={`/producto/${product.slug}`}>
                    Ver {product.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span className="stars" aria-hidden="true">
      {"★★★★★".slice(0, full)}
      <span>{"★★★★★".slice(full)}</span>
    </span>
  );
}

/** Reseñas escritas por la tienda a partir de las de Google (con enlace para que el cliente las verifique). */
export function ReviewsSection({ reviews }: { reviews: HomeContent["reviews"] }) {
  const url = reviews.url ? safeHref(reviews.url) : null;
  return (
    <section className="sec" aria-labelledby="h-reviews">
      <div className="wrap">
        <div className="sechead">
          <div>
            <span className="eyebrow">Lo que dicen los clientes</span>
            <h2 className="disp" id="h-reviews">Reseñas</h2>
            {reviews.rating != null && (
              <p className="rating-line">
                <Stars value={reviews.rating} />
                <b>{formatRating(reviews.rating)}</b> de 5{reviews.count ? ` · ${reviews.count.toLocaleString("es-CO")} reseñas en Google` : ""}
              </p>
            )}
          </div>
          {url && (
            <a className="link" href={url} target="_blank" rel="noopener noreferrer">
              Ver en Google
            </a>
          )}
        </div>
        {reviews.items.length > 0 && (
          <ul className="reviews">
            {reviews.items.map((r) => (
              <li key={r.id} className="review">
                <span className="sr-only">{r.rating} de 5 estrellas.</span>
                <Stars value={r.rating} />
                <p>“{r.text}”</p>
                <b>{r.author}</b>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

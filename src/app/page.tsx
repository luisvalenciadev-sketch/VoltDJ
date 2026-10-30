import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import { ProductArt } from "@/components/ProductArt";
import { ProductCard } from "@/components/ProductCard";
import { CartIcon, ChatIcon, ShieldIcon, TruckIcon } from "@/components/icons";
import { Marquee } from "@/components/Marquee";
import { PauseOffscreen, Tilt } from "@/components/Tilt";
import { Meter, Pending, Price, ProductMedia } from "@/components/ui";
import { FaqList } from "@/components/Content";
import { BannerCarousel, ReviewsSection, VideoSection } from "@/components/HomeContent";
import type { HomeSectionId } from "@/config/content";
import { getContent } from "@/data/content";
import { getStore } from "@/data/store";
import { liveBanners, liveVideos, safeHref } from "@/lib/home-content";
import { getBrands, getCategories, getProducts } from "@/data/catalog";
import { discountPercent, hasPromo } from "@/lib/pricing";

/*
 * Paisaje de espectro del hero: el medidor del logo llevado a 3D. Cada barra pulsa con un
 * retraso proporcional a su distancia al centro, así las ondas salen del producto hacia afuera.
 * Las filas del fondo son más tenues (profundidad atmosférica).
 */
const EQ_COLS = 22;
const EQ_ROWS = 7;
const EQ_BARS = Array.from({ length: EQ_COLS * EQ_ROWS }, (_, i) => {
  const col = i % EQ_COLS;
  const row = Math.floor(i / EQ_COLS);
  const dist = Math.hypot((col - (EQ_COLS - 1) / 2) / 2, row - EQ_ROWS + 1);
  const peak = Math.max(0.6, 5.2 - dist * 0.55) * (0.75 + ((col * 7 + row * 13) % 10) / 20);
  return {
    "--d": `${(-dist * 0.16).toFixed(2)}s`,
    "--hi": peak.toFixed(2),
    "--o": (0.25 + (row / (EQ_ROWS - 1)) * 0.75).toFixed(2),
  } as React.CSSProperties;
});

/*
 * Orden de la portada: primero el producto (visual, categorías, selección, ofertas, accesorios),
 * luego la confianza (marcas) y al final el soporte (cómo se compra, preguntas).
 * Cada sección tiene un único "ver más" en su cabecera: nunca dos CTAs compitiendo.
 */
export default async function HomePage() {
  const [products, categories, brands, store, content] = await Promise.all([getProducts(), getCategories(), getBrands(), getStore(), getContent()]);
  const banners = liveBanners(content.banners);
  const videos = liveVideos(content.videos);
  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? "";
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "";
  const featured = products.filter((p) => p.featured).slice(0, 4);
  const promos = products.filter(hasPromo).slice(0, 4);
  const accessories = products.filter((p) => p.categoryId === "accesorios").slice(0, 4);
  const catalogBrands = brands.filter((b) => products.some((p) => p.brandId === b.id));
  // Producto estrella de la portada: el primer destacado con foto (o el primero, con ilustración).
  const star = featured.find((p) => p.images[0]) ?? featured[0] ?? null;
  const starImage = star?.images[0] ?? null;
  const starBrand = star ? brandName(star.brandId) : "";
  const starModel = star ? (star.name.startsWith(`${starBrand} `) ? star.name.slice(starBrand.length + 1) : star.name) : "";
  const starOff = star ? discountPercent(star) : 0;
  const moreStars = featured.filter((p) => p.id !== star?.id).slice(0, 3);
  // Una frase por línea y la última resaltada: "Tu sonido. Tu energía. Tu escenario." da tres líneas.
  const lines = (store.tagline || store.name).split(/(?<=[.!?])\s+/).filter(Boolean);
  const last = lines.pop() ?? "";


  // Cada sección del inicio, en el orden y con el encendido que la tienda eligió en el panel.
  // Una sección sin contenido (sin ofertas, sin videos…) no se muestra aunque esté encendida.
  const blocks: Record<HomeSectionId, React.ReactNode> = {
    banners: banners.length > 0 && <BannerCarousel banners={banners} />,
    categorias: (
      <section className="sec" aria-labelledby="h-cats">
        <div className="wrap">
          <div className="sechead">
            <div>
              <span className="eyebrow">Catálogo</span>
              <h2 className="disp" id="h-cats">Categorías</h2>
              <p>Encuentra el equipo según lo que vas a hacer.</p>
            </div>
            <Link className="link" href="/catalogo">Ver todo el catálogo</Link>
          </div>
          <div className="cats">
            {categories.map((c) => (
              <Link key={c.id} className="cat" href={`/catalogo/${c.slug}`}>
                <span className="img">
                  {c.image ? (
                    <Image src={c.image.src} alt="" width={c.image.width} height={c.image.height} sizes="(min-width: 720px) 25vw, 50vw" className="cover" />
                  ) : (
                    <ProductArt kind={c.art} />
                  )}
                </span>
                <span className="meta">
                  <b>{c.name}</b>
                  <span>{products.filter((p) => p.categoryId === c.id).length}<span className="sr-only"> productos</span></span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    ),
    destacados: featured.length > 0 && (
        <section className="sec showcase" aria-labelledby="h-feat">
          <div className="wrap">
            <div className="sechead">
              <div>
                <span className="eyebrow">Selección de la tienda</span>
                <h2 className="disp" id="h-feat">Destacados</h2>
              </div>
              <Link className="link" href="/catalogo">Ver más</Link>
            </div>
            {/* Cada producto en su propio campo de color, inclinado, "aterrizando" con el scroll. */}
            <div className="reel">
              {featured.map((p, i) => {
                const brand = brandName(p.brandId);
                const model = p.name.startsWith(`${brand} `) ? p.name.slice(brand.length + 1) : p.name;
                return (
                  <article key={p.id} className="billboard" data-field={i % 4} aria-labelledby={`bb-${p.id}`}>
                    {/* Enlace a toda la banda como hijo directo: dentro de .txt, la animación de scroll
                        (transform) lo encerraría y solo el título sería clicable. */}
                    <Link className="billboard-link" href={`/producto/${p.slug}`} aria-label={`Ver producto: ${p.name}`} />
                    <div className="pose">
                      <Tilt className="tilt" max={8} lift={24} host=".billboard">
                        <div className="angle">
                          <ProductMedia image={p.images[0] ?? null} art={p.art} sizes="(min-width: 900px) 560px, 90vw" />
                        </div>
                      </Tilt>
                    </div>
                    <div className="txt">
                      {/* La cifra que el comprador busca primero (18", 4CH), editable en el panel. */}
                      {p.keyFigure && <span className="key-figure" aria-hidden="true">{p.keyFigure}</span>}
                      <span className="brand">{brand} · {categoryName(p.categoryId)}</span>
                      <h3 className="disp" id={`bb-${p.id}`}>
                        <span className="sr-only">{brand} </span>
                        {model}
                      </h3>
                      <Price price={p.price} promoPrice={p.promoPrice} />
                      <span className="go" aria-hidden="true">Ver producto</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
    ),
    ofertas: promos.length > 0 && (
        <section className="sec" aria-labelledby="h-promo">
          <div className="wrap">
            <div className="sechead">
              <div>
                <span className="eyebrow">Precio promocional</span>
                <h2 className="disp" id="h-promo">Ofertas vigentes</h2>
              </div>
              <Link className="link" href="/ofertas">Ver todas</Link>
            </div>
            <div className="grid-p">{promos.map((p) => <ProductCard key={p.id} product={p} brand={brandName(p.brandId)} />)}</div>
          </div>
        </section>
    ),
    accesorios: accessories.length > 0 && (
        <section className="sec" aria-labelledby="h-acc">
          <div className="wrap">
            <div className="sechead">
              <div>
                <span className="eyebrow">Completa tu setup</span>
                <h2 className="disp" id="h-acc">Accesorios</h2>
                <p>Cables, estuches, cápsulas y soportes.</p>
              </div>
              <Link className="link" href="/catalogo/accesorios">Ver accesorios</Link>
            </div>
            <div className="grid-p">{accessories.map((p) => <ProductCard key={p.id} product={p} brand={brandName(p.brandId)} />)}</div>
          </div>
        </section>
    ),
    videos: videos.length > 0 && <VideoSection videos={videos} products={products} />,
    resenas: (content.reviews.items.length > 0 || content.reviews.rating != null) && <ReviewsSection reviews={content.reviews} />,
    marcas: catalogBrands.length > 0 && (
      <section className="sec" aria-labelledby="h-brands">
        <div className="wrap">
          <div className="sechead">
            <div>
              <span className="eyebrow">Marcas en el catálogo</span>
              <h2 className="disp" id="h-brands">Las marcas de la cabina</h2>
            </div>
          </div>
        </div>
        <Marquee label="cinta de marcas" seconds={32} className="logos">
          {catalogBrands.map((b) => (
            <Link key={b.id} className="logo-item" href={`/catalogo?marca=${b.id}`} aria-label={`Ver productos ${b.name}`}>
              {b.logo && <Image src={b.logo.src} alt="" width={b.logo.width} height={b.logo.height} unoptimized className={b.logo.withName ? "mark" : undefined} />}
              {(!b.logo || b.logo.withName) && <span className="wordmark">{b.name}</span>}
            </Link>
          ))}
        </Marquee>
      </section>
    ),
    "como-compras": (
      <section className="band" aria-labelledby="h-how">
        <div className="wrap">
          <div className="sechead">
            <div>
              <span className="eyebrow">Sin pago en línea</span>
              <h2 className="disp" id="h-how">Cómo compras aquí</h2>
            </div>
          </div>
          <div className="benefits">
            <div className="benefit"><ChatIcon /><b>Asesoría por WhatsApp</b><p>Te ayudamos a elegir equipo compatible con tu software y tu setup.</p></div>
            <div className="benefit"><CartIcon /><b>Pedido sin pago en línea</b><p>Armas el carrito y un asesor confirma disponibilidad, envío y forma de pago.</p></div>
            <div className="benefit">
              <TruckIcon />
              <b>Envíos</b>
              <p>{store.shipping.summary ?? <Pending>Cobertura y tiempos de envío</Pending>}</p>
              <Link className="link" href="/envios-y-garantias">Política de envíos</Link>
            </div>
            <div className="benefit">
              <ShieldIcon />
              <b>Garantía</b>
              <p>{store.warranty.summary ?? <Pending>Garantía por marca o tienda</Pending>}</p>
              <Link className="link" href="/envios-y-garantias#garantias">Política de garantías</Link>
            </div>
          </div>
        </div>
      </section>
    ),
    preguntas: content.faqs.length > 0 && (
      <section className="sec" aria-labelledby="h-faq">
        <div className="wrap">
          <div className="sechead">
            <h2 className="disp" id="h-faq">Preguntas frecuentes</h2>
            <Link className="link" href="/preguntas-frecuentes">Ver todas</Link>
          </div>
          <FaqList items={content.faqs.slice(0, 4)} />
        </div>
      </section>
    ),
  };

  return (
    <>
      {/*
        Portada: título arriba, producto estrella al centro con su ficha (nombre y precio) y las acciones
        abajo. En escritorio el título y las acciones van a la izquierda y la escena a la derecha.
        Cada tema la viste distinto en src/styles/themes.css (luces, cartel de oferta, portada de revista…).
      */}
      <section className="hero" aria-labelledby="h-hero">
        <div className="wrap">
          <div className="stage">
            {starModel && <span className="ghost" aria-hidden="true">{starModel}</span>}
            <div className="head">
              {content.hero.eyebrow && (
                <p className="eyebrow">
                  <Meter />
                  {content.hero.eyebrow}
                </p>
              )}
              <h1 className="disp" id="h-hero">
                {lines.map((l, i) => (
                  <span key={i}>
                    {l}
                    <br />
                  </span>
                ))}
                <em>{last}</em>
              </h1>
            </div>
            <div className="scene">
              <PauseOffscreen className="eq">
                {EQ_BARS.map((b, i) => (
                  <i key={i} style={b} />
                ))}
              </PauseOffscreen>
              <span className="halo" aria-hidden="true" />
              <div className="prod">
                <div className="bob">
                  <Tilt className="tilt" max={12} lift={40} host=".stage">
                    <div className="angle">
                      {starImage ? (
                        <Image src={starImage.src} alt={starImage.alt} width={starImage.width} height={starImage.height} sizes="(min-width: 900px) 600px, 90vw" priority />
                      ) : (
                        <ProductArt kind="turntable" />
                      )}
                    </div>
                  </Tilt>
                </div>
                <span className="floor" aria-hidden="true" />
              </div>
              {star && (
                <Link className="spot" href={`/producto/${star.slug}`}>
                  <span className="spot-tag">
                    Destacado
                    {starOff > 0 && <span className="spot-off">−{starOff}%</span>}
                  </span>
                  <span className="spot-name">{star.name}</span>
                  <Price price={star.price} promoPrice={star.promoPrice} />
                </Link>
              )}
              {/* Lista corta de otros destacados: solo la muestra Bodega en escritorio, donde el panel sobra. */}
              {moreStars.length > 0 && (
                <ul className="spot-more" aria-label="Más destacados">
                  {moreStars.map((p) => (
                    <li key={p.id}>
                      <Link href={`/producto/${p.slug}`}>
                        <span className="sm-img" aria-hidden="true">
                          <ProductMedia image={p.images[0] ?? null} art={p.art} sizes="64px" />
                        </span>
                        <span className="sm-name">{p.name}</span>
                        <Price price={p.price} promoPrice={p.promoPrice} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="foot">
              {content.hero.lead && <p className="lead">{content.hero.lead}</p>}
              <div className="ctas">
                <Link className="btn btn-primary" href={safeHref(content.hero.ctaHref) ?? "/catalogo"}>{content.hero.ctaLabel || "Explorar productos"}</Link>
                {promos.length > 0 && <Link className="btn btn-ghost" href="/ofertas">Ver ofertas</Link>}
              </div>
              {/* Cifras del catálogo: solo las muestran los temas de mucho catálogo (Vitrina, Bodega). */}
              <ul className="facts">
                <li><b>{products.length}</b> productos</li>
                <li><b>{catalogBrands.length}</b> marcas</li>
                <li><b>{categories.length}</b> categorías</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      {content.sections
        .filter((s) => s.enabled)
        .map((s) => (
          <Fragment key={s.id}>{blocks[s.id]}</Fragment>
        ))}
    </>
  );
}

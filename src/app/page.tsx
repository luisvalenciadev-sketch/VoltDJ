import Image from "next/image";
import Link from "next/link";
import { ProductArt } from "@/components/ProductArt";
import { ProductCard } from "@/components/ProductCard";
import { CartIcon, ChatIcon, ShieldIcon, TruckIcon } from "@/components/icons";
import { Meter, Pending } from "@/components/ui";
import { FaqList, PolicyList } from "@/components/Content";
import { FAQ } from "@/config/content";
import { STORE } from "@/config/store";
import { getBrands, getCategories, getProducts } from "@/data/catalog";
import { stockImage } from "@/data/stock-images";
import { hasPromo } from "@/lib/pricing";

const hero = stockImage("hero", "DJ mezclando en un controlador");

export default async function HomePage() {
  const [products, categories, brands] = await Promise.all([getProducts(), getCategories(), getBrands()]);
  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? "";
  const featured = products.filter((p) => p.featured).slice(0, 4);
  const promos = products.filter(hasPromo).slice(0, 4);
  const accessories = products.filter((p) => p.categoryId === "accesorios").slice(0, 4);
  const authorizedBrands = brands.filter((b) => b.authorized);
  const [line1, line2, line3] = STORE.tagline.split(". ").map((s) => s.replace(/\.$/, ""));

  return (
    <>
      <section className="hero">
        <div className="wrap grid">
          <div>
            <p className="eyebrow">
              <Meter />
              Equipos DJ y audio profesional
            </p>
            <h1 className="disp">
              {line1}.<br />
              {line2}.<br />
              <em>{line3}.</em>
            </h1>
            <p className="lead">Controladores, mezcladores, parlantes y accesorios para cabina, estudio y eventos. Arma tu pedido y confírmalo con un asesor por WhatsApp.</p>
            <div className="ctas">
              <Link className="btn btn-primary" href="/catalogo">Explorar productos</Link>
              <Link className="btn btn-ghost" href="/ofertas">Ver ofertas</Link>
            </div>
          </div>
          <div className="shot">
            {hero ? (
              <>
                <Image src={hero.src} alt={hero.alt} width={hero.width} height={hero.height} sizes="(min-width: 900px) 50vw, 100vw" priority className="cover" />
              </>
            ) : (
              <>
                <ProductArt kind="controller" />
                <span className="cap">Fotografía autorizada pendiente · 1600×1200</span>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="sec" aria-labelledby="h-cats">
        <div className="wrap">
          <div className="sechead">
            <div>
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

      {featured.length > 0 && (
        <section className="sec" aria-labelledby="h-feat">
          <div className="wrap">
            <div className="sechead">
              <div>
                <h2 className="disp" id="h-feat">Destacados</h2>
                <p>Selección del equipo de la tienda.</p>
              </div>
              <Link className="link" href="/catalogo">Ver más</Link>
            </div>
            <div className="grid-p">{featured.map((p) => <ProductCard key={p.id} product={p} brand={brandName(p.brandId)} />)}</div>
          </div>
        </section>
      )}

      {promos.length > 0 && (
        <section className="sec" aria-labelledby="h-promo">
          <div className="wrap">
            <div className="sechead">
              <div>
                <h2 className="disp" id="h-promo">Ofertas vigentes</h2>
                <p>Productos con precio promocional en el catálogo.</p>
              </div>
              <Link className="link" href="/ofertas">Ver todas</Link>
            </div>
            <div className="grid-p">{promos.map((p) => <ProductCard key={p.id} product={p} brand={brandName(p.brandId)} />)}</div>
          </div>
        </section>
      )}

      <section className="sec" aria-labelledby="h-brands">
        <div className="wrap">
          <div className="sechead">
            <div>
              <h2 className="disp" id="h-brands">Marcas</h2>
              <p>Solo publicamos marcas con distribución o autorización confirmada.</p>
            </div>
          </div>
          <div className="brands">
            {authorizedBrands.length
              ? authorizedBrands.map((b) => <span key={b.id}>{b.name}</span>)
              : Array.from({ length: 6 }, (_, i) => <span key={i}><Pending>Logo de marca {i + 1}</Pending></span>)}
          </div>
        </div>
      </section>

      {accessories.length > 0 && (
        <section className="sec" aria-labelledby="h-acc">
          <div className="wrap">
            <div className="sechead">
              <div>
                <h2 className="disp" id="h-acc">Accesorios y complementos</h2>
                <p>Cables, estuches, cápsulas y soportes para completar tu setup.</p>
              </div>
              <Link className="link" href="/catalogo/accesorios">Ver accesorios</Link>
            </div>
            <div className="grid-p">{accessories.map((p) => <ProductCard key={p.id} product={p} brand={brandName(p.brandId)} />)}</div>
          </div>
        </section>
      )}

      <section className="sec" aria-labelledby="h-how">
        <div className="wrap">
          <div className="sechead"><h2 className="disp" id="h-how">Cómo compras aquí</h2></div>
          <div className="benefits">
            <div className="benefit"><ChatIcon /><b>Asesoría por WhatsApp</b><p>Te ayudamos a elegir equipo compatible con tu software y tu setup.</p></div>
            <div className="benefit"><CartIcon /><b>Pedido sin pago en línea</b><p>Armas el carrito y un asesor confirma disponibilidad, envío y forma de pago.</p></div>
            <div className="benefit"><TruckIcon /><b>Envíos</b><p>{STORE.shipping.summary ?? <Pending>Cobertura y tiempos de envío</Pending>}</p></div>
            <div className="benefit"><ShieldIcon /><b>Garantía</b><p>{STORE.warranty.summary ?? <Pending>Garantía por marca o tienda</Pending>}</p></div>
          </div>
        </div>
      </section>

      <section className="sec" aria-label="Envíos y garantías">
        <div className="wrap split">
          <div className="panel">
            <h2>Envíos</h2>
            <PolicyList items={STORE.shipping.details} placeholders={["Ciudades y transportadoras", "Tiempo estimado por zona", "Costo o regla de envío gratis"]} />
            <Link className="link" href="/envios-y-garantias">Leer política de envíos</Link>
          </div>
          <div className="panel">
            <h2>Garantías</h2>
            <PolicyList items={STORE.warranty.details} placeholders={["Duración por categoría o marca", "Qué cubre y qué no", "Cómo se hace un reclamo"]} />
            <Link className="link" href="/envios-y-garantias#garantias">Leer política de garantías</Link>
          </div>
        </div>
      </section>

      <section className="sec" aria-labelledby="h-faq">
        <div className="wrap">
          <div className="sechead">
            <h2 className="disp" id="h-faq">Preguntas frecuentes</h2>
            <Link className="link" href="/preguntas-frecuentes">Ver todas</Link>
          </div>
          <FaqList items={FAQ.slice(0, 4)} />
        </div>
      </section>
    </>
  );
}

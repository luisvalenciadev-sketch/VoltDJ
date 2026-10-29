import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddToCart, StickyAddBar } from "@/components/AddToCart";
import { Gallery } from "@/components/Gallery";
import { ChatIcon, InfoIcon, ShieldIcon, TruckIcon, WarnIcon, WhatsAppIcon } from "@/components/icons";
import { ProductCard } from "@/components/ProductCard";
import { AvailabilityBadge, Breadcrumbs, Pending } from "@/components/ui";
import { STORE } from "@/config/store";
import { getBrands, getCategories, getProductBySlug, getProducts, toCartProduct } from "@/data/catalog";
import type { Product } from "@/data/types";
import { canAddToCart, discountPercent, formatCOP, hasPromo, unitPrice } from "@/lib/pricing";
import { buildProductMessage, buildWhatsAppLink } from "@/lib/whatsapp";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return {};
  const price = unitPrice(p);
  return {
    title: p.name,
    description: `${p.description}${price != null ? ` Precio: ${formatCOP(price)}.` : ""}`.slice(0, 160),
    alternates: { canonical: `/producto/${p.slug}` },
    // Los productos de demostración no deben indexarse.
    robots: p.isDemo ? { index: false, follow: true } : undefined,
    openGraph: { title: p.name, description: p.description, images: p.images.map((i) => ({ url: i.src, width: i.width, height: i.height, alt: i.alt })) },
  };
}

function productJsonLd(p: Product, brand: string) {
  const price = unitPrice(p);
  const availability: Record<Product["availability"], string> = {
    disponible: "InStock",
    pocas: "LimitedAvailability",
    bajo_pedido: "PreOrder",
    agotado: "OutOfStock",
    consultar: "InStoreOnly",
  };
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku,
    description: p.description,
    brand: { "@type": "Brand", name: brand },
    image: p.images.map((i) => new URL(i.src, STORE.siteUrl).toString()),
    ...(price != null && {
      offers: {
        "@type": "Offer",
        priceCurrency: STORE.currency,
        price,
        availability: `https://schema.org/${availability[p.availability]}`,
        url: new URL(`/producto/${p.slug}`, STORE.siteUrl).toString(),
      },
    }),
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const p = await getProductBySlug((await params).slug);
  if (!p) notFound();
  const [brands, categories, all] = await Promise.all([getBrands(), getCategories(), getProducts()]);
  const brand = brands.find((b) => b.id === p.brandId)?.name ?? "";
  const category = categories.find((c) => c.id === p.categoryId);
  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? "";
  const related = [
    ...all.filter((x) => x.id !== p.id && x.categoryId === p.categoryId),
    ...all.filter((x) => x.id !== p.id && x.categoryId === "accesorios" && p.categoryId !== "accesorios"),
  ].slice(0, 4);
  const wa = buildWhatsAppLink(buildProductMessage(p));
  const cartProduct = toCartProduct(p, brands);
  const promo = hasPromo(p);

  return (
    <>
      <div className="wrap">
        <Breadcrumbs
          items={[{ label: "Inicio", href: "/" }, ...(category ? [{ label: category.name, href: `/catalogo/${category.slug}` }] : []), { label: p.name }]}
        />
        <div className="pdp">
          <Gallery images={p.images} art={p.art} name={p.name} discount={discountPercent(p)} />
          <div className="buy">
            <span className="eyebrow">
              {brand}
              {category && ` · ${category.name}`}
            </span>
            <h1>{p.name}</h1>
            <div className="ref">
              <span className="mono">Ref. {p.sku}</span>
              <AvailabilityBadge value={p.availability} />
            </div>
            <div className="price">
              {p.price == null ? (
                <b style={{ fontSize: "var(--t-xl)" }}>Precio por confirmar</b>
              ) : promo ? (
                <>
                  <b>{formatCOP(unitPrice(p)!)}</b>
                  <s>
                    <span className="sr-only">Precio anterior: </span>
                    {formatCOP(p.price)}
                  </s>
                  <span className="save">Ahorras {formatCOP(p.price - unitPrice(p)!)}</span>
                </>
              ) : (
                <b>{formatCOP(p.price)}</b>
              )}
            </div>
            {promo && (
              <p className="note">
                {p.promoEndsAt
                  ? `Promoción vigente hasta el ${new Date(p.promoEndsAt).toLocaleDateString(STORE.locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })} o hasta agotar unidades.`
                  : <>Vigencia de la promoción: <Pending>fecha de fin</Pending></>}
              </p>
            )}
            {p.availability === "agotado" && (
              <div className="alert warn">
                <WarnIcon />
                <div>
                  <b>Agotado por ahora</b>
                  <p>Pregúntanos por WhatsApp la fecha de reposición o una alternativa similar.</p>
                </div>
              </div>
            )}
            {p.availability === "bajo_pedido" && (
              <div className="alert">
                <InfoIcon />
                <div>
                  <b>Bajo pedido</b>
                  <p>El asesor confirma el tiempo de llegada antes de cerrar la compra.</p>
                </div>
              </div>
            )}
            <AddToCart product={cartProduct} />
            {wa && (
              <a className={`btn ${canAddToCart(p.availability) ? "btn-secondary" : "btn-primary"} btn-block`} href={wa} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon /> {p.availability === "agotado" ? "Preguntar por reposición" : "Consultar este producto por WhatsApp"}
              </a>
            )}
            <div className="assure">
              <div><TruckIcon /><span><b>Envío:</b> {STORE.shipping.summary ?? <Pending>condiciones de envío</Pending>}</span></div>
              <div><ShieldIcon /><span><b>Garantía:</b> {STORE.warranty.summary ?? <Pending>política de garantía</Pending>}</span></div>
              <div><ChatIcon /><span><b>Confirmación:</b> el asesor confirma disponibilidad y costo de envío antes de que pagues.</span></div>
            </div>
          </div>
        </div>
        <div className="pdp-info">
          <section aria-labelledby="h-desc">
            <h2 className="disp" id="h-desc">Descripción</h2>
            <p className="muted" style={{ maxWidth: "62ch" }}>{p.description}</p>
          </section>
          <section aria-labelledby="h-specs">
            <h2 className="disp" id="h-specs">Especificaciones</h2>
            <table className="specs">
              <tbody>
                {p.specs.map((s) => (
                  <tr key={s.label}>
                    <th scope="row">{s.label}</th>
                    <td>{s.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
        {related.length > 0 && (
          <section className="sec" style={{ paddingTop: 0 }} aria-labelledby="h-rel">
            <div className="sechead"><h2 className="disp" id="h-rel">También te puede servir</h2></div>
            <div className="grid-p">{related.map((r) => <ProductCard key={r.id} product={r} brand={brandName(r.brandId)} />)}</div>
          </section>
        )}
      </div>
      <StickyAddBar product={cartProduct} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(p, brand)).replace(/</g, "\\u003c") }} />
    </>
  );
}

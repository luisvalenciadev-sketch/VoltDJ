import Link from "next/link";
import { Suspense } from "react";
import { activePromo, TOPBAR_PLACEHOLDERS, type StoreSettings } from "@/config/store";
import { getStore } from "@/data/store";
import type { Category } from "@/data/types";
import { CartButton, CategoryNav, SearchForm } from "./HeaderClient";
import { LogoMark, WhatsAppIcon } from "./icons";
import { Marquee } from "./Marquee";
import { Pending } from "./ui";

/** Logo subido en el panel o, si no hay, el nombre de la tienda con el medidor de VOLT. */
export function Logo({ store }: { store: StoreSettings }) {
  const { logoOnDark, logoOnLight } = store.brand;
  if (logoOnDark || logoOnLight) {
    // Con los dos logos van ambos y el tema muestra el que corresponde a su fondo (themes.css): así la
    // vista previa de un tema claro cambia el logo sin pedir otra página. Con uno solo, se usa siempre.
    const both = logoOnDark && logoOnLight;
    return (
      <Link className="logo logo-img" href="/" aria-label={`${store.name}, ir al inicio`}>
        {[
          { img: logoOnDark, cls: both ? "for-dark" : undefined },
          { img: both ? logoOnLight : null, cls: "for-light" },
          { img: both ? null : logoOnLight, cls: undefined },
        ].map(({ img, cls }) =>
          img ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo de proporción libre; ya llega optimizado
            <img key={img.src} className={cls} src={img.src} alt={store.name} width={img.width} height={img.height} />
          ) : null,
        )}
      </Link>
    );
  }
  const [first, ...rest] = store.name.split(" ");
  return (
    <Link className="logo" href="/" aria-label={`${store.name}, ir al inicio`}>
      <LogoMark />
      <b>
        {first}
        {rest.length > 0 && <i> {rest.join(" ")}</i>}
      </b>
    </Link>
  );
}

/**
 * Cinta superior: la promoción manda (primero y enlazada a ofertas); detrás, los datos de
 * servicio que antes vivían en una barra fija. Una sola banda en lugar de dos apiladas.
 */
function PromoTicker({ store }: { store: StoreSettings }) {
  const PROMO = activePromo();
  const info = store.topbar.map((text, i) => text ?? <Pending>{TOPBAR_PLACEHOLDERS[i]}</Pending>);
  return (
    <Marquee label="cinta de promociones" seconds={38} className="ticker">
      {PROMO && (
        <>
          <Link className="tick hot" href="/ofertas">
            −{PROMO.percent}% en todo el catálogo
          </Link>
          <span className="tick">El descuento ya está aplicado en cada precio</span>
        </>
      )}
      <span className="tick">Arma tu pedido y confírmalo por WhatsApp</span>
      <Link className="tick" href="/seguimiento">
        Rastrea tu pedido con tu código de guía
      </Link>
      {info.map((item, i) => (
        <span className="tick" key={i}>
          {item}
        </span>
      ))}
    </Marquee>
  );
}

export async function Header({ categories, showOffers }: { categories: Category[]; showOffers: boolean }) {
  const store = await getStore();
  return (
    <>
      <PromoTicker store={store} />
      <header className="hdr">
        <div className="wrap">
          <div className="row">
            <Logo store={store} />
            <Suspense fallback={null}>
              <SearchForm id="q-desktop" />
            </Suspense>
            <div className="actions">
              <Link className="iconbtn" href="/contacto" aria-label="Contacto por WhatsApp">
                <WhatsAppIcon />
                <span className="lbl">WhatsApp</span>
              </Link>
              <CartButton />
            </div>
          </div>
          <div className="msearch">
            <Suspense fallback={null}>
              <SearchForm id="q-mobile" />
            </Suspense>
          </div>
        </div>
        <CategoryNav categories={categories} showOffers={showOffers} />
      </header>
    </>
  );
}

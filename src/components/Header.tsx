import Link from "next/link";
import { Suspense } from "react";
import { PROMO, STORE, TOPBAR_PLACEHOLDERS } from "@/config/store";
import type { Category } from "@/data/types";
import { CartButton, CategoryNav, SearchForm } from "./HeaderClient";
import { LogoMark, WhatsAppIcon } from "./icons";
import { Marquee } from "./Marquee";
import { Pending } from "./ui";

export function Logo() {
  const [first, ...rest] = STORE.name.split(" ");
  return (
    <Link className="logo" href="/" aria-label={`${STORE.name}, ir al inicio`}>
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
function PromoTicker() {
  const info = STORE.topbar.map((text, i) => text ?? <Pending>{TOPBAR_PLACEHOLDERS[i]}</Pending>);
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
      {info.map((item, i) => (
        <span className="tick" key={i}>
          {item}
        </span>
      ))}
    </Marquee>
  );
}

export function Header({ categories, showOffers }: { categories: Category[]; showOffers: boolean }) {
  return (
    <>
      <PromoTicker />
      <header className="hdr">
        <div className="wrap">
          <div className="row">
            <Logo />
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

import Link from "next/link";
import { Suspense } from "react";
import { STORE, TOPBAR_PLACEHOLDERS } from "@/config/store";
import type { Category } from "@/data/types";
import { CartButton, CategoryNav, SearchForm } from "./HeaderClient";
import { LogoMark, WhatsAppIcon } from "./icons";
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

export function Header({ categories }: { categories: Category[] }) {
  return (
    <>
      <div className="topbar">
        <div className="wrap">
          {STORE.topbar.map((text, i) => (
            <span key={i}>{text ?? <Pending>{TOPBAR_PLACEHOLDERS[i]}</Pending>}</span>
          ))}
        </div>
      </div>
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
        <CategoryNav categories={categories} />
      </header>
    </>
  );
}

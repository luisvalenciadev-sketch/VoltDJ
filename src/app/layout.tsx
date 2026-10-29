import type { Metadata, Viewport } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { STORE } from "@/config/store";
import { getCategories, getProducts } from "@/data/catalog";
import { hasPromo } from "@/lib/pricing";
import { CartProvider } from "@/store/cart-store";
import { ToastProvider } from "@/store/toast";
import { archivo, hanken, mono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(STORE.siteUrl),
  title: { default: `${STORE.name} · Equipos DJ y audio profesional`, template: `%s · ${STORE.name}` },
  description: STORE.description,
  applicationName: STORE.name,
  openGraph: { type: "website", locale: "es_CO", siteName: STORE.name },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#101114",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  const showOffers = products.some(hasPromo);
  return (
    <html lang="es-CO" className={`${archivo.variable} ${hanken.variable} ${mono.variable}`}>
      <body>
        <a className="skip" href="#contenido">
          Saltar al contenido
        </a>
        <CartProvider>
          <ToastProvider>
            <Header categories={categories} showOffers={showOffers} />
            <main id="contenido">{children}</main>
            <Footer categories={categories} showOffers={showOffers} />
          </ToastProvider>
        </CartProvider>
      </body>
    </html>
  );
}

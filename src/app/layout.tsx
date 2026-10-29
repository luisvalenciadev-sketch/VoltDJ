import type { Metadata, Viewport } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { StoreChrome } from "@/components/StoreChrome";
import { SITE } from "@/config/store";
import { getCategories, getProducts } from "@/data/catalog";
import { getStore, toStoreInfo } from "@/data/store";
import { inkFor, normalizeHex } from "@/lib/color";
import { hasPromo } from "@/lib/pricing";
import { CartProvider } from "@/store/cart-store";
import { StoreInfoProvider } from "@/store/store-info";
import { ToastProvider } from "@/store/toast";
import { archivo, hanken, mono } from "./fonts";
import "./globals.css";

// Las páginas estáticas se regeneran cada hora: así una promoción vencida desaparece sola,
// sin redesplegar (a más tardar una hora después de la fecha de fin).
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore();
  const { seo, brand } = store;
  return {
    metadataBase: new URL(SITE.url),
    title: { default: seo.title || store.name, template: `%s · ${store.name}` },
    description: seo.description || store.description || undefined,
    applicationName: store.name,
    openGraph: {
      type: "website",
      locale: "es_CO",
      siteName: store.name,
      images: seo.image ? [{ url: seo.image.src, width: seo.image.width, height: seo.image.height, alt: seo.image.alt || store.name }] : undefined,
    },
    icons: { icon: brand.favicon?.src ?? "/icon.svg" },
  };
}

export const viewport: Viewport = {
  themeColor: "#101114",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [categories, products, store] = await Promise.all([getCategories(), getProducts(), getStore()]);
  const showOffers = products.some(hasPromo);
  // Solo un color validado (#rrggbb) llega a la hoja de estilos: nunca texto libre del panel.
  const accent = store.brand.accent ? normalizeHex(store.brand.accent) : null;
  return (
    <html lang="es-CO" className={`${archivo.variable} ${hanken.variable} ${mono.variable}`}>
      <head>{accent && <style>{`:root{--accent:${accent};--accent-ink:${inkFor(accent)}}`}</style>}</head>
      <body>
        <a className="skip" href="#contenido">
          Saltar al contenido
        </a>
        <StoreInfoProvider value={toStoreInfo(store)}>
          <CartProvider>
            <ToastProvider>
              <StoreChrome>
                <Header categories={categories} showOffers={showOffers} />
              </StoreChrome>
              <main id="contenido">{children}</main>
              <StoreChrome>
                <Footer categories={categories} showOffers={showOffers} />
              </StoreChrome>
            </ToastProvider>
          </CartProvider>
        </StoreInfoProvider>
      </body>
    </html>
  );
}

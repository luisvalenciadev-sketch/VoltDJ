import type { Metadata, Viewport } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { StoreChrome } from "@/components/StoreChrome";
import { ThemePreview } from "@/components/ThemePreview";
import { SITE } from "@/config/store";
import { DEFAULT_THEME, themeCss, THEMES } from "@/config/themes";
import { getCategories, getProducts } from "@/data/catalog";
import { getStore, toStoreInfo } from "@/data/store";
import { normalizeHex } from "@/lib/color";
import { hasPromo } from "@/lib/pricing";
import { CartProvider } from "@/store/cart-store";
import { StoreInfoProvider } from "@/store/store-info";
import { ToastProvider } from "@/store/toast";
import { fontVariables } from "./fonts";
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

export async function generateViewport(): Promise<Viewport> {
  const theme = THEMES[(await getStore()).brand.theme] ?? THEMES[DEFAULT_THEME];
  return { themeColor: theme.colors.bg, colorScheme: theme.scheme, viewportFit: "cover" };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [categories, products, store] = await Promise.all([getCategories(), getProducts(), getStore()]);
  const showOffers = products.some(hasPromo);
  const theme = THEMES[store.brand.theme] ? store.brand.theme : DEFAULT_THEME;
  // Solo un color validado (#rrggbb) llega a la hoja de estilos: nunca texto libre del panel.
  const accent = store.brand.accent ? normalizeHex(store.brand.accent) : null;
  return (
    <html lang="es-CO" data-theme={theme} className={fontVariables}>
      <head>
        {/* Sin escapar a propósito: el contenido sale de THEMES y de un color ya validado (#rrggbb). */}
        <style dangerouslySetInnerHTML={{ __html: themeCss(accent) }} />
      </head>
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
                <ThemePreview applied={theme} />
              </StoreChrome>
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

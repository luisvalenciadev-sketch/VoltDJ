export type Availability = "disponible" | "pocas" | "bajo_pedido" | "agotado" | "consultar";

export type PublicationStatus = "draft" | "published" | "archived";

export type ArtKind =
  | "controller" | "mixer" | "turntable" | "speaker" | "headphones"
  | "mic" | "light" | "case" | "cable" | "needle" | "stand";

export interface ProductImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface Spec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brandId: string;
  categoryId: string;
  description: string;
  images: ProductImage[];
  /** Ilustración provisional mientras no haya fotografías autorizadas. */
  art: ArtKind;
  /** Pesos colombianos enteros. `null` = precio por confirmar. */
  price: number | null;
  /** Solo cuando existe una promoción real. */
  promoPrice: number | null;
  promoEndsAt: string | null;
  sku: string;
  availability: Availability;
  maxQtyPerOrder: number;
  specs: Spec[];
  status: PublicationStatus;
  /** Distingue los productos de demostración del catálogo definitivo. */
  isDemo: boolean;
  featured: boolean;
  updatedAt: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  art: ArtKind;
  order: number;
}

export interface Brand {
  id: string;
  name: string;
  /** Solo marcas con distribución o autorización confirmada deben tener `authorized: true`. */
  authorized: boolean;
  isDemo: boolean;
}

/** Vista mínima de producto que el carrito necesita en el cliente. */
export interface CartProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  sku: string;
  art: ArtKind;
  image: ProductImage | null;
  price: number | null;
  promoPrice: number | null;
  availability: Availability;
  maxQtyPerOrder: number;
}

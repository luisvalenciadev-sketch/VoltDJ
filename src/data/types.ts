export type Availability = "disponible" | "pocas" | "bajo_pedido" | "agotado" | "consultar";

export type PublicationStatus = "draft" | "published" | "archived";

export type ArtKind =
  | "controller" | "mixer" | "turntable" | "speaker" | "headphones"
  | "mic" | "light" | "case" | "cable" | "needle" | "stand";

export interface ImageCredit {
  name: string;
  url: string;
  /** Página de la foto en el banco de imágenes. */
  source: string;
  /** Licencias que exigen atribución (p. ej. CC BY-SA). */
  license?: string;
  licenseUrl?: string;
}

export interface ProductImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** "cover" para fotos de ambiente que llenan el marco; por defecto "contain" (foto de producto sobre fondo). */
  fit?: "cover" | "contain";
  /** Foto de banco de imágenes usada como referencia, no del producto exacto. */
  credit?: ImageCredit;
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
  /** Cifra que el comprador busca primero ("18\"", "1000W", "4CH"); titular de la vitrina. */
  keyFigure?: string | null;
  updatedAt: string;
}

/**
 * Producto tal como se guarda y se edita en el panel. La tienda nunca lo usa directo:
 * `toPublicProduct` calcula la disponibilidad desde el stock y aplica la promoción vigente.
 */
export interface ProductRecord {
  id: string;
  slug: string;
  sku: string;
  name: string;
  brandId: string;
  categoryId: string;
  description: string;
  /** Precio de lista en COP enteros. `null` = precio por confirmar. */
  price: number | null;
  /** Precio rebajado propio del producto; tiene prioridad sobre la promoción general. */
  salePrice: number | null;
  keyFigure: string | null;
  specs: Spec[];
  images: ProductImage[];
  art: ArtKind;
  /** Unidades en bodega. `null` = la tienda no controla inventario de este producto. */
  stock: number | null;
  /** Con stock en este número o menos se muestra "Pocas unidades". 0 = nunca. */
  lowStockAt: number;
  /** Sin stock se sigue vendiendo como "Bajo pedido" en lugar de "Agotado". */
  allowBackorder: boolean;
  maxPerOrder: number;
  featured: boolean;
  status: PublicationStatus;
  createdAt: string;
  updatedAt: string;
}

export type StockReason = "ajuste" | "pedido" | "cancelacion" | "importacion" | "inicial";

export interface StockMovement {
  id: string;
  productId: string;
  delta: number;
  stockAfter: number | null;
  reason: StockReason;
  ref: string | null;
  note: string | null;
  createdAt: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  art: ArtKind;
  order: number;
  image?: ProductImage;
  /** Oculta la categoría en la tienda sin borrarla. Sin valor = visible. */
  visible?: boolean;
}

export interface Brand {
  id: string;
  name: string;
  /** Solo marcas con distribución o autorización confirmada deben tener `authorized: true`. */
  authorized: boolean;
  isDemo: boolean;
  /** Logotipo en public/img/marcas o subido desde el panel. Sin logo confiable se muestra el nombre como texto. */
  logo?: { src: string; width: number; height: number; /** El logo es solo un símbolo: mostrar el nombre al lado. */ withName?: boolean };
  order?: number;
  /** Oculta la marca en la tienda sin borrarla. Sin valor = visible. */
  visible?: boolean;
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

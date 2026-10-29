import { slugify } from "@/data/products";
import type { Brand, Category, ProductRecord, PublicationStatus, Spec } from "@/data/types";
import { parseCsvObjects, toCsv } from "./csv";

/**
 * Importación y exportación del catálogo. Acepta dos formatos:
 * - "plantilla": la nuestra (encabezados en español, ver TEMPLATE_COLUMNS).
 * - "woocommerce": el CSV de "Productos → Exportar" de WooCommerce, en inglés o en español.
 * Todo es puro (sin base de datos): el panel muestra el plan con errores por fila antes de aplicar.
 */
export type ImportFormat = "plantilla" | "woocommerce";

export const TEMPLATE_COLUMNS = [
  "sku",
  "nombre",
  "marca",
  "categoria",
  "precio",
  "precio_rebajado",
  "stock",
  "stock_bajo",
  "bajo_pedido",
  "max_por_pedido",
  "estado",
  "destacado",
  "cifra_clave",
  "descripcion",
  "especificaciones",
  "fotos",
] as const;

export const MAX_IMPORT_ROWS = 2000;

/** Una fila ya normalizada. `undefined` = la columna vino vacía: al actualizar, ese dato no se toca. */
export interface ImportRow {
  line: number;
  sku: string;
  name?: string;
  brand?: string;
  category?: string;
  price?: number | null;
  salePrice?: number | null;
  stock?: number | null;
  lowStockAt?: number;
  allowBackorder?: boolean;
  maxPerOrder?: number;
  status?: PublicationStatus;
  featured?: boolean;
  keyFigure?: string;
  description?: string;
  specs?: Spec[];
  imageUrls: string[];
  errors: string[];
  warnings: string[];
  /** Filas que no son productos (p. ej. el producto "variable" padre de WooCommerce). */
  skip?: boolean;
}

export type PlanAction = "crear" | "actualizar" | "omitir";
export interface PlannedRow extends ImportRow {
  action: PlanAction;
  /** Id del producto existente (actualizar) o el que se creará. */
  productId: string;
  /** Fotos que se descargarán: solo para productos sin fotos. */
  fetchImages: boolean;
}

export interface ImportPlan {
  format: ImportFormat;
  rows: PlannedRow[];
  newCategories: string[];
  newBrands: string[];
  counts: { crear: number; actualizar: number; omitir: number; errores: number; fotos: number };
}

// ---------- Lectura de valores ----------

const clean = (v: string | undefined) => (v ?? "").replace(/\s+/g, " ").trim();

/** Pesos: acepta "$ 1.250.000", "1,250,000", "1250000.00". Devuelve `undefined` si viene vacío y NaN si es inválido. */
export function parseMoney(raw: string | undefined): number | undefined {
  let s = clean(raw).replace(/[$\sCOP]/gi, "");
  if (!s) return undefined;
  // Decimales al final (",00" o ".00"): se descartan; el resto de puntos y comas son miles.
  s = s.replace(/[.,]\d{1,2}$/, "");
  s = s.replace(/[.,]/g, "");
  return /^\d+$/.test(s) ? Number(s) : NaN;
}

function parseInteger(raw: string | undefined): number | undefined {
  const s = clean(raw);
  if (!s) return undefined;
  const n = Number(s.replace(/[.,]0+$/, ""));
  return Number.isInteger(n) ? n : NaN;
}

const TRUE = new Set(["si", "sí", "s", "1", "true", "yes", "x", "verdadero", "notify"]);
const FALSE = new Set(["no", "n", "0", "false", "falso", "-1", ""]);
function parseBool(raw: string | undefined): boolean | undefined | null {
  const s = clean(raw).toLowerCase();
  if (!s) return undefined;
  if (TRUE.has(s)) return true;
  if (FALSE.has(s)) return false;
  return null;
}

const STATUS: Record<string, PublicationStatus> = {
  publicado: "published",
  published: "published",
  borrador: "draft",
  draft: "draft",
  oculto: "draft",
  archivado: "archived",
  archived: "archived",
};

/** HTML de WooCommerce a texto plano: los saltos de párrafo se conservan como líneas. */
export function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h\d|div)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, 4000);
}

function parseSpecs(raw: string | undefined): Spec[] | undefined {
  const s = clean(raw);
  if (!s) return undefined;
  return s
    .split("|")
    .map((pair) => {
      const i = pair.indexOf(":");
      return i > 0 ? { label: pair.slice(0, i).trim(), value: pair.slice(i + 1).trim() } : null;
    })
    .filter((x): x is Spec => Boolean(x && x.label && x.value))
    .slice(0, 30);
}

const urlList = (raw: string | undefined, sep: RegExp) =>
  clean(raw)
    .split(sep)
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u))
    .slice(0, 8);

// ---------- Formatos ----------

/** Encabezados de WooCommerce en inglés y en español (la exportación usa el idioma del sitio). */
const WOO: Record<string, string[]> = {
  id: ["ID"],
  type: ["Type", "Tipo"],
  sku: ["SKU"],
  name: ["Name", "Nombre"],
  published: ["Published", "Publicado"],
  featured: ["Is featured?", "¿Está destacado?"],
  short: ["Short description", "Descripción corta"],
  description: ["Description", "Descripción"],
  inStock: ["In stock?", "¿En inventario?", "¿Hay existencias?"],
  stock: ["Stock", "Inventario", "Existencias"],
  backorders: ["Backorders allowed?", "¿Permitir reservas de productos agotados?", "¿Permitir reservas?"],
  sale: ["Sale price", "Precio rebajado"],
  regular: ["Regular price", "Precio normal"],
  categories: ["Categories", "Categorías"],
  images: ["Images", "Imágenes"],
  parent: ["Parent", "Superior"],
  brands: ["Brands", "Marcas", "Brand", "Marca"],
};

function wooGetter(headers: string[]) {
  const index = new Map(headers.map((h) => [h.toLowerCase(), h]));
  const keyOf = (field: keyof typeof WOO) => WOO[field].map((a) => index.get(a.toLowerCase())).find(Boolean);
  // La marca a veces viene como atributo ("Nombre del atributo 1" = Marca).
  const attrPairs = headers
    .map((h) => h.match(/^(?:Attribute (\d+) name|Nombre del atributo (\d+))$/i))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => {
      const n = m[1] ?? m[2];
      const valueKey = headers.find((h) => new RegExp(`^(Attribute ${n} value\\(s\\)|Valor\\(es\\) del atributo ${n})$`, "i").test(h));
      return { nameKey: m[0], valueKey };
    });
  return {
    get: (v: Record<string, string>, field: keyof typeof WOO) => {
      const k = keyOf(field);
      return k ? v[k] : undefined;
    },
    brandAttr: (v: Record<string, string>) => {
      for (const a of attrPairs) {
        if (/^(marca|brand)$/i.test(clean(v[a.nameKey])) && a.valueKey) return clean(v[a.valueKey]).split(",")[0]?.trim();
      }
      return undefined;
    },
  };
}

export function detectFormat(headers: string[]): ImportFormat | null {
  const lower = new Set(headers.map((h) => h.toLowerCase()));
  if (lower.has("nombre") && lower.has("precio") && lower.has("sku")) return "plantilla";
  const has = (field: keyof typeof WOO) => WOO[field].some((a) => lower.has(a.toLowerCase()));
  if (has("regular") && has("name") && has("type")) return "woocommerce";
  return null;
}

function fromTemplate(line: number, v: Record<string, string>): ImportRow {
  const row: ImportRow = { line, sku: clean(v.sku), imageUrls: urlList(v.fotos, /\s*[|\n]\s*/), errors: [], warnings: [] };
  const num = <K extends keyof ImportRow>(key: K, raw: string | undefined, label: string, parse: (r: string | undefined) => number | undefined) => {
    const n = parse(raw);
    if (n === undefined) return;
    if (Number.isNaN(n) || n < 0) row.errors.push(`${label} inválido: "${clean(raw)}".`);
    else (row as unknown as Record<string, unknown>)[key] = n;
  };
  if (clean(v.nombre)) row.name = clean(v.nombre).slice(0, 160);
  if (clean(v.marca)) row.brand = clean(v.marca).slice(0, 60);
  if (clean(v.categoria)) row.category = clean(v.categoria).slice(0, 60);
  num("price", v.precio, "Precio", parseMoney);
  num("salePrice", v.precio_rebajado, "Precio rebajado", parseMoney);
  if (clean(v.stock).toLowerCase() === "sin control") row.stock = null;
  else num("stock", v.stock, "Stock", parseInteger);
  num("lowStockAt", v.stock_bajo, "Stock bajo", parseInteger);
  num("maxPerOrder", v.max_por_pedido, "Máximo por pedido", parseInteger);
  const back = parseBool(v.bajo_pedido);
  if (back === null) row.errors.push(`"bajo_pedido" debe ser sí o no.`);
  else if (back !== undefined) row.allowBackorder = back;
  const feat = parseBool(v.destacado);
  if (feat === null) row.errors.push(`"destacado" debe ser sí o no.`);
  else if (feat !== undefined) row.featured = feat;
  const st = clean(v.estado).toLowerCase();
  if (st) {
    if (STATUS[st]) row.status = STATUS[st];
    else row.errors.push(`Estado "${clean(v.estado)}" no existe: usa publicado, borrador o archivado.`);
  }
  if (clean(v.cifra_clave)) row.keyFigure = clean(v.cifra_clave).slice(0, 12);
  if (clean(v.descripcion)) row.description = (v.descripcion ?? "").trim().slice(0, 4000);
  row.specs = parseSpecs(v.especificaciones);
  return row;
}

function fromWoo(line: number, v: Record<string, string>, w: ReturnType<typeof wooGetter>): ImportRow {
  const type = clean(w.get(v, "type")).toLowerCase();
  const row: ImportRow = { line, sku: clean(w.get(v, "sku")), imageUrls: urlList(w.get(v, "images"), /\s*,\s*/), errors: [], warnings: [] };
  if (type.includes("variable")) {
    row.skip = true;
    row.warnings.push("Producto con variaciones: se importan sus variaciones como productos separados.");
    return row;
  }
  if (type.includes("grouped") || type.includes("external") || type.includes("agrupado") || type.includes("externo")) {
    row.skip = true;
    row.warnings.push(`Tipo "${clean(w.get(v, "type"))}" no se importa.`);
    return row;
  }
  if (type.includes("variation") || type.includes("variación")) row.warnings.push("Variación: se importa como un producto separado.");
  if (clean(w.get(v, "name"))) row.name = clean(w.get(v, "name")).slice(0, 160);
  const regular = parseMoney(w.get(v, "regular"));
  if (regular !== undefined) {
    if (Number.isNaN(regular)) row.errors.push(`Precio normal inválido: "${clean(w.get(v, "regular"))}".`);
    else row.price = regular;
  }
  const sale = parseMoney(w.get(v, "sale"));
  if (sale !== undefined && !Number.isNaN(sale)) row.salePrice = sale;
  const stock = parseInteger(w.get(v, "stock"));
  const inStock = parseBool(w.get(v, "inStock"));
  if (stock !== undefined && !Number.isNaN(stock)) row.stock = Math.max(stock, 0);
  else if (inStock === false) row.stock = 0;
  else row.stock = null; // WooCommerce sin control de inventario
  const back = parseBool(w.get(v, "backorders"));
  if (back) row.allowBackorder = true;
  const pub = clean(w.get(v, "published"));
  row.status = pub === "1" ? "published" : "draft";
  const feat = parseBool(w.get(v, "featured"));
  if (feat) row.featured = true;
  const cat = clean(w.get(v, "categories")).split(",")[0] ?? "";
  const leaf = cat.split(">").pop()?.trim();
  if (leaf) row.category = leaf.slice(0, 60);
  const brand = clean(w.get(v, "brands")).split(",")[0]?.trim() || w.brandAttr(v);
  if (brand) row.brand = brand.slice(0, 60);
  const desc = htmlToText(w.get(v, "short") || w.get(v, "description") || "");
  if (desc) row.description = desc;
  return row;
}

/** Lee el archivo y lo normaliza. Un error aquí (formato desconocido, demasiadas filas) detiene todo. */
export function parseImport(text: string): { format: ImportFormat; rows: ImportRow[] } | { error: string } {
  const { headers, rows } = parseCsvObjects(text);
  if (!headers.length) return { error: "El archivo está vacío." };
  const format = detectFormat(headers);
  if (!format) return { error: "No reconocemos el formato. Usa la plantilla del panel o la exportación de productos de WooCommerce." };
  if (!rows.length) return { error: "El archivo no tiene productos debajo del encabezado." };
  if (rows.length > MAX_IMPORT_ROWS) return { error: `El archivo tiene ${rows.length} filas; el máximo por importación es ${MAX_IMPORT_ROWS}. Divídelo en partes.` };
  if (format === "plantilla") return { format, rows: rows.map((r) => fromTemplate(r.line, r.values)) };

  const w = wooGetter(headers);
  const parsed = rows.map((r) => fromWoo(r.line, r.values, w));
  // Las variaciones heredan del padre lo que no traen (categoría, marca, descripción, fotos).
  const byId = new Map(rows.map((r, i) => [clean(w.get(r.values, "id")), parsed[i]]));
  const bySku = new Map(parsed.filter((p) => p.sku).map((p) => [p.sku, p]));
  rows.forEach((r, i) => {
    const parentRef = clean(w.get(r.values, "parent"));
    if (!parentRef) return;
    const parent = parentRef.startsWith("id:") ? byId.get(parentRef.slice(3)) : bySku.get(parentRef);
    if (!parent) return;
    const row = parsed[i];
    const src = rows[parsed.indexOf(parent)]?.values;
    row.category ??= parent.category ?? (src ? clean(w.get(src, "categories")).split(",")[0]?.split(">").pop()?.trim() : undefined);
    row.brand ??= parent.brand ?? (src ? w.brandAttr(src) : undefined);
    if (!row.description && src) row.description = htmlToText(w.get(src, "short") || w.get(src, "description") || "") || undefined;
    if (!row.imageUrls.length && src) row.imageUrls = urlList(w.get(src, "images"), /\s*,\s*/);
  });
  return { format, rows: parsed };
}

// ---------- Plan contra el catálogo actual ----------

export const DEFAULT_BRAND = "Otras marcas";
export const DEFAULT_CATEGORY = "Sin categoría";

export function planImport(format: ImportFormat, rows: ImportRow[], current: { products: ProductRecord[]; categories: Category[]; brands: Brand[] }): ImportPlan {
  const bySku = new Map(current.products.filter((p) => p.sku).map((p) => [p.sku.toLowerCase(), p]));
  const bySlug = new Map(current.products.map((p) => [p.slug, p]));
  const catNames = new Set(current.categories.map((c) => c.name.toLowerCase()));
  const brandNames = new Set(current.brands.map((b) => b.name.toLowerCase()));
  const newCategories = new Map<string, string>();
  const newBrands = new Map<string, string>();
  const seen = new Set<string>();
  const counts = { crear: 0, actualizar: 0, omitir: 0, errores: 0, fotos: 0 };

  const planned = rows.map((r): PlannedRow => {
    const key = r.sku ? `sku:${r.sku.toLowerCase()}` : r.name ? `slug:${slugify(r.name)}` : "";
    const existing = r.sku ? bySku.get(r.sku.toLowerCase()) : r.name ? bySlug.get(slugify(r.name)) : undefined;
    const row: PlannedRow = { ...r, errors: [...r.errors], warnings: [...r.warnings], action: existing ? "actualizar" : "crear", productId: existing?.id ?? "", fetchImages: false };
    if (r.skip) row.action = "omitir";
    else if (!key) row.errors.push("Falta el SKU o el nombre.");
    else if (seen.has(key)) row.errors.push(r.sku ? `El SKU ${r.sku} está repetido en el archivo.` : "Producto repetido en el archivo.");
    else seen.add(key);

    if (row.action === "crear" && !r.skip) {
      if (!r.name) row.errors.push("Falta el nombre para crear el producto.");
      if (!r.sku) row.warnings.push("Sin SKU: en próximas importaciones se reconocerá por el nombre.");
      if (!r.category) {
        row.category = DEFAULT_CATEGORY;
        row.warnings.push(`Sin categoría: queda en "${DEFAULT_CATEGORY}".`);
      }
      if (!r.brand) {
        row.brand = DEFAULT_BRAND;
        if (format === "woocommerce") row.warnings.push(`Sin marca: queda en "${DEFAULT_BRAND}".`);
      }
      if (r.price === undefined) row.warnings.push("Sin precio: se publica como \"precio por confirmar\".");
      row.fetchImages = r.imageUrls.length > 0;
    }
    if (row.action === "actualizar" && existing) row.fetchImages = existing.images.length === 0 && r.imageUrls.length > 0;
    if (row.price != null && row.salePrice != null && row.salePrice >= row.price) row.warnings.push("El precio rebajado no es menor que el precio: se ignora en la tienda.");

    if (!row.errors.length && row.action !== "omitir") {
      if (row.category && !catNames.has(row.category.toLowerCase())) newCategories.set(row.category.toLowerCase(), row.category);
      if (row.brand && !brandNames.has(row.brand.toLowerCase())) newBrands.set(row.brand.toLowerCase(), row.brand);
    }
    if (row.errors.length) counts.errores++;
    else counts[row.action]++;
    if (!row.errors.length && row.fetchImages) counts.fotos += row.imageUrls.length;
    return row;
  });

  return { format, rows: planned, newCategories: [...newCategories.values()], newBrands: [...newBrands.values()], counts };
}

// ---------- Exportación ----------

const STATUS_ES: Record<PublicationStatus, string> = { published: "publicado", draft: "borrador", archived: "archivado" };
const absolute = (src: string, siteUrl: string) => (/^https?:\/\//.test(src) ? src : `${siteUrl.replace(/\/$/, "")}${src}`);

export function exportCatalogCsv(snapshot: { products: ProductRecord[]; categories: Category[]; brands: Brand[] }, siteUrl: string): string {
  const cat = new Map(snapshot.categories.map((c) => [c.id, c.name]));
  const brand = new Map(snapshot.brands.map((b) => [b.id, b.name]));
  const rows = [...snapshot.products]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => [
      p.sku,
      p.name,
      brand.get(p.brandId) ?? p.brandId,
      cat.get(p.categoryId) ?? p.categoryId,
      p.price,
      p.salePrice,
      p.stock == null ? "sin control" : p.stock,
      p.lowStockAt,
      p.allowBackorder ? "sí" : "no",
      p.maxPerOrder,
      STATUS_ES[p.status],
      p.featured ? "sí" : "no",
      p.keyFigure,
      p.description,
      p.specs.map((s) => `${s.label}: ${s.value}`).join(" | "),
      p.images.map((i) => absolute(i.src, siteUrl)).join(" | "),
    ]);
  return toCsv([...TEMPLATE_COLUMNS], rows);
}

/** Plantilla vacía con una fila de ejemplo que muestra cómo se llena cada columna. */
export function templateCsv(): string {
  return toCsv(
    [...TEMPLATE_COLUMNS],
    [["PB15F-LED", "Cabina activa 15\" PB15F-LED", "PRO DJ", "Parlantes y bajos", 700000, 595000, 3, 1, "no", 2, "borrador", "no", "15\"", "Cabina activa de 15 pulgadas con luces LED.", "Woofer: 15\" | Potencia: 1000 W", "https://ejemplo.com/foto.jpg"]],
  );
}

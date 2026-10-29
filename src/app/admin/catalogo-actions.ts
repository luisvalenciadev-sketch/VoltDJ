"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { CATALOG_TAG } from "@/data/catalog";
import { slugify } from "@/data/products";
import type { ArtKind, Brand, Category, ProductImage, ProductRecord, PromotionScope, PublicationStatus, Spec, StockReason } from "@/data/types";
import { requireAdmin, requireOwner } from "@/lib/admin-auth";
import { DEFAULT_BRAND, DEFAULT_CATEGORY, parseImport, planImport, type ImportPlan, type PlannedRow } from "@/lib/catalog-import";
import { catalogStore, isDuplicate, ReadOnlyCatalogError, type CatalogSnapshot } from "@/lib/catalog-store";
import { audit } from "@/lib/audit";
import { deleteMedia, importRemoteImage } from "@/lib/media";
import { formatCOP } from "@/lib/pricing";
import { promotionProblem } from "@/lib/promotions";

export type FormState = { error?: string; ok?: string } | undefined;

const ART: ArtKind[] = ["controller", "mixer", "turntable", "speaker", "headphones", "mic", "light", "case", "cable", "needle", "stand"];
const STATUSES: PublicationStatus[] = ["draft", "published", "archived"];
const REASONS: StockReason[] = ["ajuste", "pedido", "cancelacion", "importacion"];

const text = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const longText = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);
/** Entero desde un campo con separadores de miles ("1.250.000"); vacío = null. */
const intOrNull = (raw: string) => {
  const d = raw.replace(/\D/g, "");
  return d === "" ? null : Number(d);
};
const checked = (fd: FormData, key: string) => fd.get(key) === "on" || fd.get(key) === "true";
const money = (n: number | null) => (n == null ? "por confirmar" : formatCOP(n));
const STATUS_WORD: Record<PublicationStatus, string> = { published: "publicado", draft: "borrador", archived: "archivado" };
const units = (n: number | null) => (n == null ? "sin control" : `${n} ${n === 1 ? "unidad" : "unidades"}`);

/** Cambio de precio en el historial, con lo necesario para deshacerlo. */
async function auditPrice(session: Awaited<ReturnType<typeof requireOwner>>, p: Pick<ProductRecord, "id" | "name" | "price" | "salePrice">, next: { price: number | null; salePrice: number | null }) {
  if (p.price === next.price && p.salePrice === next.salePrice) return;
  const parts = [p.price !== next.price && `precio ${money(p.price)} → ${money(next.price)}`, p.salePrice !== next.salePrice && `rebajado ${money(p.salePrice)} → ${money(next.salePrice)}`].filter(Boolean);
  await audit(session, { entity: "producto", entityId: p.id, action: "precio", summary: `${p.name}: ${parts.join(", ")}`, before: { price: p.price, salePrice: p.salePrice }, after: next });
}

function invalidate() {
  // Expiración inmediata: el dueño recarga la tienda y ve su cambio, sin esperar a la revalidación.
  revalidateTag(CATALOG_TAG, { expire: 0 });
}

/** Errores del almacén a mensajes para la tienda; lo inesperado se registra y se explica sin detalles técnicos. */
function failure(e: unknown, what: string): FormState {
  if (e instanceof ReadOnlyCatalogError) return { error: "Falta conectar la base de datos: el catálogo no se puede editar todavía." };
  if (isDuplicate(e)) return { error: "Ya existe otro producto con esa dirección web. Cambia el nombre o la dirección." };
  console.error(`[panel] ${what}`, e);
  return { error: `No se pudo ${what}. Intenta de nuevo en un momento.` };
}

function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = base || "producto";
  if (!used.has(root)) return root;
  for (let i = 2; ; i++) if (!used.has(`${root}-${i}`)) return `${root}-${i}`;
}

/** Libera las fotos que ya no usa ningún producto, categoría ni marca (las copias duplicadas comparten fotos). */
async function releaseMedia(srcs: string[], snapshot: CatalogSnapshot) {
  if (!srcs.length) return;
  const inUse = new Set<string>([
    ...snapshot.products.flatMap((p) => p.images.map((i) => i.src)),
    ...snapshot.categories.flatMap((c) => (c.image ? [c.image.src] : [])),
    ...snapshot.brands.flatMap((b) => (b.logo ? [b.logo.src] : [])),
  ]);
  await deleteMedia(srcs.filter((s) => !inUse.has(s)));
}

function parseImages(raw: string, alt: string): ProductImage[] | string {
  try {
    const list = JSON.parse(raw || "[]") as ProductImage[];
    if (!Array.isArray(list)) return "Las fotos no son válidas.";
    return list.slice(0, 12).map((i) => {
      if (typeof i.src !== "string" || !(i.src.startsWith("/") || i.src.startsWith("https://"))) throw new Error();
      return { src: i.src, width: Math.max(1, Math.round(Number(i.width)) || 1200), height: Math.max(1, Math.round(Number(i.height)) || 1200), alt: String(i.alt || alt).slice(0, 160), fit: i.fit === "cover" ? "cover" : "contain", ...(i.credit ? { credit: i.credit } : {}) };
    });
  } catch {
    return "Las fotos no son válidas.";
  }
}

function parseSpecs(raw: string): Spec[] {
  try {
    const list = JSON.parse(raw || "[]") as Spec[];
    return Array.isArray(list)
      ? list
          .map((s) => ({ label: String(s.label ?? "").trim().slice(0, 60), value: String(s.value ?? "").trim().slice(0, 160) }))
          .filter((s) => s.label && s.value)
          .slice(0, 30)
      : [];
  } catch {
    return [];
  }
}

// ---------- Productos ----------

export async function saveProduct(_: FormState, fd: FormData): Promise<FormState> {
  const session = await requireOwner();
  const store = catalogStore();
  const id = text(fd, "id", 120);
  const name = text(fd, "name", 160);
  if (!name) return { error: "Escribe el nombre del producto." };
  const brandId = text(fd, "brandId", 80);
  const categoryId = text(fd, "categoryId", 80);
  const price = intOrNull(text(fd, "price", 20));
  const salePrice = intOrNull(text(fd, "salePrice", 20));
  if (salePrice != null && (price == null || salePrice >= price)) return { error: "El precio rebajado debe ser menor que el precio." };
  const status = text(fd, "status", 20) as PublicationStatus;
  if (!STATUSES.includes(status)) return { error: "Elige el estado del producto." };
  const art = text(fd, "art", 20) as ArtKind;
  const images = parseImages(String(fd.get("images") ?? ""), name);
  if (typeof images === "string") return { error: images };
  const tracked = checked(fd, "tracked");
  const stockRaw = intOrNull(text(fd, "stock", 10));
  const stock = tracked ? (stockRaw ?? 0) : null;

  let snapshot: CatalogSnapshot;
  try {
    snapshot = await store.snapshot();
  } catch (e) {
    return failure(e, "guardar el producto");
  }
  if (!snapshot.brands.some((b) => b.id === brandId)) return { error: "Elige la marca." };
  if (!snapshot.categories.some((c) => c.id === categoryId)) return { error: "Elige la categoría." };
  const current = id ? snapshot.products.find((p) => p.id === id) : undefined;
  if (id && !current) return { error: "Este producto ya no existe. Recarga la lista." };
  const slugInput = slugify(text(fd, "slug", 120)) || slugify(name);
  const slug = current && slugInput === current.slug ? slugInput : uniqueSlug(slugInput, snapshot.products.filter((p) => p.id !== id).map((p) => p.slug));

  const record: ProductRecord = {
    id: current?.id ?? uniqueSlug(slugify(name), snapshot.products.map((p) => p.id)),
    slug,
    sku: text(fd, "sku", 60),
    name,
    brandId,
    categoryId,
    description: longText(fd, "description", 4000),
    price,
    salePrice,
    keyFigure: text(fd, "keyFigure", 12) || null,
    specs: parseSpecs(String(fd.get("specs") ?? "")),
    images,
    art: ART.includes(art) ? art : "controller",
    stock,
    lowStockAt: Math.min(intOrNull(text(fd, "lowStockAt", 6)) ?? 0, 9999),
    allowBackorder: checked(fd, "allowBackorder"),
    maxPerOrder: Math.min(Math.max(intOrNull(text(fd, "maxPerOrder", 4)) ?? 1, 1), 99),
    featured: checked(fd, "featured"),
    status,
    createdAt: current?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    if (!current) {
      await store.createProduct(record);
      await audit(session, { entity: "producto", entityId: record.id, action: "crear", summary: `Creó ${record.name} (${money(record.price)}, ${STATUS_WORD[record.status]})` });
    } else {
      await store.updateProduct(record);
      await auditPrice(session, current, { price: record.price, salePrice: record.salePrice });
      if (current.status !== record.status) await audit(session, { entity: "producto", entityId: record.id, action: "estado", summary: `${record.name}: ${STATUS_WORD[current.status]} → ${STATUS_WORD[record.status]}` });
      if (current.stock !== stock) await audit(session, { entity: "stock", entityId: record.id, action: "fijar", summary: `${record.name}: ${units(current.stock)} → ${units(stock)} (ficha del producto)`, before: { stock: current.stock }, after: { stock } });
      if (current.stock !== stock) await store.changeStock(record.id, { mode: "set", value: stock }, { reason: "ajuste", note: text(fd, "stockNote", 160) || "Desde la ficha del producto" });
      const kept = new Set(images.map((i) => i.src));
      await releaseMedia(
        current.images.map((i) => i.src).filter((s) => !kept.has(s)),
        await store.snapshot(),
      );
    }
  } catch (e) {
    return failure(e, "guardar el producto");
  }
  invalidate();
  if (!current) redirect(`/admin/productos/${record.id}?creado=1`);
  return { ok: status === "published" ? "Producto guardado y publicado." : "Producto guardado." };
}

export async function duplicateProduct(id: string): Promise<void> {
  const session = await requireOwner();
  const store = catalogStore();
  const snapshot = await store.snapshot();
  const p = snapshot.products.find((x) => x.id === id);
  if (!p) redirect("/admin/productos");
  const name = `${p.name} (copia)`;
  const copy: ProductRecord = {
    ...p,
    id: uniqueSlug(slugify(name), snapshot.products.map((x) => x.id)),
    slug: uniqueSlug(slugify(name), snapshot.products.map((x) => x.slug)),
    name,
    sku: p.sku ? `${p.sku}-COPIA` : "",
    stock: p.stock == null ? null : 0,
    status: "draft",
    featured: false,
  };
  await store.createProduct(copy);
  await audit(session, { entity: "producto", entityId: copy.id, action: "crear", summary: `Duplicó ${p.name} como borrador` });
  invalidate();
  redirect(`/admin/productos/${copy.id}?duplicado=1`);
}

export async function setProductStatus(id: string, status: PublicationStatus): Promise<FormState> {
  const session = await requireOwner();
  if (!STATUSES.includes(status)) return { error: "Estado inválido." };
  const store = catalogStore();
  try {
    const p = await store.getProduct(id);
    if (!p) return { error: "Este producto ya no existe." };
    await store.updateProduct({ ...p, status });
    if (p.status !== status) await audit(session, { entity: "producto", entityId: id, action: "estado", summary: `${p.name}: ${STATUS_WORD[p.status]} → ${STATUS_WORD[status]}` });
  } catch (e) {
    return failure(e, "cambiar el estado");
  }
  invalidate();
  return { ok: status === "published" ? "Producto publicado." : status === "archived" ? "Producto archivado: ya no aparece en la tienda." : "Producto pasado a borrador." };
}

export async function deleteProduct(id: string): Promise<void> {
  const session = await requireOwner();
  const store = catalogStore();
  const p = await store.getProduct(id);
  if (p) {
    await store.deleteProduct(id);
    await audit(session, { entity: "producto", entityId: id, action: "eliminar", summary: `Eliminó ${p.name}` });
    await releaseMedia(p.images.map((i) => i.src), await store.snapshot());
    invalidate();
  }
  redirect("/admin/productos?eliminado=1");
}

/** Edición en la fila de la lista: precio y stock sin abrir la ficha. */
export async function quickUpdate(_: FormState, fd: FormData): Promise<FormState> {
  const session = await requireOwner();
  const store = catalogStore();
  const id = text(fd, "id", 120);
  try {
    const p = await store.getProduct(id);
    if (!p) return { error: "Este producto ya no existe." };
    const price = intOrNull(text(fd, "price", 20));
    if (price != null && price !== p.price) {
      if (p.salePrice != null && p.salePrice >= price) return { error: "El precio debe ser mayor que el precio rebajado." };
      await store.updateProduct({ ...p, price });
      await auditPrice(session, p, { price, salePrice: p.salePrice });
    }
    const stockRaw = text(fd, "stock", 10);
    if (stockRaw !== "" && p.stock !== null) {
      const stock = intOrNull(stockRaw);
      if (stock != null && stock !== p.stock) {
        await store.changeStock(id, { mode: "set", value: stock }, { reason: "ajuste", note: "Edición rápida" });
        await audit(session, { entity: "stock", entityId: id, action: "fijar", summary: `${p.name}: ${units(p.stock)} → ${units(stock)} (edición rápida)`, before: { stock: p.stock }, after: { stock } });
      }
    }
  } catch (e) {
    return failure(e, "guardar el cambio");
  }
  invalidate();
  return { ok: "Guardado." };
}

// ---------- Inventario ----------

export async function adjustStock(_: FormState, fd: FormData): Promise<FormState> {
  const session = await requireAdmin();
  const id = text(fd, "id", 120);
  const mode = text(fd, "mode", 6);
  const amount = intOrNull(text(fd, "amount", 6));
  const reason = (text(fd, "reason", 20) || "ajuste") as StockReason;
  if (!REASONS.includes(reason)) return { error: "Elige el motivo." };
  if (amount == null) return { error: "Escribe la cantidad." };
  if (mode !== "add" && mode !== "remove" && mode !== "set") return { error: "Elige si sumas, restas o fijas el stock." };
  try {
    const before = await catalogStore().getProduct(id);
    const after = await catalogStore().changeStock(
      id,
      mode === "set" ? { mode: "set", value: amount } : { mode: "add", delta: mode === "add" ? amount : -amount },
      { reason, note: text(fd, "note", 160) || null, ref: text(fd, "ref", 40) || null },
    );
    if (before) {
      const note = text(fd, "note", 160);
      await audit(session, { entity: "stock", entityId: id, action: "ajuste", summary: `${before.name}: ${units(before.stock)} → ${units(after)}${note ? ` (${note})` : ""}`, before: { stock: before.stock }, after: { stock: after } });
    }
    invalidate();
    return { ok: `Stock actualizado: ${after ?? 0} ${after === 1 ? "unidad" : "unidades"}.` };
  } catch (e) {
    return failure(e, "ajustar el stock");
  }
}

/** Activa o desactiva el control de inventario de un producto. */
export async function setStockTracking(id: string, tracked: boolean): Promise<FormState> {
  const session = await requireAdmin();
  try {
    const p = await catalogStore().getProduct(id);
    if (!p) return { error: "Este producto ya no existe." };
    await catalogStore().changeStock(id, { mode: "set", value: tracked ? (p.stock ?? 0) : null }, { reason: "ajuste", note: tracked ? "Activó el control de inventario" : "Quitó el control de inventario" });
    await audit(session, { entity: "stock", entityId: id, action: "control", summary: `${p.name}: ${tracked ? "activó" : "quitó"} el control de inventario` });
  } catch (e) {
    return failure(e, "cambiar el control de inventario");
  }
  invalidate();
  return { ok: tracked ? "Ahora se controla el stock de este producto." : "Este producto ya no controla stock." };
}

// ---------- Categorías y marcas ----------

function imageFrom(raw: string, alt: string): ProductImage | undefined {
  const list = parseImages(raw, alt);
  return typeof list === "string" ? undefined : list[0];
}

export async function saveCategory(_: FormState, fd: FormData): Promise<FormState> {
  const session = await requireOwner();
  const store = catalogStore();
  const name = text(fd, "name", 60);
  if (!name) return { error: "Escribe el nombre de la categoría." };
  try {
    const snap = await store.snapshot();
    const id = text(fd, "id", 80);
    const current = id ? snap.categories.find((c) => c.id === id) : undefined;
    const slugIn = slugify(text(fd, "slug", 80)) || slugify(name);
    const others = snap.categories.filter((c) => c.id !== id);
    if (others.some((c) => c.name.toLowerCase() === name.toLowerCase())) return { error: "Ya existe una categoría con ese nombre." };
    const image = imageFrom(String(fd.get("image") ?? ""), name);
    const category: Category = {
      id: current?.id ?? uniqueSlug(slugify(name), snap.categories.map((c) => c.id)),
      slug: uniqueSlug(slugIn, others.map((c) => c.slug)),
      name,
      description: text(fd, "description", 200),
      art: (ART.includes(text(fd, "art", 20) as ArtKind) ? text(fd, "art", 20) : current?.art ?? "controller") as ArtKind,
      order: intOrNull(text(fd, "order", 4)) ?? current?.order ?? snap.categories.length + 1,
      image: image ? { ...image, fit: "cover" } : undefined,
      visible: checked(fd, "visible"),
    };
    await store.saveCategory(category);
    await audit(session, { entity: "categoria", entityId: category.id, action: current ? "editar" : "crear", summary: `${current ? "Editó" : "Creó"} la categoría ${category.name}${category.visible ? "" : " (oculta)"}` });
    if (current?.image && current.image.src !== category.image?.src) await releaseMedia([current.image.src], await store.snapshot());
  } catch (e) {
    return failure(e, "guardar la categoría");
  }
  invalidate();
  return { ok: "Categoría guardada." };
}

export async function deleteCategory(id: string): Promise<FormState> {
  const session = await requireOwner();
  const store = catalogStore();
  try {
    const snap = await store.snapshot();
    const n = snap.products.filter((p) => p.categoryId === id).length;
    if (n) return { error: `No se puede eliminar: tiene ${n} ${n === 1 ? "producto" : "productos"}. Muévelos a otra categoría u oculta la categoría.` };
    const c = snap.categories.find((x) => x.id === id);
    await store.deleteCategory(id);
    if (c?.image) await releaseMedia([c.image.src], await store.snapshot());
  } catch (e) {
    return failure(e, "eliminar la categoría");
  }
  invalidate();
  return { ok: "Categoría eliminada." };
}

export async function saveBrand(_: FormState, fd: FormData): Promise<FormState> {
  const session = await requireOwner();
  const store = catalogStore();
  const name = text(fd, "name", 60);
  if (!name) return { error: "Escribe el nombre de la marca." };
  try {
    const snap = await store.snapshot();
    const id = text(fd, "id", 80);
    const current = id ? snap.brands.find((b) => b.id === id) : undefined;
    if (snap.brands.some((b) => b.id !== id && b.name.toLowerCase() === name.toLowerCase())) return { error: "Ya existe una marca con ese nombre." };
    const logo = imageFrom(String(fd.get("logo") ?? ""), name);
    const brand: Brand = {
      id: current?.id ?? uniqueSlug(slugify(name), snap.brands.map((b) => b.id)),
      name,
      authorized: checked(fd, "authorized"),
      isDemo: false,
      logo: logo ? { src: logo.src, width: logo.width, height: logo.height, withName: checked(fd, "withName") } : undefined,
      order: intOrNull(text(fd, "order", 4)) ?? current?.order ?? snap.brands.length + 1,
      visible: checked(fd, "visible"),
    };
    await store.saveBrand(brand);
    await audit(session, { entity: "marca", entityId: brand.id, action: current ? "editar" : "crear", summary: `${current ? "Editó" : "Creó"} la marca ${brand.name}${brand.visible ? "" : " (oculta)"}` });
    if (current?.logo && current.logo.src !== brand.logo?.src) await releaseMedia([current.logo.src], await store.snapshot());
  } catch (e) {
    return failure(e, "guardar la marca");
  }
  invalidate();
  return { ok: "Marca guardada." };
}

export async function deleteBrand(id: string): Promise<FormState> {
  const session = await requireOwner();
  const store = catalogStore();
  try {
    const snap = await store.snapshot();
    const n = snap.products.filter((p) => p.brandId === id).length;
    if (n) return { error: `No se puede eliminar: tiene ${n} ${n === 1 ? "producto" : "productos"}. Cámbiales la marca u oculta la marca.` };
    const b = snap.brands.find((x) => x.id === id);
    await store.deleteBrand(id);
    if (b?.logo) await releaseMedia([b.logo.src], await store.snapshot());
  } catch (e) {
    return failure(e, "eliminar la marca");
  }
  invalidate();
  return { ok: "Marca eliminada." };
}

// ---------- Importación ----------

export type PreviewResult = { error: string } | { plan: ImportPlan };

export async function previewImport(csv: string): Promise<PreviewResult> {
  const session = await requireOwner();
  const parsed = parseImport(csv);
  if ("error" in parsed) return parsed;
  try {
    return { plan: planImport(parsed.format, parsed.rows, await catalogStore().snapshot()) };
  } catch (e) {
    return { error: failure(e, "leer el catálogo")?.error ?? "Error" };
  }
}

export interface ChunkResult {
  line: number;
  ok: boolean;
  error?: string;
  productId?: string;
  name?: string;
  /** Fotos pendientes de descargar para este producto. */
  images?: string[];
}

async function ensureCategory(name: string, snap: CatalogSnapshot): Promise<string> {
  const found = snap.categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (found) return found.id;
  const c: Category = {
    id: uniqueSlug(slugify(name), snap.categories.map((x) => x.id)),
    slug: uniqueSlug(slugify(name), snap.categories.map((x) => x.slug)),
    name,
    description: "",
    art: name === DEFAULT_CATEGORY ? "case" : "speaker",
    order: snap.categories.length + 1,
    visible: true,
  };
  await catalogStore().saveCategory(c);
  snap.categories.push(c);
  return c.id;
}

async function ensureBrand(name: string, snap: CatalogSnapshot): Promise<string> {
  const found = snap.brands.find((b) => b.name.toLowerCase() === name.toLowerCase());
  if (found) return found.id;
  const b: Brand = { id: uniqueSlug(slugify(name), snap.brands.map((x) => x.id)), name, authorized: false, isDemo: false, order: name === DEFAULT_BRAND ? 999 : snap.brands.length + 1, visible: true };
  await catalogStore().saveBrand(b);
  snap.brands.push(b);
  return b.id;
}

async function applyRow(r: PlannedRow, snap: CatalogSnapshot): Promise<ChunkResult> {
  const store = catalogStore();
  if (r.action === "actualizar") {
    const p = snap.products.find((x) => x.id === r.productId);
    if (!p) return { line: r.line, ok: false, error: "El producto ya no existe." };
    const next: ProductRecord = {
      ...p,
      name: r.name ?? p.name,
      categoryId: r.category ? await ensureCategory(r.category, snap) : p.categoryId,
      brandId: r.brand ? await ensureBrand(r.brand, snap) : p.brandId,
      price: r.price !== undefined ? r.price : p.price,
      salePrice: r.salePrice !== undefined ? r.salePrice : p.salePrice,
      lowStockAt: r.lowStockAt ?? p.lowStockAt,
      allowBackorder: r.allowBackorder ?? p.allowBackorder,
      maxPerOrder: r.maxPerOrder ?? p.maxPerOrder,
      status: r.status ?? p.status,
      featured: r.featured ?? p.featured,
      keyFigure: r.keyFigure ?? p.keyFigure,
      description: r.description ?? p.description,
      specs: r.specs ?? p.specs,
    };
    await store.updateProduct(next);
    if (r.stock !== undefined && r.stock !== p.stock) await store.changeStock(p.id, { mode: "set", value: r.stock }, { reason: "importacion" });
    return { line: r.line, ok: true, productId: p.id, name: next.name, images: r.fetchImages ? r.imageUrls : undefined };
  }
  const name = r.name as string;
  const id = uniqueSlug(slugify(name), snap.products.map((x) => x.id));
  const record: ProductRecord = {
    id,
    slug: uniqueSlug(slugify(name), snap.products.map((x) => x.slug)),
    sku: r.sku,
    name,
    brandId: await ensureBrand(r.brand ?? DEFAULT_BRAND, snap),
    categoryId: await ensureCategory(r.category ?? DEFAULT_CATEGORY, snap),
    description: r.description ?? "",
    price: r.price ?? null,
    salePrice: r.salePrice ?? null,
    keyFigure: r.keyFigure ?? null,
    specs: r.specs ?? [],
    images: [],
    art: "speaker",
    stock: r.stock === undefined ? null : r.stock,
    lowStockAt: r.lowStockAt ?? 0,
    allowBackorder: r.allowBackorder ?? false,
    maxPerOrder: r.maxPerOrder ?? 5,
    featured: r.featured ?? false,
    status: r.status ?? "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await store.createProduct(record);
  snap.products.push(record);
  return { line: r.line, ok: true, productId: id, name, images: r.fetchImages ? r.imageUrls : undefined };
}

/**
 * Aplica un tramo del archivo (el navegador lo llama por partes y muestra el progreso): así una
 * importación de cientos de productos no choca con el tiempo máximo de una función en Vercel.
 */
export async function applyImportChunk(csv: string, from: number, to: number): Promise<{ error: string } | { results: ChunkResult[] }> {
  const session = await requireOwner();
  const parsed = parseImport(csv);
  if ("error" in parsed) return parsed;
  const store = catalogStore();
  let snap: CatalogSnapshot;
  try {
    snap = await store.snapshot();
  } catch (e) {
    return { error: failure(e, "leer el catálogo")?.error ?? "Error" };
  }
  // El plan se rehace contra el catálogo actual: las filas de tramos anteriores ya figuran como existentes.
  const plan = planImport(parsed.format, parsed.rows, snap);
  const results: ChunkResult[] = [];
  for (const r of plan.rows.slice(from, to)) {
    if (r.errors.length || r.action === "omitir") continue;
    try {
      results.push(await applyRow(r, snap));
    } catch (e) {
      results.push({ line: r.line, ok: false, error: failure(e, "importar esta fila")?.error });
    }
  }
  const done = results.filter((r) => r.ok).length;
  if (done) await audit(session, { entity: "importacion", action: "importar", summary: `Importó ${done} ${done === 1 ? "producto" : "productos"} desde CSV` });
  invalidate();
  return { results };
}

/** Descarga las fotos de un producto importado y las agrega a su galería. */
export async function importProductImages(productId: string, urls: string[]): Promise<{ added: number; failed: { url: string; error: string }[] }> {
  const session = await requireOwner();
  const store = catalogStore();
  const p = await store.getProduct(productId);
  if (!p) return { added: 0, failed: urls.map((url) => ({ url, error: "El producto ya no existe." })) };
  const added: ProductImage[] = [];
  const failed: { url: string; error: string }[] = [];
  for (const url of urls.slice(0, 8)) {
    try {
      added.push({ ...(await importRemoteImage(url, p.slug)), alt: p.name });
    } catch (e) {
      failed.push({ url, error: e instanceof Error ? e.message : "No se pudo descargar." });
    }
  }
  if (added.length) {
    const fresh = (await store.getProduct(productId)) ?? p;
    await store.updateProduct({ ...fresh, images: [...fresh.images, ...added].slice(0, 12) });
    invalidate();
  }
  return { added: added.length, failed };
}

// ---------- Promociones ----------

const SCOPES: PromotionScope[] = ["tienda", "categoria", "producto"];
const dayOrNull = (fd: FormData, key: string) => {
  const v = text(fd, key, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};

export async function savePromotion(_: FormState, fd: FormData): Promise<FormState> {
  const session = await requireOwner();
  const store = catalogStore();
  const scopeIn = text(fd, "scope", 20) as PromotionScope;
  const scope = SCOPES.includes(scopeIn) ? scopeIn : "tienda";
  const draft = {
    name: text(fd, "name", 80),
    percent: Number(text(fd, "percent", 3).replace(/\D/g, "") || 0),
    scope,
    targetId: scope === "tienda" ? null : text(fd, scope === "categoria" ? "categoryId" : "productId", 120) || null,
    startsAt: dayOrNull(fd, "startsAt"),
    endsAt: dayOrNull(fd, "endsAt"),
    active: checked(fd, "active"),
  };
  const problem = promotionProblem(draft);
  if (problem) return { error: problem };
  try {
    const snap = await store.snapshot();
    if (draft.scope === "categoria" && !snap.categories.some((c) => c.id === draft.targetId)) return { error: "Esa categoría ya no existe." };
    if (draft.scope === "producto" && !snap.products.some((p) => p.id === draft.targetId)) return { error: "Ese producto ya no existe." };
    const id = text(fd, "id", 80);
    const current = id ? snap.promotions.find((p) => p.id === id) : undefined;
    const now = new Date().toISOString();
    await audit(session, { entity: "promocion", entityId: current?.id ?? null, action: current ? "editar" : "crear", summary: `${current ? "Editó" : "Creó"} la promoción ${draft.name} (−${draft.percent} %)` });
    await store.savePromotion({
      ...draft,
      id: current?.id ?? uniqueSlug(slugify(draft.name), snap.promotions.map((p) => p.id)),
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    });
  } catch (e) {
    return failure(e, "guardar la promoción");
  }
  invalidate();
  return { ok: "Promoción guardada. Los precios de la tienda ya la reflejan." };
}

export async function setPromotionActive(id: string, active: boolean): Promise<FormState> {
  const session = await requireOwner();
  const store = catalogStore();
  try {
    const current = (await store.snapshot()).promotions.find((p) => p.id === id);
    if (!current) return { error: "La promoción ya no existe." };
    await store.savePromotion({ ...current, active, updatedAt: new Date().toISOString() });
    await audit(session, { entity: "promocion", entityId: id, action: active ? "reanudar" : "pausar", summary: `${active ? "Reanudó" : "Pausó"} la promoción ${current.name}` });
  } catch (e) {
    return failure(e, active ? "reanudar la promoción" : "pausar la promoción");
  }
  invalidate();
  return { ok: active ? "Promoción reanudada." : "Promoción pausada." };
}

export async function deletePromotion(id: string): Promise<FormState> {
  const session = await requireOwner();
  try {
    const gone = (await catalogStore().snapshot()).promotions.find((x) => x.id === id);
    await catalogStore().deletePromotion(id);
    if (gone) await audit(session, { entity: "promocion", entityId: id, action: "eliminar", summary: `Eliminó la promoción ${gone.name}` });
  } catch (e) {
    return failure(e, "eliminar la promoción");
  }
  invalidate();
  return { ok: "Promoción eliminada." };
}

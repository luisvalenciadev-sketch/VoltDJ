"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useId, useMemo, useRef, useState, useTransition } from "react";
import {
  adjustStock,
  applyImportChunk,
  deleteBrand,
  deleteCategory,
  deleteProduct,
  duplicateProduct,
  importProductImages,
  previewImport,
  quickUpdate,
  saveBrand,
  saveCategory,
  saveProduct,
  setProductStatus,
  setStockTracking,
  type ChunkResult,
  type FormState,
} from "@/app/admin/catalogo-actions";
import { ProductArt } from "@/components/ProductArt";
import type { ArtKind, Brand, Category, ProductImage, ProductRecord, PublicationStatus, Spec } from "@/data/types";
import type { ImportPlan } from "@/lib/catalog-import";
import { availabilityFor } from "@/lib/inventory";
import type { UploadMode } from "@/lib/media";
import { AVAILABILITY_LABEL, formatCOP } from "@/lib/pricing";

// ---------- Piezas comunes ----------

function Message({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <p className={`alert ${state.error ? "err" : "ok"}`} role={state.error ? "alert" : "status"}>
      <span>{state.error ?? state.ok}</span>
    </p>
  );
}

const digits = (v: string) => v.replace(/\D/g, "").slice(0, 11);
const thousands = (n: number | null) => (n == null ? "" : n.toLocaleString("es-CO"));

/** Pesos con separador de miles mientras se escribe. Vacío = sin valor (p. ej. precio por confirmar). */
function MoneyInput({ id, name, label, value, onChange, hint, placeholder = "0" }: { id: string; name: string; label: string; value: number | null; onChange: (n: number | null) => void; hint?: string; placeholder?: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="money">
        <span aria-hidden="true">$</span>
        <input id={id} className="input num" inputMode="numeric" autoComplete="off" value={thousands(value)} placeholder={placeholder} onChange={(e) => onChange(digits(e.target.value) === "" ? null : Number(digits(e.target.value)))} />
        <input type="hidden" name={name} value={value == null ? "" : String(value)} />
      </div>
      {hint && <span className="note">{hint}</span>}
    </div>
  );
}

function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="aform-sec" aria-labelledby={`sec-${id}`}>
      <header>
        <div>
          <h2 id={`sec-${id}`}>{title}</h2>
          {hint && <p className="note">{hint}</p>}
        </div>
      </header>
      <div className="aform-body">{children}</div>
    </section>
  );
}

/** Botón de dos pasos para lo que no se puede deshacer. */
function ConfirmAction({ label, confirm, onConfirm, pending }: { label: string; confirm: string; onConfirm: () => void; pending?: boolean }) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <button type="button" className="textbtn danger" onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  return (
    <span className="confirm" role="group" aria-label={confirm}>
      <span>{confirm}</span>
      <button type="button" className="btn btn-sm btn-danger" disabled={pending} onClick={onConfirm}>
        {pending ? "…" : "Sí, eliminar"}
      </button>
      <button type="button" className="textbtn" onClick={() => setAsking(false)}>
        Cancelar
      </button>
    </span>
  );
}

const ART_LABEL: Record<ArtKind, string> = {
  controller: "Controlador",
  mixer: "Mezcladora / efectos",
  turntable: "Reproductor / tornamesa",
  speaker: "Parlante",
  headphones: "Audífonos",
  mic: "Micrófono",
  light: "Luces",
  case: "Estuche",
  cable: "Cable",
  needle: "Aguja",
  stand: "Soporte",
};

const STATUS_LABEL: Record<PublicationStatus, string> = { published: "Publicado", draft: "Borrador", archived: "Archivado" };

// ---------- Fotos ----------

/**
 * Optimiza en el navegador antes de subir: máximo 1600 px y WebP (o JPG/PNG donde el navegador no
 * codifica WebP). Una foto de 8 MB del celular llega como ~300 KB y la subida no depende del servidor.
 */
async function optimize(file: File, keepAlpha: boolean): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const width = Math.round(bmp.width * scale);
  const height = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  const toBlob = (type: string, q?: number) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));
  let blob = await toBlob("image/webp", 0.82);
  if (!blob || blob.type !== "image/webp") blob = await toBlob(keepAlpha ? "image/png" : "image/jpeg", 0.86);
  if (!blob) throw new Error("No se pudo procesar la foto.");
  return { blob, width, height };
}

async function uploadImage(file: File, mode: UploadMode, baseName: string, keepAlpha = false): Promise<ProductImage> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error(`"${file.name}" no es una foto JPG, PNG o WebP.`);
  const { blob, width, height } = await optimize(file, keepAlpha);
  const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
  let src: string;
  if (mode === "blob") {
    const { upload } = await import("@vercel/blob/client");
    src = (await upload(`productos/${baseName || "foto"}.${ext}`, blob, { access: "public", handleUploadUrl: "/admin/subir", contentType: blob.type })).url;
  } else {
    const fd = new FormData();
    fd.append("file", new File([blob], `foto.${ext}`, { type: blob.type }));
    const res = await fetch("/admin/subir", { method: "POST", body: fd });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !json.url) throw new Error(json.error ?? "No se pudo subir la foto.");
    src = json.url;
  }
  return { src, width, height, alt: "", fit: "contain" };
}

function UploadOff() {
  return (
    <p className="alert warn">
      <span>Falta conectar el almacenamiento de fotos: en Vercel, Storage → Blob → conectar al proyecto.</span>
    </p>
  );
}

/** Galería del producto: subir varias, ordenar (la primera es la portada), texto alternativo y quitar. */
function ImageManager({ images, onChange, mode, baseName, alt }: { images: ProductImage[]; onChange: (next: ProductImage[]) => void; mode: UploadMode; baseName: string; alt: string }) {
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const latest = useRef(images);
  latest.current = images;

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = [...files].slice(0, 12 - latest.current.length);
    setBusy(list.length);
    for (const f of list) {
      try {
        const img = await uploadImage(f, mode, baseName);
        onChange([...latest.current, { ...img, alt }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo subir la foto.");
      }
      setBusy((n) => n - 1);
    }
    if (input.current) input.current.value = "";
  }
  const move = (i: number, d: -1 | 1) => {
    const next = [...images];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };

  return (
    <div className="stack">
      {images.length > 0 ? (
        <ol className="img-grid">
          {images.map((img, i) => (
            <li key={img.src}>
              <div className="img-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element -- miniatura del panel, sin optimizar a propósito */}
                <img src={img.src} alt="" />
                {i === 0 && <span className="img-cover">Portada</span>}
              </div>
              <label className="sr-only" htmlFor={`alt-${i}`}>
                Descripción de la foto {i + 1}
              </label>
              <input id={`alt-${i}`} className="input input-sm" value={img.alt} placeholder="Qué se ve en la foto" maxLength={160} onChange={(e) => onChange(images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
              <div className="img-tools">
                <button type="button" className="iconbtn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Mover la foto ${i + 1} antes`}>
                  ←
                </button>
                <button type="button" className="iconbtn" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label={`Mover la foto ${i + 1} después`}>
                  →
                </button>
                <button type="button" className="textbtn danger" onClick={() => onChange(images.filter((_, j) => j !== i))}>
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-lines">Sin fotos: la tienda muestra la ilustración del tipo de equipo.</p>
      )}
      {mode === "off" ? (
        <UploadOff />
      ) : (
        <div className="row-wrap">
          <label className={`btn btn-secondary btn-sm${busy || images.length >= 12 ? " is-disabled" : ""}`}>
            {busy ? `Subiendo ${busy}…` : "+ Subir fotos"}
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={busy > 0 || images.length >= 12} onChange={(e) => add(e.target.files)} aria-label="Subir fotos" />
          </label>
          <span className="note">JPG, PNG o WebP. Se optimizan al subir. Máximo 12.</span>
        </div>
      )}
      {error && (
        <p className="alert err" role="alert">
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/** Una sola imagen (categoría o logo de marca). */
function SingleImage({ label, value, onChange, mode, baseName, keepAlpha }: { label: string; value: ProductImage | null; onChange: (v: ProductImage | null) => void; mode: UploadMode; baseName: string; keepAlpha?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="single-img">
        <div className="img-thumb">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- miniatura del panel
            <img src={value.src} alt="" />
          ) : (
            <span className="note">Sin imagen</span>
          )}
        </div>
        {mode === "off" ? (
          <UploadOff />
        ) : (
          <div className="row-wrap">
            <label className="btn btn-secondary btn-sm" htmlFor={id}>
              {busy ? "Subiendo…" : value ? "Cambiar" : "Subir"}
            </label>
            <input
              id={id}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setBusy(true);
                setError(null);
                try {
                  onChange(await uploadImage(f, mode, baseName, keepAlpha));
                } catch (err) {
                  setError(err instanceof Error ? err.message : "No se pudo subir.");
                }
                setBusy(false);
                e.target.value = "";
              }}
            />
            {value && (
              <button type="button" className="textbtn danger" onClick={() => onChange(null)}>
                Quitar
              </button>
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="alert err" role="alert">
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

// ---------- Ficha de producto ----------

interface ProductFormProps {
  product?: ProductRecord;
  categories: Category[];
  brands: Brand[];
  mode: UploadMode;
  promoPercent: number | null;
  writable: boolean;
}

export function ProductForm({ product, categories, brands, mode, promoPercent, writable }: ProductFormProps) {
  const [state, action, pending] = useActionState(saveProduct, undefined);
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState<number | null>(product?.price ?? null);
  const [salePrice, setSalePrice] = useState<number | null>(product?.salePrice ?? null);
  const [images, setImages] = useState<ProductImage[]>(product?.images ?? []);
  const [art, setArt] = useState<ArtKind>(product?.art ?? "speaker");
  const [specs, setSpecs] = useState<Spec[]>(product?.specs.length ? product.specs : [{ label: "", value: "" }]);
  const [tracked, setTracked] = useState(product ? product.stock !== null : true);
  const [stock, setStock] = useState(product?.stock ?? 1);
  const [lowStockAt, setLowStockAt] = useState(product?.lowStockAt ?? 0);
  const [backorder, setBackorder] = useState(product?.allowBackorder ?? false);
  const [status, setStatus] = useState<PublicationStatus>(product?.status ?? "draft");
  const [dirty, setDirty] = useState(false);

  const availability = availabilityFor({ stock: tracked ? stock : null, lowStockAt, allowBackorder: backorder });
  const effective = salePrice != null && price != null && salePrice < price ? salePrice : promoPercent && price != null ? Math.round((price * (1 - promoPercent / 100)) / 1000) * 1000 : null;
  const brandName = brands.find((b) => b.id === product?.brandId)?.name;
  const slugBase = useMemo(() => name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), [name]);

  return (
    <form action={action} className="aform" onChange={() => setDirty(true)}>
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="specs" value={JSON.stringify(specs)} />
      <div className="aform-main">
        {!writable && (
          <p className="alert warn">
            <span>Falta conectar la base de datos (Neon): puedes ver el catálogo, pero los cambios no se guardan.</span>
          </p>
        )}
        <Section id="info" title="Producto">
          <div className="admin-grid">
            <div className="field span-2">
              <label htmlFor="name">Nombre *</label>
              <input id="name" name="name" className="input" required maxLength={160} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Cabina activa 15&quot; 1000W" />
            </div>
            <div className="field">
              <label htmlFor="brandId">Marca *</label>
              <select id="brandId" name="brandId" className="input" required defaultValue={product?.brandId ?? ""}>
                <option value="" disabled>
                  Elige la marca
                </option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <Link className="note link" href="/admin/marcas">
                Crear o editar marcas
              </Link>
            </div>
            <div className="field">
              <label htmlFor="categoryId">Categoría *</label>
              <select id="categoryId" name="categoryId" className="input" required defaultValue={product?.categoryId ?? ""}>
                <option value="" disabled>
                  Elige la categoría
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Link className="note link" href="/admin/categorias">
                Crear o editar categorías
              </Link>
            </div>
            <div className="field">
              <label htmlFor="sku">Referencia (SKU)</label>
              <input id="sku" name="sku" className="input mono" maxLength={60} defaultValue={product?.sku ?? ""} placeholder="Ej.: DDJ-FLX4" />
              <span className="note">Con ella se reconoce el producto al importar desde Excel.</span>
            </div>
            <div className="field">
              <label htmlFor="keyFigure">Cifra clave</label>
              <input id="keyFigure" name="keyFigure" className="input" maxLength={12} defaultValue={product?.keyFigure ?? ""} placeholder='18", 1000W, 4CH' />
              <span className="note">Lo primero que busca el comprador. Se muestra en grande en la vitrina.</span>
            </div>
            <div className="field span-2">
              <label htmlFor="description">Descripción</label>
              <textarea id="description" name="description" className="input textarea" rows={5} maxLength={4000} defaultValue={product?.description ?? ""} />
            </div>
          </div>
        </Section>

        <Section id="precio" title="Precio" hint={promoPercent ? `La promoción general (${promoPercent} %) se aplica sola a los productos sin precio rebajado propio.` : undefined}>
          <div className="admin-grid">
            <MoneyInput id="price" name="price" label="Precio" value={price} onChange={setPrice} placeholder="Por confirmar" hint="Vacío = la tienda muestra “precio por confirmar”." />
            <MoneyInput id="salePrice" name="salePrice" label="Precio rebajado (opcional)" value={salePrice} onChange={setSalePrice} placeholder="Sin rebaja" hint={salePrice != null && price != null && salePrice < price ? `${Math.round((1 - salePrice / price) * 100)} % de descuento` : "Debe ser menor que el precio."} />
          </div>
        </Section>

        <Section id="fotos" title="Fotos" hint="La primera es la portada. Usa las flechas para cambiar el orden.">
          <ImageManager images={images} onChange={(n) => (setImages(n), setDirty(true))} mode={mode} baseName={slugBase} alt={name} />
          <div className="field">
            <label htmlFor="art">Ilustración si no hay foto</label>
            <select id="art" name="art" className="input" value={art} onChange={(e) => setArt(e.target.value as ArtKind)}>
              {(Object.keys(ART_LABEL) as ArtKind[]).map((k) => (
                <option key={k} value={k}>
                  {ART_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
        </Section>

        <Section id="inventario" title="Inventario">
          <label className="step-toggle">
            <input type="checkbox" name="tracked" checked={tracked} onChange={(e) => setTracked(e.target.checked)} />
            Controlar el stock de este producto
          </label>
          {tracked ? (
            <div className="admin-grid">
              <div className="field">
                <label htmlFor="stock">Unidades en bodega</label>
                <input id="stock" name="stock" className="input num" inputMode="numeric" value={stock} onChange={(e) => setStock(Number(digits(e.target.value) || 0))} />
                {product && product.stock !== null && stock !== product.stock && <span className="note">Quedará en el historial como ajuste.</span>}
              </div>
              <div className="field">
                <label htmlFor="lowStockAt">Avisar “Pocas unidades” desde</label>
                <input id="lowStockAt" name="lowStockAt" className="input num" inputMode="numeric" value={lowStockAt} onChange={(e) => setLowStockAt(Number(digits(e.target.value) || 0))} />
                <span className="note">0 = nunca.</span>
              </div>
              <label className="step-toggle span-2">
                <input type="checkbox" name="allowBackorder" checked={backorder} onChange={(e) => setBackorder(e.target.checked)} />
                Sin unidades, seguir vendiendo “bajo pedido”
              </label>
              {product && product.stock !== null && stock !== product.stock && (
                <div className="field span-2">
                  <label htmlFor="stockNote">Motivo del cambio de stock</label>
                  <input id="stockNote" name="stockNote" className="input" maxLength={160} placeholder="Ej.: llegó mercancía, conteo de bodega" />
                </div>
              )}
            </div>
          ) : (
            <p className="note">Sin control de inventario la tienda lo muestra siempre como disponible.</p>
          )}
          <div className="field narrow">
            <label htmlFor="maxPerOrder">Máximo por pedido</label>
            <input id="maxPerOrder" name="maxPerOrder" className="input num" inputMode="numeric" defaultValue={product?.maxPerOrder ?? 5} />
          </div>
        </Section>

        <Section id="ficha" title="Ficha técnica" hint="Lo que el comprador compara: potencia, canales, conexiones, peso.">
          <ul className="spec-rows">
            {specs.map((s, i) => (
              <li key={i}>
                <input className="input" aria-label={`Dato ${i + 1}`} placeholder="Dato (Potencia)" maxLength={60} value={s.label} onChange={(e) => (setSpecs(specs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x))), setDirty(true))} />
                <input className="input" aria-label={`Valor ${i + 1}`} placeholder="Valor (1000 W)" maxLength={160} value={s.value} onChange={(e) => (setSpecs(specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x))), setDirty(true))} />
                <button type="button" className="iconbtn" aria-label={`Quitar el dato ${i + 1}`} onClick={() => (setSpecs(specs.filter((_, j) => j !== i)), setDirty(true))}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSpecs([...specs, { label: "", value: "" }])} disabled={specs.length >= 30}>
            + Agregar dato
          </button>
        </Section>

        <Section id="publicacion" title="Publicación">
          <div className="mode-cards" role="radiogroup" aria-label="Estado">
            {(["published", "draft", "archived"] as PublicationStatus[]).map((s) => (
              <label key={s} className="mode-card" data-on={status === s ? "" : undefined}>
                <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} />
                <b>{STATUS_LABEL[s]}</b>
                <span>{s === "published" ? "Visible en la tienda." : s === "draft" ? "Guardado, todavía no se muestra." : "Retirado de la tienda; se conserva en el panel."}</span>
              </label>
            ))}
          </div>
          <label className="step-toggle">
            <input type="checkbox" name="featured" defaultChecked={product?.featured ?? false} />
            Destacar en el inicio
          </label>
          <div className="field">
            <label htmlFor="slug">Dirección web</label>
            <div className="prefixed">
              <span aria-hidden="true">/producto/</span>
              <input id="slug" name="slug" className="input mono" maxLength={120} defaultValue={product?.slug ?? ""} placeholder={slugBase || "se-crea-del-nombre"} />
            </div>
            <span className="note">Vacía = se crea del nombre. Cambiarla rompe los enlaces que ya compartiste.</span>
          </div>
        </Section>
      </div>

      <aside className="preview" aria-label="Vista previa">
        <span className="eyebrow">Así se verá</span>
        <div className="pcard-mini">
          <div className="pcard-media">
            {images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element -- vista previa del panel
              <img src={images[0].src} alt="" />
            ) : (
              <ProductArt kind={art} />
            )}
          </div>
          <div className="pcard-body">
            {brandName && <span className="eyebrow">{brandName}</span>}
            <b>{name || "Nombre del producto"}</b>
            <span className={`pv-avail pv-avail-${availability}`}>{AVAILABILITY_LABEL[availability]}</span>
            <div className="pcard-price">
              {price == null ? (
                <span className="note">Precio por confirmar</span>
              ) : effective != null ? (
                <>
                  <b>{formatCOP(effective)}</b> <s>{formatCOP(price)}</s>
                </>
              ) : (
                <b>{formatCOP(price)}</b>
              )}
            </div>
          </div>
        </div>
        <p className="note">{STATUS_LABEL[status]}{status !== "published" ? ": no aparece en la tienda." : "."}</p>
        {product?.status === "published" && (
          <Link className="link" href={`/producto/${product.slug}`} target="_blank">
            Ver en la tienda ↗
          </Link>
        )}
      </aside>

      <div className="aform-bar">
        <Message state={state} />
        {dirty && !pending && !state && <span className="note">Cambios sin guardar</span>}
        <button type="submit" className="btn btn-primary" disabled={pending || !writable}>
          {pending ? "Guardando…" : product ? "Guardar cambios" : "Crear producto"}
        </button>
      </div>
    </form>
  );
}

/** Acciones de la ficha que no son "guardar": publicar/archivar, duplicar, eliminar. */
export function ProductActions({ product, writable }: { product: ProductRecord; writable: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<FormState>(undefined);
  const run = (fn: () => Promise<FormState | void>) =>
    start(async () => {
      const r = await fn();
      if (r) setMsg(r);
      router.refresh();
    });
  if (!writable) return null;
  return (
    <div className="stack">
      <div className="row-wrap">
        {product.status !== "published" && (
          <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run(() => setProductStatus(product.id, "published"))}>
            Publicar
          </button>
        )}
        {product.status !== "archived" && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(() => setProductStatus(product.id, "archived"))}>
            Archivar
          </button>
        )}
        <form action={duplicateProduct.bind(null, product.id)}>
          <button type="submit" className="btn btn-ghost btn-sm">
            Duplicar
          </button>
        </form>
        <ConfirmAction label="Eliminar" confirm="¿Eliminar el producto y sus fotos? No se puede deshacer." pending={pending} onConfirm={() => run(() => deleteProduct(product.id))} />
      </div>
      <Message state={msg} />
    </div>
  );
}

// ---------- Lista: edición rápida ----------

export function QuickEdit({ product, writable }: { product: ProductRecord; writable: boolean }) {
  const [state, action, pending] = useActionState(quickUpdate, undefined);
  const [price, setPrice] = useState<number | null>(product.price);
  const [stock, setStock] = useState(product.stock == null ? "" : String(product.stock));
  const changed = price !== product.price || (product.stock !== null && stock !== String(product.stock));
  return (
    <form action={action} className="quick-edit">
      <input type="hidden" name="id" value={product.id} />
      <div className="money">
        <span aria-hidden="true">$</span>
        <input className="input input-sm num" aria-label={`Precio de ${product.name}`} inputMode="numeric" value={thousands(price)} placeholder="Por confirmar" disabled={!writable} onChange={(e) => setPrice(digits(e.target.value) === "" ? null : Number(digits(e.target.value)))} />
        <input type="hidden" name="price" value={price == null ? "" : String(price)} />
      </div>
      {product.stock === null ? (
        <span className="note qe-stock" title="Este producto no controla stock">
          —
        </span>
      ) : (
        <input className="input input-sm num qe-stock" name="stock" aria-label={`Stock de ${product.name}`} inputMode="numeric" value={stock} disabled={!writable} onChange={(e) => setStock(digits(e.target.value).slice(0, 5))} />
      )}
      <button type="submit" className="btn btn-sm btn-secondary" disabled={!changed || pending || !writable}>
        {pending ? "…" : "Guardar"}
      </button>
      {state && <span className={`qe-msg ${state.error ? "err" : "ok"}`} role={state.error ? "alert" : "status"}>{state.error ?? "✓"}</span>}
    </form>
  );
}

// ---------- Inventario ----------

export function StockAdjust({ product, writable }: { product: ProductRecord; writable: boolean }) {
  const [state, action, pending] = useActionState(adjustStock, undefined);
  const [mode, setMode] = useState<"add" | "remove" | "set">("add");
  const [pendingTrack, start] = useTransition();
  const router = useRouter();
  const id = useId();
  if (product.stock === null) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" disabled={!writable || pendingTrack} onClick={() => start(async () => (await setStockTracking(product.id, true), router.refresh()))}>
        Controlar stock
      </button>
    );
  }
  return (
    <form action={action} className="stock-adjust">
      <input type="hidden" name="id" value={product.id} />
      <input type="hidden" name="mode" value={mode} />
      <div className="segmented" role="radiogroup" aria-label="Tipo de ajuste">
        {(
          [
            ["add", "Sumar"],
            ["remove", "Restar"],
            ["set", "Fijar en"],
          ] as const
        ).map(([m, l]) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>
            {l}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor={`${id}-amount`}>
        Cantidad
      </label>
      <input id={`${id}-amount`} name="amount" className="input input-sm num" inputMode="numeric" required placeholder="0" />
      <label className="sr-only" htmlFor={`${id}-reason`}>
        Motivo
      </label>
      <select id={`${id}-reason`} name="reason" className="input input-sm" defaultValue="ajuste">
        <option value="ajuste">Ajuste o conteo</option>
        <option value="pedido">Venta / pedido</option>
        <option value="cancelacion">Devolución o cancelación</option>
      </select>
      <label className="sr-only" htmlFor={`${id}-note`}>
        Nota
      </label>
      <input id={`${id}-note`} name="note" className="input input-sm" maxLength={160} placeholder="Nota (opcional)" />
      <button type="submit" className="btn btn-sm btn-secondary" disabled={pending || !writable}>
        {pending ? "…" : "Aplicar"}
      </button>
      {state && <span className={`qe-msg ${state.error ? "err" : "ok"}`} role={state.error ? "alert" : "status"}>{state.error ?? state.ok}</span>}
    </form>
  );
}

// ---------- Categorías y marcas ----------

export function CategoryEditor({ category, products, mode, writable }: { category?: Category; products: number; mode: UploadMode; writable: boolean }) {
  const [state, action, pending] = useActionState(saveCategory, undefined);
  const [image, setImage] = useState<ProductImage | null>(category?.image ?? null);
  const [delState, del, deleting] = useActionState(async () => (category ? deleteCategory(category.id) : undefined), undefined);
  const uid = category?.id ?? "nueva";
  return (
    <form action={action} className="stack">
      {category && <input type="hidden" name="id" value={category.id} />}
      <input type="hidden" name="image" value={image ? JSON.stringify([image]) : "[]"} />
      <div className="admin-grid">
        <div className="field">
          <label htmlFor={`c-name-${uid}`}>Nombre *</label>
          <input id={`c-name-${uid}`} name="name" className="input" required maxLength={60} defaultValue={category?.name} />
        </div>
        <div className="field">
          <label htmlFor={`c-slug-${uid}`}>Dirección web</label>
          <div className="prefixed">
            <span aria-hidden="true">/catalogo/</span>
            <input id={`c-slug-${uid}`} name="slug" className="input mono" maxLength={80} defaultValue={category?.slug} placeholder="se-crea-del-nombre" />
          </div>
        </div>
        <div className="field span-2">
          <label htmlFor={`c-desc-${uid}`}>Descripción corta</label>
          <input id={`c-desc-${uid}`} name="description" className="input" maxLength={200} defaultValue={category?.description} />
        </div>
        <div className="field">
          <label htmlFor={`c-art-${uid}`}>Ilustración</label>
          <select id={`c-art-${uid}`} name="art" className="input" defaultValue={category?.art ?? "speaker"}>
            {(Object.keys(ART_LABEL) as ArtKind[]).map((k) => (
              <option key={k} value={k}>
                {ART_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="field narrow">
          <label htmlFor={`c-order-${uid}`}>Orden</label>
          <input id={`c-order-${uid}`} name="order" className="input num" inputMode="numeric" defaultValue={category?.order} />
        </div>
        <div className="span-2">
          <SingleImage label="Foto de la categoría" value={image} onChange={setImage} mode={mode} baseName={`categoria-${uid}`} />
        </div>
        <label className="step-toggle span-2">
          <input type="checkbox" name="visible" defaultChecked={category?.visible !== false} />
          Visible en la tienda
        </label>
      </div>
      <div className="row-wrap">
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending || !writable}>
          {pending ? "Guardando…" : category ? "Guardar" : "Crear categoría"}
        </button>
        {category && writable && (products === 0 ? <ConfirmAction label="Eliminar" confirm="¿Eliminar esta categoría?" pending={deleting} onConfirm={() => del()} /> : <span className="note">Tiene {products} productos: no se puede eliminar, solo ocultar.</span>)}
      </div>
      <Message state={state ?? delState} />
    </form>
  );
}

export function BrandEditor({ brand, products, mode, writable }: { brand?: Brand; products: number; mode: UploadMode; writable: boolean }) {
  const [state, action, pending] = useActionState(saveBrand, undefined);
  const [logo, setLogo] = useState<ProductImage | null>(brand?.logo ? { ...brand.logo, alt: brand.name } : null);
  const [delState, del, deleting] = useActionState(async () => (brand ? deleteBrand(brand.id) : undefined), undefined);
  const uid = brand?.id ?? "nueva";
  return (
    <form action={action} className="stack">
      {brand && <input type="hidden" name="id" value={brand.id} />}
      <input type="hidden" name="logo" value={logo ? JSON.stringify([logo]) : "[]"} />
      <div className="admin-grid">
        <div className="field">
          <label htmlFor={`b-name-${uid}`}>Nombre *</label>
          <input id={`b-name-${uid}`} name="name" className="input" required maxLength={60} defaultValue={brand?.name} />
        </div>
        <div className="field narrow">
          <label htmlFor={`b-order-${uid}`}>Orden</label>
          <input id={`b-order-${uid}`} name="order" className="input num" inputMode="numeric" defaultValue={brand?.order} />
        </div>
        <div className="span-2">
          <SingleImage label="Logo (mejor PNG o SVG convertido, fondo transparente)" value={logo} onChange={setLogo} mode={mode} baseName={`marca-${uid}`} keepAlpha />
        </div>
        <label className="step-toggle">
          <input type="checkbox" name="withName" defaultChecked={brand?.logo?.withName ?? false} />
          El logo es solo un símbolo: mostrar el nombre al lado
        </label>
        <label className="step-toggle">
          <input type="checkbox" name="authorized" defaultChecked={brand?.authorized ?? false} />
          Distribuidor autorizado
        </label>
        <label className="step-toggle span-2">
          <input type="checkbox" name="visible" defaultChecked={brand?.visible !== false} />
          Visible en la tienda
        </label>
      </div>
      <div className="row-wrap">
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending || !writable}>
          {pending ? "Guardando…" : brand ? "Guardar" : "Crear marca"}
        </button>
        {brand && writable && (products === 0 ? <ConfirmAction label="Eliminar" confirm="¿Eliminar esta marca?" pending={deleting} onConfirm={() => del()} /> : <span className="note">Tiene {products} productos: no se puede eliminar, solo ocultar.</span>)}
      </div>
      <Message state={state ?? delState} />
    </form>
  );
}

// ---------- Importación ----------

const CHUNK = 25;
type Phase = "elegir" | "revisar" | "importando" | "fotos" | "listo";
type PhotoJob = { productId: string; name: string; urls: string[]; status: "pendiente" | "ok" | "error"; error?: string };

export function ImportWizard({ writable, mode }: { writable: boolean; mode: UploadMode }) {
  const [phase, setPhase] = useState<Phase>("elegir");
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState("");
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ChunkResult[]>([]);
  const [jobs, setJobs] = useState<PhotoJob[]>([]);
  const [busy, setBusy] = useState(false);
  const [onlyIssues, setOnlyIssues] = useState(false);

  async function choose(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    const text = await file.text();
    setFileName(file.name);
    setCsv(text);
    const r = await previewImport(text);
    setBusy(false);
    if ("error" in r) return setError(r.error);
    setPlan(r.plan);
    setPhase("revisar");
  }

  async function run() {
    if (!plan) return;
    setPhase("importando");
    const total = plan.rows.length;
    setProgress({ done: 0, total });
    const all: ChunkResult[] = [];
    for (let from = 0; from < total; from += CHUNK) {
      const r = await applyImportChunk(csv, from, from + CHUNK);
      if ("error" in r) {
        setError(r.error);
        break;
      }
      all.push(...r.results);
      setResults([...all]);
      setProgress({ done: Math.min(from + CHUNK, total), total });
    }
    const photo = all.filter((r) => r.ok && r.images?.length && r.productId).map((r) => ({ productId: r.productId!, name: r.name ?? "", urls: r.images!, status: "pendiente" as const }));
    setJobs(photo);
    if (photo.length && mode !== "off") {
      setPhase("fotos");
      await fetchPhotos(photo);
    }
    setPhase("listo");
  }

  async function fetchPhotos(list: PhotoJob[]) {
    setBusy(true);
    const next = [...list];
    for (let i = 0; i < next.length; i++) {
      if (next[i].status === "ok") continue;
      try {
        const r = await importProductImages(next[i].productId, next[i].urls);
        next[i] = r.failed.length ? { ...next[i], status: r.added ? "ok" : "error", urls: r.failed.map((f) => f.url), error: r.failed.map((f) => f.error).join(" · ") } : { ...next[i], status: "ok" };
      } catch {
        next[i] = { ...next[i], status: "error", error: "Sin respuesta del servidor." };
      }
      setJobs([...next]);
    }
    setBusy(false);
  }

  const reset = () => {
    setPhase("elegir");
    setPlan(null);
    setCsv("");
    setResults([]);
    setJobs([]);
    setError(null);
  };

  const rows = plan ? plan.rows.filter((r) => !onlyIssues || r.errors.length || r.warnings.length) : [];
  const okCount = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  const photosOk = jobs.filter((j) => j.status === "ok").length;
  const photoErrors = jobs.filter((j) => j.status === "error");

  return (
    <div className="stack">
      {phase === "elegir" && (
        <section className="aform-sec">
          <h2>1. Elige el archivo</h2>
          <p className="note">CSV de la plantilla del panel o la exportación de productos de WooCommerce (Productos → Exportar). Antes de cambiar nada verás qué va a pasar con cada fila.</p>
          <label className={`btn btn-primary${busy || !writable ? " is-disabled" : ""}`}>
            {busy ? "Leyendo…" : "Elegir archivo CSV"}
            <input type="file" accept=".csv,text/csv" className="sr-only" disabled={busy || !writable} onChange={(e) => choose(e.target.files?.[0])} aria-label="Archivo CSV a importar" />
          </label>
        </section>
      )}

      {error && (
        <p className="alert err" role="alert">
          <span>{error}</span>
        </p>
      )}

      {phase === "revisar" && plan && (
        <section className="aform-sec">
          <h2>2. Revisa antes de importar</h2>
          <p>
            <b>{fileName}</b> · formato {plan.format === "woocommerce" ? "WooCommerce" : "plantilla del panel"}
          </p>
          <dl className="kpis kpis-4">
            <div>
              <dt>Se crean</dt>
              <dd>{plan.counts.crear}</dd>
            </div>
            <div>
              <dt>Se actualizan</dt>
              <dd>{plan.counts.actualizar}</dd>
            </div>
            <div>
              <dt>Con errores (no se importan)</dt>
              <dd className={plan.counts.errores ? "warn-text" : undefined}>{plan.counts.errores}</dd>
            </div>
            <div>
              <dt>Fotos a descargar</dt>
              <dd>{plan.counts.fotos}</dd>
            </div>
          </dl>
          {(plan.newCategories.length > 0 || plan.newBrands.length > 0) && (
            <p className="note">
              {plan.newCategories.length > 0 && <>Categorías nuevas: {plan.newCategories.join(", ")}. </>}
              {plan.newBrands.length > 0 && <>Marcas nuevas: {plan.newBrands.join(", ")}.</>}
            </p>
          )}
          {plan.counts.fotos > 0 && mode === "off" && <UploadOff />}
          <label className="step-toggle">
            <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} />
            Ver solo filas con errores o avisos
          </label>
          <div className="table-wrap">
            <table className="atable">
              <thead>
                <tr>
                  <th>Fila</th>
                  <th>Producto</th>
                  <th>Acción</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 300).map((r) => (
                  <tr key={r.line} data-state={r.errors.length ? "err" : r.action}>
                    <td className="mono">{r.line}</td>
                    <td>
                      <b>{r.name ?? r.sku ?? "—"}</b>
                      {r.sku && <span className="mono note"> {r.sku}</span>}
                    </td>
                    <td>{r.errors.length ? <span className="status-chip" data-s="cancelado">Error</span> : <span className="status-chip">{r.action === "crear" ? "Crear" : r.action === "actualizar" ? "Actualizar" : "Omitir"}</span>}</td>
                    <td className="note">{[...r.errors, ...r.warnings].join(" ") || (r.price != null ? formatCOP(r.price) : "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 300 && <p className="note">Se muestran 300 de {rows.length} filas.</p>}
          </div>
          <div className="row-wrap">
            <button type="button" className="btn btn-primary" disabled={!writable || plan.counts.crear + plan.counts.actualizar === 0} onClick={run}>
              Importar {plan.counts.crear + plan.counts.actualizar} productos
            </button>
            <button type="button" className="btn btn-ghost" onClick={reset}>
              Elegir otro archivo
            </button>
          </div>
        </section>
      )}

      {(phase === "importando" || phase === "fotos" || phase === "listo") && (
        <section className="aform-sec" aria-live="polite">
          <h2>{phase === "listo" ? "3. Listo" : phase === "fotos" ? "3. Descargando fotos…" : "3. Importando…"}</h2>
          <Progress label="Productos" done={progress.done} total={progress.total} />
          {jobs.length > 0 && <Progress label="Fotos" done={jobs.filter((j) => j.status !== "pendiente").length} total={jobs.length} />}
          {phase === "listo" && (
            <>
              <p>
                <b>{okCount}</b> productos importados{failed.length ? `, ${failed.length} con error` : ""}.{jobs.length > 0 && ` Fotos: ${photosOk} de ${jobs.length} productos completos.`}
              </p>
              {failed.length > 0 && (
                <ul className="issue-list">
                  {failed.map((f) => (
                    <li key={f.line}>
                      Fila {f.line}: {f.error}
                    </li>
                  ))}
                </ul>
              )}
              {photoErrors.length > 0 && (
                <>
                  <ul className="issue-list">
                    {photoErrors.map((j) => (
                      <li key={j.productId}>
                        <Link href={`/admin/productos/${j.productId}`}>{j.name}</Link>: {j.error}
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => fetchPhotos(jobs)}>
                    {busy ? "Reintentando…" : "Reintentar fotos"}
                  </button>
                </>
              )}
              <div className="row-wrap">
                <Link className="btn btn-primary" href="/admin/productos">
                  Ver productos
                </Link>
                <button type="button" className="btn btn-ghost" onClick={reset}>
                  Importar otro archivo
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

function Progress({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="progress">
      <div className="progress-head">
        <span>{label}</span>
        <span className="mono">
          {done} / {total}
        </span>
      </div>
      <div className="progress-bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

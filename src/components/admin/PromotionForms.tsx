"use client";

import { useActionState, useState } from "react";
import { deletePromotion, savePromotion, setPromotionActive } from "@/app/admin/catalogo-actions";
import type { Category, Promotion, PromotionScope } from "@/data/types";
import { formatCOP } from "@/lib/pricing";
import { SCOPE_LABEL } from "@/lib/promotions";
import { ConfirmAction, Message } from "./CatalogForms";

export interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

const optionLabel = (p: ProductOption) => (p.sku ? `${p.name} · ${p.sku}` : p.name);

/** Editor de una promoción (o de una nueva). El producto se busca escribiendo: una tienda puede tener cientos. */
export function PromotionEditor({ promotion, categories, products, writable }: { promotion?: Promotion; categories: Category[]; products: ProductOption[]; writable: boolean }) {
  const [state, action, pending] = useActionState(savePromotion, undefined);
  const [delState, del, deleting] = useActionState(async () => (promotion ? deletePromotion(promotion.id) : undefined), undefined);
  const [scope, setScope] = useState<PromotionScope>(promotion?.scope ?? "tienda");
  const [percent, setPercent] = useState(String(promotion?.percent ?? 10));
  const current = promotion?.scope === "producto" ? products.find((p) => p.id === promotion.targetId) : undefined;
  const [productText, setProductText] = useState(current ? optionLabel(current) : "");
  const productId = products.find((p) => optionLabel(p) === productText)?.id ?? "";
  const uid = promotion?.id ?? "nueva";
  const n = Number(percent) || 0;

  return (
    <form action={action} className="stack">
      {promotion && <input type="hidden" name="id" value={promotion.id} />}
      <input type="hidden" name="productId" value={productId} />
      <div className="admin-grid">
        <div className="field">
          <label htmlFor={`pr-name-${uid}`}>Nombre *</label>
          <input id={`pr-name-${uid}`} name="name" className="input" required maxLength={80} defaultValue={promotion?.name} placeholder="Black Friday parlantes" />
        </div>
        <div className="field narrow">
          <label htmlFor={`pr-pct-${uid}`}>Descuento (%) *</label>
          <input id={`pr-pct-${uid}`} name="percent" className="input num" inputMode="numeric" maxLength={2} required value={percent} onChange={(e) => setPercent(e.target.value.replace(/\D/g, ""))} />
          {n > 0 && n <= 90 && (
            <span className="note">
              Un equipo de <span className="nowrap">{formatCOP(1_000_000)}</span> queda en <span className="nowrap">{formatCOP(Math.round((1_000_000 * (1 - n / 100)) / 1000) * 1000)}</span>.
            </span>
          )}
        </div>
        <fieldset className="field span-2 pick-row">
          <legend className="label">Aplica a</legend>
          <div className="row-wrap">
            {(Object.keys(SCOPE_LABEL) as PromotionScope[]).map((s) => (
              <label key={s} className="pick">
                <input type="radio" name="scope" value={s} checked={scope === s} onChange={() => setScope(s)} />
                <span>{SCOPE_LABEL[s]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {scope === "categoria" && (
          <div className="field span-2">
            <label htmlFor={`pr-cat-${uid}`}>Categoría *</label>
            <select id={`pr-cat-${uid}`} name="categoryId" className="input" defaultValue={promotion?.scope === "categoria" ? (promotion.targetId ?? "") : ""} required>
              <option value="" disabled>
                Elige una categoría
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {scope === "producto" && (
          <div className="field span-2">
            <label htmlFor={`pr-prod-${uid}`}>Producto *</label>
            <input id={`pr-prod-${uid}`} className="input" list={`pr-prods-${uid}`} value={productText} onChange={(e) => setProductText(e.target.value)} placeholder="Escribe el nombre o la referencia" aria-invalid={(productText !== "" && !productId) || undefined} />
            <datalist id={`pr-prods-${uid}`}>
              {products.map((p) => (
                <option key={p.id} value={optionLabel(p)} />
              ))}
            </datalist>
            {productText !== "" && !productId && <span className="note warn-text">Elige un producto de la lista.</span>}
          </div>
        )}
        <div className="field">
          <label htmlFor={`pr-start-${uid}`}>Empieza</label>
          <input id={`pr-start-${uid}`} name="startsAt" type="date" className="input" defaultValue={promotion?.startsAt ?? ""} />
          <span className="note">Vacío = ya. A las 12:00 a. m., hora de Colombia.</span>
        </div>
        <div className="field">
          <label htmlFor={`pr-end-${uid}`}>Termina</label>
          <input id={`pr-end-${uid}`} name="endsAt" type="date" className="input" defaultValue={promotion?.endsAt ?? ""} />
          <span className="note">Incluye todo ese día. Vacío = sin fecha de fin.</span>
        </div>
        <label className="step-toggle span-2">
          <input type="checkbox" name="active" defaultChecked={promotion?.active ?? true} />
          Activa (desmárcala para pausarla sin borrarla)
        </label>
      </div>
      <div className="row-wrap">
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending || !writable}>
          {pending ? "Guardando…" : promotion ? "Guardar" : "Crear promoción"}
        </button>
        {promotion && writable && <ConfirmAction label="Eliminar" confirm="¿Eliminar esta promoción?" pending={deleting} onConfirm={() => del()} />}
      </div>
      <Message state={state ?? delState} />
    </form>
  );
}

/** Pausar o reanudar desde la lista, sin abrir el editor. */
export function PromotionToggle({ promotion, writable }: { promotion: Promotion; writable: boolean }) {
  const [state, run, pending] = useActionState(async () => setPromotionActive(promotion.id, !promotion.active), undefined);
  return (
    <form action={run} className="row-wrap">
      <button type="submit" className="btn btn-secondary btn-sm" disabled={pending || !writable}>
        {pending ? "…" : promotion.active ? "Pausar" : "Reanudar"}
      </button>
      {state?.error && <span className="note warn-text">{state.error}</span>}
    </form>
  );
}

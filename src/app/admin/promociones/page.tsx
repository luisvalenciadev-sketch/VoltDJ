import type { Metadata } from "next";
import { PromotionEditor, PromotionToggle } from "@/components/admin/PromotionForms";
import type { Category, ProductRecord, Promotion } from "@/data/types";
import { requireOwner } from "@/lib/admin-auth";
import { catalogStore } from "@/lib/catalog-store";
import { formatDay } from "@/lib/tracking";
import { promotionState, SCOPE_LABEL, type PromotionState } from "@/lib/promotions";

export const metadata: Metadata = { title: "Promociones" };

const STATE_LABEL: Record<PromotionState, string> = { vigente: "Vigente", programada: "Programada", vencida: "Vencida", pausada: "Pausada" };
const ORDER: PromotionState[] = ["vigente", "programada", "pausada", "vencida"];

function target(p: Promotion, categories: Category[], products: ProductRecord[]) {
  if (p.scope === "tienda") return SCOPE_LABEL.tienda;
  if (p.scope === "categoria") return `Categoría: ${categories.find((c) => c.id === p.targetId)?.name ?? "eliminada"}`;
  return `Producto: ${products.find((x) => x.id === p.targetId)?.name ?? "eliminado"}`;
}

function dates(p: Promotion) {
  if (!p.startsAt && !p.endsAt) return "Sin fechas";
  if (!p.startsAt) return `Hasta el ${formatDay(p.endsAt!)}`;
  if (!p.endsAt) return `Desde el ${formatDay(p.startsAt)}`;
  return `Del ${formatDay(p.startsAt)} al ${formatDay(p.endsAt)}`;
}

export default async function PromotionsPage() {
  await requireOwner();
  const store = catalogStore();
  const { promotions, categories, products } = await store.snapshot();
  const now = new Date();
  const rows = promotions.map((p) => ({ p, state: promotionState(p, now) })).sort((a, b) => ORDER.indexOf(a.state) - ORDER.indexOf(b.state));
  const options = products.filter((p) => p.status !== "archived").map((p) => ({ id: p.id, name: p.name, sku: p.sku })).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Ventas</span>
          <h1 className="disp">Promociones</h1>
          <p className="note">
            Descuentos por porcentaje para toda la tienda, una categoría o un producto. Empiezan y terminan solos en las fechas que pongas (hora de Colombia). Si a un producto le aplican varias, gana la mayor; si además tiene precio rebajado propio, la tienda muestra el más bajo.
          </p>
        </div>
      </div>
      <ul className="editor-list">
        {rows.map(({ p, state }) => (
          <li key={p.id}>
            <details className="editor">
              <summary>
                <span className="promo-pct">−{p.percent}%</span>
                <span className="ed-text">
                  <b>{p.name}</b>
                  <span className="note">
                    {target(p, categories, products)} · {dates(p)}
                  </span>
                </span>
                <span className="status-chip" data-s={state}>
                  {STATE_LABEL[state]}
                </span>
              </summary>
              <div className="stack">
                {state !== "vencida" && <PromotionToggle promotion={p} writable={store.writable} />}
                <PromotionEditor promotion={p} categories={categories} products={options} writable={store.writable} />
              </div>
            </details>
          </li>
        ))}
        <li>
          <details className="editor" open={promotions.length === 0}>
            <summary>
              <span className="ed-add">+ Nueva promoción</span>
            </summary>
            <PromotionEditor categories={categories} products={options} writable={store.writable} />
          </details>
        </li>
      </ul>
    </>
  );
}

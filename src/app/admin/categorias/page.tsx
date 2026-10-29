import type { Metadata } from "next";
import { CategoryEditor } from "@/components/admin/CatalogForms";
import { ProductArt } from "@/components/ProductArt";
import { requireOwner } from "@/lib/admin-auth";
import { catalogStore } from "@/lib/catalog-store";
import { uploadMode } from "@/lib/media";

export const metadata: Metadata = { title: "Categorías" };

export default async function CategoriesPage() {
  await requireOwner();
  const store = catalogStore();
  const { categories, products } = await store.snapshot();
  const mode = uploadMode();
  const count = (id: string) => products.filter((p) => p.categoryId === id).length;
  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Catálogo</span>
          <h1 className="disp">Categorías</h1>
          <p className="note">Ordenan el menú y el catálogo de la tienda. Una categoría oculta no aparece, y tampoco sus productos.</p>
        </div>
      </div>
      <ul className="editor-list">
        {categories.map((c) => (
          <li key={c.id}>
            <details className="editor">
              <summary>
                <span className="ed-thumb">
                  {c.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura del panel
                    <img src={c.image.src} alt="" />
                  ) : (
                    <ProductArt kind={c.art} />
                  )}
                </span>
                <span className="ed-text">
                  <b>{c.name}</b>
                  <span className="note">
                    {count(c.id)} productos · /catalogo/{c.slug}
                  </span>
                </span>
                {c.visible === false && <span className="status-chip">Oculta</span>}
              </summary>
              <CategoryEditor category={c} products={count(c.id)} mode={mode} writable={store.writable} />
            </details>
          </li>
        ))}
        <li>
          <details className="editor" open={categories.length === 0}>
            <summary>
              <span className="ed-add">+ Nueva categoría</span>
            </summary>
            <CategoryEditor products={0} mode={mode} writable={store.writable} />
          </details>
        </li>
      </ul>
    </>
  );
}

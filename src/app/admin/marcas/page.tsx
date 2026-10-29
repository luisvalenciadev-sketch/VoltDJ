import type { Metadata } from "next";
import { BrandEditor } from "@/components/admin/CatalogForms";
import { requireOwner } from "@/lib/admin-auth";
import { catalogStore } from "@/lib/catalog-store";
import { uploadMode } from "@/lib/media";

export const metadata: Metadata = { title: "Marcas" };

export default async function BrandsPage() {
  await requireOwner();
  const store = catalogStore();
  const { brands, products } = await store.snapshot();
  const mode = uploadMode();
  const count = (id: string) => products.filter((p) => p.brandId === id).length;
  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Catálogo</span>
          <h1 className="disp">Marcas</h1>
          <p className="note">Con logo aparecen en la cinta de marcas del inicio; sin logo, se muestra el nombre.</p>
        </div>
      </div>
      <ul className="editor-list">
        {brands.map((b) => (
          <li key={b.id}>
            <details className="editor">
              <summary>
                <span className="ed-thumb ed-logo">
                  {b.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura del panel
                    <img src={b.logo.src} alt="" />
                  ) : (
                    <span className="mono">{b.name.slice(0, 2).toUpperCase()}</span>
                  )}
                </span>
                <span className="ed-text">
                  <b>{b.name}</b>
                  <span className="note">{count(b.id)} productos</span>
                </span>
                {b.visible === false && <span className="status-chip">Oculta</span>}
              </summary>
              <BrandEditor brand={b} products={count(b.id)} mode={mode} writable={store.writable} />
            </details>
          </li>
        ))}
        <li>
          <details className="editor" open={brands.length === 0}>
            <summary>
              <span className="ed-add">+ Nueva marca</span>
            </summary>
            <BrandEditor products={0} mode={mode} writable={store.writable} />
          </details>
        </li>
      </ul>
    </>
  );
}

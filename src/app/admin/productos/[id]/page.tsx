import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductActions, ProductForm } from "@/components/admin/CatalogForms";
import { bestPromotion } from "@/lib/promotions";
import { requireOwner } from "@/lib/admin-auth";
import { catalogStore } from "@/lib/catalog-store";
import { uploadMode } from "@/lib/media";
import { formatTrackingDate } from "@/lib/tracking";
import { MovementList } from "@/components/admin/MovementList";

type Params = Promise<{ id: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await catalogStore().getProduct((await params).id);
  return { title: p?.name ?? "Producto" };
}

export default async function EditProductPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  await requireOwner();
  const { id } = await params;
  const sp = await searchParams;
  const store = catalogStore();
  const [{ products, categories, brands, promotions }, movements] = await Promise.all([store.snapshot(), store.movements(id, 5)]);
  const product = products.find((p) => p.id === id);
  if (!product) notFound();

  return (
    <>
      <div className="admin-head">
        <div>
          <Link className="link" href="/admin/productos">
            ← Productos
          </Link>
          <h1 className="disp">{product.name}</h1>
          <p className="note">Actualizado {formatTrackingDate(product.updatedAt)}</p>
        </div>
        <ProductActions product={product} writable={store.writable} />
      </div>
      {(sp.creado || sp.duplicado) && (
        <p className="alert ok" role="status">
          <span>{sp.creado ? "Producto creado." : "Copia creada como borrador: revisa el nombre, el SKU y el stock antes de publicarla."}</span>
        </p>
      )}
      <ProductForm key={product.updatedAt} product={product} categories={categories} brands={brands} mode={uploadMode()} promoPercent={bestPromotion(product, promotions)?.percent ?? null} writable={store.writable} />
      {movements.length > 0 && (
        <section className="aform-sec">
          <div className="row-wrap between">
            <h2>Últimos movimientos de stock</h2>
            <Link className="link" href={`/admin/inventario?producto=${product.id}`}>
              Ver historial
            </Link>
          </div>
          <MovementList movements={movements} />
        </section>
      )}
    </>
  );
}

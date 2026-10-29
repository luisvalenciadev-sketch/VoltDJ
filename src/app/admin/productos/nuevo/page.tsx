import type { Metadata } from "next";
import Link from "next/link";
import { ProductForm } from "@/components/admin/CatalogForms";
import { storewidePromotion } from "@/lib/promotions";
import { requireOwner } from "@/lib/admin-auth";
import { catalogStore } from "@/lib/catalog-store";
import { uploadMode } from "@/lib/media";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  await requireOwner();
  const store = catalogStore();
  const { categories, brands, promotions } = await store.snapshot();
  return (
    <>
      <div className="admin-head">
        <div>
          <Link className="link" href="/admin/productos">
            ← Productos
          </Link>
          <h1 className="disp">Nuevo producto</h1>
        </div>
      </div>
      <ProductForm categories={categories} brands={brands} mode={uploadMode()} promoPercent={storewidePromotion(promotions)?.percent ?? null} writable={store.writable} />
    </>
  );
}

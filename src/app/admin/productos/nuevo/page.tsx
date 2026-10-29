import type { Metadata } from "next";
import Link from "next/link";
import { ProductForm } from "@/components/admin/CatalogForms";
import { activePromo } from "@/config/store";
import { requireAdmin } from "@/lib/admin-auth";
import { catalogStore } from "@/lib/catalog-store";
import { uploadMode } from "@/lib/media";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  await requireAdmin();
  const store = catalogStore();
  const { categories, brands } = await store.snapshot();
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
      <ProductForm categories={categories} brands={brands} mode={uploadMode()} promoPercent={activePromo()?.percent ?? null} writable={store.writable} />
    </>
  );
}

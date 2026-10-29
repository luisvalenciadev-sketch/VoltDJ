import type { Metadata } from "next";
import { CartView } from "@/components/CartView";
import { getCartCatalog } from "@/data/catalog";

export const metadata: Metadata = { title: "Carrito", robots: { index: false } };

export default async function CartPage() {
  const catalog = await getCartCatalog();
  return (
    <div className="wrap">
      <CartView catalog={catalog} />
    </div>
  );
}

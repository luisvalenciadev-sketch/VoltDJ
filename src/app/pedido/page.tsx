import type { Metadata } from "next";
import { OrderView } from "@/components/OrderView";
import { getCartCatalog } from "@/data/catalog";

export const metadata: Metadata = { title: "Pedido por WhatsApp", robots: { index: false } };

export default async function OrderPage() {
  const catalog = await getCartCatalog();
  return (
    <div className="wrap">
      <OrderView catalog={catalog} />
    </div>
  );
}

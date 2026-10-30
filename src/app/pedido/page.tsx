import { redirect } from "next/navigation";

/** El pedido se arma y se envía desde el carrito; esta dirección queda para enlaces viejos. */
export default function OrderPage() {
  redirect("/carrito");
}

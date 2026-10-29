import type { Metadata } from "next";
import { WarnIcon } from "@/components/icons";
import { Breadcrumbs, Pending } from "@/components/ui";
import { STORE } from "@/config/store";

export const metadata: Metadata = { title: "Términos y condiciones", alternates: { canonical: "/terminos" } };

export default function TermsPage() {
  return (
    <div className="wrap">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Términos y condiciones" }]} />
      <div className="pagehead">
        <h1 className="disp">Términos y condiciones</h1>
      </div>
      <div className="prose">
        <div className="alert warn" role="note">
          <WarnIcon />
          <div>
            <b>Texto legal pendiente</b>
            <p>Los términos definitivos, incluido lo aplicable del Estatuto del Consumidor (Ley 1480 de 2011), debe redactarlos y aprobarlos la tienda.</p>
          </div>
        </div>
        <h2>Cómo funciona la compra</h2>
        <ul>
          <li>Los precios publicados están en pesos colombianos (COP). El subtotal del carrito es una estimación y no incluye envío.</li>
          <li>Enviar el pedido por WhatsApp es una solicitud. La venta se concreta cuando {STORE.name} confirma disponibilidad, precio final, envío y forma de pago.</li>
          <li>Las promociones aplican mientras estén publicadas en el sitio.</li>
        </ul>
        <h2>Condiciones comerciales</h2>
        <p>
          <Pending>Medios de pago, derecho de retracto, devoluciones, garantías, envíos y PQR</Pending>
        </p>
      </div>
    </div>
  );
}

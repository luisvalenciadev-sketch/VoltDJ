import type { Metadata } from "next";
import { WarnIcon } from "@/components/icons";
import { RichText } from "@/components/RichText";
import { Breadcrumbs, Pending } from "@/components/ui";
import { getStore } from "@/data/store";

export const metadata: Metadata = { title: "Términos y condiciones", alternates: { canonical: "/terminos" } };

export default async function TermsPage() {
  const store = await getStore();
  return (
    <div className="wrap">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Términos y condiciones" }]} />
      <div className="pagehead">
        <h1 className="disp">Términos y condiciones</h1>
      </div>
      <div className="prose">
        {store.termsText ? (
          <RichText text={store.termsText} />
        ) : (
          <>
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
              <li>Enviar el pedido por WhatsApp es una solicitud. La venta se concreta cuando {store.name} confirma disponibilidad, precio final, envío y forma de pago.</li>
              <li>Las promociones aplican mientras estén publicadas en el sitio.</li>
            </ul>
            <h2>Condiciones comerciales</h2>
            <p>
              Medio de pago: {store.paymentMethods ?? <Pending>medios de pago</Pending>}. Envíos: {store.shipping.summary ?? <Pending>política de envíos</Pending>} Garantía:{" "}
              {store.warranty.summary ?? <Pending>política de garantía</Pending>} Cambios y devoluciones: {store.returnsPolicy ?? <Pending>política de cambios</Pending>}{" "}
              <Pending>Procedimiento de PQR</Pending>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { WarnIcon } from "@/components/icons";
import { RichText } from "@/components/RichText";
import { Breadcrumbs, Pending } from "@/components/ui";
import { getStore } from "@/data/store";

export const metadata: Metadata = { title: "Política de privacidad", alternates: { canonical: "/privacidad" } };

export default async function PrivacyPage() {
  const store = await getStore();
  return (
    <div className="wrap">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Política de privacidad" }]} />
      <div className="pagehead">
        <h1 className="disp">Política de privacidad</h1>
      </div>
      <div className="prose">
        {store.privacyText ? (
          <RichText text={store.privacyText} />
        ) : (
          <>
            <div className="alert warn" role="note">
              <WarnIcon />
              <div>
                <b>Texto legal pendiente</b>
                <p>Esta página describe cómo funciona el sitio. La política completa de tratamiento de datos personales (Ley 1581 de 2012) debe redactarla y aprobarla la tienda.</p>
              </div>
            </div>
            <h2>Qué hace este sitio con tus datos</h2>
            <ul>
              <li>No pedimos registro ni cuenta de usuario.</li>
              <li>El carrito se guarda solo en tu navegador, con el identificador y la cantidad de cada producto. No se envía a nuestros servidores.</li>
              <li>
                Al pulsar “Enviar pedido por WhatsApp” se abre WhatsApp con un mensaje que contiene los productos, cantidades, precios y, si la escribes, tu
                ciudad. Tú decides si lo envías.
              </li>
              <li>Lo que compartas por WhatsApp queda sujeto a las condiciones de WhatsApp y a la política de tratamiento de datos de la tienda.</li>
            </ul>
          </>
        )}
        <h2>Responsable del tratamiento</h2>
        <p>
          {store.legalName ?? <Pending>Razón social</Pending>} · NIT {store.taxId ?? <Pending>NIT</Pending>} ·{" "}
          {store.email ?? <Pending>Correo para asuntos de datos personales</Pending>}
        </p>
        {!store.privacyText && (
          <>
            <h2>Finalidades, derechos y procedimiento</h2>
            <p>
              <Pending>Finalidades del tratamiento, derechos del titular, procedimiento de consultas y reclamos, vigencia</Pending>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

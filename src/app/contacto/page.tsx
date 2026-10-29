import type { Metadata } from "next";
import { WarnIcon, WhatsAppIcon } from "@/components/icons";
import { Breadcrumbs, Pending } from "@/components/ui";
import { STORE } from "@/config/store";
import { buildGeneralMessage, buildWhatsAppLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contacto y WhatsApp",
  description: `Escríbenos por WhatsApp para consultar disponibilidad, envíos y garantías en ${STORE.name}.`,
  alternates: { canonical: "/contacto" },
};

export default function ContactPage() {
  const wa = buildWhatsAppLink(buildGeneralMessage());
  return (
    <div className="wrap">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Contacto" }]} />
      <div className="pagehead">
        <h1 className="disp">Contacto</h1>
        <p>La forma más rápida de comprar o resolver dudas es WhatsApp: un asesor confirma disponibilidad, envío y forma de pago.</p>
      </div>
      <div className="split" style={{ paddingBottom: "var(--s7)" }}>
        <section className="panel" aria-labelledby="h-wa">
          <h2 id="h-wa">WhatsApp comercial</h2>
          {wa ? (
            <>
              <p className="muted">Respondemos consultas de productos, pedidos, envíos y garantías.</p>
              <a className="btn btn-primary" href={wa} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon /> Escribir por WhatsApp
              </a>
              <p className="note mono">+{STORE.whatsappNumber}</p>
            </>
          ) : (
            <div className="alert warn">
              <WarnIcon />
              <div>
                <b>Número pendiente</b>
                <p>La tienda aún no ha configurado su WhatsApp comercial.</p>
              </div>
            </div>
          )}
        </section>
        <section className="panel" aria-labelledby="h-data">
          <h2 id="h-data">Datos de la tienda</h2>
          <ul className="contact-list">
            <li><span>Horario</span><span>{STORE.hours ?? <Pending>Horario de atención</Pending>}</span></li>
            <li><span>Correo</span><span>{STORE.email ?? <Pending>Correo</Pending>}</span></li>
            <li><span>Dirección</span><span>{STORE.address ?? <Pending>Dirección / showroom</Pending>}</span></li>
            <li><span>Razón social</span><span>{STORE.legalName ?? <Pending>Razón social</Pending>}</span></li>
            <li><span>NIT</span><span>{STORE.taxId ?? <Pending>NIT</Pending>}</span></li>
          </ul>
        </section>
      </div>
    </div>
  );
}

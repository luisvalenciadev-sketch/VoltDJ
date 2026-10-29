import type { Metadata } from "next";
import { PolicyList } from "@/components/Content";
import { Breadcrumbs, Pending } from "@/components/ui";
import { PAYMENT_METHODS } from "@/config/payments";
import { getStore } from "@/data/store";
import { enabledPayments } from "@/lib/payments";
import { formatCOP } from "@/lib/pricing";
import { sameDayText, zoneCostLabel } from "@/lib/shipping";

export const metadata: Metadata = {
  title: "Envíos, pagos y garantías",
  description: "Tiempos y costos de envío por zona, medios de pago y política de garantía.",
  alternates: { canonical: "/envios-y-garantias" },
};

export default async function ShippingPage() {
  const store = await getStore();
  const payments = enabledPayments(store.payments);
  const sameDay = sameDayText(store.sameDay);
  return (
    <div className="wrap">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Envíos y garantías" }]} />
      <div className="pagehead">
        <h1 className="disp">Envíos, pagos y garantías</h1>
        <p>El costo y el tiempo de envío se confirman por WhatsApp antes del pago, según tu ciudad y los productos del pedido.</p>
      </div>
      <div className="split" style={{ paddingBottom: "var(--s7)" }}>
        <section className="panel" id="envios" aria-labelledby="h-env">
          <h2 id="h-env">Envíos</h2>
          <p className="muted">{store.shipping.summary ?? <Pending>Resumen de la política de envíos</Pending>}</p>
          {sameDay && <p className="note-strong">{sameDay}</p>}
          {store.shippingZones.length > 0 && (
            <div className="table-wrap">
              <table className="atable zones">
                <caption className="sr-only">Tiempos y costos de envío por zona</caption>
                <thead>
                  <tr>
                    <th scope="col">Zona</th>
                    <th scope="col">Tiempo</th>
                    <th scope="col" className="num">Costo</th>
                  </tr>
                </thead>
                <tbody>
                  {store.shippingZones.map((z) => (
                    <tr key={z.id}>
                      <td>{z.name}</td>
                      <td>{z.days}</td>
                      <td className="num">{zoneCostLabel(z.cost, formatCOP)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <PolicyList
            items={store.shipping.details}
            placeholders={["Ciudades y transportadoras", "Tiempo estimado por zona", "Costo o regla de envío gratis", "Qué hacer si el paquete llega dañado"]}
          />
        </section>
        <section className="panel" id="pagos" aria-labelledby="h-pag">
          <h2 id="h-pag">Medios de pago</h2>
          {payments.length ? (
            <ul className="pay-list">
              {payments.map((p) => (
                <li key={p.id}>
                  <b>
                    {PAYMENT_METHODS[p.id].name}
                    {PAYMENT_METHODS[p.id].installments && p.installments && p.installments > 1 ? ` · hasta ${p.installments} cuotas` : ""}
                  </b>
                  {p.instructions && <span className="muted">{p.instructions}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              <Pending>Medios de pago</Pending>
            </p>
          )}
          <p className="note">No cobramos en la página: el asesor te confirma el valor final y te comparte los datos de pago por WhatsApp. Los créditos y cuotas están sujetos a aprobación de cada entidad.</p>
        </section>
        <section className="panel" id="garantias" aria-labelledby="h-gar">
          <h2 id="h-gar">Garantías</h2>
          <p className="muted">{store.warranty.summary ?? <Pending>Resumen de la política de garantía</Pending>}</p>
          <PolicyList
            items={store.warranty.details}
            placeholders={["Duración por categoría o marca", "Qué cubre y qué no", "Documentos necesarios", "Cómo y dónde se hace un reclamo"]}
          />
        </section>
        <section className="panel" id="cambios" aria-labelledby="h-cam">
          <h2 id="h-cam">Cambios y devoluciones</h2>
          <p className="muted">{store.returnsPolicy ?? <Pending>Política de cambios y devoluciones</Pending>}</p>
          <p className="muted">Escríbenos por WhatsApp con tu número de pedido para gestionarlo.</p>
        </section>
      </div>
    </div>
  );
}

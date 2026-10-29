import type { Metadata } from "next";
import { PolicyList } from "@/components/Content";
import { Breadcrumbs, Pending } from "@/components/ui";
import { getStore } from "@/data/store";

export const metadata: Metadata = {
  title: "Envíos y garantías",
  description: "Condiciones de envío y política de garantía.",
  alternates: { canonical: "/envios-y-garantias" },
};

export default async function ShippingPage() {
  const store = await getStore();
  return (
    <div className="wrap">
      <Breadcrumbs items={[{ label: "Inicio", href: "/" }, { label: "Envíos y garantías" }]} />
      <div className="pagehead">
        <h1 className="disp">Envíos y garantías</h1>
        <p>El costo y el tiempo de envío se confirman por WhatsApp antes del pago, según tu ciudad y los productos del pedido.</p>
      </div>
      <div className="split" style={{ paddingBottom: "var(--s7)" }}>
        <section className="panel" id="envios" aria-labelledby="h-env">
          <h2 id="h-env">Envíos</h2>
          <p className="muted">{store.shipping.summary ?? <Pending>Resumen de la política de envíos</Pending>}</p>
          <PolicyList
            items={store.shipping.details}
            placeholders={["Ciudades y transportadoras", "Tiempo estimado por zona", "Costo o regla de envío gratis", "Qué hacer si el paquete llega dañado"]}
          />
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

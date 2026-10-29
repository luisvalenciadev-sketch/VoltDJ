import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { TrackingTimeline } from "@/components/TrackingTimeline";
import { WhatsAppIcon } from "@/components/icons";
import { Breadcrumbs } from "@/components/ui";
import { STORE } from "@/config/store";
import { guidesStore } from "@/lib/guides-store";
import { formatCOP } from "@/lib/pricing";
import { currentStatus, formatTrackingDate, normalizeGuideCode, orderTotals, STATUS_LABEL, timeline } from "@/lib/tracking";
import { buildWhatsAppLink } from "@/lib/whatsapp";

type Params = Promise<{ codigo: string }>;

// Página personal de cada cliente: no debe aparecer en buscadores.
export const metadata: Metadata = { title: "Estado de tu pedido", robots: { index: false, follow: false } };

export default async function TrackingPage({ params }: { params: Params }) {
  // Siempre al momento: el estado automático depende de la hora de la consulta.
  await connection();
  const code = normalizeGuideCode(decodeURIComponent((await params).codigo));
  const store = guidesStore();
  const guide = code && store ? await store.get(code) : null;
  const crumbs = [{ label: "Inicio", href: "/" }, { label: "Rastrear pedido", href: "/seguimiento" }, { label: code ?? "Guía" }];

  if (!guide) {
    const help = buildWhatsAppLink(`Hola ${STORE.name}, no encuentro mi pedido con el código ${code ?? ""}. ¿Me ayudan?`);
    return (
      <div className="wrap track">
        <Breadcrumbs items={crumbs} />
        <div className="empty">
          <h1 className="disp" style={{ fontSize: "var(--t-xl)" }}>
            No encontramos esa guía
          </h1>
          <p>{store ? "Revisa el código que te enviamos por WhatsApp. Si acaba de confirmarse tu pedido, puede tardar unos minutos en aparecer." : "El seguimiento de pedidos no está disponible en este momento."}</p>
          <div className="row-wrap">
            <Link className="btn btn-secondary" href="/seguimiento">
              Probar otro código
            </Link>
            {help && (
              <a className="btn btn-ghost" href={help} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon /> Preguntar por WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  const now = new Date();
  const current = currentStatus(guide, now);
  const totals = orderTotals(guide);
  const firstName = guide.customerName.split(" ")[0];
  const help = buildWhatsAppLink(`Hola ${STORE.name}, tengo una consulta sobre mi pedido ${guide.code}.`);

  return (
    <div className="wrap track">
      <Breadcrumbs items={crumbs} />
      <div className="track-layout">
        <section className="track-main" aria-labelledby="h-status">
          <span className="eyebrow">Guía {guide.code}</span>
          <h1 className="disp" id="h-status">
            {current ? STATUS_LABEL[current.status] : "Pedido registrado"}
          </h1>
          <p className="muted">
            Hola, {firstName}. {current ? `Actualizado el ${formatTrackingDate(current.at)}.` : "Tu pedido quedó registrado; muy pronto verás el primer avance."}
          </p>
          {guide.publicNote && <p className="alert">{guide.publicNote}</p>}
          <TrackingTimeline items={timeline(guide, now)} />
        </section>
        <aside className="summary track-side" aria-label="Detalles del envío">
          <h2 className="disp">Envío</h2>
          <dl className="track-dl">
            {guide.carrier && (
              <>
                <dt>Transportadora</dt>
                <dd>{guide.carrier}</dd>
              </>
            )}
            {guide.trackingNumber && (
              <>
                <dt>N.º de guía</dt>
                <dd className="mono">{guide.trackingNumber}</dd>
              </>
            )}
            {guide.city && (
              <>
                <dt>Destino</dt>
                <dd>{guide.city}</dd>
              </>
            )}
            {guide.lines.length === 0 && guide.items && (
              <>
                <dt>Productos</dt>
                <dd className="pre">{guide.items}</dd>
              </>
            )}
          </dl>
          {!guide.carrier && !guide.trackingNumber && <p className="note">Cuando despachemos tu pedido verás aquí la transportadora y su número de guía.</p>}
          {guide.lines.length > 0 && (
            <>
              <h2 className="disp">Tu pedido</h2>
              <ul className="order-summary">
                {guide.lines.map((l, i) => (
                  <li key={i}>
                    <span>
                      {l.qty} × {l.name}
                    </span>
                    <span className="num">{formatCOP(l.qty * l.unitPrice)}</span>
                  </li>
                ))}
                {guide.shipping > 0 && (
                  <li>
                    <span>Envío</span>
                    <span className="num">{formatCOP(guide.shipping)}</span>
                  </li>
                )}
              </ul>
              <dl className="totals">
                <div>
                  <dt>Total</dt>
                  <dd className="num">{formatCOP(totals.total)}</dd>
                </div>
                <div>
                  <dt>Pagado</dt>
                  <dd className="num">{formatCOP(totals.paid)}</dd>
                </div>
                <div className="due" data-state={totals.state}>
                  <dt>{totals.pending > 0 ? "Pendiente al recibir" : "Pendiente"}</dt>
                  <dd className="num">{formatCOP(totals.pending)}</dd>
                </div>
              </dl>
              {totals.pending > 0 && <p className="note">El saldo pendiente se paga al recibir el pedido, según lo acordado con el asesor.</p>}
            </>
          )}
          {help && (
            <a className="btn btn-secondary btn-block" href={help} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon /> ¿Dudas? Escríbenos
            </a>
          )}
        </aside>
      </div>
    </div>
  );
}

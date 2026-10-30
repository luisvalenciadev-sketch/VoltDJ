import type { Metadata } from "next";
import Link from "next/link";
import { after, connection } from "next/server";
import { RescheduleForm } from "@/components/RescheduleForm";
import { TrackingStepper } from "@/components/TrackingTimeline";
import { WhatsAppIcon } from "@/components/icons";
import { Breadcrumbs } from "@/components/ui";
import { getStore } from "@/data/store";
import { guidesStore } from "@/lib/guides-store";
import { notifyGuide } from "@/lib/notifications";
import { formatCOP } from "@/lib/pricing";
import { currentStatus, formatTrackingDate, normalizeGuideCode, orderTotals, PAYMENT_LABEL, STATUS_LABEL, timeline } from "@/lib/tracking";
import { buildWhatsAppLink } from "@/lib/whatsapp";

type Params = Promise<{ codigo: string }>;

// Página personal de cada cliente: no debe aparecer en buscadores.
export const metadata: Metadata = { title: "Estado de tu pedido", robots: { index: false, follow: false } };

/**
 * Página del cliente. Jerarquía: primero "es mi pedido" (saludo, código, monto), luego en qué
 * va (pasos en horizontal + detalle del actual), y abajo el recibo y el envío.
 */
export default async function TrackingPage({ params }: { params: Params }) {
  // Siempre al momento: el estado automático depende de la hora de la consulta.
  await connection();
  const code = normalizeGuideCode(decodeURIComponent((await params).codigo));
  const store = guidesStore();
  const shop = await getStore();
  const guide = code && store ? await store.get(code) : null;
  // Un pedido en modo automático avanza solo: si el cliente mira su pedido y hay un paso sin avisar, se le
  // escribe después de responder la página (no la demora).
  if (guide?.email) after(() => notifyGuide(guide.code));
  const crumbs = [{ label: "Inicio", href: "/" }, { label: "Rastrear pedido", href: "/seguimiento" }, { label: code ?? "Guía" }];

  if (!guide) {
    const help = buildWhatsAppLink(`Hola ${shop.name}, no encuentro mi pedido con el código ${code ?? ""}. ¿Me ayudan?`, shop.whatsappNumber);
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
  const steps = timeline(guide, now);
  const active = steps.find((s) => s.state === "current");
  const totals = orderTotals(guide);
  const paidPct = totals.total ? Math.round((totals.paid / totals.total) * 100) : 0;
  const help = buildWhatsAppLink(`Hola ${shop.name}, tengo una consulta sobre mi pedido ${guide.code}.`, shop.whatsappNumber);
  // Rango que el cliente puede elegir al reprogramar (mañana a 30 días, hora de Colombia).
  const today = new Date(now.getTime() - 5 * 3_600_000);
  const dayPlus = (n: number) => new Date(today.getTime() + n * 86_400_000).toISOString().slice(0, 10);

  return (
    <div className="wrap track">
      <Breadcrumbs items={crumbs} />

      <section className="track-hero" aria-labelledby="h-status">
        <div className="th-main">
          <p className="th-hello">Hola, {guide.customerName}</p>
          <span className="eyebrow">Tu pedido {guide.code}</span>
          <h1 className="disp" id="h-status">
            {current ? STATUS_LABEL[current.status] : "Pedido registrado"}
          </h1>
          <p className="muted">{current ? `Actualizado el ${formatTrackingDate(current.at)}` : "Muy pronto verás el primer avance."}</p>
        </div>
        {guide.lines.length > 0 && (
          <div className="th-sum">
            <span>
              {totals.units} {totals.units === 1 ? "producto" : "productos"}
            </span>
            <b className="num">{formatCOP(totals.total)}</b>
            <span className="pay-chip" data-state={totals.state}>
              {PAYMENT_LABEL[totals.state]}
            </span>
          </div>
        )}
      </section>

      <section className="panel progress-card" aria-label="Avance del pedido">
        <TrackingStepper items={steps} />
        {active && (
          <div className="now" data-cancel={active.id === "cancelado" || undefined} data-exc={active.id}>
            <b>{active.label}</b>
            <span>{active.detail}</span>
            {active.note && <span className="tl-note">{active.note}</span>}
          </div>
        )}
        {current?.status === "entrega_fallida" && <RescheduleForm code={guide.code} minDay={dayPlus(1)} maxDay={dayPlus(30)} />}
        {guide.publicNote && <p className="alert">{guide.publicNote}</p>}
      </section>

      <div className="track-grid">
        {guide.lines.length > 0 ? (
          <section className="panel receipt" aria-labelledby="h-order">
            <h2 id="h-order">Detalle del pedido</h2>
            <ul className="rc-lines">
              {guide.lines.map((l, i) => (
                <li key={i}>
                  <span className="rc-qty num">{l.qty}×</span>
                  <span className="rc-name">{l.name}</span>
                  <span className="rc-amt num">{formatCOP(l.qty * l.unitPrice)}</span>
                </li>
              ))}
            </ul>
            <dl className="rc-rows">
              <div>
                <dt>Subtotal</dt>
                <dd className="num">{formatCOP(totals.subtotal)}</dd>
              </div>
              <div>
                <dt>Envío</dt>
                <dd className="num">{guide.shipping > 0 ? formatCOP(guide.shipping) : "Incluido"}</dd>
              </div>
              <div className="rc-total">
                <dt>Total</dt>
                <dd className="num">{formatCOP(totals.total)}</dd>
              </div>
            </dl>
            <div className="rc-pay">
              <div className="rc-bar" role="img" aria-label={`Pagado ${paidPct} % del total`}>
                <span style={{ width: `${paidPct}%` }} />
              </div>
              <div className="rc-split">
                <div>
                  <span>Pagado</span>
                  <b className="num">{formatCOP(totals.paid)}</b>
                </div>
                <div className="due" data-state={totals.state}>
                  <span>{totals.pending > 0 ? "Pendiente al recibir" : "Pendiente"}</span>
                  <b className="num">{formatCOP(totals.pending)}</b>
                </div>
              </div>
              {totals.pending > 0 && <p className="note">El saldo se paga al recibir el pedido, según lo acordado con el asesor.</p>}
            </div>
          </section>
        ) : (
          guide.items && (
            <section className="panel receipt" aria-labelledby="h-order">
              <h2 id="h-order">Detalle del pedido</h2>
              <p className="pre">{guide.items}</p>
            </section>
          )
        )}

        <aside className="panel ship-card" aria-labelledby="h-ship">
          <h2 id="h-ship">Envío</h2>
          <dl className="track-dl">
            <dt>Transportadora</dt>
            <dd>{guide.carrier ?? "Por asignar"}</dd>
            <dt>N.º de guía</dt>
            <dd className="mono">{guide.trackingNumber ?? "Al despachar"}</dd>
            {guide.city && (
              <>
                <dt>Destino</dt>
                <dd>{guide.city}</dd>
              </>
            )}
          </dl>
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

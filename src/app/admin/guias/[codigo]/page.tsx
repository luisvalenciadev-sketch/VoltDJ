import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdvanceForm, CopyLink, DeleteGuideButton, EditDetailsForm, PaymentForm, StatusModes } from "@/components/admin/AdminForms";
import { WhatsAppIcon } from "@/components/icons";
import { TrackingTimeline } from "@/components/TrackingTimeline";
import { SITE } from "@/config/store";
import { getStore } from "@/data/store";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCatalog } from "@/lib/admin-catalog";
import { guidesStore } from "@/lib/guides-store";
import { formatCOP } from "@/lib/pricing";
import { currentStatus, formatTrackingDate, isoToLocalInput, isOrderLocked, nextScheduled, nextStep, normalizeGuideCode, orderTotals, PAYMENT_LABEL, STATUS_LABEL, timeline } from "@/lib/tracking";
import { buildWhatsAppLink } from "@/lib/whatsapp";

type Params = Promise<{ codigo: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return { title: `Guía ${(await params).codigo}` };
}

/**
 * Jerarquía de la guía: arriba qué pasa ahora y el siguiente paso con un clic; luego el dinero
 * (lo pendiente por cobrar), compartir con el cliente y, plegado, lo que rara vez se edita.
 */
export default async function GuideAdminPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  await requireAdmin();
  const code = normalizeGuideCode((await params).codigo);
  const store = guidesStore();
  const shop = await getStore();
  const guide = code && store ? await store.get(code) : null;
  if (!guide) notFound();
  const created = Boolean((await searchParams).creada);

  const now = new Date();
  const cur = currentStatus(guide, now);
  const next = nextScheduled(guide, now);
  const advance = nextStep(cur?.status ?? null);
  const totals = orderTotals(guide);
  const locked = isOrderLocked(cur?.status);
  const today = new Date(now.getTime() - 5 * 3_600_000);
  const dayPlus = (n: number) => new Date(today.getTime() + n * 86_400_000).toISOString().slice(0, 10);
  const publicUrl = new URL(`/seguimiento/${guide.code}`, SITE.url).toString();
  const firstName = guide.customerName.split(" ")[0];
  const pendingLine = totals.pending > 0 ? `\nSaldo pendiente para la entrega: ${formatCOP(totals.pending)}` : "";
  // Mensaje listo para el cliente: el asesor solo pulsa enviar en WhatsApp.
  const toCustomer = guide.phone
    ? buildWhatsAppLink(`Hola ${firstName}, tu pedido en ${shop.name} ya tiene guía de seguimiento.\nCódigo: ${guide.code}${pendingLine}\nConsúltalo aquí: ${publicUrl}`, guide.phone)
    : null;

  return (
    <>
      <div className="admin-head">
        <div>
          <Link className="link" href="/admin">
            ← Guías
          </Link>
          <h1 className="disp mono-title">{guide.code}</h1>
          <p className="guide-meta">
            <b>{guide.customerName}</b>
            {guide.city && <span>{guide.city}</span>}
            <span className="status-chip" data-s={cur?.status ?? "none"}>
              {cur ? STATUS_LABEL[cur.status] : "Sin iniciar"}
            </span>
            <span className="pay-chip" data-state={totals.state}>
              {PAYMENT_LABEL[totals.state]}
            </span>
          </p>
        </div>
      </div>

      {created && (
        <p className="alert ok" role="status">
          <span>Guía creada. Envíale el enlace al cliente por WhatsApp.</span>
        </p>
      )}

      <div className="admin-cols">
        <div className="stack">
          <section className="panel" aria-labelledby="h-now">
            <span className="eyebrow">Estado actual · {guide.mode === "auto" ? "automático" : "manual"}</span>
            <h2 id="h-now" className="now-title">
              {cur ? STATUS_LABEL[cur.status] : "Sin iniciar"}
            </h2>
            <p className="note">
              {cur ? `Desde el ${formatTrackingDate(cur.at)}` : "Aún no llega la primera fecha del calendario"}
              {next && ` · Siguiente automático: ${STATUS_LABEL[next.status]} el ${formatTrackingDate(next.at)}`}
            </p>
            {cur?.receivedBy && <p className="note">Recibido por {cur.receivedBy}</p>}
            {cur?.status === "entrega_fallida" && cur.note && <p className="alert warn"><span>Motivo: {cur.note}. El cliente puede reprogramar desde su página.</span></p>}
            {cur?.status === "reprogramado" && cur.rescheduledFor && <p className="alert"><span>Nueva fecha de entrega: {cur.rescheduledFor}{cur.note ? ` · ${cur.note}` : ""}</span></p>}
            {advance && <AdvanceForm code={guide.code} next={advance} />}
            <details className="admin-acc">
              <summary>Otro estado o calendario</summary>
              <StatusModes code={guide.code} mode={guide.mode} events={guide.events} current={cur?.status ?? null} defaultStart={isoToLocalInput(now.toISOString())} minDay={dayPlus(1)} maxDay={dayPlus(30)} />
            </details>
          </section>

          <section className="panel" aria-labelledby="h-money">
            <h2 id="h-money">Pedido y pago</h2>
            {guide.lines.length > 0 ? (
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
            ) : (
              guide.items && <p className="note pre">{guide.items}</p>
            )}
            <PaymentForm code={guide.code} total={totals.total} paid={guide.paid} />
            {totals.pending > 0 && cur?.status === "entregado" && (
              <p className="alert warn" role="status">
                <span>Marcado como entregado con {formatCOP(totals.pending)} pendientes: registra el pago si ya se cobró.</span>
              </p>
            )}
          </section>

          <section className="panel share" aria-label="Compartir con el cliente">
            <div className="share-url">
              <span className="eyebrow">Enlace para el cliente</span>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="mono">
                {publicUrl}
              </a>
            </div>
            <div className="row-wrap">
              {toCustomer ? (
                <a className="btn btn-primary" href={toCustomer} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon /> Enviar al cliente
                </a>
              ) : (
                <span className="note">Agrega el celular del cliente para enviarlo por WhatsApp.</span>
              )}
              <CopyLink url={publicUrl} />
            </div>
          </section>

          <details className="panel admin-acc">
            <summary>{locked ? "Editar contacto y envío (pedido bloqueado)" : "Editar datos del pedido"}</summary>
            {/* key = última modificación: si cambia el pago o el estado, el formulario arranca con los
                datos guardados y nunca reescribe un pago con un valor viejo. */}
            <EditDetailsForm key={guide.updatedAt} guide={guide} catalog={await adminCatalog()} locked={locked} />
          </details>
          <DeleteGuideButton code={guide.code} />
        </div>

        <aside className="panel preview" aria-labelledby="h-preview">
          <span className="eyebrow" id="h-preview">
            Lo que ve el cliente
          </span>
          <TrackingTimeline items={timeline(guide, now)} />
        </aside>
      </div>
    </>
  );
}

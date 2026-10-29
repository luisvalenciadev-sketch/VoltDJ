import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLink, DeleteGuideButton, DetailsForm, ManualStatusForm, ScheduleForm } from "@/components/admin/AdminForms";
import { WhatsAppIcon } from "@/components/icons";
import { TrackingTimeline } from "@/components/TrackingTimeline";
import { STORE } from "@/config/store";
import { requireAdmin } from "@/lib/admin-auth";
import { guidesStore } from "@/lib/guides-store";
import { currentStatus, formatTrackingDate, isoToLocalInput, nextScheduled, normalizeGuideCode, STATUS_LABEL, timeline } from "@/lib/tracking";
import { buildWhatsAppLink } from "@/lib/whatsapp";

type Params = Promise<{ codigo: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return { title: `Guía ${(await params).codigo}` };
}

export default async function GuideAdminPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  await requireAdmin();
  const code = normalizeGuideCode((await params).codigo);
  const store = guidesStore();
  const guide = code && store ? await store.get(code) : null;
  if (!guide) notFound();
  const created = Boolean((await searchParams).creada);

  const now = new Date();
  const cur = currentStatus(guide, now);
  const next = nextScheduled(guide, now);
  const publicUrl = new URL(`/seguimiento/${guide.code}`, STORE.siteUrl).toString();
  const firstName = guide.customerName.split(" ")[0];
  // Mensaje listo para el cliente: el asesor solo pulsa enviar en WhatsApp.
  const toCustomer = guide.phone
    ? buildWhatsAppLink(`Hola ${firstName}, tu pedido en ${STORE.name} ya tiene guía de seguimiento.\nCódigo: ${guide.code}\nConsúltalo aquí: ${publicUrl}`, guide.phone)
    : null;

  return (
    <>
      <div className="admin-head">
        <div>
          <Link className="link" href="/admin">
            ← Guías
          </Link>
          <h1 className="disp mono-title">{guide.code}</h1>
          <p className="muted">
            {guide.customerName}
            {guide.city && ` · ${guide.city}`}
          </p>
        </div>
      </div>

      {created && (
        <p className="alert ok" role="status">
          <span>Guía creada. Envíale el enlace al cliente por WhatsApp.</span>
        </p>
      )}

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

      <div className="admin-cols">
        <div className="stack">
          <section className="panel" aria-labelledby="h-state">
            <h2 id="h-state">Estado</h2>
            <p>
              <span className="status-chip" data-s={cur?.status ?? "none"}>
                {cur ? STATUS_LABEL[cur.status] : "Sin iniciar"}
              </span>{" "}
              <span className="note">
                {guide.mode === "auto" ? "Automático" : "Manual"}
                {next && ` · siguiente: ${STATUS_LABEL[next.status]} el ${formatTrackingDate(next.at)}`}
              </span>
            </p>
            <details className="admin-acc" open={guide.mode === "manual"}>
              <summary>Cambiar estado manualmente</summary>
              <p className="note">Si la guía está en automático, al cambiarla a mano el calendario se detiene y desde ahí avanza solo con tus cambios.</p>
              <ManualStatusForm code={guide.code} current={cur?.status ?? null} />
            </details>
            <details className="admin-acc" open={guide.mode === "auto"}>
              <summary>{guide.mode === "auto" ? "Calendario automático" : "Pasar a automático por fechas"}</summary>
              <ScheduleForm code={guide.code} events={guide.events} isAuto={guide.mode === "auto"} defaultStart={isoToLocalInput(now.toISOString())} />
            </details>
          </section>

          <section className="panel" aria-labelledby="h-data">
            <h2 id="h-data">Datos del pedido</h2>
            <DetailsForm guide={guide} />
          </section>
          <DeleteGuideButton code={guide.code} />
        </div>

        <aside className="panel" aria-labelledby="h-preview">
          <h2 id="h-preview">Lo que ve el cliente</h2>
          <TrackingTimeline items={timeline(guide, now)} />
        </aside>
      </div>
    </>
  );
}

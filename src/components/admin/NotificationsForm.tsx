"use client";

import { useActionState } from "react";
import { saveNotifications, sendTestEmail } from "@/app/admin/configuracion/actions";
import type { StoreSettings } from "@/config/store";
import { NOTIFY_LABEL, NOTIFY_STATUSES } from "@/lib/notify-rules";
import { Message, Section } from "./CatalogForms";
import { Field, ReadOnlyNotice, SaveBar, useSave } from "./SettingsForms";

export interface ProviderInfo {
  label: string;
  from: string;
}

export interface MailLogItem {
  id: string;
  at: string;
  summary: string;
  failed: boolean;
}

function TestEmail({ defaultTo, disabled }: { defaultTo: string; disabled: boolean }) {
  const [state, action, pending] = useActionState(sendTestEmail, undefined);
  return (
    <form action={action} className="stack">
      <div className="field">
        <label htmlFor="test-to">Enviar un correo de prueba a</label>
        <div className="with-action">
          <input id="test-to" name="to" type="email" className="input" defaultValue={defaultTo} required />
          <button type="submit" className="btn btn-secondary btn-sm" disabled={pending || disabled}>
            {pending ? "Enviando…" : "Enviar prueba"}
          </button>
        </div>
      </div>
      <Message state={state} />
    </form>
  );
}

export function NotificationsForm({ store, provider, problem, log, writable }: { store: StoreSettings; provider: ProviderInfo | null; problem: string | null; log: MailLogItem[]; writable: boolean }) {
  const { state, pending, dirty, setDirty, onSubmit } = useSave(saveNotifications);
  const n = store.notifications;
  return (
    <div className="stack" style={{ gap: "var(--s5)" }}>
      <section className="panel" aria-labelledby="h-provider">
        <h2 id="h-provider">Proveedor de correo</h2>
        {provider ? (
          <p className="alert ok">
            <span>
              Conectado con <b>{provider.label}</b>: los correos salen desde <b>{provider.from}</b> con el nombre “{store.name}”.
            </span>
          </p>
        ) : (
          <div className="alert warn">
            <div>
              <b>{problem}</b>
              <p>Los avisos no salen hasta conectar uno. La tienda funciona igual mientras tanto.</p>
            </div>
          </div>
        )}
        <details className="admin-acc">
          <summary>Cómo conectar Gmail o Resend</summary>
          <div className="prose" style={{ paddingBottom: 0 }}>
            <h2>Gmail (sin dominio propio)</h2>
            <ul>
              <li>En la cuenta de Gmail de la tienda, activa la verificación en dos pasos.</li>
              <li>Entra a myaccount.google.com/apppasswords, crea una contraseña de aplicación llamada “Tienda” y cópiala (16 letras).</li>
              <li>
                En Vercel → Settings → Environment Variables agrega <code>GMAIL_USER</code> (el correo) y <code>GMAIL_APP_PASSWORD</code> (esa contraseña), y vuelve a desplegar.
              </li>
              <li>Límite de Gmail: unos 500 correos al día; una tienda envía unos pocos decenas.</li>
            </ul>
            <h2>Resend (con dominio propio)</h2>
            <ul>
              <li>Crea una cuenta en resend.com, agrega y verifica tu dominio (te pide unos registros DNS).</li>
              <li>
                Crea una API key y agrega en Vercel <code>RESEND_API_KEY</code> y <code>EMAIL_FROM</code> (p. ej. pedidos@tutienda.com). Si también está Gmail, define <code>EMAIL_PROVIDER=resend</code>.
              </li>
              <li>Plan gratis: 3.000 correos al mes, máximo 100 al día.</li>
            </ul>
          </div>
        </details>
        <TestEmail defaultTo={n.ownerEmail ?? store.email ?? ""} disabled={!provider} />
      </section>

      <form onSubmit={onSubmit} className="aform" onChange={() => setDirty(true)}>
        <div className="aform-main">
          <ReadOnlyNotice writable={writable} />
          <Section id="cliente" title="Avisos al cliente" hint="Se envían cuando la guía tiene el correo del cliente. Si el pedido avanza varios pasos de una vez, recibe uno solo, el del paso más reciente.">
            <div className="stack" style={{ gap: "var(--s2)" }}>
              {NOTIFY_STATUSES.map((s) => (
                <label key={s} className="step-toggle">
                  <input type="checkbox" name={`n-${s}`} defaultChecked={n.statuses[s]} />
                  {NOTIFY_LABEL[s]}
                </label>
              ))}
            </div>
          </Section>
          <Section id="tienda-avisos" title="Avisos a la tienda">
            <label className="step-toggle">
              <input type="checkbox" name="lowStock" defaultChecked={n.lowStock} />
              Avisarme cuando un pedido deje un producto con stock bajo o agotado
            </label>
            <div className="admin-grid">
              <Field id="ownerEmail" label="Correo de la tienda" hint="A dónde llegan los avisos de stock.">
                <input id="ownerEmail" name="ownerEmail" type="email" className="input" maxLength={160} defaultValue={n.ownerEmail ?? ""} />
              </Field>
              <Field id="replyTo" label="Si el cliente responde, le llega a" hint="Vacío = a la dirección desde la que sale el correo.">
                <input id="replyTo" name="replyTo" type="email" className="input" maxLength={160} defaultValue={n.replyTo ?? ""} />
              </Field>
            </div>
          </Section>
        </div>
        <aside className="preview" aria-label="Últimos correos">
          <span className="eyebrow">Últimos correos</span>
          {log.length ? (
            <ul className="mail-log">
              {log.map((m) => (
                <li key={m.id} data-failed={m.failed || undefined}>
                  <span className="note">{m.at}</span>
                  <span>{m.summary}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="note">Todavía no se ha enviado ningún correo.</p>
          )}
        </aside>
        <SaveBar state={state} pending={pending} dirty={dirty} writable={writable} />
      </form>
    </div>
  );
}

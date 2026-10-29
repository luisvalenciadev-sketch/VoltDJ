"use client";

import { useActionState, useState, useTransition } from "react";
import { saveBrandSettings, savePayments, savePolicies, saveSeo, saveShipping, saveStoreData, saveTheme, type SettingsState } from "@/app/admin/configuracion/actions";
import { RichText } from "@/components/RichText";
import { LogoMark } from "@/components/icons";
import { PAYMENT_METHODS, type PaymentId, type PaymentSetting } from "@/config/payments";
import type { SocialLink, StoreSettings } from "@/config/store";
import { DEFAULT_THEME, THEME_IDS, THEMES, type ThemeId } from "@/config/themes";
import type { ProductImage } from "@/data/types";
import { contrast, MIN_ACCENT_CONTRAST, inkFor, normalizeHex, readableAccent } from "@/lib/color";
import type { UploadMode } from "@/lib/media";
import { enabledPayments, installmentOffer, paymentLabel } from "@/lib/payments";
import { formatCOP } from "@/lib/pricing";
import { sameDayText, type ShippingZone, zoneCostLabel } from "@/lib/shipping";
import { normalizeWhatsApp } from "@/lib/whatsapp";
import { Message, Section, SingleImage } from "./CatalogForms";

export function ReadOnlyNotice({ writable }: { writable: boolean }) {
  if (writable) return null;
  return (
    <p className="alert warn">
      <span>Falta conectar la base de datos (Neon): puedes ver la configuración, pero los cambios no se guardan.</span>
    </p>
  );
}

/**
 * Guarda sin que React reinicie el formulario: con action={…} los campos no controlados volverían a su
 * valor inicial (el de antes de guardar) mientras llega la página actualizada.
 */
export function useSave(fn: (prev: SettingsState, fd: FormData) => Promise<SettingsState>) {
  const [state, dispatch, pending] = useActionState(fn, undefined);
  const [dirty, setDirty] = useState(false);
  const [, startTransition] = useTransition();
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setDirty(false);
    startTransition(() => dispatch(fd));
  };
  return { state, pending, dirty, setDirty, onSubmit };
}

/** Barra de guardar pegada abajo, igual que en la ficha de producto. */
export function SaveBar({ state, pending, dirty, writable }: { state: SettingsState; pending: boolean; dirty: boolean; writable: boolean }) {
  return (
    <div className="aform-bar">
      {dirty && !pending ? <span className="note">Cambios sin guardar</span> : <Message state={state} />}
      <button type="submit" className="btn btn-primary" disabled={pending || !writable}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  );
}

export function Field({ id, label, hint, children, wide }: { id: string; label: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`field${wide ? " span-2" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <span className="note">{hint}</span>}
    </div>
  );
}

/** Contador para textos con límite útil (títulos de Google, descripciones). */
function Counter({ value, ideal }: { value: string; ideal: number }) {
  return (
    <span className={`note${value.length > ideal ? " warn-text" : ""}`}>
      {value.length} / {ideal} caracteres{value.length > ideal ? ": Google lo cortará" : ""}
    </span>
  );
}

// ---------- Datos de la tienda ----------

export function StoreDataForm({ store, writable }: { store: StoreSettings; writable: boolean }) {
  const { state, pending, dirty, setDirty, onSubmit } = useSave(saveStoreData);
  const [name, setName] = useState(store.name);
  const [tagline, setTagline] = useState(store.tagline);
  const [whatsapp, setWhatsapp] = useState(store.whatsappNumber);
  const [social, setSocial] = useState<SocialLink[]>(store.social);
  const wa = normalizeWhatsApp(whatsapp);
  const edit = (next: SocialLink[]) => (setSocial(next), setDirty(true));

  return (
    <form onSubmit={onSubmit} className="aform" onChange={() => setDirty(true)}>
      <input type="hidden" name="social" value={JSON.stringify(social)} />
      <div className="aform-main">
        <ReadOnlyNotice writable={writable} />
        <Section id="identidad" title="Identidad" hint="Aparece en la cabecera, el pie, los mensajes de WhatsApp y los resultados de Google.">
          <div className="admin-grid">
            <Field id="name" label="Nombre de la tienda *">
              <input id="name" name="name" className="input" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field id="tagline" label="Eslogan" hint="Una frase por línea en la portada: separa con punto.">
              <input id="tagline" name="tagline" className="input" maxLength={120} value={tagline} onChange={(e) => setTagline(e.target.value)} />
            </Field>
            <Field id="description" label="Descripción corta" hint="Qué vendes y dónde. Se usa en Google si no defines una descripción en SEO." wide>
              <textarea id="description" name="description" className="input textarea" rows={3} maxLength={300} defaultValue={store.description} />
            </Field>
          </div>
        </Section>

        <Section id="contacto" title="Contacto">
          <div className="admin-grid">
            <Field id="whatsappNumber" label="WhatsApp de pedidos" hint={wa === null ? "Número incompleto." : wa ? `Los pedidos llegarán a +${wa}.` : "Sin número, la tienda oculta los botones de WhatsApp."}>
              <input id="whatsappNumber" name="whatsappNumber" className="input mono" inputMode="tel" maxLength={30} placeholder="300 123 4567" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} aria-invalid={wa === null || undefined} />
            </Field>
            <Field id="phone" label="Teléfono para llamadas">
              <input id="phone" name="phone" className="input" inputMode="tel" maxLength={30} defaultValue={store.phone ?? ""} />
            </Field>
            <Field id="email" label="Correo">
              <input id="email" name="email" type="email" className="input" maxLength={120} defaultValue={store.email ?? ""} />
            </Field>
            <Field id="address" label="Dirección del local">
              <input id="address" name="address" className="input" maxLength={160} defaultValue={store.address ?? ""} />
            </Field>
            <Field id="hours" label="Horario" wide>
              <input id="hours" name="hours" className="input" maxLength={200} defaultValue={store.hours ?? ""} placeholder="Lunes a viernes de 8:00 a. m. a 6:00 p. m.; sábados de 9:00 a. m. a 2:00 p. m." />
            </Field>
          </div>
        </Section>

        <Section id="legal" title="Datos legales y pedidos" hint="La razón social y el NIT salen en el pie y en la política de privacidad.">
          <div className="admin-grid">
            <Field id="legalName" label="Razón social">
              <input id="legalName" name="legalName" className="input" maxLength={120} defaultValue={store.legalName ?? ""} />
            </Field>
            <Field id="taxId" label="NIT">
              <input id="taxId" name="taxId" className="input mono" maxLength={30} defaultValue={store.taxId ?? ""} />
            </Field>
            <Field id="orderIdPrefix" label="Prefijo de pedidos" hint="Inicia el número provisional de cada pedido, p. ej. VD-261029-4F7K.">
              <input id="orderIdPrefix" name="orderIdPrefix" className="input mono" maxLength={4} defaultValue={store.orderIdPrefix} style={{ textTransform: "uppercase" }} />
            </Field>
          </div>
        </Section>

        <Section id="cinta" title="Cinta superior" hint="Tres avisos cortos que corren arriba de la tienda, después de la promoción vigente.">
          <div className="admin-grid">
            {[0, 1, 2].map((i) => (
              <Field key={i} id={`topbar${i}`} label={`Aviso ${i + 1}`} wide>
                <input id={`topbar${i}`} name={`topbar${i}`} className="input" maxLength={90} defaultValue={store.topbar[i] ?? ""} />
              </Field>
            ))}
          </div>
        </Section>

        <Section id="redes" title="Redes sociales">
          <ul className="spec-rows">
            {social.map((s, i) => (
              <li key={i}>
                <input className="input" aria-label={`Nombre de la red ${i + 1}`} placeholder="Instagram @mitienda" maxLength={60} value={s.label} onChange={(e) => edit(social.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <input className="input" aria-label={`Enlace de la red ${i + 1}`} placeholder="https://instagram.com/mitienda" maxLength={300} inputMode="url" value={s.url} onChange={(e) => edit(social.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                <button type="button" className="iconbtn" aria-label={`Quitar la red ${i + 1}`} onClick={() => edit(social.filter((_, j) => j !== i))}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => edit([...social, { label: "", url: "" }])} disabled={social.length >= 8}>
            + Agregar red
          </button>
        </Section>
      </div>

      <aside className="preview" aria-label="Vista previa">
        <span className="eyebrow">Portada</span>
        <div className="set-preview">
          <p className="set-tagline">{tagline || name || "Nombre de la tienda"}</p>
        </div>
        <span className="eyebrow">Mensaje de WhatsApp</span>
        <div className="set-preview set-bubble">Hola {name || "…"}, quiero consultar este pedido.</div>
      </aside>

      <SaveBar state={state} pending={pending} dirty={dirty} writable={writable} />
    </form>
  );
}

// ---------- Marca ----------

export function BrandForm({ store, mode, writable }: { store: StoreSettings; mode: UploadMode; writable: boolean }) {
  const { state, pending, dirty, setDirty, onSubmit } = useSave(saveBrandSettings);
  const [logoOnDark, setLogoOnDark] = useState<ProductImage | null>(store.brand.logoOnDark);
  const [logoOnLight, setLogoOnLight] = useState<ProductImage | null>(store.brand.logoOnLight);
  const [favicon, setFavicon] = useState<ProductImage | null>(store.brand.favicon);
  const [accentText, setAccentText] = useState(store.brand.accent ?? "");
  const accent = normalizeHex(accentText);
  const theme = THEMES[store.brand.theme] ?? THEMES[DEFAULT_THEME];
  const shown = accent ?? theme.colors.accent;
  const ratio = contrast(shown, theme.colors.bg);
  const suggestion = accent ? readableAccent(accent, theme.colors.bg) : null;
  const image = (set: (v: ProductImage | null) => void) => (v: ProductImage | null) => (set(v ? { ...v, alt: store.name } : null), setDirty(true));

  return (
    <form onSubmit={onSubmit} className="aform" onChange={() => setDirty(true)}>
      <input type="hidden" name="logoOnDark" value={JSON.stringify(logoOnDark)} />
      <input type="hidden" name="logoOnLight" value={JSON.stringify(logoOnLight)} />
      <input type="hidden" name="favicon" value={JSON.stringify(favicon)} />
      <div className="aform-main">
        <ReadOnlyNotice writable={writable} />
        <Section id="logo" title="Logo" hint="PNG con fondo transparente, horizontal. Sin logo, la tienda muestra su nombre en letras.">
          <SingleImage label="Logo para fondo oscuro (el que se usa hoy)" value={logoOnDark} onChange={image(setLogoOnDark)} mode={mode} baseName="tienda-logo-oscuro" keepAlpha />
          <SingleImage label="Logo para fondo claro (para los temas claros)" value={logoOnLight} onChange={image(setLogoOnLight)} mode={mode} baseName="tienda-logo-claro" keepAlpha />
          <SingleImage label="Ícono de la pestaña (cuadrado, 512 × 512)" value={favicon} onChange={image(setFavicon)} mode={mode} baseName="tienda-icono" keepAlpha />
        </Section>

        <Section id="color" title="Color de acento" hint={`Botones principales, precios rebajados y pasos activos. Debe leerse sobre el fondo ${theme.scheme === "dark" ? "oscuro" : "claro"} del tema ${theme.name}.`}>
          <div className="color-row">
            <input type="color" aria-label="Elegir color" value={shown} onChange={(e) => setAccentText(e.target.value)} />
            <div className="field">
              <label htmlFor="accent">Código del color</label>
              <input id="accent" name="accent" className="input mono" maxLength={7} placeholder={`${theme.colors.accent.toUpperCase()} (el del tema)`} value={accentText} onChange={(e) => setAccentText(e.target.value)} aria-invalid={(accentText !== "" && !accent) || undefined} />
            </div>
            {accentText && (
              <button type="button" className="textbtn" onClick={() => (setAccentText(""), setDirty(true))}>
                Volver al del tema
              </button>
            )}
          </div>
          <p className={`note${ratio < MIN_ACCENT_CONTRAST ? " warn-text" : ""}`} aria-live="polite">
            Contraste con el fondo: {ratio.toFixed(1)}:1 {ratio >= MIN_ACCENT_CONTRAST ? "· se lee bien" : `· necesita al menos ${MIN_ACCENT_CONTRAST}:1`}
          </p>
          {suggestion && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => (setAccentText(suggestion), setDirty(true))}>
              Usar {suggestion.toUpperCase()}, el mismo tono legible
            </button>
          )}
        </Section>
      </div>

      <aside className="preview" aria-label="Vista previa">
        <span className="eyebrow">Así se verá</span>
        <div className="brand-preview" data-theme={theme.id} style={{ "--accent": shown, "--accent-ink": inkFor(shown) } as React.CSSProperties}>
          <div className="bp-bar">
            {logoOnDark ? (
              // eslint-disable-next-line @next/next/no-img-element -- vista previa del panel
              <img src={logoOnDark.src} alt="" />
            ) : (
              <span className="logo">
                <LogoMark />
                <b>{store.name}</b>
              </span>
            )}
          </div>
          <div className="bp-body">
            <span className="bp-price">$ 1.275.000</span>
            <s className="note">$ 1.500.000</s>
            <span className="btn btn-primary btn-sm">Añadir al carrito</span>
          </div>
        </div>
      </aside>

      <SaveBar state={state} pending={pending} dirty={dirty} writable={writable} />
    </form>
  );
}

// ---------- Políticas ----------

function PolicyText({ id, label, value, onChange, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; hint: string }) {
  const [preview, setPreview] = useState(false);
  return (
    <div className="field">
      <div className="row-wrap between">
        <label htmlFor={id}>{label}</label>
        <button type="button" className="textbtn" aria-pressed={preview} onClick={() => setPreview(!preview)}>
          {preview ? "Editar" : "Vista previa"}
        </button>
      </div>
      {/* El campo sigue en el formulario durante la vista previa: se oculta, no se desmonta. */}
      <textarea id={id} name={id} className="input textarea" rows={12} maxLength={20000} value={value} onChange={(e) => onChange(e.target.value)} hidden={preview} placeholder={"## Subtítulo\nUn párrafo.\n\n- Un punto de la lista\n- Otro punto"} />
      {preview && <div className="prose policy-preview">{value.trim() ? <RichText text={value} /> : <p className="note">Vacío: la página muestra el texto de ejemplo con lo pendiente marcado.</p>}</div>}
      <span className="note">{hint}</span>
    </div>
  );
}

export function PoliciesForm({ store, writable }: { store: StoreSettings; writable: boolean }) {
  const { state, pending, dirty, setDirty, onSubmit } = useSave(savePolicies);
  const [privacy, setPrivacy] = useState(store.privacyText ?? "");
  const [terms, setTerms] = useState(store.termsText ?? "");
  const detailsHint = "Un punto por línea.";

  return (
    <form onSubmit={onSubmit} className="aform" onChange={() => setDirty(true)}>
      <div className="aform-main">
        <ReadOnlyNotice writable={writable} />
        <Section id="envios" title="Envíos" hint="El resumen sale en la ficha de cada producto y en la portada; los puntos, en Envíos y garantías.">
          <Field id="shippingSummary" label="Resumen">
            <input id="shippingSummary" name="shippingSummary" className="input" maxLength={300} defaultValue={store.shipping.summary ?? ""} />
          </Field>
          <Field id="shippingDetails" label="Detalle" hint={detailsHint}>
            <textarea id="shippingDetails" name="shippingDetails" className="input textarea" rows={4} defaultValue={store.shipping.details?.join("\n") ?? ""} />
          </Field>
        </Section>

        <Section id="garantia" title="Garantía">
          <Field id="warrantySummary" label="Resumen">
            <input id="warrantySummary" name="warrantySummary" className="input" maxLength={300} defaultValue={store.warranty.summary ?? ""} />
          </Field>
          <Field id="warrantyDetails" label="Detalle" hint={detailsHint}>
            <textarea id="warrantyDetails" name="warrantyDetails" className="input textarea" rows={4} defaultValue={store.warranty.details?.join("\n") ?? ""} />
          </Field>
        </Section>

        <Section id="cambios" title="Cambios, devoluciones y pagos">
          <Field id="returnsPolicy" label="Cambios y devoluciones">
            <input id="returnsPolicy" name="returnsPolicy" className="input" maxLength={400} defaultValue={store.returnsPolicy ?? ""} />
          </Field>
          <Field id="paymentMethods" label="Medios de pago" hint="Texto de los términos. Los medios de pago con cuotas (Addi, Sistecrédito…) se configuran en la fase de ventas.">
            <input id="paymentMethods" name="paymentMethods" className="input" maxLength={200} defaultValue={store.paymentMethods ?? ""} />
          </Field>
        </Section>

        <Section id="legales" title="Páginas legales" hint="Vacías, las páginas explican cómo funciona el sitio y marcan lo pendiente. El texto legal lo debe aprobar la tienda.">
          <PolicyText id="privacyText" label="Política de privacidad" value={privacy} onChange={(v) => (setPrivacy(v), setDirty(true))} hint="La razón social, el NIT y el correo se agregan solos al final." />
          <PolicyText id="termsText" label="Términos y condiciones" value={terms} onChange={(v) => (setTerms(v), setDirty(true))} hint="Reemplaza toda la página de términos." />
        </Section>
      </div>

      <aside className="preview" aria-label="Formato">
        <span className="eyebrow">Formato del texto</span>
        <div className="set-preview">
          <p className="mono note">## Subtítulo</p>
          <p className="mono note">- Punto de una lista</p>
          <p className="note">Una línea en blanco separa párrafos. No se admite HTML.</p>
        </div>
      </aside>

      <SaveBar state={state} pending={pending} dirty={dirty} writable={writable} />
    </form>
  );
}

// ---------- SEO ----------

export function SeoForm({ store, mode, writable, siteUrl }: { store: StoreSettings; mode: UploadMode; writable: boolean; siteUrl: string }) {
  const { state, pending, dirty, setDirty, onSubmit } = useSave(saveSeo);
  const [title, setTitle] = useState(store.seo.title ?? "");
  const [description, setDescription] = useState(store.seo.description ?? "");
  const [image, setImage] = useState<ProductImage | null>(store.seo.image);
  const shownTitle = title || store.name;
  const shownDescription = description || store.description;
  const host = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <form onSubmit={onSubmit} className="aform" onChange={() => setDirty(true)}>
      <input type="hidden" name="seoImage" value={JSON.stringify(image)} />
      <div className="aform-main">
        <ReadOnlyNotice writable={writable} />
        <Section id="google" title="Google" hint="Título y descripción de la portada en los resultados de búsqueda. Las fichas de producto usan su propio nombre.">
          <Field id="seoTitle" label="Título">
            <input id="seoTitle" name="seoTitle" className="input" maxLength={70} placeholder={store.name} value={title} onChange={(e) => setTitle(e.target.value)} />
            <Counter value={title} ideal={60} />
          </Field>
          <Field id="seoDescription" label="Descripción">
            <textarea id="seoDescription" name="seoDescription" className="input textarea" rows={3} maxLength={160} placeholder={store.description} value={description} onChange={(e) => setDescription(e.target.value)} />
            <Counter value={description} ideal={155} />
          </Field>
        </Section>
        <Section id="compartir" title="Imagen para compartir" hint="La que aparece al pegar el enlace de la tienda en WhatsApp, Facebook o Instagram. Horizontal, 1200 × 630.">
          <SingleImage label="Imagen" value={image} onChange={(v) => (setImage(v ? { ...v, alt: store.name } : null), setDirty(true))} mode={mode} baseName="tienda-compartir" />
        </Section>
      </div>

      <aside className="preview" aria-label="Vista previa">
        <span className="eyebrow">En Google</span>
        <div className="serp">
          <span className="serp-url">{host}</span>
          <b className="serp-title">{shownTitle}</b>
          <p>{shownDescription || "Sin descripción: Google tomará un texto de la página."}</p>
        </div>
        <span className="eyebrow">Al compartir el enlace</span>
        <div className="share-card">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- vista previa del panel
            <img src={image.src} alt="" />
          ) : (
            <span className="note">Sin imagen</span>
          )}
          <div>
            <span className="note">{host}</span>
            <b>{shownTitle}</b>
          </div>
        </div>
      </aside>

      <SaveBar state={state} pending={pending} dirty={dirty} writable={writable} />
    </form>
  );
}

// ---------- Diseño ----------

/** Miniatura de la tienda pintada con las variables del tema: la misma hoja que usa la tienda. */
function ThemeMini({ id, name }: { id: ThemeId; name: string }) {
  return (
    <div className="theme-mini" data-theme={id} aria-hidden="true">
      <div className="tm-tick" />
      <div className="tm-bar">
        {name}
        <i />
      </div>
      <div className="tm-hero">
        Tu sonido.
        <span />
      </div>
      <div className="tm-cards">
        {["$ 1.275.000", "$ 890.000", "$ 2.300.000"].map((p) => (
          <div key={p}>
            <b>{p}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ThemeForm({ store, writable }: { store: StoreSettings; writable: boolean }) {
  const { state, pending, dirty, setDirty, onSubmit } = useSave(saveTheme);
  const [theme, setTheme] = useState<ThemeId>(store.brand.theme);
  return (
    <form onSubmit={onSubmit} className="stack">
      <ReadOnlyNotice writable={writable} />
      <ul className="theme-cards" role="radiogroup" aria-label="Tema de la tienda">
        {THEME_IDS.map((id) => {
          const t = THEMES[id];
          return (
            <li key={id}>
              <label className="theme-card">
                <input type="radio" name="theme" value={id} checked={theme === id} onChange={() => (setTheme(id), setDirty(true))} />
                <ThemeMini id={id} name={store.name} />
                <span className="tc-head">
                  <b>{t.name}</b>
                  {store.brand.theme === id && <span className="status-chip">En uso</span>}
                </span>
                <p>{t.idea}</p>
                <p className="note">Para: {t.forWho}</p>
                <a className="link" href={`/?tema=${id}`} target="_blank" rel="noopener">
                  Ver la tienda con este tema ↗
                </a>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="note">La vista previa solo la ves tú, en esa pestaña. Tu color de acento se aplica en cualquier tema, ajustado para leerse sobre su fondo.</p>
      <SaveBar state={state} pending={pending} dirty={dirty} writable={writable} />
    </form>
  );
}

// ---------- Pagos ----------

export function PaymentsForm({ store, writable }: { store: StoreSettings; writable: boolean }) {
  const { state, pending, dirty, setDirty, onSubmit } = useSave(savePayments);
  const [payments, setPayments] = useState<PaymentSetting[]>(store.payments);
  const edit = (id: PaymentId, patch: Partial<PaymentSetting>) => (setPayments(payments.map((p) => (p.id === id ? { ...p, ...patch } : p))), setDirty(true));
  const offer = installmentOffer(1_500_000, payments);

  return (
    <form onSubmit={onSubmit} className="aform" onChange={() => setDirty(true)}>
      <div className="aform-main">
        <ReadOnlyNotice writable={writable} />
        <Section id="medios" title="Medios de pago" hint="Activa los que aceptas. La tienda muestra solo los activos: en la ficha, en Envíos y pagos y en el mensaje de cada pedido.">
          <ul className="pay-edit">
            {payments.map((p) => {
              const m = PAYMENT_METHODS[p.id];
              return (
                <li key={p.id} data-on={p.enabled || undefined}>
                  <label className="step-toggle">
                    <input type="checkbox" name={`pay-${p.id}`} checked={p.enabled} onChange={(e) => edit(p.id, { enabled: e.target.checked })} />
                    <b>{m.name}</b>
                  </label>
                  {/* Apagado se oculta pero sigue en el formulario: sus datos no se pierden al guardar. */}
                  <div className="pay-fields" hidden={!p.enabled}>
                    {m.installments && (
                      <div className="field narrow">
                        <label htmlFor={`pay-${p.id}-cuotas`}>Máximo de cuotas</label>
                        <input id={`pay-${p.id}-cuotas`} name={`pay-${p.id}-cuotas`} className="input num" inputMode="numeric" maxLength={2} value={p.installments ?? ""} onChange={(e) => edit(p.id, { installments: Number(e.target.value.replace(/\D/g, "")) || null })} />
                      </div>
                    )}
                    <div className="field">
                      <label htmlFor={`pay-${p.id}-info`}>Instrucciones para el cliente</label>
                      <input id={`pay-${p.id}-info`} name={`pay-${p.id}-info`} className="input" maxLength={400} defaultValue={p.instructions ?? ""} placeholder={m.hint} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>
      <aside className="preview" aria-label="Vista previa">
        <span className="eyebrow">Ficha de un equipo de $ 1.500.000</span>
        <div className="set-preview">
          {offer ? (
            <p>
              Desde <b>{formatCOP(offer.monthly)}</b> al mes con {offer.method} ({offer.months} cuotas, sujeto a aprobación)
            </p>
          ) : (
            <p className="note">Sin medios a cuotas activos no se muestra cuota mensual.</p>
          )}
          <p className="note">Pagos: {enabledPayments(payments).map(paymentLabel).join(" · ") || "ninguno"}</p>
        </div>
      </aside>
      <SaveBar state={state} pending={pending} dirty={dirty} writable={writable} />
    </form>
  );
}

// ---------- Envíos ----------

export function ShippingForm({ store, writable }: { store: StoreSettings; writable: boolean }) {
  const { state, pending, dirty, setDirty, onSubmit } = useSave(saveShipping);
  const [zones, setZones] = useState<ShippingZone[]>(store.shippingZones);
  const [sameDay, setSameDay] = useState(store.sameDay);
  const edit = (next: ShippingZone[]) => (setZones(next), setDirty(true));
  const patch = (i: number, p: Partial<ShippingZone>) => edit(zones.map((z, j) => (j === i ? { ...z, ...p } : z)));
  const money = (raw: string) => {
    const d = raw.replace(/\D/g, "");
    return d === "" ? null : Number(d);
  };
  const preview = sameDayText(sameDay);

  return (
    <form onSubmit={onSubmit} className="aform" onChange={() => setDirty(true)}>
      <input type="hidden" name="zones" value={JSON.stringify(zones)} />
      <div className="aform-main">
        <ReadOnlyNotice writable={writable} />
        <Section id="zonas" title="Zonas de envío" hint="El cliente elige su zona al enviar el pedido y ve el tiempo y el costo. Costo vacío = se cotiza por WhatsApp; 0 = gratis.">
          <ul className="zone-rows">
            {zones.map((z, i) => (
              <li key={z.id}>
                <input className="input" aria-label={`Zona ${i + 1}`} placeholder="Ibagué" maxLength={60} value={z.name} onChange={(e) => patch(i, { name: e.target.value })} />
                <input className="input" aria-label={`Tiempo de entrega de la zona ${i + 1}`} placeholder="1 día hábil" maxLength={60} value={z.days} onChange={(e) => patch(i, { days: e.target.value })} />
                <input className="input num" aria-label={`Costo de la zona ${i + 1}`} placeholder="Se cotiza" inputMode="numeric" value={z.cost == null ? "" : z.cost.toLocaleString("es-CO")} onChange={(e) => patch(i, { cost: money(e.target.value) })} />
                <button type="button" className="iconbtn" aria-label={`Quitar la zona ${i + 1}`} onClick={() => edit(zones.filter((_, j) => j !== i))}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => edit([...zones, { id: `zona-${Date.now().toString(36)}`, name: "", days: "", cost: null }])} disabled={zones.length >= 30}>
            + Agregar zona
          </button>
        </Section>
        <Section id="mismo-dia" title="Despacho el mismo día">
          <label className="step-toggle">
            <input type="checkbox" name="sameDay" checked={sameDay.enabled} onChange={(e) => setSameDay({ ...sameDay, enabled: e.target.checked })} />
            Despachamos el mismo día los pedidos confirmados antes de la hora de corte
          </label>
          <div className="admin-grid">
            <Field id="cutoff" label="Hora de corte">
              <input id="cutoff" name="cutoff" type="time" className="input" value={sameDay.cutoff} onChange={(e) => setSameDay({ ...sameDay, cutoff: e.target.value })} />
            </Field>
            <Field id="sameDayArea" label="Dónde aplica" hint="Vacío = donde despaches.">
              <input id="sameDayArea" name="sameDayArea" className="input" maxLength={60} value={sameDay.area} onChange={(e) => setSameDay({ ...sameDay, area: e.target.value })} />
            </Field>
          </div>
        </Section>
      </div>
      <aside className="preview" aria-label="Vista previa">
        <span className="eyebrow">En Envíos y pagos</span>
        <div className="set-preview">
          {preview && <p className="note-strong">{preview}</p>}
          {zones
            .filter((z) => z.name)
            .map((z) => (
              <p key={z.id} className="row-wrap between">
                <span>{z.name}</span>
                <span className="note">
                  {z.days || "…"} · {zoneCostLabel(z.cost, formatCOP)}
                </span>
              </p>
            ))}
          {!preview && !zones.some((z) => z.name) && <p className="note">Sin zonas: el envío se cotiza por WhatsApp.</p>}
        </div>
      </aside>
      <SaveBar state={state} pending={pending} dirty={dirty} writable={writable} />
    </form>
  );
}

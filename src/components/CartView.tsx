"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { submitOrder } from "@/app/carrito/actions";
import type { CartProduct } from "@/data/types";
import { summarize, type CartItem } from "@/lib/cart";
import { EMPTY_CUSTOMER, MAX_ADDRESS_LENGTH, MAX_EMAIL_LENGTH, MAX_NAME_LENGTH, validateCustomer, type CustomerField, type CustomerInput } from "@/lib/order-drafts";
import { enabledPayments, paymentLabel } from "@/lib/payments";
import { formatCOP } from "@/lib/pricing";
import { zoneCostLabel } from "@/lib/shipping";
import { buildOrderMessage, buildWhatsAppLink, isWhatsAppConfigured, MAX_CITY_LENGTH } from "@/lib/whatsapp";
import { useCart } from "@/store/cart-store";
import { useStoreInfo } from "@/store/store-info";
import { useToast } from "@/store/toast";
import { CartLines, SavingsRows } from "./CartLines";
import { CartIcon, OkIcon, WarnIcon, WhatsAppIcon } from "./icons";

export function CartSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando carrito" className="stack">
      {[0, 1].map((i) => (
        <div key={i} className="line">
          <div className="thumb sk" />
          <div className="info">
            <div className="sk" style={{ height: 10, width: "30%" }} />
            <div className="sk" style={{ height: 14, width: "80%" }} />
            <div className="sk" style={{ height: 12, width: "40%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyCart({ title = "Tu carrito está vacío", text = "Explora el catálogo y añade los equipos que quieres consultar." }) {
  return (
    <div className="empty" style={{ marginBottom: "var(--s7)" }}>
      <CartIcon />
      <b>{title}</b>
      <p>{text}</p>
      <Link className="btn btn-primary" href="/catalogo">Ir al catálogo</Link>
    </div>
  );
}

/** Datos del cliente: se recuerdan en este navegador para no escribirlos en cada pedido. */
export const CUSTOMER_KEY = "voltdj.customer.v1";
/** Último pedido enviado en esta pestaña: reenviar el mismo carrito actualiza ese pedido en vez de duplicarlo. */
export const SENT_KEY = "voltdj.order.v2";

const signature = (items: CartItem[]) => items.map((i) => `${i.id}:${i.qty}`).sort().join("|");
type Sent = { code: string; saved: boolean; sig: string };

function readJSON<T>(storage: () => Storage, key: string): T | null {
  try {
    return JSON.parse(storage().getItem(key) ?? "null") as T | null;
  } catch {
    return null;
  }
}
function writeJSON(storage: () => Storage, key: string, value: unknown) {
  try {
    if (value == null) storage().removeItem(key);
    else storage().setItem(key, JSON.stringify(value));
  } catch {
    // Almacenamiento bloqueado (modo privado): el pedido funciona igual, solo no se recuerda.
  }
}
const local = () => window.localStorage;
const session = () => window.sessionStorage;

const FIELD_ORDER: CustomerField[] = ["name", "phone", "city", "zoneId", "address", "email"];

/**
 * Carrito y pedido en una sola página: productos, datos de envío y el botón que guarda el pedido y
 * abre WhatsApp con su código. Ese código es el mismo que tendrá la guía cuando el asesor lo confirme.
 */
export function CartView({ catalog }: { catalog: CartProduct[] }) {
  const cart = useCart();
  const toast = useToast();
  const store = useStoreInfo();
  const [customer, setCustomer] = useState<CustomerInput>(EMPTY_CUSTOMER);
  const [errors, setErrors] = useState<Partial<Record<CustomerField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const saved = readJSON<Partial<CustomerInput>>(local, CUSTOMER_KEY);
    if (saved && typeof saved === "object") setCustomer((c) => ({ ...c, ...Object.fromEntries(Object.entries(saved).filter(([, v]) => typeof v === "string")) }));
    setSent(readJSON<Sent>(session, SENT_KEY));
  }, []);

  const s = useMemo(() => summarize(cart.items, catalog), [cart.items, catalog]);
  const sig = signature(cart.items);
  const done = sent && sent.sig === sig ? sent : null;
  const zone = store.shippingZones.find((z) => z.id === customer.zoneId) ?? null;
  const payments = enabledPayments(store.payments).map(paymentLabel);
  const messageFor = (orderId: string) =>
    buildOrderMessage(s, { orderId, customerName: customer.name, city: customer.city, address: customer.address, storeName: store.name, zone, payments });
  const message = messageFor(done?.code ?? "(se asigna al enviar)");
  const link = done ? buildWhatsAppLink(message, store.whatsappNumber) : null;
  const canLink = isWhatsAppConfigured(store.whatsappNumber);

  if (!cart.ready) return <><div className="pagehead cart-head"><h1 className="disp">Carrito</h1></div><CartSkeleton /></>;
  if (!cart.items.length) return <><div className="pagehead cart-head"><h1 className="disp">Carrito</h1></div><EmptyCart /></>;

  const priceChanges = s.lines.some((l) => l.kind !== "missing" && l.priceChangedFrom != null);

  const set = (field: CustomerField, value: string) => {
    const next = { ...customer, [field]: value };
    setCustomer(next);
    writeJSON(local, CUSTOMER_KEY, next);
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  };
  const remove = (id: string) => {
    const removed = cart.remove(id);
    if (removed) toast("Producto eliminado", { label: "Deshacer", onClick: () => cart.restore([removed]) });
  };
  const clear = () => {
    const prev = cart.clear();
    writeJSON(session, SENT_KEY, null);
    setSent(null);
    toast("Carrito vaciado", { label: "Deshacer", onClick: () => cart.restore(prev) });
  };
  const showErrors = (fields: Partial<Record<CustomerField, string>>) => {
    setErrors(fields);
    const first = FIELD_ORDER.find((f) => fields[f]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (sending || !s.orderable.length) return;
    setFormError(null);
    const checked = validateCustomer(customer, store.shippingZones);
    if ("errors" in checked) return showErrors(checked.errors);
    setErrors({});
    // La pestaña de WhatsApp se abre ya, dentro del clic: abrirla después de esperar al servidor la bloquea el navegador.
    const win = canLink ? window.open("", "_blank") : null;
    if (win) win.opener = null;
    setSending(true);
    const res = await submitOrder({ items: cart.items, customer, code: done?.saved ? done.code : null }).catch(() => ({ error: "No pudimos enviar tu pedido. Revisa tu conexión e inténtalo de nuevo." }) as const);
    setSending(false);
    if ("error" in res) {
      win?.close();
      setFormError(res.error);
      if ("fields" in res && res.fields) showErrors(res.fields);
      return;
    }
    const next: Sent = { code: res.code, saved: res.saved, sig };
    setSent(next);
    writeJSON(session, SENT_KEY, next);
    const url = buildWhatsAppLink(messageFor(res.code), store.whatsappNumber);
    if (url) {
      if (win) win.location.href = url;
      else window.location.href = url;
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast("Mensaje copiado");
    } catch {
      toast("No pudimos copiar. Selecciona el texto de la vista previa.");
    }
  };

  const field = (name: CustomerField) => ({
    id: `c-${name}`,
    name,
    value: customer[name],
    onChange: (e: { target: { value: string } }) => set(name, e.target.value),
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `c-${name}-err` : undefined,
  });
  const err = (name: CustomerField) => errors[name] && <span className="field-err" id={`c-${name}-err`}>{errors[name]}</span>;

  return (
    <>
      <div className="pagehead cart-head">
        <h1 className="disp">Carrito</h1>
        <p>
          {s.units} {s.units === 1 ? "unidad" : "unidades"} · completa tus datos y envía el pedido por WhatsApp. Un asesor te confirma disponibilidad, envío y forma de pago.
        </p>
      </div>
      <div className="cartlayout">
        <div className="stack" style={{ gap: "var(--s6)" }}>
          <div className="stack">
            {s.hasIssues && (
              <div className="alert warn" role="alert">
                <WarnIcon />
                <div>
                  <b>Revisa tu carrito</b>
                  <p>Algunos productos cambiaron desde que los añadiste. Los productos retirados o agotados no se incluirán en el pedido.</p>
                  {priceChanges && (
                    <button type="button" className="link" style={{ marginTop: 8 }} onClick={() => cart.acknowledge(catalog)}>
                      Entendido, usar precios actuales
                    </button>
                  )}
                </div>
              </div>
            )}
            <CartLines lines={s.lines} editable onQty={cart.setQty} onRemove={remove} />
            <div className="row-wrap" style={{ justifyContent: "space-between" }}>
              <Link className="link" href="/catalogo">Seguir comprando</Link>
              <button type="button" className="textbtn danger" onClick={clear}>Vaciar carrito</button>
            </div>
          </div>

          <form id="order-form" ref={formRef} className="checkout" onSubmit={submit} noValidate aria-labelledby="h-datos">
            <div>
              <h2 className="disp" id="h-datos">Tus datos de envío</h2>
              <p className="note">Con ellos preparamos tu envío y tu guía de seguimiento. No los publicamos ni los compartimos.</p>
            </div>
            <div className="form-grid">
              <div className="field span-2">
                <label htmlFor="c-name">Nombre y apellido *</label>
                <input {...field("name")} className="input" maxLength={MAX_NAME_LENGTH} autoComplete="name" required />
                {err("name")}
              </div>
              <div className="field">
                <label htmlFor="c-phone">Celular (WhatsApp) *</label>
                <input {...field("phone")} className="input" type="tel" inputMode="tel" maxLength={25} placeholder="300 123 4567" autoComplete="tel" required />
                {err("phone")}
              </div>
              <div className="field">
                <label htmlFor="c-city">Ciudad *</label>
                <input {...field("city")} className="input" maxLength={MAX_CITY_LENGTH} placeholder="Ej.: Medellín" autoComplete="address-level2" required />
                {err("city")}
              </div>
              {store.shippingZones.length > 0 && (
                <div className="field span-2">
                  <label htmlFor="c-zoneId">¿A dónde lo enviamos?</label>
                  <select {...field("zoneId")} className="input">
                    <option value="">Elige tu zona (opcional)</option>
                    {store.shippingZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                  {zone && (
                    <span className="note">
                      {zone.days} · {zoneCostLabel(zone.cost, formatCOP)}. El asesor confirma el valor final.
                    </span>
                  )}
                  {err("zoneId")}
                </div>
              )}
              <div className="field span-2">
                <label htmlFor="c-address">Dirección de entrega</label>
                <input {...field("address")} className="input" maxLength={MAX_ADDRESS_LENGTH} placeholder="Calle, número, barrio, apto." autoComplete="street-address" />
                <span className="note">Opcional: si aún no la tienes, la confirmas con el asesor.</span>
              </div>
              <div className="field span-2">
                <label htmlFor="c-email">Correo (opcional)</label>
                <input {...field("email")} className="input" type="email" maxLength={MAX_EMAIL_LENGTH} placeholder="tu@correo.com" autoComplete="email" />
                <span className="note">Te avisamos por correo cada paso de tu pedido.</span>
                {err("email")}
              </div>
            </div>
          </form>

          <details className="msg-details">
            <summary>Ver el mensaje que enviaremos por WhatsApp</summary>
            <div className="wa-preview">
              <div className="hd"><WhatsAppIcon /> Mensaje para WhatsApp</div>
              <pre className="bubble" data-testid="message-preview">{message}</pre>
            </div>
          </details>
        </div>

        <aside className="summary" aria-labelledby="h-sum">
          <h2 className="disp" id="h-sum">Resumen</h2>
          {s.orderable.map((l) => (
            <div className="sumrow" key={l.product.id}>
              <span>{l.qty} × {l.product.name}</span>
              <span>{l.total == null ? "Por confirmar" : formatCOP(l.total)}</span>
            </div>
          ))}
          <SavingsRows summary={s} />
          <p className="note">
            No incluye envío.{s.hasUnpriced && " Hay productos con precio por confirmar."} El asesor confirma el valor final por WhatsApp.
          </p>

          {!canLink && (
            <div className="alert warn">
              <WarnIcon />
              <div>
                <b>WhatsApp no está configurado</b>
                <p>Guardamos tu pedido igual. Copia el mensaje y envíalo por el canal de contacto disponible.</p>
              </div>
            </div>
          )}
          {formError && (
            <p className="alert err" role="alert">
              <WarnIcon />
              <span>{formError}</span>
            </p>
          )}

          {/* En celular este bloque queda fijo abajo: enviar el pedido nunca exige buscar el botón. */}
          <div className="dock">
            <div className="sumrow total">
              <span>Subtotal estimado</span>
              <span data-testid="subtotal">{formatCOP(s.subtotal)}</span>
            </div>
            <button type="submit" form="order-form" className="btn btn-primary btn-block" disabled={sending || !s.orderable.length} data-testid="send-whatsapp">
              <WhatsAppIcon /> {sending ? "Enviando…" : done ? "Enviar de nuevo" : "Enviar pedido por WhatsApp"}
            </button>
          </div>

          {done && (
            <div className="alert ok" role="status">
              <OkIcon />
              <div>
                <b>Tu código de pedido: <span className="mono" data-testid="order-code">{done.code}</span></b>
                <p>
                  {canLink ? "Envía el mensaje en WhatsApp para que un asesor lo reciba. " : ""}
                  Te confirmarán disponibilidad, envío y forma de pago.
                  {done.saved && <> Con este mismo código podrás <Link href="/seguimiento">rastrear tu pedido</Link>.</>}
                </p>
                {link && (
                  <a className="link" href={link} target="_blank" rel="noopener noreferrer" data-testid="whatsapp-link" style={{ marginTop: 8, display: "inline-block" }}>
                    ¿No se abrió WhatsApp? Ábrelo aquí
                  </a>
                )}
                <button type="button" className="link" style={{ marginTop: 8, display: "block" }} onClick={clear}>
                  Ya envié el mensaje: vaciar carrito
                </button>
              </div>
            </div>
          )}

          {done && <button type="button" className="btn btn-ghost btn-block btn-sm" onClick={copy}>Copiar mensaje</button>}
        </aside>
      </div>
    </>
  );
}

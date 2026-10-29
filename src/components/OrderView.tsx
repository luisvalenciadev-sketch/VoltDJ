"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CartProduct } from "@/data/types";
import { summarize, type CartItem } from "@/lib/cart";
import { enabledPayments, paymentLabel } from "@/lib/payments";
import { formatCOP } from "@/lib/pricing";
import { zoneCostLabel } from "@/lib/shipping";
import { buildOrderMessage, buildWhatsAppLink, createOrderId, MAX_CITY_LENGTH } from "@/lib/whatsapp";
import { useCart } from "@/store/cart-store";
import { useStoreInfo } from "@/store/store-info";
import { useToast } from "@/store/toast";
import { CartLines, SavingsRows, Steps } from "./CartLines";
import { CartSkeleton, EmptyCart } from "./CartView";
import { OkIcon, WarnIcon, WhatsAppIcon } from "./icons";

const ORDER_KEY = "voltdj.order.v1";
const signature = (items: CartItem[]) => items.map((i) => `${i.id}:${i.qty}`).sort().join("|");

/** ID provisional estable mientras el contenido del carrito no cambie. */
function useOrderId(items: CartItem[], ready: boolean, prefix: string) {
  const [id, setId] = useState<string | null>(null);
  const sig = signature(items);
  useEffect(() => {
    if (!ready) return;
    let stored: { id: string; sig: string } | null = null;
    try {
      stored = JSON.parse(sessionStorage.getItem(ORDER_KEY) ?? "null");
    } catch {}
    if (stored && stored.sig === sig && typeof stored.id === "string") return setId(stored.id);
    const next = createOrderId(prefix);
    try {
      sessionStorage.setItem(ORDER_KEY, JSON.stringify({ id: next, sig }));
    } catch {}
    setId(next);
  }, [sig, ready, prefix]);
  return id;
}

export function OrderView({ catalog }: { catalog: CartProduct[] }) {
  const cart = useCart();
  const toast = useToast();
  const [city, setCity] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [opened, setOpened] = useState(false);
  const store = useStoreInfo();
  const orderId = useOrderId(cart.items, cart.ready, store.orderIdPrefix);
  const s = useMemo(() => summarize(cart.items, catalog), [cart.items, catalog]);
  const zone = store.shippingZones.find((z) => z.id === zoneId) ?? null;
  const payments = enabledPayments(store.payments).map(paymentLabel);
  const message = orderId ? buildOrderMessage(s, { orderId, city, storeName: store.name, zone, payments }) : "";
  const link = message ? buildWhatsAppLink(message, store.whatsappNumber) : null;

  if (!cart.ready || (cart.items.length > 0 && !orderId)) return <><Steps current={1} /><CartSkeleton /></>;
  if (!s.orderable.length) {
    return (
      <>
        <Steps current={1} />
        <div className="pagehead"><h1 className="disp">Revisa tu pedido</h1></div>
        <EmptyCart title="No hay productos para enviar" text="Añade productos disponibles al carrito para preparar el mensaje de pedido." />
      </>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast("Mensaje copiado");
    } catch {
      toast("No pudimos copiar. Selecciona el texto de la vista previa.");
    }
  };

  return (
    <>
      <Steps current={1} />
      <div className="pagehead">
        <h1 className="disp">Revisa tu pedido</h1>
        <p>Enviaremos este resumen a un asesor. Tu pedido queda confirmado cuando te respondan con disponibilidad, envío y forma de pago.</p>
      </div>
      <div className="cartlayout">
        <div className="stack" style={{ gap: "var(--s5)" }}>
          {s.hasIssues && (
            <div className="alert warn">
              <WarnIcon />
              <div>
                <b>Hay cambios en tu carrito</b>
                <p>
                  Algunos productos cambiaron de precio o ya no están disponibles. <Link href="/carrito">Revisa el carrito</Link>.
                </p>
              </div>
            </div>
          )}
          <CartLines lines={s.lines} editable={false} />
          {store.shippingZones.length > 0 && (
            <div className="field" style={{ maxWidth: 360 }}>
              <label htmlFor="zone">¿A dónde lo enviamos?</label>
              <select id="zone" className="input" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
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
            </div>
          )}
          <div className="field" style={{ maxWidth: 360 }}>
            <label htmlFor="city">Ciudad de envío (opcional, para cotizar el envío)</label>
            <input id="city" className="input" maxLength={MAX_CITY_LENGTH} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ej.: Medellín" autoComplete="address-level2" />
          </div>
          <section aria-labelledby="h-prev">
            <h2 className="eyebrow" id="h-prev" style={{ marginBottom: 8 }}>Vista previa del mensaje</h2>
            <div className="wa-preview">
              <div className="hd"><WhatsAppIcon /> Mensaje para WhatsApp</div>
              <pre className="bubble" data-testid="message-preview">{message}</pre>
            </div>
          </section>
        </div>
        <aside className="summary" aria-labelledby="h-send">
          <h2 className="disp" id="h-send">Pedido {orderId}</h2>
          <div className="sumrow"><span>Unidades</span><span>{s.units}</span></div>
          <SavingsRows summary={s} />
          <p className="note">El identificador es provisional y sirve para que el asesor ubique tu consulta. No es una confirmación de compra.</p>

          {!link && (
            <div className="alert warn">
              <WarnIcon />
              <div>
                <b>WhatsApp no está configurado</b>
                <p>La tienda aún no ha configurado su número. Copia el mensaje y envíalo por el canal de contacto disponible.</p>
              </div>
            </div>
          )}
          {/* En celular este bloque queda fijo abajo: enviar el pedido nunca exige buscar el botón. */}
          <div className="dock">
            <div className="sumrow total"><span>Subtotal estimado</span><span>{formatCOP(s.subtotal)}</span></div>
            {link ? (
              <a className="btn btn-primary btn-block" href={link} target="_blank" rel="noopener noreferrer" data-testid="send-whatsapp" onClick={() => setOpened(true)}>
                <WhatsAppIcon /> Enviar pedido por WhatsApp
              </a>
            ) : (
              <button type="button" className="btn btn-primary btn-block" disabled data-testid="send-whatsapp">
                <WhatsAppIcon /> Enviar pedido por WhatsApp
              </button>
            )}
          </div>

          {opened && (
            <div className="alert ok" role="status">
              <OkIcon />
              <div>
                <b>Abrimos WhatsApp con tu pedido {orderId}</b>
                <p>Envía el mensaje en WhatsApp para que un asesor lo reciba. Te confirmarán disponibilidad, envío y forma de pago, y te enviarán un código para <Link href="/seguimiento">rastrear tu pedido</Link>.</p>
                <button
                  type="button"
                  className="link"
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    const prev = cart.clear();
                    toast("Carrito vaciado", { label: "Deshacer", onClick: () => cart.restore(prev) });
                  }}
                >
                  Ya envié el mensaje: vaciar carrito
                </button>
              </div>
            </div>
          )}

          <button type="button" className="btn btn-ghost btn-block btn-sm" onClick={copy}>Copiar mensaje</button>
          <Link className="link" href="/carrito">Volver al carrito</Link>
        </aside>
      </div>
    </>
  );
}

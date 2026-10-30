import { inkFor, normalizeHex } from "./color";
import type { NotifyStatus } from "./notify-rules";
import { formatCOP } from "./pricing";
import { formatDay, orderTotals, type Guide, type TrackingEvent } from "./tracking";

/**
 * Correos de la tienda. HTML de tablas con estilos en línea (lo único que respetan Gmail y Outlook), siempre
 * con versión en texto plano. Todo lo que viene de datos (nombres, notas) se escapa: nunca HTML del panel.
 */
export interface EmailStore {
  name: string;
  accent: string | null;
  logoUrl: string | null;
  whatsappNumber: string;
  phone: string | null;
  address: string | null;
}

export interface Email {
  subject: string;
  html: string;
  text: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Color del botón: el de la marca si se lee sobre blanco; si no, casi negro. */
function buttonColors(accent: string | null) {
  const a = accent ? normalizeHex(accent) : null;
  if (!a) return { bg: "#101114", fg: "#ffffff" };
  return { bg: a, fg: inkFor(a) };
}

function layout(store: EmailStore, body: { title: string; paragraphs: string[]; rows?: [string, string][]; cta?: { label: string; href: string }; footnote?: string }): { html: string; text: string } {
  const btn = buttonColors(store.accent);
  const head = store.logoUrl
    ? `<img src="${esc(store.logoUrl)}" alt="${esc(store.name)}" height="36" style="display:block;height:36px;width:auto;border:0">`
    : `<span style="font:800 20px/1 Arial,sans-serif;color:#101114;letter-spacing:.02em">${esc(store.name)}</span>`;
  const rows = body.rows?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid #e5e7eb">${body.rows
        .map(([k, v]) => `<tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#555b66;font:14px Arial,sans-serif">${esc(k)}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#111318;font:600 14px Arial,sans-serif">${esc(v)}</td></tr>`)
        .join("")}</table>`
    : "";
  const cta = body.cta
    ? `<p style="margin:24px 0"><a href="${esc(body.cta.href)}" style="display:inline-block;padding:12px 20px;border-radius:6px;background:${btn.bg};color:${btn.fg};font:700 15px Arial,sans-serif;text-decoration:none">${esc(body.cta.label)}</a></p>`
    : "";
  const contact = [store.whatsappNumber && `WhatsApp +${store.whatsappNumber}`, store.phone && `Tel. ${store.phone}`, store.address].filter(Boolean).join(" · ");
  const html = `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#f3f4f6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;padding:28px">
<tr><td>${head}</td></tr>
<tr><td style="padding-top:24px">
<h1 style="margin:0 0 12px;font:800 22px/1.25 Arial,sans-serif;color:#111318">${esc(body.title)}</h1>
${body.paragraphs.map((p) => `<p style="margin:0 0 12px;font:15px/1.5 Arial,sans-serif;color:#2b2f36">${esc(p)}</p>`).join("")}
${rows}${cta}
${body.footnote ? `<p style="margin:16px 0 0;font:13px/1.5 Arial,sans-serif;color:#555b66">${esc(body.footnote)}</p>` : ""}
</td></tr>
<tr><td style="padding-top:24px;border-top:1px solid #e5e7eb;font:12px/1.5 Arial,sans-serif;color:#646a73">${esc(store.name)}${contact ? ` · ${esc(contact)}` : ""}<br>Este correo es sobre tu pedido; no lo enviamos con fines publicitarios.</td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    body.title,
    "",
    ...body.paragraphs,
    ...(body.rows?.length ? ["", ...body.rows.map(([k, v]) => `${k}: ${v}`)] : []),
    ...(body.cta ? ["", `${body.cta.label}: ${body.cta.href}`] : []),
    ...(body.footnote ? ["", body.footnote] : []),
    "",
    "—",
    `${store.name}${contact ? ` · ${contact}` : ""}`,
  ].join("\n");
  return { html, text };
}

const SUBJECT: Record<NotifyStatus, (code: string) => string> = {
  confirmado: (c) => `Tu pedido ${c} está confirmado`,
  enviado: (c) => `Tu pedido ${c} va en camino`,
  en_reparto: (c) => `Tu pedido ${c} llega hoy`,
  entregado: (c) => `Tu pedido ${c} fue entregado`,
  entrega_fallida: (c) => `No pudimos entregar tu pedido ${c}`,
  reprogramado: (c) => `Nueva fecha de entrega para tu pedido ${c}`,
  cancelado: (c) => `Tu pedido ${c} fue cancelado`,
};

/** Correo de un paso del pedido. `trackingUrl` es la página pública de seguimiento. */
export function orderEmail(store: EmailStore, guide: Pick<Guide, "code" | "customerName" | "lines" | "shipping" | "paid" | "carrier" | "trackingNumber">, event: TrackingEvent & { status: NotifyStatus }, trackingUrl: string): Email {
  const first = guide.customerName.split(" ")[0] || guide.customerName;
  const t = orderTotals(guide);
  const money: [string, string][] = t.total > 0 ? [["Total del pedido", formatCOP(t.total)], ...(t.pending > 0 ? ([["Saldo pendiente", formatCOP(t.pending)]] as [string, string][]) : [])] : [];
  const carrier: [string, string][] = [...(guide.carrier ? ([["Transportadora", guide.carrier]] as [string, string][]) : []), ...(guide.trackingNumber ? ([["Número de guía", guide.trackingNumber]] as [string, string][]) : [])];
  const follow = { label: "Ver mi pedido", href: trackingUrl };
  const bodies: Record<NotifyStatus, Parameters<typeof layout>[1]> = {
    confirmado: {
      title: `¡Listo, ${first}! Tu pedido está confirmado`,
      paragraphs: [`Confirmamos tu pedido ${guide.code}. Te avisaremos por aquí cada vez que avance.`],
      rows: [...guide.lines.map((l) => [`${l.qty} × ${l.name}`, formatCOP(l.qty * l.unitPrice)] as [string, string]), ...(guide.shipping ? ([["Envío", formatCOP(guide.shipping)]] as [string, string][]) : []), ...money],
      cta: follow,
    },
    enviado: { title: `${first}, tu pedido va en camino`, paragraphs: [`Tu pedido ${guide.code} salió de la tienda.`], rows: [...carrier, ...money.slice(1)], cta: follow },
    en_reparto: {
      title: `${first}, tu pedido llega hoy`,
      paragraphs: [`La transportadora está llevando tu pedido ${guide.code} a tu dirección. Ten a mano tu documento para recibirlo.`],
      rows: [...carrier, ...money.slice(1)],
      cta: follow,
      footnote: t.pending > 0 ? `Recuerda: hay un saldo de ${formatCOP(t.pending)} para pagar al recibir.` : undefined,
    },
    entregado: {
      title: `Tu pedido fue entregado`,
      paragraphs: [`Tu pedido ${guide.code} fue entregado${event.receivedBy ? ` a ${event.receivedBy}` : ""}. ¡Que lo disfrutes!`, "Si algo no está bien, escríbenos por WhatsApp con tu número de pedido."],
      cta: follow,
    },
    entrega_fallida: {
      title: `No pudimos entregar tu pedido`,
      paragraphs: [`Intentamos entregar tu pedido ${guide.code}, pero no fue posible.${event.note ? ` Motivo: ${event.note}.` : ""}`, "Elige una nueva fecha y lo intentamos de nuevo."],
      cta: { label: "Elegir nueva fecha", href: trackingUrl },
    },
    reprogramado: {
      title: `Nueva fecha de entrega`,
      paragraphs: [event.rescheduledFor ? `Tu pedido ${guide.code} llegará el ${formatDay(event.rescheduledFor)}.` : `Reprogramamos la entrega de tu pedido ${guide.code}.`],
      cta: follow,
    },
    cancelado: {
      title: `Tu pedido fue cancelado`,
      paragraphs: [`Cancelamos tu pedido ${guide.code}.${event.note ? ` Motivo: ${event.note}.` : ""}`, "Si no esperabas este correo o tienes dudas, escríbenos por WhatsApp."],
    },
  };
  return { subject: SUBJECT[event.status](guide.code), ...layout(store, bodies[event.status]) };
}

export function testEmail(store: EmailStore, provider: string): Email {
  return {
    subject: `Correo de prueba de ${store.name}`,
    ...layout(store, {
      title: "Los correos de tu tienda funcionan",
      paragraphs: [`Este es un correo de prueba enviado con ${provider}. Así se verán los avisos de pedido que reciben tus clientes.`],
      rows: [["1 × Producto de ejemplo", formatCOP(1_275_000)], ["Total del pedido", formatCOP(1_275_000)]],
    }),
  };
}

export function lowStockEmail(store: EmailStore, items: { name: string; stock: number }[], panelUrl: string): Email {
  const out = items.filter((i) => i.stock <= 0);
  return {
    subject: out.length ? `Se agotó: ${out.map((i) => i.name).join(", ")}` : `Stock bajo: ${items.map((i) => i.name).join(", ")}`,
    ...layout(store, {
      title: out.length ? "Hay productos agotados" : "Hay productos con stock bajo",
      paragraphs: ["Después del último pedido o ajuste, estos productos quedaron así:"],
      rows: items.map((i) => [i.name, i.stock <= 0 ? "Agotado" : `${i.stock} ${i.stock === 1 ? "unidad" : "unidades"}`]),
      cta: { label: "Ver inventario", href: panelUrl },
    }),
  };
}

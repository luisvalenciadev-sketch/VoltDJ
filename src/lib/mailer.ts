import "server-only";
import nodemailer from "nodemailer";
import type { Email } from "./email-templates";

/**
 * Envío de correos con el proveedor que tenga configurado la tienda (variables de entorno en Vercel; las
 * claves nunca pasan por el panel ni por la base):
 *  - Gmail: GMAIL_USER + GMAIL_APP_PASSWORD (contraseña de aplicación). Sale desde el Gmail de la tienda,
 *    sin dominio propio. Unos 500 correos al día.
 *  - Resend: RESEND_API_KEY + EMAIL_FROM (dirección de un dominio verificado en Resend).
 * EMAIL_PROVIDER=gmail|resend elige uno si están los dos; si no se define, se usa el que esté completo.
 * Pruebas: EMAIL_PROVIDER=memoria guarda los correos en memoria del proceso (nunca en Vercel).
 */
export type ProviderName = "gmail" | "resend" | "memoria";

export interface Mailer {
  name: ProviderName;
  label: string;
  /** Dirección desde la que sale, para mostrar en el panel. */
  from: string;
  send(to: string, email: Email, opts: { fromName: string; replyTo?: string | null }): Promise<void>;
}

export interface SentMail {
  to: string;
  subject: string;
  text: string;
  html: string;
  at: string;
}

const gmailReady = () => Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
const resendReady = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

/** "Nombre de la tienda" <correo>, con el nombre entre comillas y sin caracteres que rompan el encabezado. */
const fromHeader = (name: string, address: string) => `"${name.replace(/["\r\n\\]/g, "").slice(0, 60)}" <${address}>`;

function gmail(): Mailer {
  const user = process.env.GMAIL_USER!;
  // Gmail recibe la contraseña de aplicación con o sin espacios ("abcd efgh ijkl mnop").
  const transport = nodemailer.createTransport({ service: "gmail", auth: { user, pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s+/g, "") } });
  return {
    name: "gmail",
    label: "Gmail",
    from: user,
    async send(to, email, { fromName, replyTo }) {
      await transport.sendMail({ from: fromHeader(fromName, user), to, replyTo: replyTo || undefined, subject: email.subject, text: email.text, html: email.html });
    },
  };
}

function resend(): Mailer {
  const from = process.env.EMAIL_FROM!;
  return {
    name: "resend",
    label: "Resend",
    from,
    async send(to, email, { fromName, replyTo }) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromHeader(fromName, from), to: [to], subject: email.subject, html: email.html, text: email.text, ...(replyTo ? { reply_to: replyTo } : {}) }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(`Resend respondió ${res.status}: ${body.message ?? res.statusText}`);
      }
    },
  };
}

export function memoryOutbox(): SentMail[] {
  const g = globalThis as unknown as { __voltOutbox?: SentMail[] };
  return (g.__voltOutbox ??= []);
}

function memory(): Mailer {
  return {
    name: "memoria",
    label: "Memoria (pruebas)",
    from: "pruebas@localhost",
    async send(to, email) {
      memoryOutbox().unshift({ to, subject: email.subject, text: email.text, html: email.html, at: new Date().toISOString() });
    },
  };
}

let cached: Mailer | null | undefined;
/** Proveedor configurado, o null si la tienda todavía no conectó ninguno (los avisos simplemente no salen). */
export function mailer(): Mailer | null {
  if (cached !== undefined) return cached;
  const choice = process.env.EMAIL_PROVIDER?.toLowerCase();
  if (choice === "memoria" && process.env.VERCEL !== "1") return (cached = memory());
  if (choice === "gmail") return (cached = gmailReady() ? gmail() : null);
  if (choice === "resend") return (cached = resendReady() ? resend() : null);
  return (cached = gmailReady() ? gmail() : resendReady() ? resend() : null);
}

/** Qué falta para que funcione, en palabras para el panel. */
export function mailerProblem(): string | null {
  if (mailer()) return null;
  const choice = process.env.EMAIL_PROVIDER?.toLowerCase();
  if (choice === "gmail") return "Elegiste Gmail, pero faltan GMAIL_USER o GMAIL_APP_PASSWORD en Vercel.";
  if (choice === "resend") return "Elegiste Resend, pero faltan RESEND_API_KEY o EMAIL_FROM en Vercel.";
  return "No hay proveedor de correo configurado.";
}

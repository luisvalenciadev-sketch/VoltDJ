import type { Metadata } from "next";
import Link from "next/link";
import { BrandForm, PaymentsForm, PoliciesForm, SeoForm, ShippingForm, StoreDataForm, ThemeForm } from "@/components/admin/SettingsForms";
import { NotificationsForm } from "@/components/admin/NotificationsForm";
import { SITE } from "@/config/store";
import { requireOwner } from "@/lib/admin-auth";
import { mailer, mailerProblem } from "@/lib/mailer";
import { uploadMode } from "@/lib/media";
import { formatTrackingDate } from "@/lib/tracking";
import { usersStore } from "@/lib/users-store";
import { settingsStore } from "@/lib/settings-store";

export const metadata: Metadata = { title: "Configuración" };

const TABS = [
  { id: "tienda", label: "Tienda", intro: "Nombre, contacto y datos legales. Lo que cambies aquí se ve en toda la tienda y en los mensajes de WhatsApp." },
  { id: "diseno", label: "Diseño", intro: "Cinco temas con la misma tienda por dentro: cambia la forma, no tus datos. Míralos en tu tienda antes de aplicar." },
  { id: "marca", label: "Marca", intro: "Logo, ícono de la pestaña y color de acento." },
  { id: "pagos", label: "Pagos", intro: "Medios de pago que aceptas y cuotas. La tienda muestra solo los activos." },
  { id: "envios", label: "Envíos", intro: "Zonas con tiempo y costo de entrega, y despacho el mismo día." },
  { id: "notificaciones", label: "Notificaciones", intro: "Correos automáticos al cliente en cada paso del pedido y avisos de stock para la tienda." },
  { id: "politicas", label: "Políticas", intro: "Envíos, garantía, cambios y las páginas legales." },
  { id: "seo", label: "SEO", intro: "Cómo aparece la tienda en Google y al compartir el enlace." },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  await requireOwner();
  const s = (await searchParams).s;
  const tab: Tab = TABS.some((t) => t.id === s) ? (s as Tab) : "tienda";
  const settings = settingsStore();
  // Directo del almacén, sin la caché de la tienda: el panel siempre muestra lo último guardado.
  const store = await settings.get();
  const mode = uploadMode();
  const current = TABS.find((t) => t.id === tab)!;
  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Configuración</span>
          <h1 className="disp">{current.label}</h1>
          <p className="note">{current.intro}</p>
        </div>
      </div>
      <nav className="tabs" aria-label="Configuración">
        {TABS.map((t) => (
          <Link key={t.id} href={t.id === "tienda" ? "/admin/configuracion" : `/admin/configuracion?s=${t.id}`} aria-current={tab === t.id ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="settings-body">
        {tab === "tienda" && <StoreDataForm store={store} writable={settings.writable} />}
        {tab === "diseno" && <ThemeForm store={store} writable={settings.writable} />}
        {tab === "marca" && <BrandForm store={store} mode={mode} writable={settings.writable} />}
        {tab === "pagos" && <PaymentsForm store={store} writable={settings.writable} />}
        {tab === "envios" && <ShippingForm store={store} writable={settings.writable} />}
        {tab === "notificaciones" && <Notifications store={store} writable={settings.writable} />}
        {tab === "politicas" && <PoliciesForm store={store} writable={settings.writable} />}
        {tab === "seo" && <SeoForm store={store} mode={mode} writable={settings.writable} siteUrl={SITE.url} />}
      </div>
    </>
  );
}

async function Notifications({ store, writable }: { store: Awaited<ReturnType<ReturnType<typeof settingsStore>["get"]>>; writable: boolean }) {
  const m = mailer();
  const log = (await usersStore().auditList({ entity: "correo", limit: 12 })).map((e) => ({ id: e.id, at: formatTrackingDate(e.at), summary: e.summary, failed: e.action === "error" }));
  return <NotificationsForm store={store} provider={m ? { label: m.label, from: m.from } : null} problem={mailerProblem()} log={log} writable={writable} />;
}

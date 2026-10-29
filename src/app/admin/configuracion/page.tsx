import type { Metadata } from "next";
import Link from "next/link";
import { BrandForm, PoliciesForm, SeoForm, StoreDataForm } from "@/components/admin/SettingsForms";
import { SITE } from "@/config/store";
import { requireAdmin } from "@/lib/admin-auth";
import { uploadMode } from "@/lib/media";
import { settingsStore } from "@/lib/settings-store";

export const metadata: Metadata = { title: "Configuración" };

const TABS = [
  { id: "tienda", label: "Tienda", intro: "Nombre, contacto y datos legales. Lo que cambies aquí se ve en toda la tienda y en los mensajes de WhatsApp." },
  { id: "marca", label: "Marca", intro: "Logo, ícono de la pestaña y color de acento." },
  { id: "politicas", label: "Políticas", intro: "Envíos, garantía, cambios y las páginas legales." },
  { id: "seo", label: "SEO", intro: "Cómo aparece la tienda en Google y al compartir el enlace." },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  await requireAdmin();
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
        {tab === "marca" && <BrandForm store={store} mode={mode} writable={settings.writable} />}
        {tab === "politicas" && <PoliciesForm store={store} writable={settings.writable} />}
        {tab === "seo" && <SeoForm store={store} mode={mode} writable={settings.writable} siteUrl={SITE.url} />}
      </div>
    </>
  );
}

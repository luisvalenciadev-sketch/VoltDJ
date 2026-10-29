import type { Metadata } from "next";
import Link from "next/link";
import { BannersForm, FaqsForm, HomeForm, ReviewsForm, VideosForm } from "@/components/admin/ContentForms";
import { requireOwner } from "@/lib/admin-auth";
import { catalogStore } from "@/lib/catalog-store";
import { uploadMode } from "@/lib/media";
import { contentStore } from "@/lib/settings-store";

export const metadata: Metadata = { title: "Contenido" };

const TABS = [
  { id: "inicio", label: "Inicio", intro: "Textos de la portada y el orden de las secciones del inicio." },
  { id: "banners", label: "Banners", intro: "Fotos con título y botón para anunciar ofertas, llegadas o eventos, con fechas de inicio y fin." },
  { id: "videos", label: "Videos", intro: "“Mira cómo suena”: videos cortos del local, de pruebas de sonido o de eventos." },
  { id: "preguntas", label: "Preguntas frecuentes", intro: "Las dudas que más te hacen por WhatsApp, respondidas en la tienda." },
  { id: "resenas", label: "Reseñas", intro: "Tu calificación en Google y algunas reseñas reales de clientes." },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  await requireOwner();
  const s = (await searchParams).s;
  const tab: Tab = TABS.some((t) => t.id === s) ? (s as Tab) : "inicio";
  const store = contentStore();
  // Directo del almacén, sin la caché de la tienda: el panel siempre muestra lo último guardado.
  const content = await store.get();
  const mode = uploadMode();
  const current = TABS.find((t) => t.id === tab)!;
  const products =
    tab === "videos"
      ? (await catalogStore().snapshot()).products
          .filter((p) => p.status === "published")
          .map((p) => ({ id: p.id, name: p.name }))
          .sort((a, b) => a.name.localeCompare(b.name))
      : [];
  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Contenido</span>
          <h1 className="disp">{current.label}</h1>
          <p className="note">{current.intro}</p>
        </div>
      </div>
      <nav className="tabs" aria-label="Contenido">
        {TABS.map((t) => (
          <Link key={t.id} href={t.id === "inicio" ? "/admin/contenido" : `/admin/contenido?s=${t.id}`} aria-current={tab === t.id ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="settings-body">
        {tab === "inicio" && <HomeForm content={content} writable={store.writable} />}
        {tab === "banners" && <BannersForm content={content} mode={mode} writable={store.writable} />}
        {tab === "videos" && <VideosForm content={content} products={products} mode={mode} writable={store.writable} />}
        {tab === "preguntas" && <FaqsForm content={content} writable={store.writable} />}
        {tab === "resenas" && <ReviewsForm content={content} writable={store.writable} />}
      </div>
    </>
  );
}

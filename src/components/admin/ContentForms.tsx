"use client";

import { useId, useState } from "react";
import { saveBanners, saveFaqs, saveHome, saveReviews, saveVideos } from "@/app/admin/contenido/actions";
import { HOME_SECTION_LABEL, type Banner, type FaqItem, type HomeContent, type HomeSectionId, type Review, type Video } from "@/config/content";
import type { ProductImage } from "@/data/types";
import { youtubeId } from "@/lib/home-content";
import type { UploadMode } from "@/lib/media";
import { Section, SingleImage, uploadVideo } from "./CatalogForms";
import { Field, ReadOnlyNotice, SaveBar, useSave } from "./SettingsForms";

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/** Mover un elemento de una lista: subir (−1) o bajar (+1). */
function move<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Botones de orden y quitar de cada fila de una lista editable. */
function RowTools({ i, total, label, onMove, onRemove }: { i: number; total: number; label: string; onMove: (dir: -1 | 1) => void; onRemove: () => void }) {
  return (
    <span className="row-tools">
      <button type="button" className="iconbtn" aria-label={`Subir ${label}`} disabled={i === 0} onClick={() => onMove(-1)}>
        ↑
      </button>
      <button type="button" className="iconbtn" aria-label={`Bajar ${label}`} disabled={i === total - 1} onClick={() => onMove(1)}>
        ↓
      </button>
      <button type="button" className="textbtn danger" onClick={onRemove}>
        Quitar
      </button>
    </span>
  );
}

// ---------- Inicio: héroe y orden de secciones ----------

export function HomeForm({ content, writable }: { content: HomeContent; writable: boolean }) {
  const { state, pending, dirty, setDirty, onSubmit } = useSave(saveHome);
  const [sections, setSections] = useState(content.sections);
  const edit = (next: typeof sections) => (setSections(next), setDirty(true));

  return (
    <form onSubmit={onSubmit} className="aform" onChange={() => setDirty(true)}>
      <input type="hidden" name="sections" value={JSON.stringify(sections)} />
      <div className="aform-main">
        <ReadOnlyNotice writable={writable} />
        <Section id="heroe" title="Portada" hint="Lo primero que se ve. El título grande es el eslogan de la tienda (Configuración → Tienda); la foto, la del primer producto destacado.">
          <div className="admin-grid">
            <Field id="eyebrow" label="Texto pequeño sobre el título" hint="Vacío = no se muestra.">
              <input id="eyebrow" name="eyebrow" className="input" maxLength={60} defaultValue={content.hero.eyebrow} />
            </Field>
            <Field id="ctaLabel" label="Texto del botón">
              <input id="ctaLabel" name="ctaLabel" className="input" maxLength={30} defaultValue={content.hero.ctaLabel} placeholder="Explorar productos" />
            </Field>
            <Field id="lead" label="Párrafo" hint="Qué vendes y cómo se compra, en dos líneas." wide>
              <textarea id="lead" name="lead" className="input textarea" rows={3} maxLength={260} defaultValue={content.hero.lead} />
            </Field>
            <Field id="ctaHref" label="El botón lleva a" hint="Una página de la tienda, por ejemplo /catalogo/parlantes-y-bajos." wide>
              <input id="ctaHref" name="ctaHref" className="input mono" maxLength={300} defaultValue={content.hero.ctaHref} placeholder="/catalogo" />
            </Field>
          </div>
        </Section>

        <Section id="secciones" title="Secciones del inicio" hint="Ordénalas y apaga las que no quieras. Una sección sin contenido (sin ofertas, sin videos…) no se muestra aunque esté encendida.">
          <ol className="section-rows">
            {sections.map((s, i) => (
              <li key={s.id} data-off={!s.enabled || undefined}>
                <label className="step-toggle">
                  <input type="checkbox" checked={s.enabled} onChange={(e) => edit(sections.map((x) => (x.id === s.id ? { ...x, enabled: e.target.checked } : x)))} />
                  {HOME_SECTION_LABEL[s.id as HomeSectionId]}
                </label>
                <span className="row-tools">
                  <button type="button" className="iconbtn" aria-label={`Subir ${HOME_SECTION_LABEL[s.id]}`} disabled={i === 0} onClick={() => edit(move(sections, i, -1))}>
                    ↑
                  </button>
                  <button type="button" className="iconbtn" aria-label={`Bajar ${HOME_SECTION_LABEL[s.id]}`} disabled={i === sections.length - 1} onClick={() => edit(move(sections, i, 1))}>
                    ↓
                  </button>
                </span>
              </li>
            ))}
          </ol>
          <p className="note">
            Los <b>destacados</b> se eligen en cada producto, con la casilla “Destacar en el inicio”.
          </p>
        </Section>
      </div>
      <SaveBar state={state} pending={pending} dirty={dirty} writable={writable} />
    </form>
  );
}

// ---------- Banners ----------

export function BannersForm({ content, mode, writable }: { content: HomeContent; mode: UploadMode; writable: boolean }) {
  const { state, pending, dirty, setDirty, onSubmit } = useSave(saveBanners);
  const [banners, setBanners] = useState<Banner[]>(content.banners);
  const edit = (next: Banner[]) => (setBanners(next), setDirty(true));
  const patch = (i: number, p: Partial<Banner>) => edit(banners.map((b, j) => (j === i ? { ...b, ...p } : b)));

  return (
    <form onSubmit={onSubmit} className="stack">
      <input type="hidden" name="banners" value={JSON.stringify(banners)} />
      <ReadOnlyNotice writable={writable} />
      <p className="note">Foto horizontal (1600 × 700 o similar). El texto se escribe aquí y va sobre la foto, nunca dentro de la imagen: así se lee en celular y Google lo encuentra.</p>
      <ul className="content-rows">
        {banners.map((b, i) => (
          <li key={b.id} className="content-row">
            <div className="row-wrap between">
              <b>Banner {i + 1}</b>
              <RowTools i={i} total={banners.length} label={`el banner ${i + 1}`} onMove={(d) => edit(move(banners, i, d))} onRemove={() => edit(banners.filter((_, j) => j !== i))} />
            </div>
            <div className="admin-grid">
              <div className="span-2">
                <SingleImage label="Foto" value={b.image} onChange={(v: ProductImage | null) => patch(i, { image: v ? { ...v, fit: "cover" } : null })} mode={mode} baseName={`banner-${i + 1}`} />
              </div>
              <Field id={`b-title-${b.id}`} label="Título *">
                <input id={`b-title-${b.id}`} className="input" maxLength={80} value={b.title} onChange={(e) => patch(i, { title: e.target.value })} />
              </Field>
              <Field id={`b-sub-${b.id}`} label="Subtítulo">
                <input id={`b-sub-${b.id}`} className="input" maxLength={160} value={b.subtitle} onChange={(e) => patch(i, { subtitle: e.target.value })} />
              </Field>
              <Field id={`b-cta-${b.id}`} label="Texto del botón">
                <input id={`b-cta-${b.id}`} className="input" maxLength={30} value={b.ctaLabel} onChange={(e) => patch(i, { ctaLabel: e.target.value })} placeholder="Ver ofertas" />
              </Field>
              <Field id={`b-href-${b.id}`} label="El botón lleva a">
                <input id={`b-href-${b.id}`} className="input mono" maxLength={300} value={b.ctaHref} onChange={(e) => patch(i, { ctaHref: e.target.value })} placeholder="/ofertas" />
              </Field>
              <Field id={`b-start-${b.id}`} label="Se muestra desde" hint="Vacío = ya.">
                <input id={`b-start-${b.id}`} type="date" className="input" value={b.startsAt ?? ""} onChange={(e) => patch(i, { startsAt: e.target.value || null })} />
              </Field>
              <Field id={`b-end-${b.id}`} label="Hasta" hint="Incluye ese día. Vacío = sin fin.">
                <input id={`b-end-${b.id}`} type="date" className="input" value={b.endsAt ?? ""} onChange={(e) => patch(i, { endsAt: e.target.value || null })} />
              </Field>
              <label className="step-toggle span-2">
                <input type="checkbox" checked={b.active} onChange={(e) => patch(i, { active: e.target.checked })} />
                Activo
              </label>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-ghost btn-sm" disabled={banners.length >= 8} onClick={() => edit([...banners, { id: newId("banner"), title: "", subtitle: "", ctaLabel: "", ctaHref: "", image: null, startsAt: null, endsAt: null, active: true }])}>
        + Agregar banner
      </button>
      <SaveBar state={state} pending={pending} dirty={dirty} writable={writable} />
    </form>
  );
}

// ---------- Videos ----------

type VideoDraft = Video & { youtube?: string };

function VideoUpload({ value, onChange, mode }: { value: string | null; onChange: (src: string) => void; mode: UploadMode }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  if (mode === "off") return <p className="alert warn"><span>Falta conectar el almacenamiento (Vercel Blob) para subir videos. Mientras tanto, usa un enlace de YouTube.</span></p>;
  return (
    <div className="field">
      <span className="label">Archivo MP4 (vertical, hasta 50 MB)</span>
      <div className="row-wrap">
        <label className="btn btn-secondary btn-sm" htmlFor={id}>
          {busy ? "Subiendo…" : value ? "Cambiar video" : "Subir video"}
        </label>
        <input
          id={id}
          type="file"
          accept="video/mp4,video/webm"
          className="sr-only"
          aria-label="Subir video"
          disabled={busy}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            setError(null);
            try {
              onChange(await uploadVideo(f, mode, "mira-como-suena"));
            } catch (err) {
              setError(err instanceof Error ? err.message : "No se pudo subir el video.");
            }
            setBusy(false);
            e.target.value = "";
          }}
        />
        {value && <span className="note">Video cargado.</span>}
      </div>
      {error && (
        <p className="alert err" role="alert">
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export function VideosForm({ content, products, mode, writable }: { content: HomeContent; products: { id: string; name: string }[]; mode: UploadMode; writable: boolean }) {
  const { state, pending, dirty, setDirty, onSubmit } = useSave(saveVideos);
  const [videos, setVideos] = useState<VideoDraft[]>(content.videos.map((v) => ({ ...v, youtube: v.youtubeId ? `https://youtu.be/${v.youtubeId}` : "" })));
  const edit = (next: VideoDraft[]) => (setVideos(next), setDirty(true));
  const patch = (i: number, p: Partial<VideoDraft>) => edit(videos.map((v, j) => (j === i ? { ...v, ...p } : v)));

  return (
    <form onSubmit={onSubmit} className="stack">
      <input type="hidden" name="videos" value={JSON.stringify(videos)} />
      <ReadOnlyNotice writable={writable} />
      <p className="note">Videos cortos y verticales del local, de una prueba de sonido o de un evento. Un enlace de YouTube no gasta almacenamiento de la tienda; un MP4 subido sí consume transferencia cada vez que alguien lo ve.</p>
      <ul className="content-rows">
        {videos.map((v, i) => {
          const usesYoutube = v.youtube !== undefined && (v.youtube !== "" || !v.src);
          const yt = v.youtube ? youtubeId(v.youtube) : null;
          return (
            <li key={v.id} className="content-row">
              <div className="row-wrap between">
                <b>Video {i + 1}</b>
                <RowTools i={i} total={videos.length} label={`el video ${i + 1}`} onMove={(d) => edit(move(videos, i, d))} onRemove={() => edit(videos.filter((_, j) => j !== i))} />
              </div>
              <div className="admin-grid">
                <Field id={`v-title-${v.id}`} label="Título *">
                  <input id={`v-title-${v.id}`} className="input" maxLength={80} value={v.title} onChange={(e) => patch(i, { title: e.target.value })} placeholder="Prueba de sonido EV ZLX-15P" />
                </Field>
                <Field id={`v-prod-${v.id}`} label="Producto que se ve" hint="El video enlaza a su ficha.">
                  <select id={`v-prod-${v.id}`} className="input" value={v.productId ?? ""} onChange={(e) => patch(i, { productId: e.target.value || null })}>
                    <option value="">Ninguno</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="span-2 row-wrap">
                  <label className="pick">
                    <input type="radio" name={`v-kind-${v.id}`} checked={usesYoutube} onChange={() => patch(i, { youtube: v.youtube || "" , src: null })} />
                    <span>Usar YouTube</span>
                  </label>
                  <label className="pick">
                    <input type="radio" name={`v-kind-${v.id}`} checked={!usesYoutube} onChange={() => patch(i, { youtube: undefined, youtubeId: null })} />
                    <span>Subir MP4</span>
                  </label>
                </div>
                {usesYoutube ? (
                  <Field id={`v-yt-${v.id}`} label="Enlace de YouTube" hint={v.youtube && !yt ? "No reconocemos ese enlace: copia el del video o el del Short." : "Funciona con videos normales y con Shorts."} wide>
                    <input id={`v-yt-${v.id}`} className="input" inputMode="url" value={v.youtube ?? ""} onChange={(e) => patch(i, { youtube: e.target.value })} placeholder="https://youtube.com/shorts/…" aria-invalid={(Boolean(v.youtube) && !yt) || undefined} />
                  </Field>
                ) : (
                  <div className="span-2">
                    <VideoUpload value={v.src} mode={mode} onChange={(src) => patch(i, { src })} />
                  </div>
                )}
                <div className="span-2">
                  <SingleImage label="Portada (opcional; con YouTube se usa la del video)" value={v.poster} onChange={(p) => patch(i, { poster: p ? { ...p, fit: "cover" } : null })} mode={mode} baseName={`video-${i + 1}`} />
                </div>
                <label className="step-toggle span-2">
                  <input type="checkbox" checked={v.active} onChange={(e) => patch(i, { active: e.target.checked })} />
                  Visible en el inicio
                </label>
              </div>
            </li>
          );
        })}
      </ul>
      <button type="button" className="btn btn-ghost btn-sm" disabled={videos.length >= 12} onClick={() => edit([...videos, { id: newId("video"), title: "", src: null, youtubeId: null, youtube: "", poster: null, productId: null, active: true }])}>
        + Agregar video
      </button>
      <SaveBar state={state} pending={pending} dirty={dirty} writable={writable} />
    </form>
  );
}

// ---------- Preguntas frecuentes ----------

export function FaqsForm({ content, writable }: { content: HomeContent; writable: boolean }) {
  const { state, pending, dirty, setDirty, onSubmit } = useSave(saveFaqs);
  const [faqs, setFaqs] = useState<FaqItem[]>(content.faqs);
  const edit = (next: FaqItem[]) => (setFaqs(next), setDirty(true));
  const patch = (i: number, p: Partial<FaqItem>) => edit(faqs.map((f, j) => (j === i ? { ...f, ...p } : f)));

  return (
    <form onSubmit={onSubmit} className="stack">
      <input type="hidden" name="faqs" value={JSON.stringify(faqs)} />
      <ReadOnlyNotice writable={writable} />
      <p className="note">Las cuatro primeras salen en el inicio; todas, en Preguntas frecuentes (y Google puede mostrarlas en sus resultados).</p>
      <ul className="content-rows">
        {faqs.map((f, i) => (
          <li key={f.id} className="content-row">
            <div className="row-wrap between">
              <b>Pregunta {i + 1}</b>
              <RowTools i={i} total={faqs.length} label={`la pregunta ${i + 1}`} onMove={(d) => edit(move(faqs, i, d))} onRemove={() => edit(faqs.filter((_, j) => j !== i))} />
            </div>
            <Field id={`f-q-${f.id}`} label="Pregunta">
              <input id={`f-q-${f.id}`} className="input" maxLength={160} value={f.q} onChange={(e) => patch(i, { q: e.target.value })} />
            </Field>
            <Field id={`f-a-${f.id}`} label="Respuesta">
              <textarea id={`f-a-${f.id}`} className="input textarea" rows={3} maxLength={1200} value={f.a} onChange={(e) => patch(i, { a: e.target.value })} />
            </Field>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-ghost btn-sm" disabled={faqs.length >= 40} onClick={() => edit([...faqs, { id: newId("faq"), q: "", a: "" }])}>
        + Agregar pregunta
      </button>
      <SaveBar state={state} pending={pending} dirty={dirty} writable={writable} />
    </form>
  );
}

// ---------- Reseñas ----------

export function ReviewsForm({ content, writable }: { content: HomeContent; writable: boolean }) {
  const { state, pending, dirty, setDirty, onSubmit } = useSave(saveReviews);
  const [items, setItems] = useState<Review[]>(content.reviews.items);
  const edit = (next: Review[]) => (setItems(next), setDirty(true));
  const patch = (i: number, p: Partial<Review>) => edit(items.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const r = content.reviews;

  return (
    <form onSubmit={onSubmit} className="stack">
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <ReadOnlyNotice writable={writable} />
      <Section id="google" title="Calificación en Google" hint="Cópiala de tu perfil de Google. Escribe solo reseñas reales, con el nombre tal como aparece en Google: inventarlas o modificarlas es publicidad engañosa.">
        <div className="admin-grid">
          <Field id="rating" label="Calificación (1 a 5)">
            <input id="rating" name="rating" className="input num" inputMode="decimal" maxLength={4} defaultValue={r.rating == null ? "" : String(r.rating).replace(".", ",")} placeholder="4,8" />
          </Field>
          <Field id="count" label="Número de reseñas">
            <input id="count" name="count" className="input num" inputMode="numeric" maxLength={7} defaultValue={r.count ?? ""} placeholder="126" />
          </Field>
          <Field id="url" label="Enlace a tus reseñas en Google" hint="Para que el cliente las compruebe." wide>
            <input id="url" name="url" className="input" inputMode="url" maxLength={400} defaultValue={r.url ?? ""} placeholder="https://g.page/r/…" />
          </Field>
        </div>
      </Section>
      <Section id="destacadas" title="Reseñas destacadas">
        <ul className="content-rows">
          {items.map((it, i) => (
            <li key={it.id} className="content-row">
              <div className="row-wrap between">
                <b>Reseña {i + 1}</b>
                <RowTools i={i} total={items.length} label={`la reseña ${i + 1}`} onMove={(d) => edit(move(items, i, d))} onRemove={() => edit(items.filter((_, j) => j !== i))} />
              </div>
              <div className="admin-grid">
                <Field id={`r-author-${it.id}`} label="Nombre">
                  <input id={`r-author-${it.id}`} className="input" maxLength={60} value={it.author} onChange={(e) => patch(i, { author: e.target.value })} />
                </Field>
                <Field id={`r-rating-${it.id}`} label="Estrellas">
                  <select id={`r-rating-${it.id}`} className="input" value={it.rating} onChange={(e) => patch(i, { rating: Number(e.target.value) })}>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id={`r-text-${it.id}`} label="Reseña" wide>
                  <textarea id={`r-text-${it.id}`} className="input textarea" rows={3} maxLength={500} value={it.text} onChange={(e) => patch(i, { text: e.target.value })} />
                </Field>
              </div>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-ghost btn-sm" disabled={items.length >= 12} onClick={() => edit([...items, { id: newId("resena"), author: "", text: "", rating: 5 }])}>
          + Agregar reseña
        </button>
      </Section>
      <SaveBar state={state} pending={pending} dirty={dirty} writable={writable} />
    </form>
  );
}

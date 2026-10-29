import Link from "next/link";
import { phoneHref } from "@/config/store";
import { getStore } from "@/data/store";
import type { Category } from "@/data/types";
import { Logo } from "./Header";
import { Pending } from "./ui";

export async function Footer({ categories, showOffers }: { categories: Category[]; showOffers: boolean }) {
  const store = await getStore();
  const year = new Date().getFullYear();
  return (
    <footer className="ft">
      <div className="wrap">
        <div className="cols">
          <div>
            <Logo store={store} />
            {store.tagline && <p>{store.tagline}</p>}
            <p>{store.legalName && store.taxId ? `${store.legalName} · NIT ${store.taxId}` : <Pending>Razón social · NIT</Pending>}</p>
          </div>
          <div>
            <h2>Tienda</h2>
            <ul>
              <li><Link href="/catalogo">Todo el catálogo</Link></li>
              {showOffers && <li><Link href="/ofertas">Ofertas</Link></li>}
              {categories.slice(0, 6).map((c) => (
                <li key={c.id}><Link href={`/catalogo/${c.slug}`}>{c.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Ayuda</h2>
            <ul>
              <li><Link href="/seguimiento">Rastrear pedido</Link></li>
              <li><Link href="/envios-y-garantias">Envíos y garantías</Link></li>
              <li><Link href="/preguntas-frecuentes">Preguntas frecuentes</Link></li>
              <li><Link href="/contacto">Contacto y WhatsApp</Link></li>
            </ul>
          </div>
          <div>
            <h2>Contacto</h2>
            <ul>
              <li>{store.whatsappNumber ? <Link href="/contacto">WhatsApp comercial</Link> : <Pending>WhatsApp comercial</Pending>}</li>
              <li>{store.email ? <a href={`mailto:${store.email}`}>{store.email}</a> : <Pending>Correo</Pending>}</li>
              {store.phone && <li><a href={phoneHref(store.phone)}>Tel. {store.phone}</a></li>}
              <li>{store.address ?? <Pending>Dirección / showroom</Pending>}</li>
              <li>{store.hours ?? <Pending>Horario</Pending>}</li>
              {store.social.length ? (
                store.social.map((s) => (
                  <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a></li>
                ))
              ) : (
                <li><Pending>Redes sociales</Pending></li>
              )}
            </ul>
          </div>
        </div>
        <div className="legal">
          <span>
            © {year} {store.name} · Fotos:{" "}
            <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">Pexels</a>
          </span>
          <span className="row-wrap" style={{ gap: "var(--s4)" }}>
            <Link href="/privacidad">Política de privacidad</Link>
            <Link href="/terminos">Términos y condiciones</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

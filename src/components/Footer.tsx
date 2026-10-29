import Link from "next/link";
import { STORE } from "@/config/store";
import type { Category } from "@/data/types";
import { Logo } from "./Header";
import { Pending } from "./ui";

export function Footer({ categories }: { categories: Category[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="ft">
      <div className="wrap">
        <div className="cols">
          <div>
            <Logo />
            <p>{STORE.tagline}</p>
            <p>{STORE.legalName && STORE.taxId ? `${STORE.legalName} · NIT ${STORE.taxId}` : <Pending>Razón social · NIT</Pending>}</p>
          </div>
          <div>
            <h2>Tienda</h2>
            <ul>
              <li><Link href="/catalogo">Todo el catálogo</Link></li>
              <li><Link href="/ofertas">Ofertas</Link></li>
              {categories.slice(0, 5).map((c) => (
                <li key={c.id}><Link href={`/catalogo/${c.slug}`}>{c.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Ayuda</h2>
            <ul>
              <li><Link href="/envios-y-garantias">Envíos y garantías</Link></li>
              <li><Link href="/preguntas-frecuentes">Preguntas frecuentes</Link></li>
              <li><Link href="/contacto">Contacto y WhatsApp</Link></li>
            </ul>
          </div>
          <div>
            <h2>Contacto</h2>
            <ul>
              <li>{STORE.whatsappNumber ? <Link href="/contacto">WhatsApp comercial</Link> : <Pending>WhatsApp comercial</Pending>}</li>
              <li>{STORE.email ?? <Pending>Correo</Pending>}</li>
              <li>{STORE.address ?? <Pending>Dirección / showroom</Pending>}</li>
              <li>{STORE.hours ?? <Pending>Horario</Pending>}</li>
              {STORE.social.length ? (
                STORE.social.map((s) => (
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
            © {year} {STORE.name} · Fotos de referencia de{" "}
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

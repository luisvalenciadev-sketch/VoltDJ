"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canOpen, type Role } from "@/lib/permissions";

const LINKS = [
  { href: "/admin", label: "Pedidos y guías", match: (p: string) => p === "/admin" || p.startsWith("/admin/guias") },
  { href: "/admin/productos", label: "Productos", match: (p: string) => p.startsWith("/admin/productos") },
  { href: "/admin/inventario", label: "Inventario", match: (p: string) => p.startsWith("/admin/inventario") },
  { href: "/admin/categorias", label: "Categorías", match: (p: string) => p.startsWith("/admin/categorias") },
  { href: "/admin/marcas", label: "Marcas", match: (p: string) => p.startsWith("/admin/marcas") },
  { href: "/admin/promociones", label: "Promociones", match: (p: string) => p.startsWith("/admin/promociones") },
  { href: "/admin/contenido", label: "Contenido", match: (p: string) => p.startsWith("/admin/contenido") },
  { href: "/admin/importar", label: "Importar / exportar", match: (p: string) => p.startsWith("/admin/importar") },
  { href: "/admin/configuracion", label: "Configuración", match: (p: string) => p.startsWith("/admin/configuracion") },
  { href: "/admin/usuarios", label: "Usuarios", match: (p: string) => p.startsWith("/admin/usuarios") },
  { href: "/admin/historial", label: "Historial", match: (p: string) => p.startsWith("/admin/historial") },
];

/**
 * Secciones del panel, solo las que el rol puede abrir (el servidor lo vuelve a verificar en cada página).
 * Mientras se entra con la contraseña única, un aviso pide crear el primer dueño.
 */
export function AdminNav({ role, master }: { role: Role; master: boolean }) {
  const path = usePathname();
  if (path === "/admin/ingresar") return null;
  return (
    <>
      <nav className="admin-nav" aria-label="Secciones del panel">
        <div className="wrap tabs">
          {LINKS.filter((l) => canOpen(role, l.href)).map((l) => (
            <Link key={l.href} href={l.href} aria-current={l.match(path) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
      {master && !path.startsWith("/admin/usuarios") && (
        <div className="wrap">
          <p className="alert warn master-note">
            <span>
              Entraste con la contraseña única: cualquiera que la conozca tiene acceso total. <Link href="/admin/usuarios">Crea tu usuario de dueño</Link> y desde ahí cada persona entra con su correo.
            </span>
          </p>
        </div>
      )}
    </>
  );
}

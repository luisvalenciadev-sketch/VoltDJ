"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Pedidos y guías", match: (p: string) => p === "/admin" || p.startsWith("/admin/guias") },
  { href: "/admin/productos", label: "Productos", match: (p: string) => p.startsWith("/admin/productos") },
  { href: "/admin/inventario", label: "Inventario", match: (p: string) => p.startsWith("/admin/inventario") },
  { href: "/admin/categorias", label: "Categorías", match: (p: string) => p.startsWith("/admin/categorias") },
  { href: "/admin/marcas", label: "Marcas", match: (p: string) => p.startsWith("/admin/marcas") },
  { href: "/admin/promociones", label: "Promociones", match: (p: string) => p.startsWith("/admin/promociones") },
  { href: "/admin/importar", label: "Importar / exportar", match: (p: string) => p.startsWith("/admin/importar") },
  { href: "/admin/configuracion", label: "Configuración", match: (p: string) => p.startsWith("/admin/configuracion") },
];

/** Secciones del panel. En celular se desplaza de lado, como las pestañas de la lista de guías. */
export function AdminNav() {
  const path = usePathname();
  if (path === "/admin/ingresar") return null;
  return (
    <nav className="admin-nav" aria-label="Secciones del panel">
      <div className="wrap tabs">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={l.match(path) ? "page" : undefined}>
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

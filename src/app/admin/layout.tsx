import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { logout } from "./actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { LogoMark } from "@/components/icons";
import { SESSION_COOKIE, verifyAdminToken } from "@/lib/admin-auth";

// El panel nunca se indexa.
export const metadata: Metadata = { title: { default: "Panel", template: "%s · Panel" }, robots: { index: false, follow: false } };

/** Barra propia del panel: lo justo para trabajar (marca, volver a la tienda, salir). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const signedIn = await verifyAdminToken((await cookies()).get(SESSION_COOKIE)?.value);
  // El panel siempre usa el tema base (oscuro), elija la tienda el que elija: es una herramienta de trabajo.
  return (
    <div className="admin-root" data-theme="escenario">
      <header className="admin-bar">
        <div className="wrap">
          <Link className="logo" href={signedIn ? "/admin" : "/"} aria-label="Panel de guías">
            <LogoMark />
            <b>
              VOLT <i>Panel</i>
            </b>
          </Link>
          <nav className="row-wrap" aria-label="Panel">
            <Link className="textbtn" href="/" target="_blank">
              Ver tienda ↗
            </Link>
            {signedIn && (
              <form action={logout}>
                <button type="submit" className="textbtn">
                  Cerrar sesión
                </button>
              </form>
            )}
          </nav>
        </div>
      </header>
      {signedIn && <AdminNav />}
      <div className="wrap admin">{children}</div>
    </div>
  );
}

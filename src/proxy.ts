import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyAdminToken } from "@/lib/admin-auth";

/**
 * Filtro optimista del panel: solo mira la cookie firmada (sin base de datos) y manda a ingresar.
 * Cada página y acción del panel vuelve a verificar la sesión (requireAdmin).
 */
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/ingresar") return NextResponse.next();
  const ok = await verifyAdminToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();
  const url = new URL("/admin/ingresar", request.url);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};

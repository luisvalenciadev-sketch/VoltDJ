import { SITE } from "@/config/store";
import { getSession } from "@/lib/admin-auth";
import { exportCatalogCsv, templateCsv } from "@/lib/catalog-import";
import { catalogStore } from "@/lib/catalog-store";

/** Descarga del catálogo completo (o la plantilla vacía) en CSV para Excel. */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return new Response("Tu sesión expiró. Vuelve a ingresar al panel.", { status: 401 });
  if (session.role !== "dueno") return new Response("Tu usuario no tiene permiso para exportar el catálogo.", { status: 403 });
  const template = new URL(request.url).searchParams.has("plantilla");
  const day = new Date().toISOString().slice(0, 10);
  const body = template ? templateCsv() : exportCatalogCsv(await catalogStore().snapshot(), SITE.url);
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${template ? "plantilla-productos" : `catalogo-${day}`}.csv"`,
      "cache-control": "no-store",
    },
  });
}

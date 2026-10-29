import type { Metadata } from "next";
import { ImportWizard } from "@/components/admin/CatalogForms";
import { requireOwner } from "@/lib/admin-auth";
import { MAX_IMPORT_ROWS, TEMPLATE_COLUMNS } from "@/lib/catalog-import";
import { catalogStore } from "@/lib/catalog-store";
import { uploadMode } from "@/lib/media";

export const metadata: Metadata = { title: "Importar y exportar" };

export default async function ImportPage() {
  await requireOwner();
  const store = catalogStore();
  return (
    <>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Catálogo</span>
          <h1 className="disp">Importar y exportar</h1>
          <p className="note">Carga o actualiza cientos de productos desde Excel. Hasta {MAX_IMPORT_ROWS} filas por archivo.</p>
        </div>
      </div>
      {!store.writable && (
        <div className="alert warn">
          <div>
            <b>Falta conectar la base de datos</b>
            <p>Puedes descargar la plantilla y el catálogo, pero no importar.</p>
          </div>
        </div>
      )}

      <section className="aform-sec">
        <h2>Descargas</h2>
        <div className="row-wrap">
          <a className="btn btn-secondary" href="/admin/exportar?plantilla=1" download>
            Plantilla vacía (CSV)
          </a>
          <a className="btn btn-secondary" href="/admin/exportar" download>
            Exportar mi catálogo (CSV)
          </a>
        </div>
        <details className="admin-acc">
          <summary>Cómo llenar la plantilla</summary>
          <ul className="help-list">
            <li>
              Columnas: <span className="mono">{TEMPLATE_COLUMNS.join(", ")}</span>.
            </li>
            <li>
              Cada producto se reconoce por su <b>sku</b>. Si ya existe, se actualiza; si no, se crea. Una celda vacía no cambia ese dato.
            </li>
            <li>
              <b>estado</b>: publicado, borrador o archivado. Los productos nuevos sin estado quedan como borrador.
            </li>
            <li>
              <b>stock</b>: un número, o “sin control”. <b>bajo_pedido</b> y <b>destacado</b>: sí o no.
            </li>
            <li>
              <b>especificaciones</b>: “Potencia: 1000 W | Woofer: 15&quot;”. <b>fotos</b>: direcciones web separadas por “|”; solo se descargan para productos que todavía no tienen fotos.
            </li>
            <li>Si la marca o la categoría no existe, se crea.</li>
            <li>Para editar todo el catálogo: exporta, cambia en Excel y vuelve a importar el mismo archivo.</li>
          </ul>
        </details>
        <details className="admin-acc">
          <summary>Pasar desde WooCommerce</summary>
          <ul className="help-list">
            <li>En WordPress: Productos → Exportar → “Generar CSV” con todas las columnas.</li>
            <li>Se importan nombre, SKU, precios, stock, categoría, marca, descripción, estado y fotos.</li>
            <li>Los productos con variaciones (colores, tamaños) llegan como productos separados.</li>
            <li>Las fotos se descargan de la tienda vieja: debe seguir en línea mientras importas.</li>
          </ul>
        </details>
      </section>

      <ImportWizard writable={store.writable} mode={uploadMode()} />
    </>
  );
}

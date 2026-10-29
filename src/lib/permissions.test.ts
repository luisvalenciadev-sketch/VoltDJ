import { describe, expect, it } from "vitest";
import { canOpen } from "./permissions";

describe("permisos del panel", () => {
  it("el dueño abre todo", () => {
    for (const p of ["/admin", "/admin/productos", "/admin/configuracion", "/admin/usuarios", "/admin/historial"]) expect(canOpen("dueno", p)).toBe(true);
  });

  it("el asesor solo abre guías, inventario y su cuenta", () => {
    for (const p of ["/admin", "/admin/guias/nueva", "/admin/guias/VD-ABCD-1234", "/admin/inventario", "/admin/cuenta"]) expect(canOpen("asesor", p)).toBe(true);
    for (const p of ["/admin/productos", "/admin/productos/x", "/admin/promociones", "/admin/configuracion", "/admin/contenido", "/admin/usuarios", "/admin/historial", "/admin/importar", "/admin/guiasx"]) {
      expect(canOpen("asesor", p), p).toBe(false);
    }
  });
});

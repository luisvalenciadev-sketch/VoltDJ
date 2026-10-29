/**
 * Roles del panel. El dueño hace todo. El asesor atiende pedidos: guías e inventario (ajustar stock),
 * sin tocar precios, catálogo, promociones, marca, contenido ni usuarios.
 * Lógica pura: la usan el menú (qué mostrar) y el servidor (qué permitir).
 */
export type Role = "dueno" | "asesor";
export const ROLE_LABEL: Record<Role, string> = { dueno: "Dueño", asesor: "Asesor" };
export const ROLE_HINT: Record<Role, string> = {
  dueno: "Todo el panel: catálogo, precios, promociones, configuración, contenido y usuarios.",
  asesor: "Pedidos y guías, e inventario (ajustar stock). No cambia precios, catálogo, promociones, marca, contenido ni usuarios.",
};

/** Rutas del panel que el asesor puede abrir. Todo lo demás es solo del dueño. */
const ASESOR_PATHS = [/^\/admin$/, /^\/admin\/guias(\/|$)/, /^\/admin\/inventario(\/|$)/, /^\/admin\/cuenta$/];

export function canOpen(role: Role, path: string): boolean {
  return role === "dueno" || ASESOR_PATHS.some((re) => re.test(path));
}

export const isRole = (v: unknown): v is Role => v === "dueno" || v === "asesor";

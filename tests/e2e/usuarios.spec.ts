import { expect, test, type Browser, type Page } from "@playwright/test";
import { TEST_ADMIN_PASSWORD } from "../../playwright.config";

/*
 * Usuarios y roles. Corre al final de todo: crear el primer dueño apaga la contraseña única, con la que
 * entran las demás pruebas del panel. Las pruebas van en orden y comparten los usuarios creados.
 */
// Sin reintentos: reintentar repetiría el grupo entero, y el primer dueño no se puede crear dos veces.
test.describe.configure({ mode: "serial", retries: 0 });

const OWNER = { name: "Dueña Prueba", email: "duena@prueba.co", password: "clave de la duena 2026" };
const ADVISOR = { name: "Asesor Prueba", email: "asesor@prueba.co", password: "clave del asesor 2026" };

async function go(page: Page, url: string) {
  await page.goto(url);
  await page.waitForFunction(() => !document.querySelector("div[hidden][id^=\"S:\"]"));
}

async function loginAs(browser: Browser, who: { email: string; password: string }) {
  const page = await (await browser.newContext()).newPage();
  await go(page, "/admin/ingresar");
  await page.getByLabel("Correo").fill(who.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(who.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });
  return page;
}

test("con la contraseña única se crea el primer dueño y esa contraseña deja de servir", async ({ page }) => {
  await go(page, "/admin/ingresar");
  await page.getByLabel("Contraseña del panel").fill(TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });
  await expect(page.getByText("Entraste con la contraseña única")).toBeVisible();

  await page.getByRole("link", { name: "Crea tu usuario de dueño" }).click();
  await page.getByLabel("Nombre").fill(OWNER.name);
  await page.getByLabel("Correo").fill(OWNER.email);
  await page.getByLabel("Contraseña inicial").fill(OWNER.password);
  await page.getByRole("button", { name: "Crear mi usuario de dueño" }).click();
  await expect(page.getByText("Listo: ya eres el dueño.")).toBeVisible({ timeout: 15_000 });
  // Sigue adentro, ahora como la dueña.
  await expect(page.getByRole("link", { name: `${OWNER.name} · Dueño` })).toBeVisible();

  const other = await (await page.context().browser()!.newContext()).newPage();
  await go(other, "/admin/ingresar");
  await expect(other.getByLabel("Correo")).toBeVisible();
  await other.getByLabel("Correo").fill("cualquiera@prueba.co");
  await other.getByLabel("Contraseña", { exact: true }).fill(TEST_ADMIN_PASSWORD);
  await other.getByRole("button", { name: "Ingresar" }).click();
  await expect(other.getByText("Correo o contraseña incorrectos.")).toBeVisible();
});

test("el dueño crea un asesor, que solo ve pedidos, guías e inventario", async ({ browser }) => {
  const owner = await loginAs(browser, OWNER);
  await go(owner, "/admin/usuarios");
  await owner.getByText("+ Nuevo usuario").click();
  await owner.getByLabel("Nombre").last().fill(ADVISOR.name);
  await owner.getByLabel("Correo").last().fill(ADVISOR.email);
  await owner.getByLabel("Contraseña inicial").fill(ADVISOR.password);
  await owner.locator("#u-new-asesor").check({ force: true });
  await owner.getByRole("button", { name: "Crear usuario" }).click();
  await expect(owner.getByText("Usuario creado.")).toBeVisible({ timeout: 15_000 });

  const advisor = await loginAs(browser, ADVISOR);
  const nav = advisor.getByRole("navigation", { name: "Secciones del panel" });
  await expect(nav.getByRole("link")).toHaveText(["Pedidos y guías", "Inventario"]);
  await go(advisor, "/admin/productos");
  await expect(advisor).toHaveURL(/\/admin\?permiso=0$/);
  await expect(advisor.getByText("Tu usuario de asesor no puede abrir esa sección.")).toBeVisible();
  // Lo que sí puede: ajustar stock.
  await go(advisor, "/admin/inventario?ver=todos&q=DDJ-FLX6-GT");
  const row = advisor.locator(".stock-row", { hasText: "DDJ-FLX6-GT" });
  await row.getByRole("radio", { name: "Fijar en" }).click();
  await row.getByLabel("Cantidad").fill("9");
  await row.getByLabel("Nota").fill("Conteo del sábado");
  await row.getByRole("button", { name: "Aplicar" }).click();
  await expect(row.locator(".qe-msg")).toHaveText("Stock actualizado: 9 unidades.");
  // Y no puede exportar ni subir archivos aunque conozca la dirección.
  expect((await advisor.request.get("/admin/exportar")).status()).toBe(403);
});

test("el historial muestra quién cambió qué y deja deshacer un cambio de precio", async ({ browser, page }) => {
  const owner = await loginAs(browser, OWNER);
  await go(owner, "/admin/productos?q=DDJ-FLX6-GT");
  const row = owner.locator(".pl-row", { hasText: "Pioneer DJ DDJ-FLX6-GT" });
  await expect(row).toHaveCount(1);
  await row.getByLabel("Precio de Pioneer DJ DDJ-FLX6-GT").fill("3500000");
  await row.getByRole("button", { name: "Guardar" }).click();
  await expect(row.locator(".qe-msg")).toHaveText("✓");

  await go(owner, "/admin/historial");
  const table = owner.locator("table.history");
  await expect(table).toContainText(`${ADVISOR.name}`);
  await expect(table).toContainText("Pioneer DJ DDJ-FLX6-GT: 1 unidad → 9 unidades (Conteo del sábado)");
  const price = table.locator("tr", { hasText: "precio $ 3.100.000 → $ 3.500.000" });
  await expect(price).toContainText(OWNER.name);
  await price.getByRole("button", { name: /Deshacer/ }).click();
  // La fila queda tachada con quién lo deshizo, y el deshacer queda registrado arriba.
  await expect(price).toContainText(`deshecho por ${OWNER.name}`, { timeout: 15_000 });
  await expect(table.locator("tr").nth(1)).toContainText("Deshizo el cambio de precio de Pioneer DJ DDJ-FLX6-GT");

  await go(page, "/producto/pioneer-dj-ddj-flx6-gt");
  // De vuelta a $ 3.100.000 (con el 15 % de temporada: $ 2.635.000).
  await expect(page.locator(".buy .price b")).toHaveText("$ 2.635.000");
});

test("al desactivar al asesor, su sesión abierta deja de valer", async ({ browser }) => {
  const advisor = await loginAs(browser, ADVISOR);
  const owner = await loginAs(browser, OWNER);
  await go(owner, "/admin/usuarios");
  const item = owner.locator("details.editor", { hasText: ADVISOR.email });
  await item.locator("summary").click();
  await item.getByLabel(/^Activo/).uncheck();
  await item.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(item.getByText("Usuario guardado.")).toBeVisible({ timeout: 15_000 });

  await go(advisor, "/admin/inventario");
  await expect(advisor).toHaveURL(/\/admin\/ingresar$/);
});

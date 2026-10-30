import { expect, test, type Page } from "@playwright/test";
import { TEST_ADMIN_PASSWORD } from "../../playwright.config";

/*
 * Correos de la tienda con el proveedor "memoria" (EMAIL_PROVIDER=memoria en las pruebas): se guardan en
 * memoria del servidor en lugar de enviarse, y el panel los muestra en "Últimos correos".
 */
test.describe.configure({ mode: "serial" });

async function go(page: Page, url: string) {
  await page.goto(url);
  await page.waitForFunction(() => !document.querySelector("div[hidden][id^=\"S:\"]"));
}

async function login(page: Page) {
  await go(page, "/admin/ingresar");
  await page.getByLabel("Contraseña del panel").fill(TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });
}

const mailLog = (page: Page) => page.locator(".mail-log");

test("el panel muestra el proveedor conectado y envía un correo de prueba", async ({ page }) => {
  await login(page);
  await go(page, "/admin/configuracion?s=notificaciones");
  await expect(page.getByText("Conectado con Memoria (pruebas)")).toBeVisible();
  await page.getByLabel("Enviar un correo de prueba a").fill("duena@prueba.co");
  await page.getByRole("button", { name: "Enviar prueba" }).click();
  await expect(page.getByText("Listo: revisa la bandeja de duena@prueba.co")).toBeVisible({ timeout: 15_000 });
  await go(page, "/admin/configuracion?s=notificaciones");
  await expect(mailLog(page)).toContainText("Correo de prueba a d***@prueba.co");
});

test("una guía con correo le escribe al cliente al confirmarse y al enviarse, y avisa al dueño si se agota", async ({ page }) => {
  await login(page);
  await go(page, "/admin/guias/nueva");
  await page.getByLabel("Nombre del cliente *").fill("Cliente Correo");
  await page.getByLabel("Correo del cliente (opcional)").fill("cliente@prueba.co");
  await page.getByLabel("Agregar producto *").selectOption("pioneer-dj-ddj-rx");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await page.getByRole("button", { name: "Crear guía" }).click();
  await expect(page.getByText("Le escribimos a cliente@prueba.co con la confirmación.")).toBeVisible({ timeout: 15_000 });
  const code = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();

  await page.getByText("Otro estado o calendario").click();
  await page.getByRole("tab", { name: /Manual/ }).click();
  await page.locator(".status-picks").getByText("Enviado", { exact: true }).click();
  await page.getByRole("button", { name: "Cambiar estado" }).click();
  await expect(page.getByText("Estado actualizado. Le escribimos a cliente@prueba.co.")).toBeVisible({ timeout: 15_000 });

  await go(page, "/admin/configuracion?s=notificaciones");
  await expect(mailLog(page)).toContainText(`"Tu pedido ${code} va en camino" a c***@prueba.co`);
  await expect(mailLog(page)).toContainText(`"Tu pedido ${code} está confirmado" a c***@prueba.co`);
  // El DDJ-RX tenía 1 unidad: el pedido lo agota y el dueño recibe el aviso.
  await expect(mailLog(page)).toContainText('"Se agotó: Pioneer DJ DDJ-RX"');
});

test("un aviso desactivado no se envía", async ({ page }) => {
  await login(page);
  await go(page, "/admin/configuracion?s=notificaciones");
  await page.getByLabel("Pedido confirmado (al crear la guía)").uncheck();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Guardado. Ya se ve en la tienda.")).toBeVisible({ timeout: 15_000 });

  await go(page, "/admin/guias/nueva");
  await page.getByLabel("Nombre del cliente *").fill("Sin Aviso");
  await page.getByLabel("Correo del cliente (opcional)").fill("sinaviso@prueba.co");
  await page.getByLabel("Agregar producto *").selectOption("pioneer-dj-ddj-flx2");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await page.getByRole("button", { name: "Crear guía" }).click();
  await expect(page.getByText(/^Guía creada\./)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Le escribimos a sinaviso@prueba.co")).toHaveCount(0);
});

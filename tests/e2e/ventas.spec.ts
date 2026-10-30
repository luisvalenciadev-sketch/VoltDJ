import { expect, test, type Page } from "@playwright/test";
import { TEST_ADMIN_PASSWORD } from "../../playwright.config";

// Cambian promociones, pagos y envíos de toda la tienda: una prueba tras otra, después de las de la tienda.
test.describe.configure({ mode: "serial" });

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

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

async function saveSettings(page: Page) {
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Guardado. Ya se ve en la tienda.")).toBeVisible({ timeout: 15_000 });
}

test("una promoción de un producto mejora su precio, se puede pausar y una programada no aplica todavía", async ({ page, context }) => {
  await login(page);
  const name = `Remate RX ${uid()}`;
  await go(page, "/admin/promociones");
  // La promoción con la que nació la tienda ya está en la lista.
  await expect(page.locator("details.editor summary", { hasText: "Promoción de temporada" })).toContainText("Vigente");

  const nueva = page.locator("details.editor", { hasText: "+ Nueva promoción" });
  await nueva.locator("summary").click();
  await nueva.getByLabel("Nombre *").fill(name);
  await nueva.getByLabel("Descuento (%) *").fill("40");
  await expect(nueva.getByText("queda en $ 600.000")).toBeVisible();
  await nueva.getByText("Un producto", { exact: true }).click();
  await nueva.getByLabel("Producto *").fill("Pioneer DJ DDJ-RX · DDJ-RX");
  await nueva.getByRole("button", { name: "Crear promoción" }).click();
  await expect(nueva.getByText("Promoción guardada.")).toBeVisible({ timeout: 15_000 });

  const shop = await context.newPage();
  await go(shop, "/producto/pioneer-dj-ddj-rx");
  // 40 % gana sobre el 15 % de toda la tienda: $ 4.000.000 → $ 2.400.000.
  await expect(shop.locator(".pdp .price b").first()).toHaveText("$ 2.400.000");

  await go(page, "/admin/promociones");
  const row = page.locator("details.editor", { hasText: name });
  await expect(row).toHaveCount(1);
  await row.locator("summary").click();
  await row.getByRole("button", { name: "Pausar" }).click();
  await expect(row.locator("summary")).toContainText("Pausada", { timeout: 15_000 });
  await go(shop, "/producto/pioneer-dj-ddj-rx");
  await expect(shop.locator(".pdp .price b").first()).toHaveText("$ 3.400.000");

  // Programada para dentro de un año: aparece en el panel, no en la tienda.
  const later = page.locator("details.editor", { hasText: "+ Nueva promoción" });
  await later.locator("summary").click();
  await later.getByLabel("Nombre *").fill(`Futura ${uid()}`);
  await later.getByLabel("Descuento (%) *").fill("50");
  const nextYear = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
  await later.getByLabel("Empieza").fill(nextYear);
  await later.getByRole("button", { name: "Crear promoción" }).click();
  await expect(later.getByText("Promoción guardada.")).toBeVisible({ timeout: 15_000 });
  await go(page, "/admin/promociones");
  await expect(page.locator("details.editor summary", { hasText: "Futura" })).toContainText("Programada");
  await go(shop, "/producto/pioneer-dj-ddj-rx");
  await expect(shop.locator(".pdp .price b").first()).toHaveText("$ 3.400.000");
});

test("los medios de pago activos y las cuotas se ven en la ficha, en Envíos y pagos y en el pedido", async ({ page, context }) => {
  await login(page);
  await go(page, "/admin/configuracion?s=pagos");
  const addi = page.locator(".pay-edit li", { hasText: "Addi" });
  await addi.getByRole("checkbox").check();
  await addi.getByLabel("Máximo de cuotas").fill("6");
  await addi.getByLabel("Instrucciones para el cliente").fill("Lo solicitas con tu cédula y te aprueban en minutos.");
  await expect(page.locator(".preview")).toContainText("Desde $ 250.000 al mes con Addi");
  await saveSettings(page);

  const shop = await context.newPage();
  await go(shop, "/producto/pioneer-dj-ddj-flx6-gt");
  // $ 3.100.000 con 15 % = $ 2.635.000 → 6 cuotas de $ 440.000 (redondeado al millar hacia arriba).
  await expect(shop.locator(".installments")).toContainText("Desde $ 440.000 al mes con Addi");
  await expect(shop.getByText(/Pagos: .*Addi \(hasta 6 cuotas\)/)).toBeVisible();
  await go(shop, "/envios-y-garantias");
  await expect(shop.locator("#pagos")).toContainText("Lo solicitas con tu cédula");
});

test("las zonas de envío se eligen en el pedido y llegan en el mensaje", async ({ page, context }) => {
  await login(page);
  await go(page, "/admin/configuracion?s=envios");
  await page.getByRole("button", { name: "+ Agregar zona" }).click();
  await page.getByLabel("Zona 1", { exact: true }).fill("Ibagué");
  await page.getByLabel("Tiempo de entrega de la zona 1").fill("1 día hábil");
  await page.getByLabel("Costo de la zona 1").fill("10000");
  await page.getByLabel(/Despachamos el mismo día/).check();
  await saveSettings(page);

  const shop = await context.newPage();
  await go(shop, "/envios-y-garantias");
  await expect(shop.locator("table.zones")).toContainText("Ibagué");
  await expect(shop.getByText("Pide antes de las 2:00 p. m. y despachamos el mismo día en Ibagué.")).toBeVisible();

  await shop.evaluate(() => localStorage.setItem("voltdj.cart.v1", JSON.stringify([{ id: "pioneer-dj-ddj-400", qty: 1, seenPrice: 850000 }])));
  await go(shop, "/carrito");
  await shop.getByLabel("¿A dónde lo enviamos?").selectOption({ label: "Ibagué" });
  const preview = shop.getByTestId("message-preview");
  await expect(preview).toContainText("Envío a Ibagué: 1 día hábil, envío $ 10.000.");
  await expect(preview).toContainText("Medios de pago de la tienda: Transferencia bancaria, Addi (hasta 6 cuotas).");

  // El pedido enviado queda en el panel y se convierte en guía con el mismo código, sin reescribir datos.
  const name = `Pedido Web ${uid()}`;
  await shop.getByLabel("Nombre y apellido *").fill(name);
  await shop.getByLabel("Celular (WhatsApp) *").fill("3001234567");
  await shop.getByLabel("Ciudad *").fill("Ibagué");
  await shop.getByLabel("Dirección de entrega").fill("Calle 10 # 5-20");
  const [popup] = await Promise.all([shop.waitForEvent("popup"), shop.getByTestId("send-whatsapp").click()]);
  await popup.close();
  const code = (await shop.getByTestId("order-code").textContent())!.trim();
  expect(code).toMatch(/^VD-[A-Z2-9]{4}-[A-Z2-9]{4}$/);

  await go(page, "/admin");
  await page.getByRole("link", { name: /^Borradores \d+$/ }).click();
  const row = page.locator(".guide-row[data-draft]", { hasText: code });
  await expect(row).toContainText(name);
  await expect(row).toContainText("Borrador");
  await expect(row).toContainText("$ 850.000");
  await row.click();
  await expect(page.getByRole("heading", { level: 1, name: `Guía del pedido ${code}` })).toBeVisible();
  await expect(page.getByLabel("Nombre del cliente *")).toHaveValue(name);
  await expect(page.getByLabel("Dirección de entrega")).toHaveValue("Calle 10 # 5-20");
  await expect(page.getByLabel("Costo de envío")).toHaveValue("10.000");
  await expect(page.locator(".order-lines")).toContainText("DDJ-400");
  await page.getByRole("button", { name: "Crear guía" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(code, { timeout: 15_000 });
  // Ya convertido, el pedido aparece una sola vez en "Todas": como guía, no como borrador.
  await go(page, `/admin?ver=todas&q=${code}`);
  await expect(page.locator(".guide-row", { hasText: code })).toHaveCount(1);
  await expect(page.locator(".guide-row[data-draft]", { hasText: code })).toHaveCount(0);
});

test("una guía con productos aparta el stock y al cancelarla lo devuelve", async ({ page }) => {
  await login(page);
  await go(page, "/admin/inventario?ver=todos&q=DDJ-1000");
  const row = page.locator(".stock-row", { hasText: "DDJ-1000" });
  await expect(row).toHaveCount(1);
  await row.getByRole("radio", { name: "Fijar en" }).click();
  await row.getByLabel("Cantidad").fill("5");
  await row.getByRole("button", { name: "Aplicar" }).click();
  await expect(row.locator(".qe-msg")).toHaveText("Stock actualizado: 5 unidades.");

  await go(page, "/admin/guias/nueva");
  await page.getByLabel("Nombre del cliente *").fill("Inventario Prueba");
  await page.getByLabel("Agregar producto *").selectOption("pioneer-dj-ddj-1000");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await page.getByRole("button", { name: "Crear guía" }).click();
  await expect(page.getByText("Se apartaron 1 unidad del inventario.")).toBeVisible({ timeout: 15_000 });
  const code = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();

  await go(page, "/admin/inventario?producto=pioneer-dj-ddj-1000");
  const first = page.locator(".atable tbody tr").first();
  await expect(first).toContainText(code);
  await expect(first.locator("td.num").first()).toHaveText("-1");

  await go(page, `/admin/guias/${code}`);
  await page.getByText("Otro estado o calendario").click();
  // La guía nació en modo automático: cancelar es un cambio manual.
  await page.getByRole("tab", { name: /Manual/ }).click();
  await page.locator(".status-picks").getByText("Pedido cancelado", { exact: true }).click();
  await page.getByRole("button", { name: "Cambiar estado" }).click();
  await expect(page.getByText("Pedido cancelado. Las unidades volvieron al inventario.")).toBeVisible({ timeout: 15_000 });

  await go(page, "/admin/inventario?producto=pioneer-dj-ddj-1000");
  await expect(page.locator(".atable tbody tr").first().locator("td.num").first()).toHaveText("+1");
});

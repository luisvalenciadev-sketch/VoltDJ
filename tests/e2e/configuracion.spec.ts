import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { TEST_ADMIN_PASSWORD } from "../../playwright.config";

const PHOTO = path.join(__dirname, "../../public/img/productos/alphatheta-omnis-duo.aae5834d.webp");

// Cambian los datos de toda la tienda: una prueba tras otra y después de las pruebas de la tienda.
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

async function save(page: Page) {
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Guardado. Ya se ve en la tienda.")).toBeVisible({ timeout: 15_000 });
}

test("sin sesión, la configuración pide contraseña", async ({ page }) => {
  await go(page, "/admin/configuracion");
  await expect(page).toHaveURL(/\/admin\/ingresar$/);
});

test("los datos de la tienda cambian la cabecera, el pie, la portada y el contacto", async ({ page, context }) => {
  await login(page);
  await go(page, "/admin/configuracion");
  await page.getByLabel("WhatsApp de pedidos").fill("12345");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.locator(".aform-bar .alert")).toContainText("El WhatsApp debe ser");

  await page.getByLabel("WhatsApp de pedidos").fill("+57 000 000 0000");
  await page.getByLabel("Nombre de la tienda *").fill("Sonido Prueba");
  await page.getByLabel("Eslogan").fill("Suena fuerte. Vende más.");
  await page.getByLabel("Teléfono para llamadas").fill("601 555 0101");
  await page.getByRole("button", { name: "+ Agregar red" }).click();
  await page.getByLabel("Nombre de la red 2").fill("TikTok @sonidoprueba");
  await page.getByLabel("Enlace de la red 2").fill("https://www.tiktok.com/@sonidoprueba");
  await save(page);
  // Lo guardado se conserva en el formulario.
  await expect(page.getByLabel("Nombre de la tienda *")).toHaveValue("Sonido Prueba");

  const shop = await context.newPage();
  await go(shop, "/");
  await expect(shop.getByRole("heading", { level: 1 })).toContainText("Vende más.");
  await expect(shop.getByRole("link", { name: "Sonido Prueba, ir al inicio" }).first()).toBeVisible();
  await go(shop, "/contacto");
  await expect(shop.getByRole("link", { name: "601 555 0101", exact: true })).toBeVisible();
  await expect(shop.getByRole("link", { name: "TikTok @sonidoprueba" }).first()).toBeVisible();
  // El número se guardó con indicativo y el botón de WhatsApp lo usa.
  await expect(shop.getByRole("link", { name: "Escribir por WhatsApp" })).toHaveAttribute("href", /wa\.me\/570000000000\?text=Hola%20Sonido%20Prueba/);
});

test("el color de marca exige contraste, sugiere un tono legible y se aplica a la tienda", async ({ page, context }) => {
  await login(page);
  await go(page, "/admin/configuracion?s=marca");
  await page.getByLabel("Código del color").fill("#c8102e");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.locator(".aform-bar .alert")).toContainText("no se lee sobre el fondo oscuro");

  await page.getByRole("button", { name: /el mismo tono legible/ }).click();
  const accent = (await page.getByLabel("Código del color").inputValue()).toLowerCase();
  expect(accent).not.toBe("#c8102e");

  await page.locator(".field", { hasText: "Logo para fondo oscuro" }).locator('input[type="file"]').setInputFiles(PHOTO);
  await expect(page.locator(".bp-bar img")).toBeVisible({ timeout: 15_000 });
  await save(page);

  const shop = await context.newPage();
  await go(shop, "/");
  expect(await shop.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim())).toBe(accent);
  await expect(shop.locator(".hdr .logo-img img")).toHaveAttribute("alt", "Sonido Prueba");
});

test("las políticas y el texto legal se editan desde el panel", async ({ page, context }) => {
  await login(page);
  await go(page, "/admin/configuracion?s=politicas");
  await page.getByLabel("Resumen").first().fill("Envío gratis en Ibagué; al resto del país, según la transportadora.");
  await page.getByLabel("Términos y condiciones").fill("## Garantía extendida\nTodos los parlantes tienen:\n\n- 24 meses de garantía\n- Revisión gratis");
  await page.getByRole("button", { name: "Vista previa" }).nth(1).click();
  await expect(page.locator(".policy-preview h2")).toHaveText("Garantía extendida");
  await save(page);

  const shop = await context.newPage();
  await go(shop, "/terminos");
  await expect(shop.getByRole("heading", { name: "Garantía extendida" })).toBeVisible();
  await expect(shop.getByText("24 meses de garantía")).toBeVisible();
  await expect(shop.getByText("Texto legal pendiente")).toHaveCount(0);
  await go(shop, "/producto/pioneer-dj-cdj-3000");
  await expect(shop.getByText("Envío gratis en Ibagué; al resto del país, según la transportadora.")).toBeVisible();
});

test("el SEO cambia el título de la portada", async ({ page, context }) => {
  await login(page);
  await go(page, "/admin/configuracion?s=seo");
  await page.getByLabel("Título").fill("Sonido Prueba · Parlantes y DJ en Ibagué");
  await expect(page.locator(".serp-title")).toHaveText("Sonido Prueba · Parlantes y DJ en Ibagué");
  await save(page);

  const shop = await context.newPage();
  await go(shop, "/");
  await expect(shop).toHaveTitle("Sonido Prueba · Parlantes y DJ en Ibagué");
});

test("el tema elegido se aplica a toda la tienda y el panel sigue oscuro", async ({ page, context }) => {
  await login(page);
  await go(page, "/admin/configuracion?s=diseno");
  await page.locator(".theme-card", { hasText: "Vitrina" }).click();
  await expect(page.getByRole("radio", { name: /Vitrina/ })).toBeChecked();
  await save(page);
  await expect(page.locator(".theme-card", { hasText: "Vitrina" }).getByText("En uso")).toBeVisible();
  // El panel no adopta el tema de la tienda.
  await expect(page.locator(".admin-root")).toHaveCSS("background-color", "rgb(16, 17, 20)");

  const shop = await context.newPage();
  await go(shop, "/catalogo");
  await expect(shop.locator("html")).toHaveAttribute("data-theme", "vitrina");
  await expect(shop.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  // El acento guardado antes (pensado para fondo oscuro) se oscurece solo para leerse sobre blanco.
  const accent = await shop.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim());
  expect(accent).toMatch(/^#[0-9a-f]{6}$/);
});

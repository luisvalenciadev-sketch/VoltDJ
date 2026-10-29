import AxeBuilder from "@axe-core/playwright";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { TEST_ADMIN_PASSWORD } from "../../playwright.config";

const PHOTO = path.join(__dirname, "../../public/img/productos/alphatheta-omnis-duo.aae5834d.webp");

// Cambian el inicio de la tienda: una prueba tras otra y después de las pruebas de la tienda.
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

test("sin sesión, el contenido pide contraseña", async ({ page }) => {
  await go(page, "/admin/contenido");
  await expect(page).toHaveURL(/\/admin\/ingresar$/);
});

test("el texto de la portada y el orden de las secciones se editan desde el panel", async ({ page, context }) => {
  await login(page);
  await go(page, "/admin/contenido");
  await page.getByLabel("Párrafo").fill("Parlantes, consolas y luces para tu evento, con asesoría por WhatsApp.");
  await page.locator(".section-rows li", { hasText: "Marcas" }).getByRole("checkbox").uncheck();
  // Preguntas frecuentes, de última a primera.
  for (let i = 0; i < 9; i++) await page.getByRole("button", { name: "Subir Preguntas frecuentes" }).click();
  await expect(page.getByRole("button", { name: "Subir Preguntas frecuentes" })).toBeDisabled();
  await save(page);

  const shop = await context.newPage();
  await go(shop, "/");
  await expect(shop.getByText("Parlantes, consolas y luces para tu evento, con asesoría por WhatsApp.")).toBeVisible();
  await expect(shop.getByRole("heading", { name: "Las marcas de la cabina" })).toHaveCount(0);
  const order = await shop.locator("main h2").allTextContents();
  expect(order.indexOf("Preguntas frecuentes")).toBeLessThan(order.indexOf("Categorías"));
});

test("un banner con foto, título y botón aparece en el inicio", async ({ page, context }) => {
  await login(page);
  await go(page, "/admin/contenido?s=banners");
  await page.getByRole("button", { name: "+ Agregar banner" }).click();
  await page.locator(".content-row").first().locator('input[type="file"]').setInputFiles(PHOTO);
  await expect(page.locator(".content-row").first().locator(".img-thumb img")).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Título *").fill("Black Friday de parlantes");
  await page.getByLabel("Subtítulo").fill("Hasta 40 % en marcas seleccionadas.");
  await page.getByLabel("Texto del botón").fill("Ver ofertas");
  await page.getByLabel("El botón lleva a").fill("/ofertas");
  await save(page);

  const shop = await context.newPage();
  await go(shop, "/");
  const banner = shop.locator(".banner", { hasText: "Black Friday de parlantes" });
  await expect(banner.getByRole("heading", { level: 2 })).toHaveText("Black Friday de parlantes");
  await expect(banner.getByRole("link", { name: "Ver ofertas" })).toHaveAttribute("href", "/ofertas");
});

test("los videos de YouTube no cargan YouTube hasta darles play, y un MP4 subido se reproduce en la tienda", async ({ page, context }) => {
  await login(page);
  await go(page, "/admin/contenido?s=videos");
  await page.getByRole("button", { name: "+ Agregar video" }).click();
  await page.getByLabel("Título *").fill("Prueba de sonido en el local");
  await page.getByLabel("Enlace de YouTube").fill("https://youtube.com/shorts/dQw4w9WgXcQ");
  await page.getByRole("button", { name: "+ Agregar video" }).click();
  const second = page.locator(".content-row").nth(1);
  await second.getByLabel("Título *").fill("Bajos en el evento");
  await second.getByText("Subir MP4").click();
  await second.getByLabel("Subir video").setInputFiles({ name: "evento.mp4", mimeType: "video/mp4", buffer: Buffer.from("00000018667479706d703432", "hex") });
  await expect(second.getByText("Video cargado.")).toBeVisible({ timeout: 15_000 });
  await save(page);

  const shop = await context.newPage();
  await go(shop, "/");
  await expect(shop.getByRole("heading", { name: "Mira cómo suena" })).toBeVisible();
  await expect(shop.locator('iframe[src*="youtube"]')).toHaveCount(0);
  await shop.getByRole("button", { name: "Reproducir: Prueba de sonido en el local" }).click();
  await expect(shop.locator('iframe[src^="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"]')).toHaveCount(1);
  await expect(shop.locator('video[aria-label="Bajos en el evento"]')).toHaveAttribute("src", /\/media\/.+\.mp4$/);
});

test("las preguntas frecuentes y las reseñas se editan y se ven en la tienda", async ({ page, context }) => {
  await login(page);
  await go(page, "/admin/contenido?s=preguntas");
  await page.getByRole("button", { name: "+ Agregar pregunta" }).click();
  const last = page.locator(".content-row").last();
  await last.getByLabel("Pregunta", { exact: true }).fill("¿Alquilan sonido para eventos?");
  await last.getByLabel("Respuesta", { exact: true }).fill("Sí, con montaje y técnico. Escríbenos con la fecha y el lugar.");
  await save(page);

  await go(page, "/admin/contenido?s=resenas");
  await page.getByLabel("Calificación (1 a 5)").fill("4,8");
  await page.getByLabel("Número de reseñas").fill("126");
  await page.getByRole("button", { name: "+ Agregar reseña" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Andrés R.");
  await page.getByLabel("Reseña", { exact: true }).fill("Me asesoraron por WhatsApp y el parlante llegó al otro día.");
  await save(page);

  const shop = await context.newPage();
  await go(shop, "/preguntas-frecuentes");
  await expect(shop.getByText("¿Alquilan sonido para eventos?")).toBeVisible();
  await go(shop, "/");
  await expect(shop.locator(".rating-line")).toContainText("4,8 de 5 · 126 reseñas en Google");
  await expect(shop.getByText("Me asesoraron por WhatsApp y el parlante llegó al otro día.")).toBeVisible();
});

test("el inicio con banners, videos y reseñas pasa accesibilidad en un tema oscuro y en uno claro", async ({ page }) => {
  for (const tema of ["escenario", "vitrina"]) {
    await go(page, `/?tema=${tema}`);
    await expect(page.locator("html")).toHaveAttribute("data-theme", tema);
    await expect(page.locator(".banner").first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${tema} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
  }
});

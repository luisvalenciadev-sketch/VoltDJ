import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { TEST_ADMIN_PASSWORD } from "../../playwright.config";

const PHOTO = path.join(__dirname, "../../public/img/productos/alphatheta-omnis-duo.aae5834d.webp");
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/**
 * Navega y espera a que React termine de mostrar el contenido transmitido por streaming: mientras tanto, la
 * página existe dos veces (una copia oculta) y los localizadores estrictos encontrarían dos elementos.
 */
async function go(page: Page, url: string) {
  await page.goto(url);
  await page.waitForFunction(() => !document.querySelector("div[hidden][id^=\"S:\"]"));
}

async function login(page: Page) {
  await go(page, "/admin/ingresar");
  await page.getByLabel("Contraseña del panel").fill(TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  // La pantalla de ingreso también se titula "Guías de pedidos": se espera la redirección, no el título.
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });
  await expect(page.getByRole("navigation", { name: "Secciones del panel" })).toBeVisible();
}

/** Crea un producto publicado desde el formulario y devuelve su id (que es también su dirección web). */
async function createProduct(page: Page, opts: { name: string; sku: string; price: string; stock?: string; photo?: boolean }) {
  await go(page, "/admin/productos/nuevo");
  await page.getByLabel("Nombre *").fill(opts.name);
  await page.getByLabel("Marca *").selectOption({ label: "Electro-Voice" });
  await page.getByLabel("Categoría *").selectOption({ label: "Parlantes y bajos" });
  await page.getByLabel("Referencia (SKU)").fill(opts.sku);
  await page.getByLabel("Cifra clave").fill('15"');
  await page.getByRole("textbox", { name: "Precio", exact: true }).fill(opts.price);
  if (opts.photo) {
    await page.getByLabel("Subir fotos").setInputFiles(PHOTO);
    await expect(page.locator(".img-grid li")).toHaveCount(1, { timeout: 15_000 });
    await expect(page.locator(".img-cover")).toHaveText("Portada");
  }
  await page.getByLabel("Unidades en bodega").fill(opts.stock ?? "3");
  await page.locator(".mode-card", { hasText: "Publicado" }).click();
  await page.getByRole("button", { name: "Crear producto" }).click();
  await expect(page.getByText("Producto creado.")).toBeVisible({ timeout: 15_000 });
  return new URL(page.url()).pathname.split("/").pop()!;
}

test("sin sesión, el catálogo del panel pide contraseña", async ({ page }) => {
  await go(page, "/admin/productos");
  await expect(page).toHaveURL(/\/admin\/ingresar$/);
});

test("crear un producto con foto lo publica en la tienda con la promoción vigente", async ({ page, context }) => {
  await login(page);
  const id = uid();
  const name = `Cabina de prueba ${id}`;
  const slug = await createProduct(page, { name, sku: `E2E-${id}`, price: "1500000", photo: true });

  // La ficha del panel conserva lo guardado.
  await expect(page.getByLabel("Nombre *")).toHaveValue(name);
  await expect(page.locator(".img-grid li")).toHaveCount(1);

  const shop = await context.newPage();
  await go(shop, `/producto/${slug}`);
  await expect(shop.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(shop.locator(".gallery img").first()).toHaveAttribute("src", /media/);
  // 15 % de la promoción general, redondeado al millar.
  await expect(shop.getByText("$ 1.275.000").first()).toBeVisible();
  await expect(shop.getByRole("button", { name: /Añadir al carrito/ }).first()).toBeVisible();
});

test("la edición rápida cambia el precio y el stock desde la lista", async ({ page, context }) => {
  await login(page);
  const id = uid();
  const name = `Parlante rápido ${id}`;
  const slug = await createProduct(page, { name, sku: `QE-${id}`, price: "1000000" });

  await go(page, `/admin/productos?q=QE-${id}`);
  // Mientras la página llega por streaming, la fila existe un instante también en el bloque oculto: se espera una sola.
  const row = page.locator(".pl-row", { hasText: name });
  await expect(row).toHaveCount(1);
  await row.getByLabel(`Precio de ${name}`).fill("2000000");
  await row.getByLabel(`Stock de ${name}`).fill("7");
  await row.getByRole("button", { name: "Guardar" }).click();
  await expect(row.locator(".qe-msg")).toHaveText("✓");

  const shop = await context.newPage();
  await go(shop, `/producto/${slug}`);
  await expect(shop.getByText("$ 2.000.000").first()).toBeVisible();
});

test("agotar el stock en inventario deja el producto agotado en la tienda y queda en el historial", async ({ page, context }) => {
  await login(page);
  const id = uid();
  const name = `Bajo para agotar ${id}`;
  const slug = await createProduct(page, { name, sku: `AG-${id}`, price: "900000", stock: "2" });

  await go(page, `/admin/inventario?ver=todos&q=AG-${id}`);
  const row = page.locator(".stock-row", { hasText: name });
  await expect(row).toHaveCount(1);
  await row.getByRole("radio", { name: "Fijar en" }).click();
  await row.getByLabel("Cantidad").fill("0");
  await row.getByLabel("Nota").fill("Vendido en el local");
  await row.getByRole("button", { name: "Aplicar" }).click();
  await expect(row.locator(".qe-msg")).toHaveText("Stock actualizado: 0 unidades.");

  const shop = await context.newPage();
  await go(shop, `/producto/${slug}`);
  await expect(shop.getByText("Agotado").first()).toBeVisible();
  await expect(shop.getByRole("button", { name: /Añadir al carrito/ })).toHaveCount(0);

  await go(page, `/admin/inventario?producto=${slug}`);
  await expect(page.locator(".atable tbody tr").first()).toContainText("Vendido en el local");
  await expect(page.locator(".atable tbody tr").first().locator("td.num").first()).toHaveText("-2");
});

test("importar un CSV muestra los errores por fila antes de aplicar y crea lo válido", async ({ page, context }) => {
  await login(page);
  const id = uid();
  const csv = [
    "sku;nombre;marca;categoria;precio;stock;estado",
    `IMP-${id}-1;Parlante importado ${id};Marca E2E ${id};Parlantes y bajos;980000;4;publicado`,
    `IMP-${id}-2;;;;abc;;`,
  ].join("\n");

  await go(page, "/admin/importar");
  await page.getByLabel("Archivo CSV a importar").setInputFiles({ name: "productos.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.getByRole("heading", { name: "2. Revisa antes de importar" })).toBeVisible();
  await expect(page.locator(".kpis-4 div", { hasText: "Se crean" }).locator("dd")).toHaveText("1");
  await expect(page.locator(".kpis-4 div", { hasText: "Con errores" }).locator("dd")).toHaveText("1");
  await expect(page.getByText(`Marcas nuevas: Marca E2E ${id}.`)).toBeVisible();
  await expect(page.locator('tr[data-state="err"]')).toContainText("Precio inválido");

  await page.getByRole("button", { name: "Importar 1 productos" }).click();
  await expect(page.getByText("1 productos importados")).toBeVisible({ timeout: 20_000 });

  const shop = await context.newPage();
  await go(shop, `/producto/parlante-importado-${id}`);
  await expect(shop.getByRole("heading", { level: 1 })).toHaveText(`Parlante importado ${id}`);
});

test("la exportación descarga el catálogo en CSV para Excel", async ({ page }) => {
  await login(page);
  const res = await page.request.get("/admin/exportar");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  const body = await res.text();
  expect(body.startsWith("﻿sku;nombre;marca;categoria;precio")).toBe(true);
  expect(body).toContain("DDJ-FLX4;Pioneer DJ DDJ-FLX4");
});

test("una categoría con productos no se elimina, una nueva se crea y se puede ocultar", async ({ page }) => {
  await login(page);
  const id = uid();
  await go(page, "/admin/categorias");
  const nueva = page.locator("details.editor", { hasText: "+ Nueva categoría" });
  await nueva.locator("summary").click();
  await nueva.getByLabel("Nombre *").fill(`Luces ${id}`);
  await nueva.getByRole("button", { name: "Crear categoría" }).click();
  await expect(page.locator("details.editor summary", { hasText: `Luces ${id}` })).toBeVisible({ timeout: 15_000 });

  const controladores = page.locator("details.editor", { hasText: "Controladores" }).first();
  await controladores.locator("summary").click();
  await expect(controladores.getByText(/no se puede eliminar, solo ocultar/)).toBeVisible();
});

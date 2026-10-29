import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectInside(page: Page, outer: string, inner: string) {
  const o = (await page.locator(outer).boundingBox())!;
  const i = (await page.locator(inner).boundingBox())!;
  expect(i.x).toBeGreaterThanOrEqual(o.x);
  expect(i.x + i.width).toBeLessThanOrEqual(o.x + o.width + 0.5);
  expect(o.x + o.width).toBeLessThanOrEqual(page.viewportSize()!.width + 0.5);
}

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1366) < 900;

async function search(page: Page, term: string) {
  const input = page.locator(isMobile(page) ? "#q-mobile" : "#q-desktop");
  await input.fill(term);
  await input.press("Enter");
  await page.waitForURL(/\/buscar\?q=/);
}

test("flujo completo: categoría → producto → carrito → pedido por WhatsApp", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /^Controladores \d+ productos$/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Controladores" })).toBeVisible();

  await page.getByRole("link", { name: "Controlador DJ 2 canales con pads de rendimiento", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Controlador DJ 2 canales con pads de rendimiento");
  await page.getByRole("button", { name: "Aumentar cantidad" }).click();
  await page.getByRole("button", { name: "Añadir al carrito", exact: true }).click();
  await expect(page.locator(".toast")).toContainText("2 unidades añadidas al carrito");
  await expect(page.getByRole("link", { name: "Carrito, 2 unidades" })).toBeVisible();

  // Segundo producto desde la búsqueda.
  await search(page, "audifonos");
  await page.getByRole("link", { name: "Audífonos DJ cerrados y plegables", exact: true }).click();
  await page.getByRole("button", { name: "Añadir al carrito", exact: true }).click();

  await page.goto("/carrito");
  await expect(page.getByTestId("subtotal")).toHaveText("$ 3.970.000"); // 2 × 1.690.000 + 590.000
  // Persistencia tras recargar.
  await page.reload();
  await expect(page.getByTestId("subtotal")).toHaveText("$ 3.970.000");

  const line = page.getByRole("listitem").filter({ hasText: "Audífonos DJ" });
  await line.getByRole("button", { name: "Aumentar cantidad" }).click();
  await expect(page.getByTestId("subtotal")).toHaveText("$ 4.560.000");
  await expectInside(page, ".summary", ".summary .btn-primary");

  await page.getByRole("link", { name: "Revisar pedido" }).click();
  await page.getByLabel(/Ciudad de envío/).fill("Bogotá D.C.");
  const preview = page.getByTestId("message-preview");
  await expect(preview).toContainText("Ciudad de envío: Bogotá D.C.");

  await expectInside(page, ".summary", ".summary .btn-primary");
  const href = await page.getByTestId("send-whatsapp").getAttribute("href");
  const url = new URL(href!);
  expect(url.host).toBe("wa.me");
  expect(url.pathname).toBe("/570000000000");
  const text = url.searchParams.get("text")!;
  expect(text).toBe(await preview.textContent());
  expect(text).toContain("Controlador DJ 2 canales con pads de rendimiento\n   Ref.: VD-CTR-002\n   Cantidad: 2\n   Precio unitario: $ 1.690.000 · Total: $ 3.380.000");
  expect(text).toContain("Audífonos DJ cerrados y plegables\n   Ref.: VD-HP-500\n   Cantidad: 2");
  expect(text).toContain("Subtotal estimado: $ 4.560.000");
  expect(text).toMatch(/Pedido provisional: VD-\d{6}-[A-Z2-9]{4}/);
  expect(href).not.toMatch(/[\s\n]/);

  // Al pulsar se abre WhatsApp en otra pestaña; la tienda no afirma que el pedido fue recibido.
  const [popup] = await Promise.all([page.waitForEvent("popup"), page.getByTestId("send-whatsapp").click()]);
  await popup.close();
  await expect(page.getByText(/Abrimos WhatsApp con tu pedido VD-/)).toBeVisible();
  await expect(page.getByText(/pedido (recibido|confirmado)/i)).toHaveCount(0);
});

test("búsqueda sin resultados muestra estado vacío con salida", async ({ page }) => {
  await page.goto("/");
  await search(page, "sintetizador modular");
  await expect(page.getByText("No encontramos productos con esos criterios")).toBeVisible();
  await expect(page.getByRole("link", { name: "Preguntar por WhatsApp" })).toHaveAttribute("href", /wa\.me\/570000000000\?text=/);
});

test("filtros del catálogo se reflejan en la URL y en los resultados", async ({ page }) => {
  await page.goto("/catalogo");
  await expect(page.getByRole("status").filter({ hasText: "14 productos" })).toBeVisible();
  if (isMobile(page) || (page.viewportSize()?.width ?? 0) < 900) await page.getByRole("button", { name: /Filtros/ }).click();
  await page.getByLabel("Solo con precio promocional").check();
  await expect(page).toHaveURL(/promo=1/);
  await expect(page.getByRole("status").filter({ hasText: "4 productos" })).toBeVisible();
  await page.getByLabel("Orden").selectOption("precio-asc");
  await expect(page).toHaveURL(/orden=precio-asc/);
  await expect(page.locator(".card .name").first()).toHaveText("Soporte para laptop plegable");
  await page.getByRole("link", { name: "Quitar filtro Con promoción" }).click();
  await expect(page.getByRole("status").filter({ hasText: "14 productos" })).toBeVisible();
});

test("ofertas muestra solo productos con promoción real", async ({ page }) => {
  await page.goto("/ofertas");
  const cards = page.locator(".card");
  await expect(cards).toHaveCount(4);
  for (const card of await cards.all()) await expect(card.locator("s")).toHaveCount(1);
});

test("producto agotado no se puede añadir y ofrece consultar reposición", async ({ page }) => {
  await page.goto("/producto/monitores-estudio-5-pulgadas-par");
  await expect(page.getByText("Agotado por ahora")).toBeVisible();
  await expect(page.getByRole("button", { name: /Añadir/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Preguntar por reposición" })).toBeVisible();
});

test("producto inexistente devuelve 404", async ({ page }) => {
  const res = await page.goto("/producto/no-existe");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Página no encontrada" })).toBeVisible();
});

const PAGES = ["/", "/catalogo", "/catalogo/accesorios", "/producto/parlante-activo-12-pulgadas", "/carrito", "/pedido", "/contacto", "/envios-y-garantias", "/preguntas-frecuentes", "/privacidad", "/terminos"];

for (const path of PAGES) {
  test(`sin scroll horizontal ni errores de accesibilidad graves: ${path}`, async ({ page }) => {
    if (path === "/carrito" || path === "/pedido") {
      await page.goto("/");
      await page.evaluate(() => localStorage.setItem("voltdj.cart.v1", JSON.stringify([{ id: "p01", qty: 2, seenPrice: 1690000 }, { id: "p06", qty: 1, seenPrice: 2090000 }, { id: "p12", qty: 3, seenPrice: 45000 }])));
    }
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    // Lista los elementos que sobresalen del ancho de la ventana para que el fallo diga dónde está el problema.
    const offenders = await page.evaluate(() => {
      const max = document.documentElement.clientWidth;
      return [...document.querySelectorAll("body *")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.right <= max + 0.5) return false;
          // Ignora contenido dentro de contenedores con scroll horizontal propio.
          for (let p = el.parentElement; p; p = p.parentElement) if (getComputedStyle(p).overflowX !== "visible" && p !== document.body) return false;
          return true;
        })
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join(".")} → ${Math.round(el.getBoundingClientRect().right - max)}px`);
    });
    expect(offenders).toEqual([]);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

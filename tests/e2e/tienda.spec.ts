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
  await page.waitForURL("**/catalogo/controladores");
  await expect(page.getByRole("heading", { level: 1, name: "Controladores" })).toBeVisible();

  await page.getByRole("link", { name: "Pioneer DJ DDJ-FLX4", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pioneer DJ DDJ-FLX4");
  // Hay una sola unidad: no se puede pedir más de una.
  await expect(page.getByRole("button", { name: "Aumentar cantidad" })).toBeDisabled();
  await page.getByRole("button", { name: "Añadir al carrito", exact: true }).click();
  await expect(page.locator(".toast")).toContainText("Añadido al carrito");
  await expect(page.getByRole("link", { name: "Carrito, 1 unidad" })).toBeVisible();

  // Segundo producto desde la búsqueda.
  await search(page, "yamaha");
  await page.getByRole("link", { name: "Yamaha HS5", exact: true }).click();
  await page.getByRole("button", { name: "Añadir al carrito", exact: true }).click();

  await page.goto("/carrito");
  await expect(page.getByTestId("savings")).toHaveText("−$ 435.000");
  await expect(page.getByTestId("subtotal")).toHaveText("$ 2.465.000"); // 1.105.000 + 1.360.000 (precios de lista − 15 %)
  // Persistencia tras recargar.
  await page.reload();
  await expect(page.getByTestId("subtotal")).toHaveText("$ 2.465.000");
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
  expect(text).toContain("Pioneer DJ DDJ-FLX4\n   Ref.: DDJ-FLX4\n   Cantidad: 1\n   Precio unitario: $ 1.105.000 · Total: $ 1.105.000");
  expect(text).toContain("Yamaha HS5\n   Ref.: HS5\n   Cantidad: 1");
  expect(text).toContain("Precio normal: $ 1.300.000 (−15% de descuento)");
  expect(text).toContain("Descuento: −$ 435.000");
  expect(text).toContain("Subtotal estimado: $ 2.465.000");
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
  // Los filtros son inputs controlados por React: un clic antes de hidratar marca la casilla sin
  // disparar la navegación. Con varias pruebas en paralelo la hidratación tarda más.
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("status").filter({ hasText: "28 productos" })).toBeVisible();
  if (isMobile(page)) await page.getByRole("button", { name: /Filtros/ }).click();
  await page.getByRole("checkbox", { name: /^Pioneer DJ/ }).check();
  await expect(page).toHaveURL(/marca=pioneer-dj/);
  await expect(page.getByRole("status").filter({ hasText: "20 productos" })).toBeVisible();
  await page.getByLabel("Orden").selectOption("precio-asc");
  await expect(page).toHaveURL(/orden=precio-asc/);
  await expect(page.locator(".card .name").first()).toHaveText("Pioneer DJ DDJ-FLX2");
  await page.getByRole("link", { name: "Quitar filtro Pioneer DJ" }).click();
  await expect(page.getByRole("status").filter({ hasText: "28 productos" })).toBeVisible();
});

test("la promoción global del 15 % se anuncia y se aplica a todo el catálogo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Categorías" }).getByRole("link", { name: "Ofertas", exact: true })).toBeVisible();
  await expect(page.locator(".ticker .marquee-group:not([aria-hidden]) .tick.hot")).toHaveText("−15% en todo el catálogo");
  await page.goto("/producto/pioneer-dj-cdj-3000");
  await expect(page.locator(".buy .price b")).toHaveText("$ 8.500.000");
  await expect(page.locator(".buy .price s")).toContainText("$ 10.000.000");
  await page.goto("/ofertas");
  await expect(page.getByRole("status").filter({ hasText: "28 productos" })).toBeVisible();
});

test("las cintas infinitas se pueden pausar", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Pausar cinta de marcas" });
  await toggle.click();
  await expect(page.getByRole("button", { name: "Reanudar cinta de marcas" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".logos .marquee-track")).toHaveCSS("animation-play-state", "paused");
});

test("producto inexistente devuelve 404", async ({ page }) => {
  const res = await page.goto("/producto/no-existe");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Página no encontrada" })).toBeVisible();
});

const PAGES = ["/", "/catalogo", "/catalogo/controladores", "/producto/pioneer-dj-cdj-3000", "/carrito", "/pedido", "/contacto", "/envios-y-garantias", "/preguntas-frecuentes", "/privacidad", "/terminos"];

for (const path of PAGES) {
  test(`sin scroll horizontal ni errores de accesibilidad graves: ${path}`, async ({ page }) => {
    if (path === "/carrito" || path === "/pedido") {
      await page.goto("/");
      await page.evaluate(() => localStorage.setItem("voltdj.cart.v1", JSON.stringify([{ id: "pioneer-dj-xdj-rx2-edicion-limitada", qty: 1, seenPrice: 4500000 }, { id: "electro-voice-zlx-15p-g2", qty: 1, seenPrice: 2300000 }, { id: "pioneer-dj-ddj-flx2", qty: 1, seenPrice: 800000 }])));
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

test("la banda de destacados lleva a la ficha del producto", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  // Se hace clic sobre el texto "Ver producto", como lo haría una persona: debe navegar.
  const go = page.locator(".billboard .go").first();
  await go.scrollIntoViewIfNeeded();
  const box = (await go.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page).toHaveURL(/\/producto\/pioneer-dj-cdj-3000$/);
});

test("el visor del producto acerca, se restablece y abre en pantalla completa", async ({ page }) => {
  await page.goto("/producto/pioneer-dj-cdj-3000");
  await page.waitForLoadState("networkidle");
  const viewer = page.getByRole("group", { name: /Pioneer DJ CDJ-3000: vista interactiva/ });
  await expect(viewer).toBeVisible();
  await expect(page.getByRole("button", { name: "Alejar" })).toBeDisabled();
  await page.getByRole("button", { name: "Acercar" }).click();
  await expect(page.getByRole("button", { name: "Alejar" })).toBeEnabled();
  await page.getByRole("button", { name: "Restablecer vista" }).click();
  await expect(page.getByRole("button", { name: "Alejar" })).toBeDisabled();
  await page.getByRole("button", { name: "Ver en pantalla completa" }).click();
  const dialog = page.getByRole("dialog", { name: /pantalla completa/ });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

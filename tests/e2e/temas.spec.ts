import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/*
 * Cada tema pasa las mismas reglas que la tienda base: sin scroll horizontal y sin errores graves de
 * accesibilidad (contraste incluido). Se prueban con la vista previa (?tema=), que no toca lo guardado.
 * Escenario ya lo cubre tienda.spec.ts.
 */
const THEMES = ["vitrina", "estudio", "bodega", "barrio"];
const PAGES = ["/", "/catalogo/controladores", "/producto/pioneer-dj-cdj-3000", "/carrito"];

for (const theme of THEMES) {
  for (const path of PAGES) {
    test(`tema ${theme}: sin scroll horizontal ni errores de accesibilidad graves en ${path}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`${path}?tema=${theme}`);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.getByRole("status").filter({ hasText: "Vista previa" })).toBeVisible();
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}

test("la vista previa sigue al navegar y se puede quitar", async ({ page }) => {
  await page.goto("/?tema=bodega");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "bodega");
  await page.getByRole("link", { name: "Explorar productos" }).click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "bodega");
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "escenario");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "escenario");
});

import { expect, test, type Page } from "@playwright/test";
import { TEST_ADMIN_PASSWORD } from "../../playwright.config";

async function login(page: Page) {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/ingresar$/);
  await page.getByLabel("Contraseña del panel").fill(TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Guías de pedidos" })).toBeVisible();
}

/** Crea una guía y devuelve su código (leído del título de la página de la guía). */
async function createGuide(page: Page, fill: (page: Page) => Promise<void>) {
  await page.getByRole("link", { name: "Nueva guía" }).click();
  await page.getByLabel("Nombre del cliente *").fill("Laura Gómez");
  await page.getByLabel("Celular (WhatsApp)").fill("300 123 4567");
  await page.getByLabel("Ciudad").fill("Medellín");
  await page.getByLabel("Productos del pedido").fill("1 × Pioneer DJ DDJ-FLX4");
  await fill(page);
  await page.getByRole("button", { name: "Crear guía" }).click();
  await expect(page.getByText("Guía creada.")).toBeVisible();
  return (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
}

test("el panel exige contraseña y rechaza la incorrecta", async ({ page }) => {
  await page.goto("/admin/guias/nueva");
  await expect(page).toHaveURL(/\/admin\/ingresar$/);
  await page.getByLabel("Contraseña del panel").fill("no-es-esta-clave");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.locator(".alert[role=alert]")).toHaveText("Contraseña incorrecta.");
});

test("guía manual: el cliente ve cada cambio de estado y la nota", async ({ page, context }) => {
  await login(page);
  const code = await createGuide(page, async (p) => {
    await p.getByLabel("Transportadora", { exact: true }).fill("Servientrega");
    await p.getByText("Manual", { exact: true }).click();
  });
  expect(code).toMatch(/^VD-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

  // El botón de WhatsApp abre el chat del cliente con el enlace y el código.
  const wa = new URL((await page.getByRole("link", { name: "Enviar al cliente" }).getAttribute("href"))!);
  expect(wa.pathname).toBe("/573001234567");
  expect(wa.searchParams.get("text")).toContain(code);
  expect(wa.searchParams.get("text")).toContain(`/seguimiento/${code}`);

  const customer = await context.newPage();
  await customer.goto(`/seguimiento/${code}`);
  await expect(customer.getByRole("heading", { level: 1 })).toHaveText("Pedido confirmado");
  await expect(customer.getByText("Servientrega")).toBeVisible();
  await expect(customer.getByText("300 123 4567")).toHaveCount(0); // el celular nunca se muestra

  await page.locator(".status-picks").getByText("Enviado", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "Enviado", exact: true })).toBeChecked();
  await page.getByLabel(/Nota en este paso/).fill("Salió en el despacho de la mañana");
  await page.getByRole("button", { name: "Cambiar estado" }).click();
  await expect(page.getByText("Estado actualizado.")).toBeVisible();

  await customer.reload();
  await expect(customer.getByRole("heading", { level: 1 })).toHaveText("Enviado");
  await expect(customer.getByText("Salió en el despacho de la mañana")).toBeVisible();
  await expect(customer.locator('.tl-step[aria-current="step"]')).toContainText("Enviado");
});

test("guía automática: el estado sale del calendario según la fecha", async ({ page }) => {
  await login(page);
  const code = await createGuide(page, async (p) => {
    const dates: [string, string][] = [
      ["Pedido confirmado", "2026-01-01T10:00"],
      ["Pago recibido", "2026-01-01T11:00"],
      ["Preparando tu pedido", "2026-01-02T10:00"],
      ["Enviado", "2026-01-03T10:00"],
      ["En reparto", "2099-01-01T10:00"],
      ["Entregado", "2099-01-02T10:00"],
    ];
    for (const [label, value] of dates) await p.getByLabel(new RegExp(`^${label}`)).fill(value);
  });
  await expect(page.getByText(/Automático · siguiente: En reparto/)).toBeVisible();

  await page.goto(`/seguimiento/${code}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Enviado");
  // Las fechas futuras del plan no se le prometen al cliente.
  await expect(page.getByText("2099")).toHaveCount(0);
});

test("la consulta acepta el código como lo escriba el cliente", async ({ page }) => {
  await login(page);
  const code = await createGuide(page, async (p) => {
    await p.getByText("Manual", { exact: true }).click();
  });
  await page.goto("/seguimiento");
  await page.getByLabel("Código de guía").fill(code.toLowerCase().replaceAll("-", " "));
  await page.getByRole("button", { name: "Rastrear" }).click();
  await expect(page).toHaveURL(new RegExp(`/seguimiento/${code}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pedido confirmado");

  await page.goto("/seguimiento?codigo=abc");
  await expect(page.locator(".alert[role=alert]")).toContainText("no tiene el formato correcto");
  await page.goto("/seguimiento/VD-ZZZZ-ZZZZ");
  await expect(page.getByRole("heading", { name: "No encontramos esa guía" })).toBeVisible();
});

import { expect, test, type Page } from "@playwright/test";
import { TEST_ADMIN_PASSWORD } from "../../playwright.config";

async function login(page: Page) {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/ingresar$/);
  await page.getByLabel("Contraseña del panel").fill(TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Guías de pedidos" })).toBeVisible();
}

/** Crea una guía con un DDJ-FLX4 (precio con descuento: $ 1.105.000) y devuelve su código. */
async function createGuide(page: Page, fill: (page: Page) => Promise<void>) {
  await page.getByRole("link", { name: "+ Nueva guía" }).click();
  await page.getByLabel("Nombre del cliente *").fill("Laura Gómez");
  await page.getByLabel("Celular (WhatsApp)").fill("300 123 4567");
  await page.getByLabel("Ciudad de entrega").fill("Medellín");
  await page.getByLabel("Agregar producto *").selectOption("pioneer-dj-ddj-flx4");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.locator(".order-lines")).toContainText("Pioneer DJ DDJ-FLX4");
  await fill(page);
  await page.getByRole("button", { name: "Crear guía" }).click();
  await expect(page.getByText("Guía creada.")).toBeVisible({ timeout: 15_000 });
  return (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
}

test("el panel exige contraseña y rechaza la incorrecta", async ({ page }) => {
  await page.goto("/admin/guias/nueva");
  await expect(page).toHaveURL(/\/admin\/ingresar$/);
  await page.getByLabel("Contraseña del panel").fill("no-es-esta-clave");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.locator(".alert[role=alert]")).toHaveText("Contraseña incorrecta.");
});

test("sin productos no se puede crear la guía", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "+ Nueva guía" }).click();
  await page.getByLabel("Nombre del cliente *").fill("Sin Productos");
  await expect(page.getByRole("button", { name: "Crear guía" })).toBeDisabled();
  await expect(page.getByText("Agrega al menos un producto para crear la guía.")).toBeVisible();
});

test("guía manual: avanza con un clic, cambia con nota y muestra el saldo pendiente", async ({ page, context }) => {
  await login(page);
  const code = await createGuide(page, async (p) => {
    await p.getByLabel("Transportadora", { exact: true }).fill("Servientrega");
    await p.locator(".mode-card", { hasText: "Manual" }).click();
    await p.getByRole("button", { name: "50 %" }).click();
    await expect(p.locator(".aform .totals .due dd")).toHaveText("$ 552.000");
  });
  expect(code).toMatch(/^VD-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

  // El botón de WhatsApp abre el chat del cliente con el enlace, el código y lo pendiente.
  const wa = new URL((await page.getByRole("link", { name: "Enviar al cliente" }).getAttribute("href"))!);
  expect(wa.pathname).toBe("/573001234567");
  expect(wa.searchParams.get("text")).toContain(code);
  expect(wa.searchParams.get("text")).toContain("Saldo pendiente para la entrega: $ 552.000");

  const customer = await context.newPage();
  await customer.goto(`/seguimiento/${code}`);
  await expect(customer.getByRole("heading", { level: 1 })).toHaveText("Pedido confirmado");
  await expect(customer.getByText("Servientrega")).toBeVisible();
  await expect(customer.locator(".rc-split .due b")).toHaveText("$ 552.000");
  await expect(customer.getByText("300 123 4567")).toHaveCount(0); // el celular nunca se muestra

  await page.getByRole("button", { name: "Marcar como: Pago recibido" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Pago recibido" })).toBeVisible();

  await page.getByText("Otro estado o calendario").click();
  await page.locator(".status-picks").getByText("Enviado", { exact: true }).click();
  await page.getByLabel(/Nota en este paso/).fill("Salió en el despacho de la mañana");
  await page.getByRole("button", { name: "Cambiar estado" }).click();
  await expect(page.getByText("Estado actualizado.")).toBeVisible();

  await page.getByRole("button", { name: "Marcar todo como pagado" }).click();
  await expect(page.getByText("Pedido pagado por completo.")).toBeVisible();
  // Sin recargar: las cuentas del panel se actualizan solas.
  await expect(page.locator(".pay-form .totals .due dd")).toHaveText("$ 0");
  await expect(page.locator(".guide-meta .pay-chip")).toHaveText("Pagado");

  await customer.reload();
  await expect(customer.getByRole("heading", { level: 1 })).toHaveText("Enviado");
  await expect(customer.getByText("Salió en el despacho de la mañana")).toBeVisible();
  await expect(customer.locator(".rc-split .due b")).toHaveText("$ 0");
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
    for (const [label, value] of dates) await p.getByLabel(`Fecha de ${label}`).fill(value);
    // La vista previa refleja el calendario antes de guardar.
    await expect(p.locator(".preview h2")).toHaveText("Enviado");
  });
  await expect(page.getByText(/Siguiente automático: En reparto/)).toBeVisible();

  await page.goto(`/seguimiento/${code}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Enviado");
  // Las fechas futuras del plan no se le prometen al cliente.
  await expect(page.getByText("2099")).toHaveCount(0);
});

test("la consulta acepta el código como lo escriba el cliente", async ({ page }) => {
  await login(page);
  const code = await createGuide(page, async (p) => {
    await p.locator(".mode-card", { hasText: "Manual" }).click();
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

test("entrega fallida: el pedido se bloquea, el cliente reprograma y se entrega a una persona", async ({ page, context }) => {
  await login(page);
  const code = await createGuide(page, async (p) => {
    await p.locator(".mode-card", { hasText: "Manual" }).click();
  });
  for (const next of ["Pago recibido", "Preparando tu pedido", "Enviado", "En reparto"]) {
    await page.getByRole("button", { name: `Marcar como: ${next}` }).click();
    await expect(page.locator("#h-now")).toHaveText(next);
  }

  // En reparto: productos y montos bloqueados.
  await page.getByText("Editar contacto y envío (pedido bloqueado)").click();
  await expect(page.getByText(/sus productos y montos quedaron fijos/)).toBeVisible();
  await expect(page.getByLabel("Agregar producto *")).toHaveCount(0);

  await page.getByText("Otro estado o calendario").click();
  await page.locator(".status-picks").getByText("Entrega fallida", { exact: true }).click();
  await page.getByLabel("Motivo (lo ve el cliente)").selectOption("No había nadie en la dirección");
  await page.getByRole("button", { name: "Cambiar estado" }).click();
  await expect(page.locator("#h-now")).toHaveText("Entrega fallida");

  const customer = await context.newPage();
  await customer.goto(`/seguimiento/${code}`);
  await expect(customer.getByRole("heading", { level: 1 })).toHaveText("Entrega fallida");
  await expect(customer.getByText("No había nadie en la dirección")).toBeVisible();
  await customer.getByLabel("Horario").selectOption("tarde");
  await customer.getByRole("button", { name: "Reprogramar entrega" }).click();
  // La página se actualiza sola al reprogramar: el nuevo estado es la confirmación.
  await expect(customer.getByRole("heading", { level: 1 })).toHaveText("Entrega reprogramada");
  await expect(customer.getByText(/para recibir en la tarde/)).toBeVisible();
  await expect(customer.getByText(/Nueva fecha de entrega:/)).toBeVisible();
  await expect(customer.getByRole("button", { name: "Reprogramar entrega" })).toHaveCount(0); // una sola vez por falla

  await page.reload();
  await page.getByRole("button", { name: "Marcar como: En reparto" }).click();
  await expect(page.locator("#h-now")).toHaveText("En reparto");
  await page.getByLabel("Recibido por").fill("Carolina Restrepo");
  await page.getByRole("button", { name: "Marcar como: Entregado" }).click();
  await expect(page.locator("#h-now")).toHaveText("Entregado");

  await customer.reload();
  await expect(customer.getByRole("heading", { level: 1 })).toHaveText("Entregado");
  await expect(customer.getByText("Recibido por Carolina Restrepo.")).toBeVisible();
});

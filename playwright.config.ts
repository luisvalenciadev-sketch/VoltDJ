import { defineConfig, devices } from "@playwright/test";

const PORT = 3217;
// Número ficticio solo para pruebas: permite verificar el enlace de WhatsApp.
export const TEST_WHATSAPP = "570000000000";
export const TEST_ADMIN_PASSWORD = "panel-de-prueba-2026";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  workers: 4,
  timeout: 60_000,
  // Con cuatro navegadores en paralelo y las pruebas de accesibilidad de los cinco temas, una página dinámica
  // puede tardar más de los 5 s por defecto en el servidor de pruebas: no es un fallo de la tienda.
  expect: { timeout: 10_000 },
  // Un reintento: con la máquina cargada, una prueba puede vencer su tiempo sin que la tienda falle. Lo que
  // pasa al reintentar sale como "flaky" en el reporte (no se oculta); lo que falla dos veces es un error real.
  retries: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "escritorio", testIgnore: /(catalogo|configuracion|ventas|guias|contenido)\.spec/, use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } } },
    { name: "tablet", testIgnore: /(catalogo|configuracion|temas|ventas|guias|contenido)\.spec/, use: { ...devices["Desktop Chrome"], viewport: { width: 820, height: 1180 }, hasTouch: true } },
    { name: "movil", testIgnore: /(catalogo|configuracion|ventas|guias|contenido)\.spec/, use: { ...devices["Pixel 7"] } },
    // Las guías apartan stock de los productos que llevan (el catálogo inicial tiene 1 unidad de cada uno):
    // corren después de la tienda para no agotar lo que el flujo de compra está probando.
    { name: "guias-escritorio", testMatch: /guias\.spec/, dependencies: ["escritorio", "tablet", "movil"], use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } } },
    { name: "guias-movil", testMatch: /guias\.spec/, dependencies: ["escritorio", "tablet", "movil"], use: { ...devices["Pixel 7"] } },
    // El panel de catálogo crea productos en el catálogo compartido (memoria del servidor): corre al final,
    // cuando las pruebas de la tienda (que cuentan los 28 productos) ya terminaron.
    {
      name: "panel-catalogo",
      testMatch: /catalogo\.spec/,
      dependencies: ["escritorio", "tablet", "movil"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } },
    },
    // Cambia el nombre, el color y los textos de toda la tienda: también al final.
    {
      name: "panel-configuracion",
      testMatch: /configuracion\.spec/,
      dependencies: ["escritorio", "tablet", "movil"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } },
    },
    // Contenido del inicio (portada, banners, videos, preguntas, reseñas): cambia lo que ve toda la tienda.
    {
      name: "panel-contenido",
      testMatch: /contenido\.spec/,
      // Después de configuración: las dos regeneran el inicio, y si se cruzan, una puede pisar a la otra.
      dependencies: ["panel-configuracion"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } },
    },
    // Promociones, pagos, envíos y stock de pedidos: cambian precios y mensajes de toda la tienda.
    {
      name: "panel-ventas",
      testMatch: /ventas\.spec/,
      dependencies: ["escritorio", "tablet", "movil"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } },
    },
  ],
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_WHATSAPP_NUMBER: TEST_WHATSAPP,
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
      NEXT_TELEMETRY_DISABLED: "1",
      // Panel de guías con almacén en memoria: las pruebas nunca tocan la base real.
      GUIDES_STORE: "memory",
      CATALOG_STORE: "memory",
      ADMIN_PASSWORD: TEST_ADMIN_PASSWORD,
      SESSION_SECRET: "clave-de-prueba-solo-para-e2e-0123456789abcdef",
    },
  },
});

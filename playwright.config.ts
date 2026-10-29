import { defineConfig, devices } from "@playwright/test";

const PORT = 3217;
// Número ficticio solo para pruebas: permite verificar el enlace de WhatsApp.
export const TEST_WHATSAPP = "570000000000";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  workers: 4,
  timeout: 60_000,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 820, height: 1180 }, hasTouch: true } },
    { name: "movil", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: { NEXT_PUBLIC_WHATSAPP_NUMBER: TEST_WHATSAPP, NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`, NEXT_TELEMETRY_DISABLED: "1" },
  },
});

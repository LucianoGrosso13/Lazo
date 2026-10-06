import { defineConfig, devices } from "@playwright/test";

const mode = process.env.PW_CUOTAS_MODE === "real" ? "real" : "mock";
const port = mode === "real" ? 3013 : 3012;
// Servidor externo (ej. el dev del usuario): con PW_BASE_URL los tests corren
// contra esa app y no levantan otro servidor (nunca tocar el de otro).
const externalBaseURL = process.env.PW_BASE_URL;
const localBaseURL = `http://localhost:${port}`;

// Las suites afirman copy en español; la app lee `lazo.locale` (default inglés
// para el usuario). El estado inicial lo fija en español explícitamente para
// todas las suites, sin depender del ambiente. Una suite futura en inglés lo
// pisa con su propio `storageState`/`test.use`.
function spanishStorageState() {
  const origins = [localBaseURL];
  if (externalBaseURL) {
    try {
      origins.push(new URL(externalBaseURL).origin);
    } catch {
      // URL externa inválida: Playwright falla con su propio error.
    }
  }
  return {
    cookies: [],
    origins: origins.map((origin) => ({
      origin,
      localStorage: [{ name: "lazo.locale", value: "es" }],
    })),
  };
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: externalBaseURL ?? localBaseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    storageState: spanishStorageState(),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: externalBaseURL
    ? undefined
    : {
        command: `npm run dev -- --hostname localhost --port ${port}`,
        url: localBaseURL,
        reuseExistingServer: mode === "mock" && !process.env.CI,
        timeout: 120_000,
        env: { NEXT_PUBLIC_CUOTAS_MODE: mode },
      },
});

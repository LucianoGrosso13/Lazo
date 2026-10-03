import { defineConfig, devices } from "@playwright/test";

const mode = process.env.PW_CUOTAS_MODE === "real" ? "real" : "mock";
const port = mode === "real" ? 3013 : 3012;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: mode === "mock" && !process.env.CI,
    timeout: 120_000,
    env: { NEXT_PUBLIC_CUOTAS_MODE: mode },
  },
});

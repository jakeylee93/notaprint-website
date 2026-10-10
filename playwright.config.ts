import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3200);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
// Software WebGL so the 3D paths run in headless CI as well.
const webglArgs = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "tests/e2e/.artifacts/results",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "tests/e2e/.artifacts/report.json" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: { args: webglArgs, executablePath: process.env.PW_CHROMIUM_PATH || undefined },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile-375", use: { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
    { name: "mobile-390", use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
    { name: "mobile-430", use: { viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: `npx next start -p ${PORT}`, url: BASE_URL, reuseExistingServer: true, timeout: 120_000 },
});

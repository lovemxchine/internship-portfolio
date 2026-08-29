import { defineConfig, devices } from "@playwright/test";

/* รันกับ dev server จริง ไม่ mock อะไร */
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  globalSetup: "./tests/warmup.ts",
  fullyParallel: true,
  workers: 4,
  retries: 1,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:4321", trace: "on-first-retry" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // ใช้ chromium ย่อจอแทน iPhone 13 จะได้ไม่ต้องโหลด webkit เพิ่มอีกก้อน
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: false } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:4321",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

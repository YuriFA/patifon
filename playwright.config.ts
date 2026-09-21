import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:4173/patifon/",
    browserName: "chromium",
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4173/patifon/",
    reuseExistingServer: true,
  },
});

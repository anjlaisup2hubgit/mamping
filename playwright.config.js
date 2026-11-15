import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3010",
    trace: "retain-on-failure",
    launchOptions: {
      ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}),
      args: ["--enable-unsafe-swiftshader"]
    }
  },
  webServer: {
    command: "node dev-server.js",
    url: "http://127.0.0.1:3010",
    env: { PORT: "3010", VERCEL: "1" },
    reuseExistingServer: false
  }
});

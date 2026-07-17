import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.e2e.test.ts"],
        },
      },
      {
        test: {
          name: "e2e",
          environment: "node",
          include: ["src/**/*.e2e.test.ts"],
          // Browser real (headed para login, headless para el gateway) contra
          // figma.com real: lento, y necesita las env vars FIGMA_E2E_LOGIN /
          // FIGMA_TEST_CREDENTIAL / FIGMA_TEST_FILE_KEY / FIGMA_TEST_NODE_ID.
          testTimeout: 5 * 60 * 1000,
        },
      },
    ],
  },
});

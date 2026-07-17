import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["src/adapters/playwright/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "e2e",
          environment: "node",
          include: ["src/adapters/playwright/**/*.test.ts"],
          // Real browser + real figma.com: slow, and needs FIGMA_TEST_* env vars.
          testTimeout: 5 * 60 * 1000,
        },
      },
    ],
  },
});

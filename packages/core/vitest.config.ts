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
          // Real headed browser (see the WAF comment in
          // playwright-figma-gateway.ts) against real figma.com: slow, and
          // needs the env vars FIGMA_E2E_LOGIN / FIGMA_TEST_CREDENTIAL /
          // FIGMA_TEST_FILE_KEY / FIGMA_TEST_NODE_ID. Walking a real node
          // tree via the UI (hover + click + waits per node) can take
          // several minutes on a large tree.
          testTimeout: 10 * 60 * 1000,
        },
      },
    ],
  },
});

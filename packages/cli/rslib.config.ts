import { defineConfig } from "@rslib/core";

export default defineConfig({
  source: {
    entry: { cli: "./src/cli.ts" },
  },
  lib: [{ format: "esm", dts: true, banner: { js: "#!/usr/bin/env node" } }],
  output: { target: "node" },
});

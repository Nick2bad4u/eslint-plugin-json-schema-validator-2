import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    plugin: "./src/plugin.ts",
    "utils/http-client/worker": "./src/utils/http-client/worker.ts",
  },
  format: ["esm", "cjs"],
  platform: "node",
  dts: true,
  clean: true,
  outDir: "dist",
  outputOptions(options, format) {
    return format === "cjs" ? { ...options, exports: "named" } : options;
  },
  treeshake: {
    moduleSideEffects: false,
  },
  deps: {
    neverBundle: ["@eslint/core"],
  },
});

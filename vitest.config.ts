import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["benchmarks/**", "dist/**", "node_modules/**"],
  },
});

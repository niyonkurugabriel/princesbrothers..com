import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./frontend", import.meta.url))
    }
  },
  test: { include: ["frontend/middleware.test.ts", "frontend/features/**/*.test.ts", "frontend/integration/**/*.test.ts", "packages/**/*.test.ts"] }
});
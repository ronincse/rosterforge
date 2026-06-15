import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@rosterforge/foundation": fileURLToPath(
        new URL("./packages/foundation/src/index.ts", import.meta.url),
      ),
      "@rosterforge/test-fixtures": fileURLToPath(
        new URL("./packages/test-fixtures/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    coverage: {
      reporter: ["text", "html"],
    },
    include: ["packages/**/*.test.ts"],
  },
});

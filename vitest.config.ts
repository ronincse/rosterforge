import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@rosterforge/foundation": fileURLToPath(
        new URL("./packages/foundation/src/index.ts", import.meta.url),
      ),
      "@rosterforge/battlescribe-data": fileURLToPath(
        new URL("./packages/battlescribe-data/src/index.ts", import.meta.url),
      ),
      "@rosterforge/test-fixtures": fileURLToPath(
        new URL("./packages/test-fixtures/src/index.ts", import.meta.url),
      ),
      "@rosterforge/data-graph": fileURLToPath(
        new URL("./packages/data-graph/src/index.ts", import.meta.url),
      ),
      "@rosterforge/roster-model": fileURLToPath(
        new URL("./packages/roster-model/src/index.ts", import.meta.url),
      ),
      "@rosterforge/evaluation": fileURLToPath(
        new URL("./packages/evaluation/src/index.ts", import.meta.url),
      ),
      "@rosterforge/repository": fileURLToPath(
        new URL("./packages/repository/src/index.ts", import.meta.url),
      ),
      "@rosterforge/persistence": fileURLToPath(
        new URL("./packages/persistence/src/index.ts", import.meta.url),
      ),
      "@rosterforge/roster-builder": fileURLToPath(
        new URL("./packages/roster-builder/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    coverage: {
      reporter: ["text", "html"],
    },
    include: [
      "packages/**/*.test.ts",
      "apps/**/*.test.ts",
      "apps/**/*.test.tsx",
    ],
  },
});

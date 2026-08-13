import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const coreFiles = [
  "packages/foundation/**/*.ts",
  "packages/battlescribe-data/**/*.ts",
  "packages/repository/**/*.ts",
  "packages/data-graph/**/*.ts",
  "packages/roster-model/**/*.ts",
  "packages/roster-builder/**/*.ts",
  "packages/evaluation/**/*.ts",
  "packages/persistence/**/*.ts",
  "packages/test-fixtures/**/*.ts",
];

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["vitest.config.ts"],
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
  },
  {
    files: coreFiles,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-*", "@vitejs/*", "vite", "zustand"],
              message: "UI dependencies belong only in apps/web.",
            },
          ],
        },
      ],
    },
  },
);

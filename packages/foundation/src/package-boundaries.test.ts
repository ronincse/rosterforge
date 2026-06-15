import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const corePackageNames = [
  "foundation",
  "battlescribe-data",
  "repository",
  "data-graph",
  "roster-model",
  "evaluation",
  "persistence",
  "test-fixtures",
] as const;
const forbiddenDependencies = ["react", "react-dom", "vite", "zustand"];

describe("core package boundaries", () => {
  it("keeps UI dependencies out of core manifests", () => {
    for (const packageName of corePackageNames) {
      const manifestPath = join(
        packageRoot,
        "packages",
        packageName,
        "package.json",
      );
      const manifest = JSON.parse(
        readFileSync(manifestPath, "utf8"),
      ) as Record<string, Record<string, string> | undefined>;
      const dependencies = {
        ...manifest.dependencies,
        ...manifest.devDependencies,
        ...manifest.peerDependencies,
      };

      for (const forbidden of forbiddenDependencies) {
        expect(
          dependencies[forbidden],
          `${packageName} must not depend on ${forbidden}`,
        ).toBeUndefined();
      }
    }
  });

  it("keeps UI imports out of core source files", () => {
    for (const packageName of corePackageNames) {
      const sourceRoot = join(packageRoot, "packages", packageName, "src");
      for (const filename of recursiveTypeScriptFiles(sourceRoot)) {
        const source = readFileSync(filename, "utf8");
        expect(source).not.toMatch(
          /from\s+["'](?:react|react-dom|vite|zustand)(?:\/[^"']*)?["']/u,
        );
      }
    }
  });
});

function recursiveTypeScriptFiles(directory: string): readonly string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      files.push(...recursiveTypeScriptFiles(path));
    } else if (entry.endsWith(".ts")) {
      files.push(path);
    }
  }
  return files;
}

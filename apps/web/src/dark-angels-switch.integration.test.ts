import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  importLocalBattleScribeFiles,
  type LocalBattleScribeFile,
} from "@rosterforge/repository";

import { prepareImportedCatalogueLibrary } from "./catalogue-library.js";

const realDataDirectory = process.env.ROSTERFORGE_BSDATA_JSON_DIR;

describe.skipIf(realDataDirectory === undefined)(
  "Dark Angels linked-catalogue switching",
  () => {
    it(
      "composes only the requested catalogue while retaining linked definitions",
      async () => {
        if (realDataDirectory === undefined) {
          throw new Error("The integration data directory is not configured.");
        }
        const imported = await importLocalBattleScribeFiles(
          realJsonFiles(realDataDirectory),
          {
            batchId: "dark-angels-switch",
            importedAt: "2026-08-27T00:00:00.000Z",
          },
        );
        expect(imported.ok).toBe(true);
        if (!imported.ok) return;
        const darkAngels = imported.value.documents.find(
          ({ metadata }) =>
            metadata.name ===
            "Imperium - Adeptus Astartes - Dark Angels",
        );
        expect(darkAngels).toBeDefined();
        if (darkAngels === undefined) return;

        const result = prepareImportedCatalogueLibrary(
          imported.value,
          imported.diagnostics,
          { catalogueDocuments: [darkAngels] },
        );
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(
          result.value.selectableCatalogues.map(({ name }) => name),
        ).toEqual(["Imperium - Adeptus Astartes - Dark Angels"]);
        expect(result.value.contexts.roots.catalogues).toHaveLength(1);
        expect(
          result.value.selectableCatalogues[0]?.context.roots.roots.some(
            ({ materialized }) =>
              materialized.kind !== "unresolvedEntryLink" &&
              materialized.definitionDocument.metadata.name ===
                "Imperium - Adeptus Astartes - Space Marines",
          ),
        ).toBe(true);
      },
      120_000,
    );
  },
);

function realJsonFiles(directory: string): readonly LocalBattleScribeFile[] {
  return readdirSync(directory)
    .filter((filename) => filename.toLowerCase().endsWith(".json"))
    .sort((left, right) => left.localeCompare(right))
    .map((filename) => ({
      filename,
      bytes: readFileSync(join(directory, filename)),
      origin: directory,
      mediaType: "application/json",
    }));
}

import { describe, expect, it } from "vitest";

import { objectId, sourceId, type SourceFileProvenance } from "@rosterforge/foundation";

import {
  planBattleScribeDependencyClosure,
  type BattleScribeRepositoryDocumentSummary,
  type BattleScribeRepositoryIndex,
} from "./dependency-closure.js";
import { pinGitHubRepository } from "./pinned-github.js";

describe("BattleScribe repository dependency closure planning", () => {
  it("plans the game system and transitive catalogues in declaration order", () => {
    const gameSystem = document("system.json", "gameSystem", "system", []);
    const root = document("root.json", "catalogue", "root", ["library-a", "library-b"]);
    const libraryA = document("library-a.json", "catalogue", "library-a", [
      "library-c",
    ]);
    const libraryB = document("library-b.json", "catalogue", "library-b", []);
    const libraryC = document("library-c.json", "catalogue", "library-c", []);
    const index = repositoryIndex([libraryB, gameSystem, libraryC, root, libraryA]);

    const planned = planBattleScribeDependencyClosure(index, "root.json");

    expect(planned.ok).toBe(true);
    if (!planned.ok) {
      return;
    }
    expect(planned.diagnostics).toEqual([]);
    expect(planned.value.status).toBe("complete");
    expect(
      planned.value.files.map(({ role, document: item }) => [role, item.path]),
    ).toEqual([
      ["gameSystem", "system.json"],
      ["selectedCatalogue", "root.json"],
      ["catalogueDependency", "library-a.json"],
      ["catalogueDependency", "library-c.json"],
      ["catalogueDependency", "library-b.json"],
    ]);
    expect(planned.value.selectedCatalogue).toBe(root);
    expect(planned.value.source).toBe(index.source);
  });

  it("reports a source-located missing target while retaining a useful plan", () => {
    const root = document("root.json", "catalogue", "root", ["missing"]);
    const planned = planBattleScribeDependencyClosure(
      repositoryIndex([
        document("system.json", "gameSystem", "system", []),
        root,
      ]),
      "root.json",
    );

    expect(planned.ok).toBe(true);
    if (!planned.ok) {
      return;
    }
    expect(planned.value.status).toBe("incomplete");
    expect(planned.value.files.map((item) => item.document.path)).toEqual([
      "system.json",
      "root.json",
    ]);
    expect(planned.diagnostics).toEqual([
      expect.objectContaining({
        code: "REPOSITORY_DEPENDENCY_TARGET_MISSING",
        severity: "warning",
        location: {
          source: syntheticSource,
          path: ["catalogue", "catalogueLinks", "missing"],
        },
        details: expect.objectContaining({
          sourceId: "root",
          targetId: "missing",
        }),
      }),
    ]);
  });

  it("diagnoses cycles without duplicating files or making the closure incomplete", () => {
    const planned = planBattleScribeDependencyClosure(
      repositoryIndex([
        document("system.json", "gameSystem", "system", []),
        document("root.json", "catalogue", "root", ["library"]),
        document("library.json", "catalogue", "library", ["root"]),
      ]),
      "root.json",
    );

    expect(planned.ok).toBe(true);
    if (!planned.ok) {
      return;
    }
    expect(planned.value.status).toBe("complete");
    expect(planned.value.files.map((item) => item.document.path)).toEqual([
      "system.json",
      "root.json",
      "library.json",
    ]);
    expect(planned.diagnostics).toEqual([
      expect.objectContaining({
        code: "REPOSITORY_DEPENDENCY_CYCLE",
        details: { paths: ["root.json", "library.json", "root.json"] },
      }),
    ]);
  });

  it("does not guess when exact IDs are ambiguous or cross game systems", () => {
    const ambiguousA = document("library-a.json", "catalogue", "duplicate", []);
    const ambiguousB = document("library-b.json", "catalogue", "duplicate", []);
    const wrongSystem = {
      ...document("wrong-system.json", "catalogue", "wrong-system", []),
      gameSystemId: objectId("other-system"),
    };
    const root = document("root.json", "catalogue", "root", [
      "duplicate",
      "wrong-system",
    ]);

    const planned = planBattleScribeDependencyClosure(
      repositoryIndex([
        document("system.json", "gameSystem", "system", []),
        root,
        ambiguousA,
        ambiguousB,
        wrongSystem,
      ]),
      "root.json",
    );

    expect(planned.ok).toBe(true);
    if (!planned.ok) {
      return;
    }
    expect(planned.value.status).toBe("incomplete");
    expect(planned.value.files.map((item) => item.document.path)).toEqual([
      "system.json",
      "root.json",
    ]);
    expect(planned.diagnostics.map((item) => item.code)).toEqual([
      "REPOSITORY_DEPENDENCY_TARGET_AMBIGUOUS",
      "REPOSITORY_DEPENDENCY_GAME_SYSTEM_MISMATCH",
    ]);
  });

  it("fails when the selected path is missing or does not identify a catalogue", () => {
    const index = repositoryIndex([
      document("system.json", "gameSystem", "system", []),
    ]);
    const missing = planBattleScribeDependencyClosure(index, "missing.json");
    const wrongKind = planBattleScribeDependencyClosure(index, "system.json");

    expect(missing.ok).toBe(false);
    expect(missing.diagnostics[0]?.code).toBe(
      "REPOSITORY_DEPENDENCY_ROOT_MISSING",
    );
    expect(wrongKind.ok).toBe(false);
    expect(wrongKind.diagnostics[0]?.code).toBe(
      "REPOSITORY_DEPENDENCY_ROOT_NOT_CATALOGUE",
    );
  });
});

const syntheticSource: SourceFileProvenance = {
  sourceId: sourceId("synthetic:dependency-closure"),
  filename: "synthetic-index.json",
  kind: "synthetic",
  importedAt: "2026-08-13T12:00:00.000Z",
};

function document(
  path: string,
  kind: "gameSystem" | "catalogue",
  id: string,
  targets: readonly string[],
): BattleScribeRepositoryDocumentSummary {
  return {
    path,
    kind,
    id: objectId(id),
    name: id,
    ...(kind === "catalogue" ? { gameSystemId: objectId("system") } : {}),
    costTypeIds: [],
    catalogueLinks: targets.map((target) => ({
      targetId: objectId(target),
      name: target,
      location: {
        source: syntheticSource,
        path: ["catalogue", "catalogueLinks", target],
      },
    })),
    source: syntheticSource,
  };
}

function repositoryIndex(
  documents: readonly BattleScribeRepositoryDocumentSummary[],
): BattleScribeRepositoryIndex {
  const source = pinGitHubRepository({
    owner: "BSData",
    repository: "fictional-system",
    revision: "1111111111111111111111111111111111111111",
  });
  if (!source.ok) {
    throw new Error("The test repository source was not pinned.");
  }
  return { source: source.value, documents };
}

import { describe, expect, it } from "vitest";

import { objectId, sourceId } from "@rosterforge/foundation";
import {
  forceOccurrenceId,
  rosterDefinitionKey,
  rosterId,
  selectionOccurrenceId,
  type Roster,
} from "@rosterforge/roster-model";

import {
  createLocalRosterDraft,
  decodeLocalRosterDraft,
  localRosterDraftFormat,
  localRosterDraftVersion,
  type LocalRosterDraft,
} from "./local-roster-draft.js";

describe("local roster draft codec", () => {
  it("round-trips source bytes and ordered roster occurrences", () => {
    const bytes = Uint8Array.from([60, 99, 97, 116, 62]);
    const draft = successful(
      createLocalRosterDraft({
        id: "draft-1",
        createdAt: "2026-07-23T12:00:00.000Z",
        updatedAt: "2026-07-23T12:05:00.000Z",
        catalogueKey: "fixture:catalogue",
        import: {
          batchId: "batch-1",
          importedAt: "2026-07-23T11:59:00.000Z",
          files: [
            {
              filename: "fixture.cat",
              bytes,
              mediaType: "application/xml",
              origin: "",
              sourceId: sourceId("download:fixture"),
              sourceKind: "download",
            },
          ],
        },
        roster: rosterFixture(),
      }),
    );

    expect(draft.import.files[0]?.bytes).toEqual(bytes);
    expect(draft.import.files[0]?.bytes).not.toBe(bytes);
    expect(draft.import.files[0]?.origin).toBe("");
    expect(draft.roster.forces[0]?.name).toBe("");
    expect(draft.import.files[0]?.sourceId).toBe("download:fixture");
    expect(draft.import.files[0]?.sourceKind).toBe("download");
    expect(draft.roster.forces[0]?.selections.map(({ id }) => id)).toEqual([
      "selection-1",
      "selection-2",
    ]);
    expect(draft.roster.forces[0]?.selections[0]?.name).toBeUndefined();
    expect(draft.roster.forces[0]?.selections[0]?.amount).toBe(2.5);
    expect(
      Object.hasOwn(
        draft.roster.forces[0]?.selections[0]?.selections[0] ?? {},
        "amount",
      ),
    ).toBe(false);
    expect(
      draft.roster.forces[0]?.selections[0]?.selections[0]?.name,
    ).toBe("");

    bytes[0] = 0;
    expect(draft.import.files[0]?.bytes[0]).toBe(60);
  });

  it("ignores unknown fields while preserving the supported draft", () => {
    const value = rawDraft();
    const result = decodeLocalRosterDraft({
      ...value,
      futureTopLevelField: { enabled: true },
      roster: {
        ...value.roster,
        futureRosterField: "still unknown",
      },
    });

    const draft = successful(result);
    expect(draft.id).toBe("draft-1");
    expect(draft.roster.forces).toHaveLength(1);
  });

  it("rejects an invalid imported file source kind with its field path", () => {
    const value = rawDraft();
    const file = value.import.files[0]!;
    const result = decodeLocalRosterDraft({
      ...value,
      import: {
        ...value.import,
        files: [{ ...file, sourceKind: "future-source" }],
      },
    });

    expect(result).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "PERSISTENCE_DRAFT_INVALID",
          details: expect.objectContaining({
            path: ["import", "files", "0", "sourceKind"],
          }),
        }),
      ],
    });
  });

  it.each([
    {
      label: "format",
      change: { format: "another/draft-format" },
      code: "PERSISTENCE_DRAFT_FORMAT_UNSUPPORTED",
    },
    {
      label: "version",
      change: { version: localRosterDraftVersion + 1 },
      code: "PERSISTENCE_DRAFT_VERSION_UNSUPPORTED",
    },
  ])("rejects an unsupported $label", ({ change, code }) => {
    const result = decodeLocalRosterDraft({ ...rawDraft(), ...change });

    expect(result).toEqual({
      ok: false,
      diagnostics: [expect.objectContaining({ code })],
    });
  });

  it("reports malformed values with a structured field path", () => {
    const value = rawDraft();
    const force = value.roster.forces[0]!;
    const selection = force.selections[0]!;

    const result = decodeLocalRosterDraft({
      ...value,
      roster: {
        ...value.roster,
        forces: [
          {
            ...force,
            selections: [
              {
                ...selection,
                definition: {
                  ...selection.definition,
                  kind: "future-kind",
                },
              },
              ...force.selections.slice(1),
            ],
          },
        ],
      },
    });

    expect(result).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "PERSISTENCE_DRAFT_INVALID",
          impacts: ["persistence"],
          details: expect.objectContaining({
            path: [
              "roster",
              "forces",
              "0",
              "selections",
              "0",
              "definition",
              "kind",
            ],
          }),
        }),
      ],
    });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, "2"])(
    "rejects invalid selection amount %s",
    (amount) => {
      const value = rawDraft();
      const force = value.roster.forces[0]!;
      const selection = force.selections[0]!;
      const result = decodeLocalRosterDraft({
        ...value,
        roster: {
          ...value.roster,
          forces: [
            {
              ...force,
              selections: [
                { ...selection, amount },
                ...force.selections.slice(1),
              ],
            },
          ],
        },
      });

      expect(result).toEqual({
        ok: false,
        diagnostics: [
          expect.objectContaining({
            code: "PERSISTENCE_DRAFT_INVALID",
            details: expect.objectContaining({
              path: [
                "roster",
                "forces",
                "0",
                "selections",
                "0",
                "amount",
              ],
            }),
          }),
        ],
      });
    },
  );

  it("rejects duplicate force and selection occurrence IDs", () => {
    const forceValue = rawDraft();
    const duplicateForce = {
      ...forceValue,
      roster: {
        ...forceValue.roster,
        forces: [
          ...forceValue.roster.forces,
          { ...forceValue.roster.forces[0]! },
        ],
      },
    };
    expect(diagnosticCode(decodeLocalRosterDraft(duplicateForce))).toBe(
      "PERSISTENCE_DRAFT_INVALID",
    );

    const selectionValue = rawDraft();
    const selectionForce = selectionValue.roster.forces[0]!;
    const duplicateSelection = {
      ...selectionValue,
      roster: {
        ...selectionValue.roster,
        forces: [
          {
            ...selectionForce,
            selections: [
              ...selectionForce.selections,
              { ...selectionForce.selections[0]! },
            ],
          },
        ],
      },
    };
    const result = decodeLocalRosterDraft(duplicateSelection);
    expect(result).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "PERSISTENCE_DRAFT_INVALID",
          details: expect.objectContaining({
            path: [
              "roster",
              "forces",
              "0",
              "selections",
              "2",
              "id",
            ],
          }),
        }),
      ],
    });
  });

  it("rejects update timestamps before draft creation", () => {
    const result = decodeLocalRosterDraft({
      ...rawDraft(),
      updatedAt: "2026-07-22T12:00:00.000Z",
    });

    expect(result).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "PERSISTENCE_DRAFT_INVALID",
          details: expect.objectContaining({ path: ["updatedAt"] }),
        }),
      ],
    });
  });

  it.each([
    {
      label: "file count",
      limits: { maxFiles: 0 },
      limit: "maxFiles",
    },
    {
      label: "file bytes",
      limits: { maxTotalFileBytes: 2 },
      limit: "maxTotalFileBytes",
    },
    {
      label: "roster node count",
      limits: { maxRosterNodes: 2 },
      limit: "maxRosterNodes",
    },
    {
      label: "roster depth",
      limits: { maxRosterDepth: 1 },
      limit: "maxRosterDepth",
    },
  ])("enforces the configured $label limit", ({ limits, limit }) => {
    const result = decodeLocalRosterDraft(rawDraft(), limits);

    expect(result).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "PERSISTENCE_DRAFT_LIMIT_EXCEEDED",
          details: expect.objectContaining({ limit }),
        }),
      ],
    });
  });
});

function rosterFixture(): Roster {
  return {
    id: rosterId("roster-1"),
    name: "Fixture roster",
    catalogue: {
      kind: "catalogue",
      key: rosterDefinitionKey("fixture:catalogue"),
      sourceId: objectId("catalogue-source"),
    },
    forces: [
      {
        id: forceOccurrenceId("force-1"),
        definition: {
          kind: "forceEntry",
          key: rosterDefinitionKey("fixture:force"),
          sourceId: objectId("force-source"),
        },
        name: "",
        forces: [],
        selections: [
          {
            id: selectionOccurrenceId("selection-1"),
            amount: 2.5,
            definition: {
              kind: "selectionEntry",
              key: rosterDefinitionKey("fixture:selection-1"),
              sourceId: objectId("selection-source-1"),
            },
            selections: [
              {
                id: selectionOccurrenceId("selection-child"),
                definition: {
                  kind: "selectionEntryGroup",
                  key: rosterDefinitionKey("fixture:selection-child"),
                },
                name: "",
                selections: [],
              },
            ],
          },
          {
            id: selectionOccurrenceId("selection-2"),
            definition: {
              kind: "selectionEntryGroup",
              key: rosterDefinitionKey("fixture:selection-2"),
            },
            name: "Second",
            selections: [],
          },
        ],
      },
    ],
  };
}

function rawDraft() {
  return {
    format: localRosterDraftFormat,
    version: localRosterDraftVersion,
    id: "draft-1",
    createdAt: "2026-07-23T12:00:00.000Z",
    updatedAt: "2026-07-23T12:05:00.000Z",
    catalogueKey: "fixture:catalogue",
    import: {
      batchId: "batch-1",
      importedAt: "2026-07-23T11:59:00.000Z",
      files: [
        {
          filename: "fixture.cat",
          bytes: Uint8Array.from([1, 2, 3]),
          mediaType: "application/xml",
        },
      ],
    },
    roster: rosterFixture(),
  };
}

function successful(result: {
  readonly ok: boolean;
  readonly value?: LocalRosterDraft;
}): LocalRosterDraft {
  if (!result.ok || result.value === undefined) {
    throw new Error("Expected local roster draft operation to succeed.");
  }
  return result.value;
}

function diagnosticCode(result: {
  readonly ok: boolean;
  readonly diagnostics: readonly { readonly code: string }[];
}): string | undefined {
  return result.diagnostics[0]?.code;
}

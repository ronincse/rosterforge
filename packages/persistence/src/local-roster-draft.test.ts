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
  it("round-trips occurrence assignments and rejects dangling or duplicate edges", () => {
    const edge = {sourceId:selectionOccurrenceId("selection-1"),targetId:selectionOccurrenceId("selection-2"),definitionKey:rosterDefinitionKey("source-association")};
    const input = { id:"assignments",createdAt:"2026-09-09T00:00:00Z",updatedAt:"2026-09-09T00:00:00Z",catalogueKey:"fixture:catalogue",import:{batchId:"edges",importedAt:"2026-09-09T00:00:00Z",files:[]},roster:{...rosterFixture(),associations:[edge]} };
    const draft=successful(createLocalRosterDraft(input));
    const decoded=successful(decodeLocalRosterDraft(draft));
    expect(decoded.roster.associations).toEqual([edge]);
    expect(createLocalRosterDraft({...input,roster:{...input.roster,associations:[edge,edge]}}).ok).toBe(false);
    expect(createLocalRosterDraft({...input,roster:{...input.roster,associations:[{...edge,targetId:selectionOccurrenceId("missing")} ]}}).ok).toBe(false);
  });
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

  it("decodes an undo history, scoping occurrence IDs per snapshot", () => {
    // Every snapshot is the same roster at a different moment, so the same
    // occurrence IDs recur throughout. Rejecting that would reject every
    // history a draft can hold.
    const value = {
      ...rawDraft(),
      history: {
        past: [rosterFixture(), rosterFixture()],
        future: [rosterFixture()],
      },
    };

    const result = decodeLocalRosterDraft(value);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.history?.past).toHaveLength(2);
    expect(result.value.history?.future).toHaveLength(1);
    expect(result.value.history?.past[0]?.forces[0]?.id).toBe(
      result.value.roster.forces[0]?.id,
    );
  });

  it("treats an absent history as absent rather than empty", () => {
    const result = decodeLocalRosterDraft(rawDraft());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.hasOwn(result.value, "history")).toBe(false);
  });

  it("reports a malformed history snapshot with its own path", () => {
    const result = decodeLocalRosterDraft({
      ...rawDraft(),
      history: {
        past: [rosterFixture()],
        future: [{ ...rosterFixture(), name: 7 }],
      },
    });

    expect(result).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "PERSISTENCE_DRAFT_INVALID",
          details: expect.objectContaining({
            path: ["history", "future", "0", "name"],
          }),
        }),
      ],
    });
  });

  it("rejects a history beyond the configured entry limit", () => {
    const result = decodeLocalRosterDraft(
      {
        ...rawDraft(),
        history: {
          past: [rosterFixture(), rosterFixture()],
          future: [rosterFixture()],
        },
      },
      { maxHistoryEntries: 2 },
    );

    expect(result).toEqual({
      ok: false,
      diagnostics: [
        expect.objectContaining({
          code: "PERSISTENCE_DRAFT_LIMIT_EXCEEDED",
          details: expect.objectContaining({
            limit: "maxHistoryEntries",
            configured: 2,
            observed: 3,
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


describe("resource budget draft persistence", () => {
  const gas = objectId("fictional-gas");
  const minerals = objectId("fictional-minerals");
  const overrides = [{ typeId: gas, value: 0 }, { typeId: minerals, value: -1 }];

  it("round-trips explicit overrides and reset history while retaining imported bytes and associations", () => {
    const raw = rawDraft();
    const associations = [{
      sourceId: selectionOccurrenceId("selection-1"), targetId: selectionOccurrenceId("selection-2"),
      definitionKey: rosterDefinitionKey("fictional-association"),
    }];
    const initial = { ...raw.roster, associations };
    const adjusted = { ...initial, resourceBudgetOverrides: overrides };
    const draft = successful(createLocalRosterDraft({ ...raw, roster: adjusted,
      history: { past: [initial], future: [{ ...adjusted, resourceBudgetOverrides: [{ typeId: gas, value: 210.5 }] }] },
    }));
    const loaded = successful(decodeLocalRosterDraft(draft));
    expect(loaded.roster.resourceBudgetOverrides).toEqual(overrides);
    expect(loaded.roster.resourceBudgetOverrides).not.toBe(overrides);
    expect(loaded.roster.resourceBudgetOverrides?.[0]).not.toBe(overrides[0]);
    expect(loaded.roster.forces).toEqual(raw.roster.forces);
    expect(loaded.roster.catalogue).toEqual(raw.roster.catalogue);
    expect(loaded.roster.id).toBe(raw.roster.id);
    expect(loaded.roster.associations).toEqual(associations);
    expect(loaded.import.files[0]?.bytes).toEqual(raw.import.files[0]?.bytes);
    expect(Object.hasOwn(loaded.history!.past[0]!, "resourceBudgetOverrides")).toBe(false);
    expect(loaded.history?.future[0]?.resourceBudgetOverrides).toEqual([{ typeId: gas, value: 210.5 }]);
    const reset = successful(createLocalRosterDraft({ ...raw, roster: initial,
      history: { past: [adjusted], future: [] },
    }));
    expect(Object.hasOwn(reset.roster, "resourceBudgetOverrides")).toBe(false);
    expect(reset.history?.past[0]?.resourceBudgetOverrides).toEqual(overrides);
    expect(JSON.parse(JSON.stringify(overrides))).toEqual(overrides);
  });

  it("keeps older drafts and histories without overrides compatible", () => {
    const raw = rawDraft();
    const decoded = successful(decodeLocalRosterDraft({ ...raw, history: { past: [raw.roster], future: [] } }));
    expect(Object.hasOwn(decoded.roster, "resourceBudgetOverrides")).toBe(false);
    expect(Object.hasOwn(decoded.history!.past[0]!, "resourceBudgetOverrides")).toBe(false);
    const empty = successful(decodeLocalRosterDraft({ ...raw, roster: { ...raw.roster, resourceBudgetOverrides: [] } }));
    expect(Object.hasOwn(empty.roster, "resourceBudgetOverrides")).toBe(false);
  });

  const malformed = [
    null, {}, [null], [undefined], new Array(1),
    [{ typeId: gas }], [{ typeId: gas, value: null }], [{ typeId: gas, value: "200" }],
    ...[NaN, Infinity, -Infinity, -2, -0.1].map((value) => [{ typeId: gas, value }]),
    ...["", " ", "a".repeat(4097), null, 2].map((typeId) => [{ typeId, value: 1 }]),
    [{ typeId: gas, value: 1, mode: "future" }],
    [{ typeId: gas, value: 1 }, { typeId: gas, value: 1 }],
    Array.from({ length: 1001 }, (_, i) => ({ typeId: `cost-${i}`, value: 1 })),
  ];
  it.each(malformed.map((resourceBudgetOverrides) => ({ resourceBudgetOverrides })))("rejects malformed present and both history directions", ({ resourceBudgetOverrides }) => {
    const raw = rawDraft();
    const roster = { ...raw.roster, resourceBudgetOverrides };
    expect(decodeLocalRosterDraft({ ...raw, roster }).ok).toBe(false);
    for (const key of ["past", "future"] as const) {
      const result = decodeLocalRosterDraft({ ...raw,
        history: { past: [], future: [], [key]: [roster] },
      });
      expect(result).toMatchObject({ ok: false, diagnostics: [expect.objectContaining({
        details: expect.objectContaining({ path: expect.arrayContaining(["history", key, "0", "resourceBudgetOverrides"]) }),
      })] });
    }
  });

  it("accepts the bounded maximum with IDs unique within each snapshot", () => {
    const raw = rawDraft();
    const roster = { ...raw.roster, resourceBudgetOverrides:
      Array.from({ length: 1000 }, (_, i) => ({ typeId: `cost-${i}`, value: 1 })) };
    const decoded = successful(decodeLocalRosterDraft({ ...raw, roster,
      history: { past: [roster], future: [roster] },
    }));
    expect(decoded.roster.resourceBudgetOverrides).toHaveLength(1000);
  });
});

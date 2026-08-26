import { describe, expect, it } from "vitest";

import type { RosterSelection } from "@rosterforge/roster-model";

import { modelQuantityDecreaseAction } from "./roster-workspace.js";

describe("model quantity controls", () => {
  it("subtracts one from an amount override before removing its occurrence", () => {
    const occurrence = {
      id: "model-quantity",
      definition: {},
      amount: 3,
      selections: [],
    } as unknown as RosterSelection;

    expect(modelQuantityDecreaseAction(occurrence)).toEqual({
      kind: "setAmount",
      amount: 2,
    });
    expect(
      modelQuantityDecreaseAction({
        ...occurrence,
        amount: 1,
      }),
    ).toEqual({ kind: "remove" });
  });
});

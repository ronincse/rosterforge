import { describe, expect, it } from "vitest";

import {
  selectionAmountChangeAllowed,
  selectionAmountSatisfiesBounds,
  type KnownSelectionAmountBound,
} from "./selection-amount-policy.js";

describe("selection amount policy", () => {
  const exactFive: readonly KnownSelectionAmountBound[] = [
    { type: "min", limit: 5, observed: 5 },
    { type: "max", limit: 5, observed: 5 },
  ];

  it("keeps a legal aggregate inside every complete known bound", () => {
    expect(selectionAmountSatisfiesBounds(1, exactFive)).toBe(true);
    expect(selectionAmountChangeAllowed(1, 2, exactFive)).toBe(false);
    expect(selectionAmountChangeAllowed(1, 0, exactFive)).toBe(false);
  });

  it("accounts for sibling amounts in the observed aggregate", () => {
    const range = [
      { type: "min", limit: 4, observed: 5 },
      { type: "max", limit: 6, observed: 5 },
    ] as const;
    expect(selectionAmountChangeAllowed(2, 1, range)).toBe(true);
    expect(selectionAmountChangeAllowed(2, 3, range)).toBe(true);
    expect(selectionAmountChangeAllowed(2, 4, range)).toBe(false);
  });

  it("allows a partial repair when the current aggregate is above maximum", () => {
    const maximum = [{ type: "max", limit: 5, observed: 8 }] as const;
    expect(selectionAmountSatisfiesBounds(4, maximum)).toBe(false);
    expect(selectionAmountChangeAllowed(4, 3, maximum)).toBe(true);
    expect(selectionAmountChangeAllowed(4, 4.5, maximum)).toBe(false);
  });

  it("allows a partial repair without worsening another known bound", () => {
    const conflicting = [
      { type: "min", limit: 5, observed: 4 },
      { type: "max", limit: 3, observed: 4 },
    ] as const;
    expect(selectionAmountChangeAllowed(1, 2, conflicting)).toBe(false);
    expect(selectionAmountChangeAllowed(1, 0.5, conflicting)).toBe(false);
  });

  it("leaves an unresolved-only editor permissive", () => {
    expect(selectionAmountSatisfiesBounds(1, [])).toBe(true);
    expect(selectionAmountChangeAllowed(1, 17, [])).toBe(true);
  });
});

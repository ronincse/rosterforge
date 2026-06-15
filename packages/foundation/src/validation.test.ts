import { describe, expect, it } from "vitest";

import type { ValidationStatus } from "./validation.js";

describe("validation status", () => {
  it("allows validity and completeness to vary independently", () => {
    const states: readonly ValidationStatus[] = [
      { validity: "valid", completeness: "complete" },
      { validity: "valid", completeness: "incomplete" },
      { validity: "invalid", completeness: "complete" },
      { validity: "invalid", completeness: "incomplete" },
    ];

    expect(states).toHaveLength(4);
  });
});

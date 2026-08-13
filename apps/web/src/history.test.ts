import { describe, expect, it } from "vitest";

import {
  commitBoundedHistory,
  createBoundedHistory,
  redoBoundedHistory,
  undoBoundedHistory,
} from "./history.js";

describe("bounded history", () => {
  it("restores exact snapshots through undo and redo", () => {
    const first = { value: 1 };
    const second = { value: 2 };
    const third = { value: 3 };
    const history = commitBoundedHistory(
      commitBoundedHistory(createBoundedHistory(first), second),
      third,
    );

    const undone = undoBoundedHistory(history);
    const redone = redoBoundedHistory(undone);

    expect(undone.present).toBe(second);
    expect(undone.future).toEqual([third]);
    expect(redone.present).toBe(third);
    expect(redone.past).toEqual([first, second]);
  });

  it("clears redo snapshots when a new value is committed after undo", () => {
    const history = commitBoundedHistory(
      commitBoundedHistory(createBoundedHistory("first"), "second"),
      "third",
    );
    const branched = commitBoundedHistory(
      undoBoundedHistory(history),
      "replacement",
    );

    expect(branched.present).toBe("replacement");
    expect(branched.future).toEqual([]);
    expect(redoBoundedHistory(branched)).toBe(branched);
  });

  it("caps retained past snapshots without changing the present value", () => {
    const history = ["second", "third", "fourth"].reduce(
      (current, value) => commitBoundedHistory(current, value, 2),
      createBoundedHistory("first"),
    );

    expect(history).toEqual({
      past: ["second", "third"],
      present: "fourth",
      future: [],
    });
  });

  it("does not create history entries for an equal snapshot reference", () => {
    const value = { value: 1 };
    const history = createBoundedHistory(value);

    expect(commitBoundedHistory(history, value)).toBe(history);
    expect(undoBoundedHistory(history)).toBe(history);
    expect(redoBoundedHistory(history)).toBe(history);
  });
});

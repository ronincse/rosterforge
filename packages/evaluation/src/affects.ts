import { objectId, type ObjectId } from "@rosterforge/foundation";

/**
 * How far from the owning occurrence an `affects` selector reaches.
 *
 * The corpus establishes this contrast itself: `self.entries.profiles.X` and
 * `self.entries.recursive.profiles.X` both occur, so `entries` alone is the
 * direct child collection and `recursive` extends it to all descendants.
 */
export type AffectsSelectorTraversal = "own" | "children" | "descendants";

export type AffectsSelectorIssue =
  | "empty"
  | "forceTraversal"
  | "noProfileSelector"
  | "missingProfileTypeName"
  | "unexpectedSegment";

export interface AffectsSelector {
  readonly value: string;
  readonly segments: readonly string[];
  /**
   * True only when the complete path decomposes into a traversal, an optional
   * single filter ID, and a profile-type selector. It does not promise that the
   * filter or profile type resolves against a catalogue, and it does not
   * execute anything.
   */
  readonly supported: boolean;
  readonly traversal: AffectsSelectorTraversal;
  readonly explicitSelf: boolean;
  /**
   * A single object ID narrowing the traversal. The observed corpus uses
   * category entries here, and once a selection entry. Resolving its kind needs
   * a catalogue graph, so the parser only records it.
   */
  readonly filterId?: ObjectId;
  /**
   * BattleScribe selects the target profile family by profile-type *name*.
   * No ID form is observed, so a consumer must resolve the name rather than
   * infer a target from a profile's own display name.
   */
  readonly profileTypeName?: string;
  readonly issues: readonly AffectsSelectorIssue[];
}

const traversalKeywords = new Set(["self", "entries", "forces", "recursive"]);

/**
 * Decomposes an observed BattleScribe `affects` selector into its parts.
 *
 * This is pure syntax. It resolves nothing against a roster or catalogue,
 * chooses no target, and executes no modifier. A caller holding the modifier
 * supplies the source location when turning an issue into a diagnostic.
 *
 * The supported shape is
 * `[self.][entries.][recursive.][<filterId>.]profiles.<profileTypeName>`.
 * Force traversal and paths that stop at an entry rather than a profile are
 * recorded as unsupported instead of being guessed.
 */
export function parseBattleScribeAffectsSelector(
  value: string,
): AffectsSelector {
  const segments = value.split(".");
  const issues: AffectsSelectorIssue[] = [];

  if (value.trim() === "") {
    return {
      value,
      segments,
      supported: false,
      traversal: "own",
      explicitSelf: false,
      issues: ["empty"],
    };
  }

  let index = 0;
  const explicitSelf = segments[index] === "self";
  if (explicitSelf) {
    index += 1;
  }

  let traversal: AffectsSelectorTraversal = "own";
  if (segments[index] === "entries") {
    traversal = "children";
    index += 1;
    if (segments[index] === "forces") {
      issues.push("forceTraversal");
      index += 1;
    }
    if (segments[index] === "recursive") {
      traversal = "descendants";
      index += 1;
    }
  }

  let filterId: ObjectId | undefined;
  const candidate = segments[index];
  if (
    candidate !== undefined &&
    candidate !== "profiles" &&
    !traversalKeywords.has(candidate)
  ) {
    filterId = objectId(candidate);
    index += 1;
  }

  let profileTypeName: string | undefined;
  if (segments[index] === "profiles") {
    index += 1;
    // Observed profile-type names contain spaces and punctuation but never a
    // dot, so the remaining segments are the complete name.
    const name = segments.slice(index).join(".");
    if (name === "") {
      issues.push("missingProfileTypeName");
    } else {
      profileTypeName = name;
    }
    index = segments.length;
  } else {
    issues.push("noProfileSelector");
  }

  if (index < segments.length) {
    issues.push("unexpectedSegment");
  }

  return {
    value,
    segments,
    supported: issues.length === 0,
    traversal,
    explicitSelf,
    ...(filterId === undefined ? {} : { filterId }),
    ...(profileTypeName === undefined ? {} : { profileTypeName }),
    issues,
  };
}

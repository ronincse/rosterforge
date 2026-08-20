import { objectId, type ObjectId } from "@rosterforge/foundation";

/**
 * How far from the owning occurrence an `affects` selector reaches.
 *
 * Confirmed against New Recruit on 2026-08-19. A Necron Skorpekh Lord's
 * unconditional `self.entries.profiles.…` increment does **not** reach weapons
 * that sit inside its `Wargear` selection-entry group, while a Death Guard
 * Helbrute's `self.entries.recursive.…` increment does reach equivalent
 * group members. So `entries` is the direct child *entry* collection and does
 * not descend into groups; `recursive` reaches all descendants.
 */
export type AffectsSelectorTraversal = "own" | "children" | "descendants";

export type AffectsSelectorIssue =
  | "empty"
  | "missingProfileTypeName"
  | "unexpectedSegment";

/**
 * What the selector's path terminates at.
 *
 * A path ending in `profiles.<typeName>` selects profiles on the occurrences
 * the traversal reached. A path that stops at the traversal or its filter
 * selects those occurrences themselves, which is what a modifier targeting a
 * selection-level field such as `category` needs. Both forms occur in the
 * pinned corpus and neither is a guess: the terminus is written in the path.
 */
export type AffectsSelectorTarget = "profiles" | "selections";

/**
 * Traversal keywords, consumed in any order and any number of times before an
 * optional filter ID. Real data uses several arrangements — `group` occurs
 * leading, after `entries`, and again after `recursive` — so position is not
 * fixed.
 */
const traversalSegments = new Set([
  "self",
  "entries",
  "forces",
  "group",
  "recursive",
]);

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
  /** What the path terminates at. See {@link AffectsSelectorTarget}. */
  readonly target: AffectsSelectorTarget;
  readonly explicitSelf: boolean;
  /**
   * True when the selector carries an explicit `group` segment, which enters
   * selection-entry groups. Without one, a `children` traversal reaches only
   * the owner's direct child entries.
   */
  readonly entersGroups: boolean;
  /**
   * True when the selector carries a `forces` segment, which leaves the
   * anchor's own subtree and reaches the roster's forces instead.
   *
   * All 24 corpus instances are detachment abilities written as
   * `self.entries.forces.recursive.…`, so the traversal keywords around it are
   * subsumed: the target set is every occurrence the forces contain.
   */
  readonly entersForces: boolean;
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

/**
 * Decomposes an observed BattleScribe `affects` selector into its parts.
 *
 * This is pure syntax. It resolves nothing against a roster or catalogue,
 * chooses no target, and executes no modifier. A caller holding the modifier
 * supplies the source location when turning an issue into a diagnostic.
 *
 * The supported shape is any arrangement of the traversal keywords `self`,
 * `entries`, `group`, and `recursive`, followed by an optional filter ID and
 * either `profiles.<profileTypeName>` or the selection terminus itself. Force
 * traversal is recorded as unsupported instead of being guessed.
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
      target: "selections",
      explicitSelf: false,
      entersGroups: false,
      entersForces: false,
      issues: ["empty"],
    };
  }

  let index = 0;
  let explicitSelf = false;
  let entries = false;
  let entersGroups = false;
  let entersForces = false;
  let recursive = false;
  while (
    index < segments.length &&
    traversalSegments.has(segments[index] as string)
  ) {
    const segment = segments[index] as string;
    if (segment === "self") explicitSelf = true;
    else if (segment === "entries") entries = true;
    else if (segment === "group") entersGroups = true;
    else if (segment === "forces") entersForces = true;
    else if (segment === "recursive") recursive = true;
    index += 1;
  }
  const traversal: AffectsSelectorTraversal = recursive
    ? "descendants"
    : entries || entersGroups
      ? "children"
      : "own";

  let filterId: ObjectId | undefined;
  const candidate = segments[index];
  if (candidate !== undefined && candidate !== "profiles") {
    filterId = objectId(candidate);
    index += 1;
  }

  let profileTypeName: string | undefined;
  let target: AffectsSelectorTarget = "selections";
  if (segments[index] === "profiles") {
    target = "profiles";
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
  }
  // A path that stops here selects the reached occurrences rather than their
  // profiles. That is not a malformed profile path: 106 corpus selectors take
  // this form, all of them on modifiers targeting `category`, a field that
  // lives on the selection rather than on any profile.

  if (index < segments.length) {
    issues.push("unexpectedSegment");
  }

  return {
    value,
    segments,
    supported: issues.length === 0,
    traversal,
    target,
    explicitSelf,
    entersGroups,
    entersForces,
    ...(filterId === undefined ? {} : { filterId }),
    ...(profileTypeName === undefined ? {} : { profileTypeName }),
    issues,
  };
}

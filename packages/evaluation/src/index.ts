/**
 * Deterministic evaluation over a roster and a catalogue context.
 *
 * Nothing here touches React, persistence, or the browser, and nothing here
 * mutates its inputs. The same roster and context always produce the same
 * report.
 *
 * Where to start, by question:
 *
 * - *Is this roster legal?* `validation.ts` composes the answer from
 *   `structural-status.ts`, `constraints.ts`, and `force-constraints.ts`,
 *   and states the two-dimensional validity/completeness contract that
 *   every report in this package obeys.
 * - *What does this profile show?* `characteristics.ts` — the largest
 *   surface here, covering characteristic operations, profile and selection
 *   annotation, and name modifiers.
 * - *What does it cost?* `costs.ts`, in three widening passes: base,
 *   unconditional modifiers, then selection conditions.
 * - *What keywords does it have?* `categories.ts`, with
 *   `effective-categories.ts` feeding membership back into conditions under
 *   a single-pass rule.
 * - *Which modifiers apply?* `conditions.ts`, `modifier-applicability.ts`,
 *   `modifier-groups.ts`, and `repeats.ts` decide whether; `modifiers.ts`
 *   runs numeric sequences.
 * - *Where do they land?* `affects.ts` parses the selector,
 *   `affects-routing.ts` walks it. That file is the best-documented one in
 *   the package and a fair sample of the house style.
 * - *What can be chosen next?* `initialization.ts`,
 *   `selection-default-amount.ts`, and `selection-visibility.ts`.
 *
 * `docs/compatibility.md` is the exhaustive record of which BattleScribe
 * behaviour this package executes and which it withholds.
 */

export * from "./affects.js";
export * from "./affects-routing.js";
export * from "./categories.js";
export * from "./category-constraints.js";
export * from "./characteristics.js";
export * from "./costs.js";
export * from "./effective-categories.js";
export * from "./conditions.js";
export * from "./constraints.js";
export * from "./force-constraints.js";
export * from "./initialization.js";
export * from "./modifier-applicability.js";
export * from "./modifier-groups.js";
export * from "./modifiers.js";
export * from "./repeats.js";
export * from "./selection-default-amount.js";
export * from "./selection-visibility.js";
export * from "./structural-status.js";
export * from "./validation.js";

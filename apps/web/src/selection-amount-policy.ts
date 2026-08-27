/**
 * Pure presentation policy for changing one roster-selection occurrence amount.
 *
 * BattleScribe selection bounds usually govern an aggregate under a parent,
 * while the editor changes only one contributing occurrence. Keeping the
 * observed aggregate beside each bound lets the UI test the proposed delta
 * without pretending that an aggregate limit is a per-input limit.
 */

export interface KnownSelectionAmountBound {
  readonly type: "min" | "max";
  readonly limit: number;
  readonly observed: number;
}

/**
 * Returns whether a positive finite target respects the complete known bounds.
 *
 * A currently legal value may only move to another legal value. When imported
 * or previously-created state is already outside a known bound, a partial
 * repair remains available if it worsens no known bound and strictly improves
 * at least one. This prevents the editor from trapping an invalid roster while
 * also preventing a recovery edit from trading one known violation for another.
 */
export function selectionAmountChangeAllowed(
  currentAmount: number,
  targetAmount: number,
  bounds: readonly KnownSelectionAmountBound[],
): boolean {
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) return false;
  if (bounds.length === 0) return true;

  const currentViolations = bounds.map((bound) =>
    selectionAmountBoundViolation(currentAmount, currentAmount, bound),
  );
  const targetViolations = bounds.map((bound) =>
    selectionAmountBoundViolation(currentAmount, targetAmount, bound),
  );
  if (targetViolations.every((violation) => violation === 0)) return true;

  return (
    targetViolations.every(
      (violation, index) => violation <= (currentViolations[index] ?? 0),
    ) &&
    targetViolations.some(
      (violation, index) => violation < (currentViolations[index] ?? 0),
    )
  );
}

/** Whether the current amount already satisfies every complete known bound. */
export function selectionAmountSatisfiesBounds(
  currentAmount: number,
  bounds: readonly KnownSelectionAmountBound[],
): boolean {
  return bounds.every(
    (bound) =>
      selectionAmountBoundViolation(currentAmount, currentAmount, bound) === 0,
  );
}

function selectionAmountBoundViolation(
  currentAmount: number,
  targetAmount: number,
  bound: KnownSelectionAmountBound,
): number {
  const targetObserved = bound.observed - currentAmount + targetAmount;
  return bound.type === "min"
    ? Math.max(0, bound.limit - targetObserved)
    : Math.max(0, targetObserved - bound.limit);
}

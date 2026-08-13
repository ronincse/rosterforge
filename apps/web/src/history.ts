export const defaultHistoryLimit = 100;

export interface BoundedHistory<Value> {
  readonly past: readonly Value[];
  readonly present: Value;
  readonly future: readonly Value[];
}

export function createBoundedHistory<Value>(
  value: Value,
): BoundedHistory<Value> {
  return { past: [], present: value, future: [] };
}

export function commitBoundedHistory<Value>(
  history: BoundedHistory<Value>,
  value: Value,
  limit = defaultHistoryLimit,
): BoundedHistory<Value> {
  if (value === history.present) return history;
  const past = [...history.past, history.present];
  return {
    past: past.slice(Math.max(0, past.length - normalizedLimit(limit))),
    present: value,
    future: [],
  };
}

export function undoBoundedHistory<Value>(
  history: BoundedHistory<Value>,
): BoundedHistory<Value> {
  const present = history.past.at(-1);
  if (present === undefined) return history;
  return {
    past: history.past.slice(0, -1),
    present,
    future: [history.present, ...history.future],
  };
}

export function redoBoundedHistory<Value>(
  history: BoundedHistory<Value>,
): BoundedHistory<Value> {
  const present = history.future[0];
  if (present === undefined) return history;
  return {
    past: [...history.past, history.present],
    present,
    future: history.future.slice(1),
  };
}

function normalizedLimit(limit: number): number {
  if (!Number.isFinite(limit)) return defaultHistoryLimit;
  return Math.max(0, Math.floor(limit));
}

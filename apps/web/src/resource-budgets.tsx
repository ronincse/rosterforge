// Small roster configuration controls; all arithmetic and limit interpretation
// come from evaluation. Editor leaves receive scalars, never imported bytes.
import { useEffect, useId, useRef, useState } from "react";
import type { ObjectId } from "@rosterforge/foundation";
import type { ResourceLimitState, RosterResourceBudgetsReport } from "@rosterforge/evaluation";

type ChangeBudget = (typeId: ObjectId, value: number | undefined) => void;
/** Shows independent resource totals and commits explicit player choices through
 * normal roster history. In-progress text is local until Apply/Enter. */
export function ResourceBudgets({ report, onChange }: { readonly report: RosterResourceBudgetsReport; readonly onChange?: ChangeBudget | undefined }) {
  const visible = report.resources.filter(item => item.resource.effective.kind === "finite" || item.value !== 0 || item.resource.override !== undefined);
  if (report.resources.length === 0) return null;
  return <section className="resource-budgets" aria-labelledby="resource-budgets-heading">
    <h3 id="resource-budgets-heading" tabIndex={-1}>Resources</h3>
    <div className="resource-budget-totals">{visible.map(({ resource, value, exact, status }) => <p key={resource.typeId}>
      <strong>{resource.definitions[0]?.name?.trim() ?? resource.typeId}</strong>{" "}
      {value.toLocaleString()} {exact ? "total" : "provisional total"}{" · "}{limitLabel(resource.effective)}
      {resource.effective.kind === "finite" && exact ? ` · ${Math.abs(resource.effective.value - value).toLocaleString()} ${status === "violated" ? "over budget" : "remaining"}` : ""}
    </p>)}</div>
    <details><summary>Configure resource budgets</summary>
      <p>Each limit is independent. Other catalogue requirements still apply. Use -1 for no limit.</p>
      {report.resources.map(({ resource }) => <BudgetEditor key={`${report.roster.id}:${resource.typeId}`}
        typeId={resource.typeId} name={resource.definitions[0]?.name?.trim() ?? resource.typeId}
        sourceLabel={resource.authored.kind === "unresolved" && resource.definitions[0]?.defaultCostLimit !== undefined
          ? `declared ${resource.definitions[0].defaultCostLimit}; activation unverified` : limitLabel(resource.authored)}
        effectiveLabel={limitLabel(resource.effective)}
        current={resource.override ?? (resource.effective.kind === "finite" || resource.effective.kind === "unbounded" ? resource.effective.value : undefined)}
        overridden={resource.override !== undefined} enabled={resource.definitions.length === 1 && onChange !== undefined}
        onChange={onChange} />)}
    </details>
  </section>;
}
function limitLabel(state: ResourceLimitState): string {
  return state.kind === "finite" ? `limit ${state.value.toLocaleString()}` : state.kind === "unbounded" ? "no configured limit"
    : state.kind === "absent" ? "no source limit" : state.kind === "invalid" ? "invalid source limit" : "source limit unverified";
}
function BudgetEditor({ typeId, name, sourceLabel, effectiveLabel, current, overridden, enabled, onChange }: {
  readonly typeId: ObjectId; readonly name: string; readonly sourceLabel: string; readonly effectiveLabel: string;
  readonly current: number | undefined; readonly overridden: boolean; readonly enabled: boolean; readonly onChange: ChangeBudget | undefined;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(current?.toString() ?? "");
  const [error, setError] = useState("");
  useEffect(() => { setText(current?.toString() ?? ""); setError(""); }, [current, overridden]);
  return <form className="resource-budget-editor" onSubmit={event => {
    event.preventDefault();
    const value = Number(text);
    if (!text.trim() || !Number.isFinite(value) || (value < 0 && value !== -1)) {
      setError("Enter a nonnegative number, or -1 for no limit."); return;
    }
    setError(""); onChange?.(typeId, value);
  }}>
    <label htmlFor={id}>{name} budget</label>
    <small id={`${id}-help`}>{overridden ? "Player override" : "Source default"}: {effectiveLabel}. Source: {sourceLabel}.</small>
    <div className="resource-budget-inputs"><input ref={input} id={id} aria-describedby={`${id}-help`} aria-invalid={!!error}
      inputMode="decimal" value={text} disabled={!enabled} onChange={event => setText(event.target.value)} />
      <button type="submit" disabled={!enabled}>Apply {name} budget</button>
      <button type="button" disabled={!overridden || onChange === undefined} onClick={() => { onChange?.(typeId, undefined); setError(""); input.current?.focus(); }}>Reset {name} budget</button>
    </div>{error && <p role="alert">{error}</p>}
  </form>;
}

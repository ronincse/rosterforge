// The options surface for occurrence-based assignments. Imported filters are
// evaluated headlessly; this view does not infer eligibility from rule prose.
import { useMemo } from "react";
import { inspectRosterAssociationChoices } from "@rosterforge/evaluation";
import type { RosterDefinitionKey, RosterSelection, SelectionOccurrenceId } from "@rosterforge/roster-model";
import type { LocalRosterSession } from "./roster-session.js";

export type SetAssociation = (source: SelectionOccurrenceId, key: RosterDefinitionKey, target: SelectionOccurrenceId | undefined) => void;

/** Show authored targets and retained stale edges without rebinding by name. */
export function AssociationOptions({session, selection, onSet}: {readonly session: LocalRosterSession; readonly selection: RosterSelection; readonly onSet: SetAssociation}) {
  const choices = useMemo(() => inspectRosterAssociationChoices(session.roster, session.catalogue.context, selection), [session, selection]);
  const saved = session.roster.associations?.filter(a => a.sourceId === selection.id) ?? [];
  const incoming = session.roster.associations?.filter(a => a.targetId === selection.id) ?? [];
  const sourceLinks = session.selectionChoices.get(selection.id)?.associationLinks.length ?? 0;
  if (!choices.length && !saved.length && !incoming.length && !sourceLinks) return null;
  const names = new Map<SelectionOccurrenceId, string>();
  const forces = [...session.roster.forces];
  while (forces.length) {
    const force = forces.pop()!;
    forces.push(...force.forces);
    const selections = [...force.selections];
    while (selections.length) {
      const entry = selections.pop()!;
      names.set(entry.id, entry.name ?? "Unnamed unit");
      selections.push(...entry.selections);
    }
  }
  return <section className="association-options" aria-label={`Attachments for ${selection.name ?? "unit"}`}>
    {choices.map(choice => {
      const existing = saved.find(a => a.definitionKey === choice.key);
      const candidates = choice.candidates.filter(c => c.status !== "unsatisfied");
      return <fieldset key={choice.key}><legend>{choice.name}</legend>
        {!choice.supported ? <p>This attachment format is not supported yet.</p> : <>
          <p>Choose one unit from your roster.</p>
          {candidates.map((candidate, index) => <button type="button" key={candidate.selection.id} disabled={candidate.status !== "satisfied"} aria-pressed={existing?.targetId === candidate.selection.id} onClick={() => onSet(selection.id, choice.key, existing?.targetId === candidate.selection.id ? undefined : candidate.selection.id)}>
            {candidate.selection.name ?? "Unnamed unit"} · squad {index + 1}{candidate.status === "unresolved" ? " — eligibility unverified" : ""}
          </button>)}
          {!candidates.length && <p>No eligible units have been added.</p>}
        </>}
        {existing && <p>Attached to {names.get(existing.targetId) ?? "unavailable unit"}. <button type="button" onClick={() => onSet(selection.id, choice.key, undefined)}>Detach</button>
          {!choice.candidates.some(c => c.selection.id === existing.targetId && c.status === "satisfied") && " Eligibility is no longer verified; detach or revise this assignment."}</p>}
      </fieldset>;
    })}
    {saved.filter(a => !choices.some(c => c.key === a.definitionKey)).map(a => <p key={a.definitionKey}>Attachment definition unavailable. <button type="button" onClick={() => onSet(selection.id, a.definitionKey, undefined)}>Detach</button></p>)}
    {incoming.map(a => <p key={a.sourceId + a.definitionKey}>Attached: {names.get(a.sourceId) ?? "unavailable unit"}</p>)}
    {sourceLinks > 0 && <p>Some linked attachment definitions are not supported yet.</p>}
    <p className="reference-source-note">Attachments are saved separately. Attached-unit effects and incoming leader limits are not fully checked.</p>
  </section>;
}

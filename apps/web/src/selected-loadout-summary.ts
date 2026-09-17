// Shared selected model/loadout summaries. Presentation only; quantities use
// the roster-model helper and never multiply a weapon's profile statistics.
import type { BattleScribeRosterSelectionChoice } from "@rosterforge/roster-builder";
import { rosterSelectionAmount } from "@rosterforge/roster-model";
import { localRosterSelectionChoice, type LocalRosterSession } from "./roster-session.js";
import type { RosterWorkspaceSelection } from "./roster-workspace-model.js";

export interface UnitComposition {
  readonly total: number;
  readonly entries: readonly {
    readonly key: string;
    readonly name: string;
    readonly amount: number;
    readonly loadout: readonly SelectedChoiceSummary[];
  }[];
}

export interface SelectedChoiceSummary {
  readonly key: string;
  readonly name: string;
  readonly amount: number;
}

/** Collects selected upgrade occurrences without inferring equipment by name. */
export function selectedUpgradeSummary(
  session: LocalRosterSession,
  selections: readonly RosterWorkspaceSelection[],
  excludedChoiceKeys: ReadonlySet<string> = new Set(),
  label?: (selection: RosterWorkspaceSelection) => string,
): readonly SelectedChoiceSummary[] {
  const entries = new Map<string, SelectedChoiceSummary>();
  const visit = (selection: RosterWorkspaceSelection): void => {
    const choice = localRosterSelectionChoice(
      session,
      selection.occurrence.id,
    );
    if (
      choice?.kind === "selectionEntry" &&
      choice.type === "upgrade" &&
      !excludedChoiceKeys.has(selectionChoiceKey(choice))
    ) {
      const name = label?.(selection) ?? selectionChoiceLabel(choice);
      const key = selectionChoiceKey(choice) + (label ? JSON.stringify(name) : "");
      const existing = entries.get(key);
      entries.set(key, {
        key,
        name,
        amount:
          (existing?.amount ?? 0) +
          rosterSelectionAmount(selection.occurrence),
      });
    }
    for (const child of selection.selections) visit(child);
  };
  for (const selection of selections) visit(selection);
  return [...entries.values()];
}

/** Join selected choices without claiming quantities multiply profile values. */
export function formatSelectedChoiceSummary(
  choices: readonly SelectedChoiceSummary[],
): string {
  return choices
    .map(({ amount, name }) => (amount > 1 ? `${amount}× ${name}` : name))
    .join(" · ");
}

/**
 * Folds exact promoted model occurrences into the compact unit-card summary.
 *
 * Repeated occurrences and one occurrence with an amount override are the two
 * legal roster shapes for multiple models. Both count through the roster-model
 * helper. Grouping keys come from the exact materialized model and selected
 * upgrade choices rather than player renames or profile-name guesses, so two
 * models of one type remain separate when their selected loadouts differ.
 */
export function createModelComposition(
  session: LocalRosterSession,
  models: readonly RosterWorkspaceSelection[],
  label?: (selection: RosterWorkspaceSelection) => string,
): UnitComposition {
  const entries = new Map<
    string,
    {
      key: string;
      name: string;
      amount: number;
      loadout: readonly SelectedChoiceSummary[];
    }
  >();
  let total = 0;
  for (const model of models) {
    const occurrence = model.occurrence;
    const amount = rosterSelectionAmount(occurrence);
    const choice = localRosterSelectionChoice(session, occurrence.id);
    const name = label?.(model) ?? (choice === undefined
        ? occurrence.name ?? "Unnamed model"
        : selectionChoiceLabel(choice));
    const key =
      choice === undefined
        ? `occurrence:${occurrence.id}`
        : selectionChoiceKey(choice);
    const loadout = selectedUpgradeSummary(session, model.selections, new Set(), label);
    const loadoutKey = loadout
      .map(({ key: choiceKey, amount: choiceAmount }) =>
        `${choiceKey}:${choiceAmount}`,
      )
      .join("|");
    const compositionKey = `${key}:${loadoutKey}:${label ? JSON.stringify(name) : ""}`;
    total += amount;
    const existing = entries.get(compositionKey);
    entries.set(compositionKey, {
      key: compositionKey,
      name,
      amount: (existing?.amount ?? 0) + amount,
      loadout,
    });
  }
  return {
    total,
    entries: [...entries.values()],
  };
}

/** Identity of the exact imported choice carrier, never a display name. */
export function selectionChoiceKey(choice: BattleScribeRosterSelectionChoice): string {
  return JSON.stringify([
    choice.occurrence.source.sourceId,
    ...choice.occurrence.path,
  ]);
}

/** Legacy source label for editing summaries; document callers override names. */
export function selectionChoiceLabel(
  choice: BattleScribeRosterSelectionChoice,
): string {
  return choice.name ?? choice.id ?? "Unnamed selection";
}

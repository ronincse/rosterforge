// Application-supplied StarCraft budget presets, separate from imported evaluation.
import type { BattleScribeCatalogueContext } from "@rosterforge/data-graph";
import { objectId, type ObjectId } from "@rosterforge/foundation";

const gameSystemId = objectId("sys-ce49-e853-2fea-6af1");
const mineralsTypeId = objectId("5bcf-897a-a5c9-d0e8");
const gasTypeId = objectId("1719-6214-392e-e53f");

export interface StarcraftGameSizePreset {
  readonly id: "skirmish" | "standard";
  readonly label: string;
  readonly mineralsTypeId: ObjectId;
  readonly minerals: number;
  readonly gasTypeId: ObjectId;
  readonly gas: number;
  readonly ruleVersion: string;
  readonly sourceUrl: string;
}

// Organised Play Guide v1.0, p4 publishes these two fixed pairs. Its rules do
// not establish one fixed Grand Offensive size or arbitrary-value rounding.
const presets: readonly StarcraftGameSizePreset[] = Object.freeze([
  Object.freeze({
    id: "skirmish" as const,
    label: "Skirmish",
    mineralsTypeId,
    minerals: 1000,
    gasTypeId,
    gas: 100,
    ruleVersion: "Organised Play Guide v1.0",
    sourceUrl: "https://starcraft-tmg.com/files/downloads/StarCraft-TMG-Organised-Play_EN.pdf",
  }),
  Object.freeze({
    id: "standard" as const,
    label: "Standard",
    mineralsTypeId,
    minerals: 2000,
    gasTypeId,
    gas: 200,
    ruleVersion: "Organised Play Guide v1.0",
    sourceUrl: "https://starcraft-tmg.com/files/downloads/StarCraft-TMG-Organised-Play_EN.pdf",
  }),
]);
const unavailable: readonly StarcraftGameSizePreset[] = Object.freeze([]);

/** Offers two explicit application presets only for an unambiguous loaded
 * StarCraft system/currency identity. Names and current Browse source are not
 * evidence; local imports and restored older snapshots use their own context.
 * This reads the selected dependency closure without copying retained bytes.
 * It never applies limits: callers must use ordinary budget commands after an
 * explicit player choice, preserving Custom values until then.
 */
export function starcraftGameSizePresets(
  context: BattleScribeCatalogueContext,
): readonly StarcraftGameSizePreset[] {
  const { document, graph } = context;
  if (document.projection.metadata.gameSystemId !== gameSystemId) return unavailable;
  const references = graph.references.filter(reference =>
    reference.sourceDocument === document && reference.kind === "catalogueGameSystem",
  );
  const reference = references[0];
  if (references.length !== 1 || reference?.targets.length !== 1) return unavailable;
  const target = reference.targets[0];
  if (target?.kind !== "gameSystem" || target.id !== gameSystemId) return unavailable;

  const closure = graph.reachableDocumentsByDocument.get(document);
  if (closure === undefined || !closure.has(document) || !closure.has(target.document)) return unavailable;
  if (graph.references.some(dependency => closure.has(dependency.sourceDocument)
    && (dependency.kind === "catalogueGameSystem" || dependency.kind === "catalogueLink")
    && dependency.targets.length !== 1)) return unavailable;
  const systems = [...closure].filter(member => member.metadata.kind === "gameSystem");
  if (systems.length !== 1 || systems[0] !== target.document) return unavailable;

  // Use the same reachable cost definitions as budget resolution, but require
  // each ID to belong uniquely to the resolved GST. A duplicate in a linked
  // catalogue must not make a misleading preset appear actionable.
  for (const id of [mineralsTypeId, gasTypeId]) {
    const definitions = [...closure].flatMap(member => member.projection.costTypes
      .filter(costType => costType.id === id)
      .map(() => member));
    if (definitions.length !== 1 || definitions[0] !== target.document) return unavailable;
  }
  return presets;
}

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { OrderedXmlElement } from "@rosterforge/battlescribe-data";
import type { LocalBattleScribeFile } from "@rosterforge/repository";
import type { BattleScribeRosterSelectionChoice } from "@rosterforge/roster-builder";
import {
  forceOccurrenceId,
  rosterId,
  selectionOccurrenceId,
  type RosterSelection,
} from "@rosterforge/roster-model";

import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
import {
  addLocalRosterChildSelection,
  addLocalRosterRootSelection,
  chooseLocalRosterChildGroupEntry,
  createLocalRosterSession,
  evaluateLocalRosterCosts,
  inspectLocalRosterChildChoices,
  inspectLocalRosterConstraints,
  inspectLocalRosterRootChoices,
  inspectLocalRosterStructuralStatus,
  inspectLocalRosterSupportedValidation,
  localRosterChildChoices,
  localRosterRootChoiceGroups,
  localRosterRootChoices,
  localRosterSelectionCount,
  restoreLocalRosterSession,
  type LocalRosterSession,
} from "./roster-session.js";

const realDataDirectory = process.env.ROSTERFORGE_BSDATA_JSON_DIR;

describe.skipIf(realDataDirectory === undefined)(
  "pinned real BSData JSON integration",
  () => {
    it(
      "imports and composes every JSON document in the supplied repository",
      async () => {
        if (realDataDirectory === undefined) {
          throw new Error("The integration data directory is not configured.");
        }
        const files = realJsonFiles(realDataDirectory);
        const result = await prepareLocalCatalogueLibrary(files, {
          import: {
            batchId: "real-bsdata-json",
            importedAt: "2026-07-23T00:00:00.000Z",
          },
        });

        expect(files).toHaveLength(46);
        expect(result.ok).toBe(true);
        if (!result.ok) {
          return;
        }
        expect(result.value.importReport.status).toBe("complete");
        expect(result.value.status).toBe("partial");
        expect(result.value.importReport.files.every(
          ({ status }) => status === "imported",
        )).toBe(true);
        expect(result.value.documents).toHaveLength(46);
        expect(result.value.gameSystems).toHaveLength(1);
        expect(result.value.gameSystems[0]?.metadata).toMatchObject({
          kind: "gameSystem",
          id: "sys-352e-adc2-7639-d610",
          name: "Warhammer 40,000 11th Edition",
        });
        expect(result.value.catalogues).toHaveLength(45);
        expect(
          result.value.catalogues.find(
            ({ name }) => name === "Imperium - Imperial Knights",
          ),
        ).toBeDefined();
        expect(
          result.value.documents.every(
            ({ sourceFormat }) => sourceFormat === "json",
          ),
        ).toBe(true);
        expect(
          identityConditionScopeCounts(
            result.value.documents.map(({ root }) => root),
          ),
        ).toEqual({
          parent: 1_084,
          self: 72,
          localConditionGroupsSelf: 339,
        });
        expect(
          extensionConditionGroupSummary(
            result.value.documents.map(({ root }) => root),
          ),
        ).toEqual({
          localGroups: 339,
          localAtLeast: 339,
          localParent: 339,
          nestedBefore: 339,
          nestedInstanceOf: 339,
          countGroups: 59,
        });
        expect(
          negativeConstraintSummary(
            result.value.documents.map(({ root }) => root),
          ),
        ).toEqual({
          total: 26,
          min: 5,
          max: 21,
          selections: 17,
          costs: 9,
          parent: 5,
          force: 15,
          roster: 6,
        });
        expect(
          groupedHiddenModifierSummary(
            result.value.documents.map(({ root }) => root),
          ),
        ).toEqual({
          total: 309,
          setTrue: 295,
          setFalse: 14,
          maximumDepth: 1,
          unsupportedModifierShapes: 0,
          unsupportedGroupShapes: 0,
        });
        expect(
          groupedCostModifierSummary(
            result.value.documents.map(({ root }) => root),
          ),
        ).toEqual({
          total: 305,
          set: 23,
          increment: 131,
          decrement: 21,
          divide: 130,
          other: 0,
          groups: 130,
          andGroups: 123,
          missingTypeGroups: 7,
          maximumDepth: 1,
          modifierRepeats: 23,
          groupRepeats: 0,
        });
        const selectableCatalogues = result.value.selectableCatalogues;
        expect(selectableCatalogues).toHaveLength(36);
        expect(selectableCatalogues).toEqual(
          result.value.catalogues.filter(
            ({ document }) => document.metadata.library !== true,
          ),
        );
        expect(
          selectableCatalogues
            .filter(({ context }) => context.forces.definitions.length === 0)
            .map(({ name }) => name),
        ).toEqual([]);
        expect(
          selectableCatalogues
            .filter((catalogue) => localRosterRootChoices(catalogue).length === 0)
            .map(({ name }) => name),
        ).toEqual([]);
        expect(
          result.diagnostics.filter(({ code }) => code.startsWith("BS_JSON_")),
        ).toEqual([]);
        expect(result.value.contexts.roots.truncated).toBe(false);
        expect(
          result.value.contexts.roots.expandedEntryLinks,
        ).toBeGreaterThan(50_000);
        expect(
          result.value.contexts.roots.expandedEntryLinks,
        ).toBeLessThanOrEqual(250_000);
        const graphDiagnosticSummary = Object.fromEntries(
          [...new Set(
            result.diagnostics
              .filter(
                ({ code }) => code !== "BS_PROJECTION_INVALID_ATTRIBUTE",
              )
              .map(({ code }) => code),
          )].map((code) => [
            code,
            result.diagnostics.filter(
              (diagnostic) => diagnostic.code === code,
            ).length,
          ]),
        );
        const missingReferences = result.diagnostics.filter(
          ({ code }) => code === "BS_GRAPH_MISSING_REFERENCE",
        );
        expect(graphDiagnosticSummary).toEqual({
          BS_GRAPH_DUPLICATE_ID: 2,
          BS_GRAPH_MISSING_REFERENCE: 60,
          BS_MATERIALIZATION_ENTRY_LINK_CYCLE: 2,
        });
        expect(
          missingReferences.reduce(
            (total, { details }) =>
              total + Number(details?.occurrenceCount ?? 0),
            0,
          ),
        ).toBe(147);
        expect(
          missingReferences.filter(
            ({ details }) => details?.kind === "defaultSelectionEntry",
          ),
        ).toHaveLength(57);
        expect(
          missingReferences.filter(
            ({ details }) => details?.kind === "costType",
          ),
        ).toHaveLength(3);
        expect(
          result.diagnostics.filter(
            ({ code }) => code === "BS_PROJECTION_INVALID_ATTRIBUTE",
          ),
        ).toEqual([
          expect.objectContaining({
            details: {
              attribute: "defaultCostLimit",
              expectedType: "number",
              value: "",
            },
            location: expect.objectContaining({
              source: expect.objectContaining({
                filename: "Warhammer 40,000.json",
              }),
              path: [
                "gameSystem",
                "costTypes[0]",
                "costType[7]",
                "@defaultCostLimit",
              ],
            }),
          }),
        ]);
      },
      120_000,
    );

    it(
      "builds an Imperial Knights roster session from its catalogue closure",
      async () => {
        if (realDataDirectory === undefined) {
          throw new Error("The integration data directory is not configured.");
        }
        const requiredFilenames = new Set([
          "Warhammer 40,000.json",
          "Imperium - Imperial Knights.json",
          "Imperium - Imperial Knights - Library.json",
          "Imperium - Agents of the Imperium.json",
          "Imperium - Adeptus Mechanicus.json",
          "Library - Titans.json",
          "Unaligned Forces.json",
        ]);
        const result = await prepareLocalCatalogueLibrary(
          realJsonFiles(realDataDirectory).filter(({ filename }) =>
            requiredFilenames.has(filename),
          ),
          {
            import: {
              batchId: "real-bsdata-json-imperial-knights",
              importedAt: "2026-07-23T00:00:00.000Z",
            },
          },
        );

        expect(result.ok).toBe(true);
        if (!result.ok) {
          return;
        }
        expect(result.value.documents).toHaveLength(requiredFilenames.size);
        expect(result.value.contexts.roots.truncated).toBe(false);
        expect(
          result.diagnostics.some(
            ({ code }) => code === "BS_MATERIALIZATION_RESOURCE_LIMIT",
          ),
        ).toBe(false);

        const catalogue = result.value.catalogues.find(
          ({ name }) => name === "Imperium - Imperial Knights",
        );
        expect(catalogue).toBeDefined();
        const forceDefinition = catalogue?.context.forces.definitions[0];
        expect(forceDefinition).toBeDefined();
        if (catalogue === undefined || forceDefinition === undefined) {
          return;
        }

        const session = createLocalRosterSession(
          catalogue,
          forceDefinition,
          {
            rosterId: rosterId("real-imperial-knights-roster"),
            forceId: forceOccurrenceId("real-imperial-knights-force"),
            name: "Integration Roster",
          },
        );
        expect(session.ok).toBe(true);
        if (!session.ok) {
          return;
        }
        const rootChoices = localRosterRootChoices(session.value.catalogue);
        expect(rootChoices.length).toBeGreaterThan(0);
        const knightPaladin = rootChoices.find(
          ({ materialized }) => materialized.name === "Knight Paladin",
        );
        expect(knightPaladin).toBeDefined();
        if (knightPaladin === undefined) {
          return;
        }
        const withKnight = addLocalRosterRootSelection(
          session.value,
          knightPaladin,
          {
            selectionId: selectionOccurrenceId(
              "real-imperial-knights-paladin",
            ),
          },
        );
        expect(withKnight.ok).toBe(true);
        if (!withKnight.ok) {
          return;
        }
        const wargear = localRosterChildChoices(
          withKnight.value,
          selectionOccurrenceId("real-imperial-knights-paladin"),
        ).find(({ name }) => name === "Wargear");
        expect(wargear).toBeDefined();
        if (wargear === undefined) {
          return;
        }
        const withWargear = addLocalRosterChildSelection(
          withKnight.value,
          selectionOccurrenceId("real-imperial-knights-paladin"),
          wargear,
          {
            selectionId: selectionOccurrenceId(
              "real-imperial-knights-paladin-wargear",
            ),
          },
        );
        expect(withWargear.ok).toBe(true);
        if (!withWargear.ok) {
          return;
        }
        expect(
          localRosterChildChoices(
            withWargear.value,
            selectionOccurrenceId(
              "real-imperial-knights-paladin-wargear",
            ),
          ).map(({ name }) => name),
        ).toEqual(
          expect.arrayContaining([
            "Questoris heavy stubber",
            "Rapid-fire battle cannon",
            "Carapace-mounted Weapon",
            "Meltagun",
            "Reaper Chainsword",
          ]),
        );
        const costs = evaluateLocalRosterCosts(withWargear.value);
        expect(costs.ok).toBe(true);
        if (!costs.ok) {
          return;
        }
        expect(
          costs.value.totals.find(
            ({ costType }) => costType.name === "pts",
          ),
        ).toMatchObject({ value: 375 });
      },
      120_000,
    );

    it(
      "expands Guardian Defenders from unconditional real-data defaults",
      async () => {
        if (realDataDirectory === undefined) {
          throw new Error("The integration data directory is not configured.");
        }
        const requiredFilenames = new Set([
          "Warhammer 40,000.json",
          "Aeldari - Craftworlds.json",
          "Aeldari - Aeldari Library.json",
          "Unaligned Forces.json",
        ]);
        const result = await prepareLocalCatalogueLibrary(
          realJsonFiles(realDataDirectory).filter(({ filename }) =>
            requiredFilenames.has(filename),
          ),
          {
            import: {
              batchId: "real-bsdata-json-aeldari-initialization",
              importedAt: "2026-07-23T00:00:00.000Z",
            },
          },
        );
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const catalogue = result.value.catalogues.find(
          ({ name }) => name === "Xenos - Aeldari",
        );
        const forceDefinition = catalogue?.context.forces.definitions[0];
        expect(catalogue).toBeDefined();
        expect(forceDefinition).toBeDefined();
        if (catalogue === undefined || forceDefinition === undefined) {
          return;
        }
        let automaticRootId = 0;
        const created = createLocalRosterSession(
          catalogue,
          forceDefinition,
          {
            rosterId: rosterId("real-aeldari-roster"),
            forceId: forceOccurrenceId("real-aeldari-force"),
            name: "Aeldari Integration Roster",
            createSelectionId: () =>
              selectionOccurrenceId(
                `real-aeldari-root-${++automaticRootId}`,
              ),
          },
        );
        if (!created.ok) throw new Error("Expected Aeldari roster session.");
        expect(created.diagnostics).toEqual([]);
        expect(
          created.value.roster.forces[0]?.selections.map(
            ({ name }) => name,
          ),
        ).toEqual([
          "Detachment",
          "Battle Focus - Agile Manoeuvres",
          "Battle Size",
          "Force Disposition",
        ]);
        expect(automaticRootId).toBe(4);
        const inspectedRoots = inspectLocalRosterRootChoices(created.value);
        expect(inspectedRoots.ok).toBe(true);
        if (!inspectedRoots.ok) return;
        const battleSizeRootState = inspectedRoots.value.groups
          .flatMap(({ choices }) => choices)
          .find(
            ({ choice }) =>
              choice.materialized.name === "Battle Size",
          );
        expect(battleSizeRootState).toMatchObject({
          minimum: 1,
          maximum: 1,
          remaining: 0,
          selected: [{ name: "Battle Size" }],
          completeness: "complete",
        });
        const structuralStatus =
          inspectLocalRosterStructuralStatus(created.value);
        expect(structuralStatus.ok).toBe(true);
        if (!structuralStatus.ok) return;
        expect(structuralStatus.value.validity).toBe("invalid");
        expect(
          structuralStatus.value.bounds.find(
            (bound) =>
              bound.kind === "root" &&
              bound.root.materialized.name === "Battle Size",
          ),
        ).toMatchObject({
          selectedCount: 1,
          status: "satisfied",
          completeness: "complete",
        });
        expect(
          structuralStatus.value.bounds.some(
            ({ kind, status }) =>
              kind === "group" && status === "violated",
          ),
        ).toBe(true);
        expect(
          structuralStatus.value.bounds.find(
            (bound) =>
              bound.kind === "group" &&
              bound.group.name === "Boarding Actions",
          ),
        ).toBeUndefined();
        expect(
          structuralStatus.value.bounds.filter(
            ({ kind, selectedCount, status }) =>
              kind === "root" &&
              selectedCount === 0 &&
              status === "unresolved",
          ),
        ).toEqual([]);
        expect(
          new Set(
            structuralStatus.diagnostics.map((diagnostic) =>
              JSON.stringify([
                diagnostic.code,
                diagnostic.location?.source.sourceId,
                diagnostic.location?.path,
                diagnostic.details,
              ]),
            ),
          ).size,
        ).toBe(structuralStatus.diagnostics.length);
        const rootChoices = localRosterRootChoices(catalogue);
        const rootGroups = localRosterRootChoiceGroups(catalogue);
        expect(rootGroups.map(({ name }) => name)).toEqual(
          expect.arrayContaining(["Configuration", "Battleline"]),
        );
        expect(
          rootGroups.reduce(
            (total, { choices }) => total + choices.length,
            0,
          ),
        ).toBe(rootChoices.length);
        expect(new Set(
          rootGroups.flatMap(({ choices }) => choices),
        ).size).toBe(rootChoices.length);
        for (const group of rootGroups) {
          expect(
            group.choices.map((choice) => rootChoices.indexOf(choice)),
          ).toEqual(
            [...group.choices]
              .map((choice) => rootChoices.indexOf(choice))
              .sort((left, right) => left - right),
          );
        }
        const battleSize =
          created.value.roster.forces[0]?.selections.find(
            ({ name }) => name === "Battle Size",
          );
        expect(battleSize).toBeDefined();
        if (battleSize === undefined) return;
        const battleSizeChoices = inspectLocalRosterChildChoices(
          created.value,
          battleSize.id,
        );
        expect(battleSizeChoices.ok).toBe(true);
        if (!battleSizeChoices.ok) return;
        expect(battleSizeChoices.diagnostics).toEqual([]);
        expect(
          battleSizeChoices.value.groups.map(({ group }) => group.name),
        ).toEqual(["Battle Size"]);
        const battleSizeGroup = battleSizeChoices.value.groups.find(
          ({ group }) => group.name === "Battle Size",
        );
        expect(battleSizeGroup).toMatchObject({
          minimum: 1,
          maximum: 1,
          remaining: 1,
          selected: [],
          choices: [
            { name: "1. Incursion (1000 Point limit)" },
            { name: "2. Strike Force (2000 Point limit)" },
          ],
        });
        expect(
          battleSizeGroup?.choices.some(
            ({ name }) => name === "3. Onslaught (3000 Point limit)",
          ),
        ).toBe(false);
        const strikeForce = battleSizeGroup?.choices.find(
          ({ name }) => name === "2. Strike Force (2000 Point limit)",
        );
        if (battleSizeGroup === undefined || strikeForce === undefined) {
          throw new Error("Expected the Battle Size choices.");
        }
        const withBattleSize = chooseLocalRosterChildGroupEntry(
          created.value,
          battleSize.id,
          battleSizeGroup.group,
          strikeForce,
          {
            selectionId: selectionOccurrenceId(
              "real-aeldari-strike-force",
            ),
          },
        );
        expect(withBattleSize.ok).toBe(true);
        if (!withBattleSize.ok) return;
        expect(
          withBattleSize.value.roster.forces[0]?.selections
            .find(({ name }) => name === "Battle Size")
            ?.selections.map(({ name }) => name),
        ).toEqual(["2. Strike Force (2000 Point limit)"]);
        const withDetachment = chooseNamedConfiguration(
          withBattleSize.value,
          "Detachment",
          "Warhost",
          "real-aeldari-warhost",
        );
        const configured = chooseNamedConfiguration(
          withDetachment,
          "Force Disposition",
          "Purge the Foe",
          "real-aeldari-purge-the-foe",
        );
        expect(
          configured.roster.forces[0]?.selections
            .find(({ name }) => name === "Detachment")
            ?.selections.map(({ name }) => name),
        ).toEqual(["Warhost"]);
        expect(
          configured.roster.forces[0]?.selections
            .find(({ name }) => name === "Force Disposition")
            ?.selections.map(({ name }) => name),
        ).toEqual(["Purge the Foe"]);
        const guardianDefenders = localRosterRootChoices(catalogue).find(
          ({ materialized }) =>
            materialized.name === "Guardian Defenders",
        );
        expect(guardianDefenders).toBeDefined();
        if (guardianDefenders === undefined) return;
        let nextId = 0;

        const initialized = addLocalRosterRootSelection(
          configured,
          guardianDefenders,
          {
            selectionId: selectionOccurrenceId(
              "real-aeldari-guardian-defenders",
            ),
            createSelectionId: () =>
              selectionOccurrenceId(
                `real-aeldari-auto-${++nextId}`,
              ),
          },
        );

        expect(initialized.ok).toBe(true);
        if (!initialized.ok) return;
        expect(initialized.diagnostics).toEqual([]);
        expect(nextId).toBe(33);
        expect(localRosterSelectionCount(initialized.value)).toBe(41);
        const unit =
          initialized.value.roster.forces[0]?.selections.find(
            ({ name }) => name === "Guardian Defenders",
          );
        const guardians = unit?.selections.filter(
          ({ name }) => name === "Guardian Defender",
        );
        const platform = unit?.selections.find(
          ({ name }) => name === "Heavy Weapon Platform",
        );
        expect(guardians).toHaveLength(10);
        expect(
          guardians?.every(({ selections }) =>
            ["Close Combat Weapon", "Shuriken Catapult"].every((name) =>
              selections.some((selection) => selection.name === name),
            ),
          ),
        ).toBe(true);
        expect(platform?.selections.map(({ name }) => name)).toEqual(
          expect.arrayContaining([
            "Close Combat Weapon",
            "Shuriken Cannon",
          ]),
        );
        const selectedChoiceInspections = rosterSelections(
          initialized.value.roster.forces.flatMap(
            ({ selections }) => selections,
          ),
        ).map(({ id }) =>
          inspectLocalRosterChildChoices(initialized.value, id),
        );
        expect(selectedChoiceInspections.every(({ ok }) => ok)).toBe(true);
        const selectedChoiceDiagnosticSummary = Object.fromEntries(
          [...new Set(
            selectedChoiceInspections
              .flatMap(({ diagnostics }) => diagnostics)
              .map(({ code }) => code),
          )].map((code) => [
            code,
            selectedChoiceInspections
              .flatMap(({ diagnostics }) => diagnostics)
              .filter((diagnostic) => diagnostic.code === code).length,
          ]),
        );
        expect(selectedChoiceDiagnosticSummary).toEqual({});
        const targetedScopeDiagnostics = selectedChoiceInspections
          .flatMap(({ diagnostics }) => diagnostics)
          .filter(
            ({ code, message }) =>
              code === "EVALUATION_CONDITION_SCOPE_TARGET_NOT_FOUND" ||
              code ===
                "EVALUATION_CONDITION_SCOPE_TARGET_KIND_UNSUPPORTED" ||
              (code === "EVALUATION_CONDITION_SCOPE_UNSUPPORTED" &&
                /ancestor|root-entry|upgrade|primary-catalogue|model|unit/.test(
                  message,
                )),
          );
        expect(targetedScopeDiagnostics).toEqual([]);
        const crusadeCostFieldDiagnostics = selectedChoiceInspections
          .flatMap(({ diagnostics }) => diagnostics)
          .filter(
            ({ code, message }) =>
              code === "EVALUATION_CONDITION_FIELD_UNSUPPORTED" &&
              /a623-fe74-1d33-cddf|75bb-ded1-c86d-bdf0/.test(message),
          );
        expect(crusadeCostFieldDiagnostics).toEqual([]);
        const weaponModifications = selectionChoiceByDefinitionId(
          guardianDefenders.materialized,
          "d1a5-4297-168b-11cd",
        );
        expect(weaponModifications?.name).toBe("Weapon Modifications");
        if (unit === undefined || weaponModifications === undefined) return;
        const withWeaponModifications = addLocalRosterChildSelection(
          initialized.value,
          unit.id,
          weaponModifications,
          {
            selectionId: selectionOccurrenceId(
              "real-aeldari-weapon-modifications",
            ),
          },
        );
        expect(withWeaponModifications.ok).toBe(true);
        if (!withWeaponModifications.ok) return;
        const activatedConstraints = inspectLocalRosterConstraints(
          withWeaponModifications.value,
        );
        expect(activatedConstraints.ok).toBe(true);
        if (!activatedConstraints.ok) return;
        const activatedGroupedConstraint =
          activatedConstraints.value.selections.selections
            .flatMap(({ constraints: reports }) => reports)
            .find(
              ({ constraint }) =>
                constraint.id === "33dc-ea33-2bce-e0b0",
            );
        expect(activatedGroupedConstraint).toMatchObject({
          owner: { id: "real-aeldari-guardian-defenders" },
          baseLimit: 0,
          limit: 2,
          modifiers: [],
          modifierGroups: [expect.any(Object)],
          modifierSequence: {
            steps: [
              {
                status: "applied",
                kind: "increment",
                input: 0,
                operand: 2,
                repetitions: 1,
                output: 2,
              },
            ],
          },
        });
        const constraints = inspectLocalRosterConstraints(initialized.value);
        expect(constraints.ok).toBe(true);
        if (constraints.ok) {
          const groupedSelectionConstraints =
            constraints.value.selections.selections.flatMap(
              ({ constraints: reports }) =>
                reports.filter(
                  ({ modifierGroups }) => modifierGroups.length > 0,
                ),
            );
          expect(groupedSelectionConstraints.length).toBeGreaterThan(0);
          const forceConstraints =
            constraints.value.forces.forces[0]?.constraints ?? [];
          expect(forceConstraints).toMatchObject([
            {
              constraint: {
                field: "82ae-1066-5107-6ae0",
                scope: "parent",
              },
              status: "satisfied",
              observed: 3,
              baseLimit: 2,
              limit: 3,
              costEvaluation: { exact: true, value: 3 },
            },
            {
              constraint: {
                field: "51b2-306e-1021-d207",
                scope: "parent",
              },
              status: "satisfied",
              observed: 90,
              baseLimit: 0,
              limit: 2000,
              costEvaluation: { exact: true, value: 90 },
            },
            {
              constraint: {
                field: "f759-1bc4-cb3a-f0d2",
                scope: "force",
              },
              status: "satisfied",
              observed: 0,
              baseLimit: 2,
              limit: 4,
              costEvaluation: { exact: true, value: 0 },
            },
          ]);
          const pointsConstraint = forceConstraints.find(
            ({ constraint }) =>
              constraint.field === "51b2-306e-1021-d207",
          );
          expect(pointsConstraint?.repeatReports).toMatchObject([
            {
              status: "exact",
              completeness: "complete",
              observed: 0,
              repetitions: 0,
            },
          ]);
          expect(
            pointsConstraint?.modifierSequence?.steps.filter(
              ({ modifier }) => modifier.repeats.length > 0,
            ),
          ).toMatchObject([
            { status: "applied", repetitions: 0, input: 2000, output: 2000 },
          ]);
          expect(
            forceConstraints.map(({ costEvaluation }) =>
              costEvaluation?.report,
            ),
          ).toEqual([
            forceConstraints[0]?.costEvaluation?.report,
            forceConstraints[0]?.costEvaluation?.report,
            forceConstraints[0]?.costEvaluation?.report,
          ]);
        }
        expect(
          constraints.diagnostics.filter(
            ({ code }) =>
              code === "EVALUATION_CONDITION_OWNER_KIND_UNSUPPORTED" ||
              code ===
                "EVALUATION_CONSTRAINT_MODIFIER_GROUP_UNSUPPORTED" ||
              code ===
                "EVALUATION_FORCE_CONSTRAINT_MODIFIER_GROUP_UNSUPPORTED",
          ),
        ).toEqual([]);
        expect(
          constraints.diagnostics.some(
            ({ code }) =>
              code ===
              "EVALUATION_CONSTRAINT_COLLECTION_OWNER_DEFINITION_AMBIGUOUS",
          ),
        ).toBe(false);
        const costs = evaluateLocalRosterCosts(initialized.value);
        expect(costs.ok).toBe(true);
        if (costs.ok) {
          expect(costs.value.completeness).toBe("complete");
          expect(
            costs.value.totals.find(
              ({ costType }) => costType.name === "pts",
            ),
          ).toMatchObject({ value: 90 });
        }
        const supported =
          inspectLocalRosterSupportedValidation(initialized.value);
        expect(supported.ok).toBe(true);
        if (supported.ok) {
          expect({
            structural: supported.value.structural.completeness,
            selections:
              supported.value.constraints.selections.completeness,
            forces: supported.value.constraints.forces.completeness,
          }).toEqual({
            structural: "incomplete",
            selections: "incomplete",
            forces: "complete",
          });
          expect(diagnosticCodeCounts(
            supported.value.structuralDiagnostics,
          )).toEqual({
            EVALUATION_ROOT_INITIALIZATION_CONDITIONAL_MODIFIERS_UNSUPPORTED: 1,
            EVALUATION_STRUCTURAL_STATUS_INACTIVE_ROOTS_UNSUPPORTED: 1,
          });
          expect(
            supported.value.structural.bounds
              .filter(({ completeness }) => completeness === "incomplete")
              .map((bound) => ({
                kind: bound.kind,
                status: bound.status,
                selectedCount: bound.selectedCount,
                name:
                  bound.kind === "root"
                    ? bound.root.materialized.name
                    : undefined,
              })),
          ).toEqual([
            {
              kind: "root",
              status: "unresolved",
              selectedCount: 1,
              name: "Guardian Defenders",
            },
          ]);
          expect(diagnosticCodeCounts(
            supported.value.constraintDiagnostics,
          )).toEqual({ EVALUATION_CONSTRAINT_FIELD_UNSUPPORTED: 3 });
          expect(
            supported.value.constraints.selections.selections.flatMap(
              ({ owner, constraints: reports }) =>
                reports
                  .filter(({ completeness }) => completeness === "incomplete")
                  .map(({ constraint }) => ({
                    owner: owner.name,
                    field: constraint.field,
                    scope: constraint.scope,
                    type: constraint.type,
                  })),
            ),
          ).toEqual([
            {
              owner: "Guardian Defenders",
              field: "75bb-ded1-c86d-bdf0",
              scope: "self",
              type: "max",
            },
            {
              owner: "Guardian Defenders",
              field: "716d-91b7-d55a-1022",
              scope: "self",
              type: "max",
            },
            {
              owner: "Guardian Defenders",
              field: "716d-91b7-d55a-1022",
              scope: "self",
              type: "min",
            },
          ]);
          expect(supported.value.structuralDiagnostics).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                code:
                  "EVALUATION_STRUCTURAL_STATUS_INACTIVE_ROOTS_UNSUPPORTED",
              }),
            ]),
          );
          expect(supported.value.status.validity).toBe("valid");
          expect(supported.value.status.completeness).toBe("incomplete");
          expect(supported.value.status.statusCounts.violated).toBe(0);
          expect(
            supported.value.status.findings.some(
              (finding) =>
                finding.kind === "forceConstraint" &&
                finding.report.constraint.field ===
                  "51b2-306e-1021-d207" &&
                finding.status === "unresolved",
            ),
          ).toBe(false);
        }
        const restored = restoreLocalRosterSession(
          catalogue,
          initialized.value.roster,
        );
        expect(restored.ok).toBe(true);
        expect(restored.diagnostics).toEqual([]);
        if (restored.ok) {
          expect(localRosterSelectionCount(restored.value)).toBe(41);
        }
      },
      120_000,
    );
  },
);

function realJsonFiles(directory: string): readonly LocalBattleScribeFile[] {
  return readdirSync(directory)
    .filter((filename) => filename.toLowerCase().endsWith(".json"))
    .sort((left, right) => left.localeCompare(right))
    .map((filename) => ({
      filename,
      bytes: readFileSync(join(directory, filename)),
      origin: directory,
      mediaType: "application/json",
    }));
}

function identityConditionScopeCounts(
  roots: readonly OrderedXmlElement[],
): Readonly<{
  parent: number;
  self: number;
  localConditionGroupsSelf: number;
}> {
  const counts = {
    parent: 0,
    self: 0,
    localConditionGroupsSelf: 0,
  };
  const visit = (
    element: OrderedXmlElement,
    insideLocalConditionGroups: boolean,
  ): void => {
    const local =
      insideLocalConditionGroups ||
      element.name === "localConditionGroups";
    if (
      element.name === "condition" &&
      (element.attributes.type === "instanceOf" ||
        element.attributes.type === "notInstanceOf") &&
      (element.attributes.scope === "parent" ||
        element.attributes.scope === "self")
    ) {
      if (local && element.attributes.scope === "self") {
        counts.localConditionGroupsSelf += 1;
      } else {
        counts[element.attributes.scope] += 1;
      }
    }
    for (const child of element.children) {
      if (child.kind === "element") {
        visit(child, local);
      }
    }
  };
  for (const root of roots) {
    visit(root, false);
  }
  return counts;
}

function extensionConditionGroupSummary(
  roots: readonly OrderedXmlElement[],
): Readonly<{
  localGroups: number;
  localAtLeast: number;
  localParent: number;
  nestedBefore: number;
  nestedInstanceOf: number;
  countGroups: number;
}> {
  const counts = {
    localGroups: 0,
    localAtLeast: 0,
    localParent: 0,
    nestedBefore: 0,
    nestedInstanceOf: 0,
    countGroups: 0,
  };
  const visit = (
    element: OrderedXmlElement,
    insideLocalGroup: boolean,
  ): void => {
    const local = insideLocalGroup || element.name === "localConditionGroup";
    if (element.name === "localConditionGroup") {
      counts.localGroups += 1;
      counts.localAtLeast += element.attributes.type === "atLeast" ? 1 : 0;
      counts.localParent += element.attributes.scope === "parent" ? 1 : 0;
    } else if (element.name === "condition" && local) {
      counts.nestedBefore += element.attributes.type === "before" ? 1 : 0;
      counts.nestedInstanceOf +=
        element.attributes.type === "instanceOf" ? 1 : 0;
    } else if (
      element.name === "conditionGroup" &&
      element.attributes.type === "count"
    ) {
      counts.countGroups += 1;
    }
    for (const child of element.children) {
      if (child.kind === "element") visit(child, local);
    }
  };
  for (const root of roots) visit(root, false);
  return counts;
}

function negativeConstraintSummary(
  roots: readonly OrderedXmlElement[],
): Readonly<{
  total: number;
  min: number;
  max: number;
  selections: number;
  costs: number;
  parent: number;
  force: number;
  roster: number;
}> {
  const counts = {
    total: 0,
    min: 0,
    max: 0,
    selections: 0,
    costs: 0,
    parent: 0,
    force: 0,
    roster: 0,
  };
  const visit = (element: OrderedXmlElement): void => {
    if (
      element.name === "constraint" &&
      element.attributes.value === "-1" &&
      (element.attributes.type === "min" ||
        element.attributes.type === "max")
    ) {
      counts.total += 1;
      counts[element.attributes.type] += 1;
      counts.selections +=
        element.attributes.field === "selections" ? 1 : 0;
      counts.costs +=
        element.attributes.field === "51b2-306e-1021-d207" ? 1 : 0;
      if (
        element.attributes.scope === "parent" ||
        element.attributes.scope === "force" ||
        element.attributes.scope === "roster"
      ) {
        counts[element.attributes.scope] += 1;
      }
    }
    for (const child of element.children) {
      if (child.kind === "element") visit(child);
    }
  };
  for (const root of roots) visit(root);
  return counts;
}

function diagnosticCodeCounts(
  diagnostics: readonly { readonly code: string }[],
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const diagnostic of diagnostics) {
    counts[diagnostic.code] = (counts[diagnostic.code] ?? 0) + 1;
  }
  return counts;
}

function groupedHiddenModifierSummary(
  roots: readonly OrderedXmlElement[],
): Readonly<{
  total: number;
  setTrue: number;
  setFalse: number;
  maximumDepth: number;
  unsupportedModifierShapes: number;
  unsupportedGroupShapes: number;
}> {
  const summary = {
    total: 0,
    setTrue: 0,
    setFalse: 0,
    maximumDepth: 0,
    unsupportedModifierShapes: 0,
    unsupportedGroupShapes: 0,
  };
  const visit = (
    element: OrderedXmlElement,
    groups: readonly OrderedXmlElement[],
  ): void => {
    const nextGroups =
      element.name === "modifierGroup" ? [...groups, element] : groups;
    if (
      element.name === "modifier" &&
      element.attributes.field === "hidden" &&
      groups.length > 0
    ) {
      summary.total += 1;
      summary.maximumDepth = Math.max(summary.maximumDepth, groups.length);
      summary.setTrue += element.attributes.value === "true" ? 1 : 0;
      summary.setFalse += element.attributes.value === "false" ? 1 : 0;
      if (
        element.attributes.type !== "set" ||
        (element.attributes.value !== "true" &&
          element.attributes.value !== "false") ||
        element.attributes.scope !== undefined ||
        hasRepeats(element)
      ) {
        summary.unsupportedModifierShapes += 1;
      }
      if (
        groups.some(
          (group) =>
            group.attributes.type !== "and" || hasRepeats(group),
        )
      ) {
        summary.unsupportedGroupShapes += 1;
      }
    }
    for (const child of element.children) {
      if (child.kind === "element") visit(child, nextGroups);
    }
  };
  for (const root of roots) visit(root, []);
  return summary;
}

function groupedCostModifierSummary(
  roots: readonly OrderedXmlElement[],
): Readonly<{
  total: number;
  set: number;
  increment: number;
  decrement: number;
  divide: number;
  other: number;
  groups: number;
  andGroups: number;
  missingTypeGroups: number;
  maximumDepth: number;
  modifierRepeats: number;
  groupRepeats: number;
}> {
  const costTypeIds = new Set<string>();
  const collectCostTypes = (element: OrderedXmlElement): void => {
    if (element.name === "costType" && element.attributes.id !== undefined) {
      costTypeIds.add(element.attributes.id);
    }
    for (const child of element.children) {
      if (child.kind === "element") collectCostTypes(child);
    }
  };
  for (const root of roots) collectCostTypes(root);

  const summary = {
    total: 0,
    set: 0,
    increment: 0,
    decrement: 0,
    divide: 0,
    other: 0,
    groups: 0,
    andGroups: 0,
    missingTypeGroups: 0,
    maximumDepth: 0,
    modifierRepeats: 0,
    groupRepeats: 0,
  };
  const costGroups = new Set<OrderedXmlElement>();
  const visit = (
    element: OrderedXmlElement,
    groups: readonly OrderedXmlElement[],
  ): void => {
    const nextGroups =
      element.name === "modifierGroup" ? [...groups, element] : groups;
    if (
      element.name === "modifier" &&
      element.attributes.field !== undefined &&
      costTypeIds.has(element.attributes.field) &&
      groups.length > 0
    ) {
      summary.total += 1;
      summary.maximumDepth = Math.max(summary.maximumDepth, groups.length);
      const type = element.attributes.type;
      if (
        type === "set" ||
        type === "increment" ||
        type === "decrement" ||
        type === "divide"
      ) {
        summary[type] += 1;
      } else {
        summary.other += 1;
      }
      summary.modifierRepeats += hasRepeats(element) ? 1 : 0;
      for (const group of groups) costGroups.add(group);
    }
    for (const child of element.children) {
      if (child.kind === "element") visit(child, nextGroups);
    }
  };
  for (const root of roots) visit(root, []);
  summary.groups = costGroups.size;
  for (const group of costGroups) {
    summary.andGroups += group.attributes.type === "and" ? 1 : 0;
    summary.missingTypeGroups +=
      group.attributes.type === undefined ? 1 : 0;
    summary.groupRepeats += hasRepeats(group) ? 1 : 0;
  }
  return summary;
}

function hasRepeats(element: OrderedXmlElement): boolean {
  return element.children.some(
    (child) =>
      child.kind === "element" &&
      child.name === "repeats" &&
      child.children.some(
        (repeat) => repeat.kind === "element" && repeat.name === "repeat",
      ),
  );
}

function rosterSelections(
  selections: readonly RosterSelection[],
): readonly RosterSelection[] {
  return selections.flatMap((selection) => [
    selection,
    ...rosterSelections(selection.selections),
  ]);
}

function chooseNamedConfiguration(
  session: LocalRosterSession,
  parentName: string,
  choiceName: string,
  occurrenceId: string,
): LocalRosterSession {
  const parent = session.roster.forces[0]?.selections.find(
    ({ name }) => name === parentName,
  );
  if (parent === undefined) {
    throw new Error(`Missing initialized selection ${parentName}.`);
  }
  const inspected = inspectLocalRosterChildChoices(session, parent.id);
  if (!inspected.ok) {
    throw new Error(`Could not inspect choices below ${parentName}.`);
  }
  for (const group of inspected.value.groups) {
    const choice = group.choices.find(({ name }) => name === choiceName);
    if (choice === undefined) {
      continue;
    }
    const selected = chooseLocalRosterChildGroupEntry(
      session,
      parent.id,
      group.group,
      choice,
      { selectionId: selectionOccurrenceId(occurrenceId) },
    );
    if (!selected.ok) {
      throw new Error(`Could not select ${choiceName}.`);
    }
    return selected.value;
  }
  throw new Error(`Missing ${choiceName} below ${parentName}.`);
}

function selectionChoiceByDefinitionId(
  root: BattleScribeRosterSelectionChoice,
  definitionId: string,
): BattleScribeRosterSelectionChoice | undefined {
  const pending: BattleScribeRosterSelectionChoice[] = [root];
  while (pending.length > 0) {
    const choice = pending.shift();
    if (choice === undefined) continue;
    if (choice.definitionId === definitionId) return choice;
    pending.push(
      ...choice.selectionEntries,
      ...choice.selectionEntryGroups,
      ...choice.entryLinks.filter(
        (entry): entry is BattleScribeRosterSelectionChoice =>
          entry.kind !== "unresolvedEntryLink",
      ),
    );
  }
  return undefined;
}

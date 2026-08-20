import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type {
  BattleScribeProjection,
  ConditionGroupProjection,
  ConditionProjection,
  InfoGroupProjection,
  ModifierGroupProjection,
  ModifierProjection,
  OrderedXmlElement,
  ProfileProjection,
  SelectionContainerProjection,
} from "@rosterforge/battlescribe-data";
import {
  evaluateRosterCondition,
  evaluateRosterProfileAnnotation,
  evaluateRosterProfileCharacteristics,
  evaluateRosterSelectionCategories,
  indexEffectiveRosterCategories,
  modifierTargetedCategoryIds,
  parseBattleScribeAffectsSelector,
} from "@rosterforge/evaluation";
import {
  pinGitHubRepository,
  planBattleScribeDependencyClosure,
  summarizeBattleScribeRepositoryDocument,
  type LocalBattleScribeFile,
} from "@rosterforge/repository";
import type { BattleScribeRosterSelectionChoice } from "@rosterforge/roster-builder";
import {
  forceOccurrenceId,
  rosterId,
  selectionOccurrenceId,
  type RosterSelection,
  type SelectionOccurrenceId,
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
  localRosterSelectionChoice,
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

        // Category-filter immunity, pinned on real data. A filter category no
        // modifier anywhere targets is settled by static links alone, which is
        // what lets pass one resolve an `affects` filter without the
        // effective-category index it is itself computing.
        const anyContext = result.value.catalogues[0]?.context;
        if (anyContext === undefined) {
          throw new Error("Expected at least one composed catalogue context.");
        }
        const targeted = new Set<string>(modifierTargetedCategoryIds(anyContext));
        // The two dominant filters in the corpus, both modifier-immune.
        expect(targeted.has("e993-e086-6de1-12af")).toBe(false);
        expect(targeted.has("4986-bf86-beb4-13ac")).toBe(false);
        // `Vehicle` is targeted by five modifiers, so a filter naming it stays
        // unresolved rather than being decided from static links.
        expect(targeted.has("dbd4-63-af05-998")).toBe(true);
        const pinnedSource = pinGitHubRepository({
          owner: "BSData",
          repository: "wh40k-11e",
          revision: "54c189f4fd01878351fab05586d3b38d9c7f6ddc",
        });
        expect(pinnedSource.ok).toBe(true);
        if (!pinnedSource.ok) {
          return;
        }
        const repositoryIndex = {
          source: pinnedSource.value,
          documents: result.value.documents.map((document) =>
            summarizeBattleScribeRepositoryDocument(
              document.source.filename,
              document,
            ),
          ),
        };
        const imperialKnightsClosure = planBattleScribeDependencyClosure(
          repositoryIndex,
          "Imperium - Imperial Knights.json",
        );
        const aeldariClosure = planBattleScribeDependencyClosure(
          repositoryIndex,
          "Aeldari - Craftworlds.json",
        );
        expect(imperialKnightsClosure.ok).toBe(true);
        expect(aeldariClosure.ok).toBe(true);
        if (!imperialKnightsClosure.ok || !aeldariClosure.ok) {
          return;
        }
        expect(imperialKnightsClosure.value.status).toBe("complete");
        expect(imperialKnightsClosure.diagnostics).toEqual([]);
        expect(
          imperialKnightsClosure.value.files.map(({ document }) => document.path),
        ).toEqual([
          "Warhammer 40,000.json",
          "Imperium - Imperial Knights.json",
          "Imperium - Imperial Knights - Library.json",
          "Imperium - Agents of the Imperium.json",
          "Unaligned Forces.json",
          "Library - Titans.json",
          "Imperium - Adeptus Mechanicus.json",
        ]);
        expect(aeldariClosure.value.status).toBe("complete");
        expect(aeldariClosure.diagnostics).toEqual([]);
        expect(
          aeldariClosure.value.files.map(({ document }) => document.path),
        ).toEqual([
          "Warhammer 40,000.json",
          "Aeldari - Craftworlds.json",
          "Aeldari - Aeldari Library.json",
          "Unaligned Forces.json",
        ]);
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
          profileOwnedCharacteristicModifierSummary(
            result.value.documents.map(({ projection }) => projection),
          ),
        ).toEqual({
          total: 484,
          direct: 369,
          grouped: 115,
          set: 205,
          append: 213,
          increment: 54,
          decrement: 6,
          floor: 4,
          replace: 2,
          otherOperations: 0,
          scoped: 16,
          withConditions: 384,
          withConditionGroups: 53,
          withRepeats: 0,
          missingValue: 3,
          affects: 16,
          join: 244,
          arg: 2,
          position: 0,
          behaviorFree: 238,
          targetOnProfile: 478,
          targetAbsent: 6,
          targetAmbiguous: 0,
          supportedSetSubset: 173,
          supportedSetDirect: 117,
          supportedSetGrouped: 56,
        });
        expect(
          affectsSelectorSummary(
            result.value.documents.map(({ projection }) => projection),
          ),
        ).toEqual({
          total: 1_859,
          distinctValues: 79,
          supported: 1_835,
          unsupported: 24,
          traversalOwn: 344,
          traversalChildren: 168,
          traversalDescendants: 1_347,
          forceTraversal: 24,
          targetProfiles: 1_753,
          targetSelections: 106,
          targetSelectionsCategoryField: 89,
          // Every one of them carries a scope, which is what makes the
          // owner-relative reading vacuous and the target set undetermined.
          targetSelectionsCategoryFieldScoped: 89,
          missingProfileTypeName: 0,
          unexpectedSegment: 0,
          empty: 0,
          withFilterId: 428,
          filterCategoryEntry: 427,
          filterSelectionEntry: 1,
          filterUnresolved: 0,
          distinctProfileTypeNames: 3,
          undeclaredProfileTypeNames: 0,
          characteristicTargets: 1_265,
          characteristicTargetsSupported: 1_246,
        });
        expect(
          selectionAnnotationModifierSummary(
            result.value.documents.map(({ projection }) => projection),
          ),
        ).toEqual({
          total: 68,
          direct: 53,
          routed: 15,
          grouped: 61,
          ungrouped: 7,
          set: 39,
          append: 29,
          withConditions: 52,
          withConditionGroups: 16,
          withRepeats: 0,
          missingJoin: 7,
          scoped: 0,
          withFilterId: 0,
        });

        expect(
          categoryModifierSummary(
            result.value.documents.map(({ projection }) => projection),
          ),
        ).toEqual({
          total: 892,
          add: 532,
          setPrimary: 328,
          remove: 27,
          unsetPrimary: 5,
          otherOperations: 0,
          direct: 566,
          grouped: 326,
          scoped: 281,
          affects: 89,
          arg: 83,
          join: 79,
          withConditions: 463,
          withConditionGroups: 4,
          withRepeats: 0,
          valueResolvesToCategory: 892,
          executable: 761,
        });
        expect(
          categoryConditionImpactSummary(
            result.value.documents.map(({ projection }) => projection),
            result.value.documents.map(({ root }) => root),
          ),
        ).toEqual({
          categoryReferencingConditions: 5_047,
          unaffected: 3_340,
          // 127 / 1,580 / 30 / 70 before scope resolution; 1,048 / 659 / 80 /
          // 20 after it and before set-primary execution.
          wouldBecomeKnown: 1_605,
          staysUnresolved: 102,
          controlledCategories: 100,
          executableOnlyCategories: 92,
          blockedCategories: 8,
        });
        expect(
          profileOwnedVisibilityModifierSummary(
            result.value.documents.map(({ projection }) => projection),
          ),
        ).toEqual({
          profiles: 13_451,
          staticHidden: 1,
          total: 154,
          direct: 154,
          grouped: 0,
          set: 154,
          otherOperations: 0,
          booleanTrue: 154,
          booleanFalse: 0,
          scoped: 0,
          withConditions: 125,
          withConditionGroups: 29,
          withRepeats: 0,
          extensionAttributes: 0,
          supportedShape: 154,
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
      "raises a pinned Custodian Guard wound characteristic through one profile set",
      async () => {
        if (realDataDirectory === undefined) {
          throw new Error("The integration data directory is not configured.");
        }
        const requiredFilenames = new Set([
          "Warhammer 40,000.json",
          "Imperium - Adeptus Custodes.json",
          "Imperium - Imperial Knights - Library.json",
          "Imperium - Agents of the Imperium.json",
          "Library - Titans.json",
          "Unaligned Forces.json",
        ]);
        const result = await prepareLocalCatalogueLibrary(
          realJsonFiles(realDataDirectory).filter(({ filename }) =>
            requiredFilenames.has(filename),
          ),
          {
            import: {
              batchId: "real-bsdata-json-adeptus-custodes",
              importedAt: "2026-08-14T00:00:00.000Z",
            },
          },
        );

        expect(result.ok).toBe(true);
        if (!result.ok) {
          return;
        }
        expect(result.value.documents).toHaveLength(requiredFilenames.size);
        expect(result.value.contexts.roots.truncated).toBe(false);

        const catalogue = result.value.catalogues.find(
          ({ name }) => name === "Imperium - Adeptus Custodes",
        );
        const forceDefinition = catalogue?.context.forces.definitions[0];
        expect(catalogue).toBeDefined();
        expect(forceDefinition).toBeDefined();
        if (catalogue === undefined || forceDefinition === undefined) {
          return;
        }

        const session = createLocalRosterSession(catalogue, forceDefinition, {
          rosterId: rosterId("real-adeptus-custodes-roster"),
          forceId: forceOccurrenceId("real-adeptus-custodes-force"),
          name: "Characteristic Integration Roster",
        });
        expect(session.ok).toBe(true);
        if (!session.ok) {
          return;
        }
        const unitRoot = localRosterRootChoices(session.value.catalogue).find(
          ({ materialized }) => materialized.name === "Custodian Guard",
        );
        expect(unitRoot).toBeDefined();
        if (unitRoot === undefined) {
          return;
        }
        const unitId = selectionOccurrenceId("real-custodian-guard-unit");
        const withUnit = addLocalRosterRootSelection(session.value, unitRoot, {
          selectionId: unitId,
        });
        expect(withUnit.ok).toBe(true);
        if (!withUnit.ok) {
          return;
        }
        const modelGroup = localRosterChildChoices(withUnit.value, unitId).find(
          ({ name }) => name === "4-5 Custodian Guard",
        );
        expect(modelGroup).toBeDefined();
        if (modelGroup === undefined) {
          return;
        }
        const groupId = selectionOccurrenceId("real-custodian-guard-group");
        const withGroup = addLocalRosterChildSelection(
          withUnit.value,
          unitId,
          modelGroup,
          { selectionId: groupId },
        );
        expect(withGroup.ok).toBe(true);
        if (!withGroup.ok) {
          return;
        }
        const shieldModel = localRosterChildChoices(
          withGroup.value,
          groupId,
        ).find(
          ({ name }) =>
            name === "Custodian Guard (Sentinel Blade & Praesidium Shield)",
        );
        expect(shieldModel).toBeDefined();
        if (shieldModel === undefined) {
          return;
        }
        const modelId = selectionOccurrenceId("real-custodian-guard-model");
        const withModel = addLocalRosterChildSelection(
          withGroup.value,
          groupId,
          shieldModel,
          { selectionId: modelId },
        );
        expect(withModel.ok).toBe(true);
        if (!withModel.ok) {
          return;
        }

        const occurrence = rosterSelections(
          withModel.value.roster.forces.flatMap(
            ({ selections }) => selections,
          ),
        ).find(({ id }) => id === modelId);
        const choice = localRosterSelectionChoice(withModel.value, modelId);
        expect(occurrence).toBeDefined();
        expect(choice).toBeDefined();
        if (occurrence === undefined || choice === undefined) {
          return;
        }
        const profile = choice.profiles.find(
          ({ name }) => name === "Custodian Guard (Shield)",
        );
        expect(profile).toBeDefined();
        if (profile === undefined) {
          return;
        }
        expect(profile.modifiers).toHaveLength(1);
        expect(profile.modifierGroups).toEqual([]);

        const evaluated = evaluateRosterProfileCharacteristics(
          withModel.value.roster,
          withModel.value.catalogue.context,
          occurrence,
          profile,
        );
        expect(evaluated.ok).toBe(true);
        expect(evaluated.diagnostics).toEqual([]);
        if (!evaluated.ok) {
          return;
        }
        const wounds = evaluated.value.characteristics.find(
          ({ characteristic }) => characteristic.name === "W",
        );
        expect(wounds).toMatchObject({
          baseValue: "3",
          value: "4",
          completeness: "complete",
          steps: [
            {
              status: "applied",
              kind: "set",
              grouped: false,
              input: "3",
              output: "4",
            },
          ],
        });
        expect(evaluated.value).toMatchObject({
          completeness: "complete",
          unroutedModifiers: [],
          modifierGroupApplicability: [],
        });
        expect(
          evaluated.value.characteristics.map(
            ({ characteristic, value }) => [characteristic.name, value],
          ),
        ).toEqual([
          ["M", '6"'],
          ["T", "6"],
          ["Sv", "2+"],
          ["W", "4"],
          ["LD", "6+"],
          ["OC", "2"],
          ["InSv", "4+"],
        ]);
      },
      120_000,
    );

    it(
      "grants a pinned category to its root entry and resolves a real condition",
      async () => {
        if (realDataDirectory === undefined) {
          throw new Error("The integration data directory is not configured.");
        }
        const requiredFilenames = new Set([
          "Warhammer 40,000.json",
          "Imperium - Adeptus Custodes.json",
          "Imperium - Imperial Knights - Library.json",
          "Imperium - Agents of the Imperium.json",
          "Library - Titans.json",
          "Unaligned Forces.json",
        ]);
        const result = await prepareLocalCatalogueLibrary(
          realJsonFiles(realDataDirectory).filter(({ filename }) =>
            requiredFilenames.has(filename),
          ),
          {
            import: {
              batchId: "real-bsdata-json-category-flip",
              importedAt: "2026-08-17T00:00:00.000Z",
            },
          },
        );
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        const catalogue = result.value.catalogues.find(
          ({ name }) => name === "Imperium - Adeptus Custodes",
        );
        const forceDefinition = catalogue?.context.forces.definitions[0];
        if (catalogue === undefined || forceDefinition === undefined) {
          throw new Error("Expected the Adeptus Custodes catalogue.");
        }
        const session = createLocalRosterSession(catalogue, forceDefinition, {
          rosterId: rosterId("real-category-flip-roster"),
          forceId: forceOccurrenceId("real-category-flip-force"),
          name: "Category Flip Roster",
        });
        if (!session.ok) throw new Error("Expected roster session.");

        // The Character upgrade adds the Character category with
        // scope="root-entry", so it reaches the top-level Dreadnought.
        const dreadnoughtRoot = localRosterRootChoices(
          session.value.catalogue,
        ).find(
          ({ materialized }) =>
            materialized.name === "Venerable Contemptor Dreadnought",
        );
        if (dreadnoughtRoot === undefined) {
          throw new Error("Expected the Venerable Contemptor Dreadnought.");
        }
        const unitId = selectionOccurrenceId("real-flip-dreadnought");
        const withUnit = addLocalRosterRootSelection(
          session.value,
          dreadnoughtRoot,
          { selectionId: unitId },
        );
        if (!withUnit.ok) throw new Error("Expected the unit to be added.");

        const upgradeGroup = localRosterChildChoices(withUnit.value, unitId).find(
          ({ name }) => name === "Character Upgrade",
        );
        if (upgradeGroup === undefined) {
          throw new Error("Expected the Character Upgrade group.");
        }
        const groupId = selectionOccurrenceId("real-flip-group");
        const withGroup = addLocalRosterChildSelection(
          withUnit.value,
          unitId,
          upgradeGroup,
          { selectionId: groupId },
        );
        if (!withGroup.ok) throw new Error("Expected the group to be added.");

        const characterUpgrade = localRosterChildChoices(
          withGroup.value,
          groupId,
        ).find(({ name }) => name === "Character");
        if (characterUpgrade === undefined) {
          throw new Error("Expected the Character upgrade choice.");
        }
        const upgradeId = selectionOccurrenceId("real-flip-upgrade");
        const withUpgrade = addLocalRosterChildSelection(
          withGroup.value,
          groupId,
          characterUpgrade,
          { selectionId: upgradeId },
        );
        if (!withUpgrade.ok) throw new Error("Expected the upgrade to be added.");

        const roster = withUpgrade.value.roster;
        const context = withUpgrade.value.catalogue.context;
        const unit = rosterSelections(
          roster.forces.flatMap(({ selections }) => selections),
        ).find(({ id }) => id === unitId);
        const unitChoice = localRosterSelectionChoice(withUpgrade.value, unitId);
        if (unit === undefined || unitChoice === undefined) {
          throw new Error("Expected the unit occurrence and choice.");
        }

        const CHARACTER = "9cfd-1c32-585f-7d5c";
        const VEHICLE = "dbd4-63-af05-998";
        const categories = evaluateRosterSelectionCategories(
          roster,
          context,
          unit,
          unitChoice,
        );
        expect(categories.ok).toBe(true);
        if (!categories.ok) return;
        // The Dreadnought does not declare Character statically; it acquires it
        // from a descendant's root-entry-scoped modifier.
        expect(categories.value.baseCategories).not.toContain(CHARACTER);
        expect(categories.value.categories).toContain(CHARACTER);
        expect(
          categories.value.steps
            .filter((step) => step.status === "applied")
            .map((step) =>
              step.status === "applied"
                ? [step.origin, step.operation, step.targetId]
                : step.status,
            ),
        ).toEqual([
          ["root-entry-scope", "add", CHARACTER],
          // The catalogue explicitly vacates the Vehicle primary before
          // claiming the Character one. Displacement makes that redundant
          // rather than necessary, and the corpus agrees: only five of 319
          // set-primary owners pair an unset, while 234 would end up with more
          // than one primary if set-primary did not displace.
          ["root-entry-scope", "unset-primary", VEHICLE],
          ["root-entry-scope", "set-primary", CHARACTER],
        ]);
        // Character becomes the sole primary, which is the slot BattleScribe
        // displays the unit under.
        expect(categories.value.primaryCategories).toEqual([CHARACTER]);

        // A real condition from this catalogue, testing the same category on
        // root-entry scope, is unknowable from static links and exact from
        // effective membership.
        const condition = findProjectedCondition(
          result.value.documents.map(({ projection }) => projection),
          (candidate) =>
            candidate.type === "instanceOf" &&
            candidate.field === "selections" &&
            candidate.scope === "root-entry" &&
            candidate.childId === CHARACTER &&
            candidate.shared === true,
        );
        expect(condition).toBeDefined();
        if (condition === undefined) return;

        const withoutIndex = evaluateRosterCondition(
          roster,
          context,
          unit,
          condition,
        );
        const withIndex = evaluateRosterCondition(
          roster,
          context,
          unit,
          condition,
          {
            effectiveCategories: indexEffectiveRosterCategories(
              roster,
              context,
            ),
          },
        );
        expect(withoutIndex.ok && withIndex.ok).toBe(true);
        if (!withoutIndex.ok || !withIndex.ok) return;
        expect(withoutIndex.value.status).toBe("unresolved");
        expect(withIndex.value.status).toBe("satisfied");
      },
      120_000,
    );

    it(
      "stands a pinned affects selector on the model its scope names",
      async () => {
        if (realDataDirectory === undefined) {
          throw new Error("The integration data directory is not configured.");
        }
        const requiredFilenames = new Set([
          "Warhammer 40,000.json",
          "Chaos - Death Guard.json",
          "Chaos - Chaos Daemons Library.json",
          "Chaos - Chaos Knights Library.json",
          "Library - Astartes Heresy Legends.json",
          "Library - Titans.json",
          "Unaligned Forces.json",
        ]);
        const result = await prepareLocalCatalogueLibrary(
          realJsonFiles(realDataDirectory).filter(({ filename }) =>
            requiredFilenames.has(filename),
          ),
          {
            import: {
              batchId: "real-bsdata-json-affects-anchor",
              importedAt: "2026-08-20T00:00:00.000Z",
            },
          },
        );
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        const catalogue = result.value.catalogues.find(
          ({ name }) => name === "Chaos - Death Guard",
        );
        const forceDefinition = catalogue?.context.forces.definitions[0];
        if (catalogue === undefined || forceDefinition === undefined) {
          throw new Error("Expected the Death Guard catalogue.");
        }
        const session = createLocalRosterSession(catalogue, forceDefinition, {
          rosterId: rosterId("real-anchor-roster"),
          forceId: forceOccurrenceId("real-anchor-force"),
          name: "Affects Anchor Roster",
        });
        if (!session.ok) throw new Error("Expected roster session.");

        const lordRoot = localRosterRootChoices(session.value.catalogue).find(
          ({ materialized }) => materialized.name === "Lord of Contagion",
        );
        if (lordRoot === undefined) {
          throw new Error("Expected the Lord of Contagion root choice.");
        }
        const lordId = selectionOccurrenceId("anchor-lord");
        let current = addLocalRosterRootSelection(session.value, lordRoot, {
          selectionId: lordId,
        });
        if (!current.ok) throw new Error("Expected the Lord to be added.");

        const addChild = (
          parentId: SelectionOccurrenceId,
          childName: string,
          childId: string,
        ): SelectionOccurrenceId => {
          if (!current.ok) throw new Error("Expected a session.");
          const choice = localRosterChildChoices(current.value, parentId).find(
            ({ name }) => name === childName,
          );
          if (choice === undefined) {
            throw new Error(`Expected the ${childName} choice.`);
          }
          const id = selectionOccurrenceId(childId);
          current = addLocalRosterChildSelection(
            current.value,
            parentId,
            choice,
            { selectionId: id },
          );
          if (!current.ok) throw new Error(`Expected ${childName} to be added.`);
          return id;
        };

        const wargearId = addChild(lordId, "Wargear", "anchor-wargear");
        const manreaperId = addChild(wargearId, "Manreaper", "anchor-manreaper");
        const enhancementsId = addChild(
          lordId,
          "Enhancements",
          "anchor-enhancements",
        );
        addChild(
          enhancementsId,
          "Furnace of Plagues",
          "anchor-furnace",
        );
        if (!current.ok) return;

        const roster = current.value.roster;
        const context = current.value.catalogue.context;
        const occurrences = rosterSelections(
          roster.forces.flatMap(({ selections }) => selections),
        );
        const reportFor = (
          id: SelectionOccurrenceId,
          typeName: string,
        ) => {
          const occurrence = occurrences.find((entry) => entry.id === id);
          const choice = localRosterSelectionChoice(
            current.ok ? current.value : session.value,
            id,
          );
          const found = choice?.profiles.find(
            (candidate) => candidate.typeName === typeName,
          );
          if (occurrence === undefined || found === undefined) {
            throw new Error(`Expected a ${typeName} profile on ${id}.`);
          }
          const evaluated = evaluateRosterProfileCharacteristics(
            roster,
            context,
            occurrence,
            found,
          );
          if (!evaluated.ok) throw new Error("Expected a report.");
          return evaluated.value;
        };

        // Furnace of Plagues has no child entries at all and is the Manreaper's
        // *sibling*, so an owner-relative selector could never reach it. Its
        // modifiers carry `scope="model"`, which stands them on the Lord.
        const manreaper = reportFor(manreaperId, "Melee Weapons");
        const routed = manreaper.characteristics.flatMap(({ steps }) =>
          steps.filter((step) => step.origin === "affects"),
        );
        expect(routed.length).toBeGreaterThan(0);
        expect(
          routed.every((step) => step.declaredBy.id === "anchor-furnace"),
        ).toBe(true);

        // Stone's New Recruit screenshot shows this weapon gaining Devastating
        // Wounds alongside its printed Lethal Hits. The append carries a
        // `position`, which the editor does not offer for `append` and which
        // New Recruit visibly ignored, so it is treated as inert noise and the
        // keyword lands.
        const keywords = manreaper.characteristics.find(
          ({ characteristic }) => characteristic.name === "Keywords",
        );
        expect(keywords).toBeDefined();
        expect(keywords?.baseValue ?? "").toContain("Lethal Hits");
        expect(keywords?.baseValue ?? "").not.toContain("Devastating Wounds");
        expect(keywords?.steps).toMatchObject([
          { status: "applied", origin: "affects", kind: "append" },
        ]);
        expect(keywords?.value ?? "").toContain("Lethal Hits");
        expect(keywords?.value ?? "").toContain("Devastating Wounds");

        // Stone's screenshot shows this weapon's S raised by one. That modifier
        // is the only one targeting S, so unlike A -- which also carries an
        // unsupported `replace` -- the value resolves end to end. This is the
        // first real stat line this evaluator changes.
        const strength = manreaper.characteristics.find(
          ({ characteristic }) => characteristic.name === "S",
        );
        expect(strength?.steps).toMatchObject([
          { status: "applied", kind: "increment", origin: "affects" },
        ]);
        expect(Number(strength?.value)).toBe(Number(strength?.baseValue) + 1);

        // A closes the whole bonus-slot idiom end to end. The `+0` append is
        // filtered to weapons whose Attacks is a dice expression, which this
        // one is not, so the slot is never opened; the two `replace` steps
        // find nothing and pass through; the positioned `increment` adds one.
        // Stone's screenshot shows 11.
        const attacks = manreaper.characteristics.find(
          ({ characteristic }) => characteristic.name === "A",
        );
        expect(Number(attacks?.value)).toBe(Number(attacks?.baseValue) + 1);
        expect(attacks?.steps.some((step) => step.status === "unapplied")).toBe(
          false,
        );

        // The same enhancement routes an `annotation` here, which New Recruit
        // renders after the weapon name: "Manreaper - sweep (Furnace of
        // Plagues)". Its base is empty, so the whole value is built here.
        const manreaperOccurrence = occurrences.find(
          (entry) => entry.id === manreaperId,
        );
        const manreaperChoice = localRosterSelectionChoice(
          current.ok ? current.value : session.value,
          manreaperId,
        );
        const meleeProfile = manreaperChoice?.profiles.find(
          (candidate) => candidate.typeName === "Melee Weapons",
        );
        if (manreaperOccurrence === undefined || meleeProfile === undefined) {
          throw new Error("Expected the Manreaper melee profile.");
        }
        const annotation = evaluateRosterProfileAnnotation(
          roster,
          context,
          manreaperOccurrence,
          meleeProfile,
        );
        if (!annotation.ok) throw new Error("Expected an annotation report.");
        expect(annotation.value.baseValue).toBe("");
        expect(annotation.value.value).toBe("Furnace of Plagues");

        // The same screenshot shows the Lord's own Unit profile unchanged:
        // `self.entries.recursive` names the anchor's descendants, and the
        // anchor is not one of them.
        const lord = reportFor(lordId, "Unit");
        expect(
          lord.characteristics.flatMap(({ steps }) =>
            steps.filter((step) => step.origin === "affects"),
          ),
        ).toEqual([]);
      },
      120_000,
    );

    it(
      "routes a pinned affects selector past groups, filters by category, and appends",
      async () => {
        if (realDataDirectory === undefined) {
          throw new Error("The integration data directory is not configured.");
        }
        const requiredFilenames = new Set([
          "Warhammer 40,000.json",
          "Chaos - Death Guard.json",
          "Chaos - Chaos Daemons Library.json",
          "Chaos - Chaos Knights Library.json",
          "Library - Astartes Heresy Legends.json",
          "Library - Titans.json",
          "Unaligned Forces.json",
        ]);
        const result = await prepareLocalCatalogueLibrary(
          realJsonFiles(realDataDirectory).filter(({ filename }) =>
            requiredFilenames.has(filename),
          ),
          {
            import: {
              batchId: "real-bsdata-json-affects-traversal",
              importedAt: "2026-08-19T00:00:00.000Z",
            },
          },
        );
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        const catalogue = result.value.catalogues.find(
          ({ name }) => name === "Chaos - Death Guard",
        );
        const forceDefinition = catalogue?.context.forces.definitions[0];
        if (catalogue === undefined || forceDefinition === undefined) {
          throw new Error("Expected the Death Guard catalogue.");
        }
        const session = createLocalRosterSession(catalogue, forceDefinition, {
          rosterId: rosterId("real-affects-roster"),
          forceId: forceOccurrenceId("real-affects-force"),
          name: "Affects Traversal Roster",
        });
        if (!session.ok) throw new Error("Expected roster session.");

        const helbruteRoot = localRosterRootChoices(session.value.catalogue).find(
          ({ materialized }) => materialized.name === "Helbrute",
        );
        if (helbruteRoot === undefined) {
          throw new Error("Expected the Helbrute root choice.");
        }
        const unitId = selectionOccurrenceId("affects-helbrute");
        let current = addLocalRosterRootSelection(session.value, helbruteRoot, {
          selectionId: unitId,
        });
        if (!current.ok) throw new Error("Expected the Helbrute to be added.");

        // Weapons sit two group levels below the model, which is exactly the
        // shape that proves `recursive` descends through selection-entry groups.
        const addChild = (
          parentId: SelectionOccurrenceId,
          childName: string,
          childId: string,
        ): SelectionOccurrenceId => {
          if (!current.ok) throw new Error("Expected a session.");
          const choice = localRosterChildChoices(current.value, parentId).find(
            ({ name }) => name === childName,
          );
          if (choice === undefined) {
            throw new Error(`Expected the ${childName} choice.`);
          }
          const id = selectionOccurrenceId(childId);
          current = addLocalRosterChildSelection(
            current.value,
            parentId,
            choice,
            { selectionId: id },
          );
          if (!current.ok) throw new Error(`Expected ${childName} to be added.`);
          return id;
        };

        const wargearId = addChild(unitId, "Wargear", "affects-wargear");
        const fistGroupId = addChild(
          wargearId,
          "Replace helbrute fist",
          "affects-fist-group",
        );
        const meltaGroupId = addChild(
          wargearId,
          "Replace multi-melta",
          "affects-melta-group",
        );
        const scourgeId = addChild(
          fistGroupId,
          "Power scourge",
          "affects-scourge",
        );
        const hammerId = addChild(
          meltaGroupId,
          "Helbrute hammer",
          "affects-hammer",
        );
        const closeCombatId = addChild(
          wargearId,
          "Close combat weapon",
          "affects-close-combat",
        );
        const autocannonId = addChild(
          meltaGroupId,
          "Twin autocannon",
          "affects-autocannon",
        );
        if (!current.ok) return;

        const roster = current.value.roster;
        const context = current.value.catalogue.context;
        const occurrences = rosterSelections(
          roster.forces.flatMap(({ selections }) => selections),
        );
        const meleeReport = (id: SelectionOccurrenceId) => {
          const occurrence = occurrences.find((entry) => entry.id === id);
          const choice = localRosterSelectionChoice(current.ok ? current.value : session.value, id);
          if (occurrence === undefined || choice === undefined) {
            throw new Error(`Expected occurrence ${id}.`);
          }
          const profile = choice.profiles.find(
            ({ typeName }) => typeName === "Melee Weapons",
          );
          if (profile === undefined) {
            throw new Error(`Expected a melee profile on ${id}.`);
          }
          const evaluated = evaluateRosterProfileCharacteristics(
            roster,
            context,
            occurrence,
            profile,
          );
          if (!evaluated.ok) throw new Error("Expected a characteristic report.");
          return evaluated.value;
        };

        const scourge = meleeReport(scourgeId);
        const hammer = meleeReport(hammerId);
        const closeCombat = meleeReport(closeCombatId);

        const routedSteps = (report: typeof scourge) =>
          report.characteristics.flatMap(({ steps }) =>
            steps.filter((step) => step.origin === "affects"),
          );

        // Both selected weapons carry the Helbrute melee weapon category, so the
        // model's `self.entries.recursive.<category>.profiles.Melee Weapons`
        // increment reaches them through two group levels.
        expect(routedSteps(scourge).length).toBeGreaterThan(0);
        expect(routedSteps(hammer).length).toBeGreaterThan(0);
        // Close combat weapon is the one melee profile outside that category.
        // Stone confirmed in New Recruit that it keeps its printed Attacks while
        // the two category members gain the bonus.
        expect(routedSteps(closeCombat)).toEqual([]);

        // The routed operation is `increment 2` on Attacks. Its value has one
        // number, so no position is needed to place it, and it executes.
        expect(routedSteps(scourge)).toMatchObject([
          { status: "applied", kind: "increment" },
        ]);
        const attacks = scourge.characteristics.find(
          ({ characteristic }) => characteristic.name === "A",
        );
        expect(attacks).toMatchObject({ baseValue: "8", value: "10" });
        // The unreached profile keeps its printed value, which is what makes
        // the category filter observable: same operation, different answer.
        expect(
          closeCombat.characteristics.find(
            ({ characteristic }) => characteristic.name === "A",
          ),
        ).toMatchObject({ baseValue: "5", value: "5" });

        // The same model carries an unconditional grouped
        // `self.entries.recursive.profiles.Ranged Weapons` append, so its ranged
        // weapon gains a keyword through the declared separator. This is the
        // first real-data case where a routed step changes a displayed value
        // rather than only proving that routing happened.
        const autocannon = occurrences.find((entry) => entry.id === autocannonId);
        const autocannonChoice = localRosterSelectionChoice(
          current.value,
          autocannonId,
        );
        const rangedProfile = autocannonChoice?.profiles.find(
          ({ typeName }) => typeName === "Ranged Weapons",
        );
        if (autocannon === undefined || rangedProfile === undefined) {
          throw new Error("Expected a ranged profile on the Twin autocannon.");
        }
        const ranged = evaluateRosterProfileCharacteristics(
          roster,
          context,
          autocannon,
          rangedProfile,
        );
        if (!ranged.ok) throw new Error("Expected a ranged characteristic report.");
        const keywords = ranged.value.characteristics.find(
          ({ characteristic }) => characteristic.name === "Keywords",
        );
        expect(keywords?.steps).toMatchObject([
          { status: "applied", kind: "append", origin: "affects" },
        ]);
        // The separator is a comma and a *non-breaking* space (U+00A0), not a
        // plain one. Reconstructing the value with `", "` fails, which is why
        // the declared `join` is used verbatim rather than normalised.
        const nonBreakingSpace = String.fromCharCode(160);
        expect(keywords?.value).toBe(
          `${keywords?.baseValue ?? ""},${nonBreakingSpace}Assault`,
        );
        expect(keywords?.value).not.toBe(keywords?.baseValue);
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

function projectedModifiers(
  projections: readonly BattleScribeProjection[],
): readonly ModifierProjection[] {
  const modifiers: ModifierProjection[] = [];

  const addGroup = (group: ModifierGroupProjection): void => {
    modifiers.push(...group.modifiers);
    for (const child of group.modifierGroups) {
      addGroup(child);
    }
  };
  const addOwner = (owner: {
    readonly modifiers: readonly ModifierProjection[];
    readonly modifierGroups: readonly ModifierGroupProjection[];
  }): void => {
    modifiers.push(...owner.modifiers);
    for (const group of owner.modifierGroups) {
      addGroup(group);
    }
  };
  const visitInfoGroup = (group: InfoGroupProjection): void => {
    addOwner(group);
    for (const profile of group.profiles) {
      addOwner(profile);
    }
    for (const child of group.infoGroups) {
      visitInfoGroup(child);
    }
  };
  const visitContainer = (container: SelectionContainerProjection): void => {
    addOwner(container);
    for (const profile of container.profiles) {
      addOwner(profile);
    }
    for (const group of container.infoGroups) {
      visitInfoGroup(group);
    }
    for (const entry of container.selectionEntries) {
      visitContainer(entry);
    }
    for (const group of container.selectionEntryGroups) {
      visitContainer(group);
    }
    for (const link of container.entryLinks) {
      visitContainer(link);
    }
  };

  for (const projection of projections) {
    for (const profile of projection.profiles) {
      addOwner(profile);
    }
    for (const entry of projection.categoryEntries) {
      addOwner(entry);
      for (const profile of entry.profiles) {
        addOwner(profile);
      }
    }
    for (const group of projection.infoGroups) {
      visitInfoGroup(group);
    }
    for (const entry of projection.selectionEntries) {
      visitContainer(entry);
    }
    for (const group of projection.selectionEntryGroups) {
      visitContainer(group);
    }
    for (const entry of projection.sharedSelectionEntries) {
      visitContainer(entry);
    }
    for (const group of projection.sharedSelectionEntryGroups) {
      visitContainer(group);
    }
    for (const link of projection.entryLinks) {
      visitContainer(link);
    }
  }
  return modifiers;
}

function projectedModifiersWithOwnership(
  projections: readonly BattleScribeProjection[],
): readonly {
  readonly modifier: ModifierProjection;
  readonly grouped: boolean;
}[] {
  const rows: {
    readonly modifier: ModifierProjection;
    readonly grouped: boolean;
  }[] = [];

  const addGroup = (group: ModifierGroupProjection): void => {
    for (const modifier of group.modifiers) {
      rows.push({ modifier, grouped: true });
    }
    for (const child of group.modifierGroups) {
      addGroup(child);
    }
  };
  const addOwner = (owner: {
    readonly modifiers: readonly ModifierProjection[];
    readonly modifierGroups: readonly ModifierGroupProjection[];
  }): void => {
    for (const modifier of owner.modifiers) {
      rows.push({ modifier, grouped: false });
    }
    for (const group of owner.modifierGroups) {
      addGroup(group);
    }
  };
  const visitContainer = (container: SelectionContainerProjection): void => {
    addOwner(container);
    for (const entry of container.selectionEntries) {
      visitContainer(entry);
    }
    for (const group of container.selectionEntryGroups) {
      visitContainer(group);
    }
    for (const link of container.entryLinks) {
      visitContainer(link);
    }
  };

  for (const projection of projections) {
    for (const entry of [
      ...projection.selectionEntries,
      ...projection.sharedSelectionEntries,
    ]) {
      visitContainer(entry);
    }
    for (const group of [
      ...projection.selectionEntryGroups,
      ...projection.sharedSelectionEntryGroups,
    ]) {
      visitContainer(group);
    }
    for (const link of projection.entryLinks) {
      visitContainer(link);
    }
  }
  return rows;
}

function selectionAnnotationModifierSummary(
  projections: readonly BattleScribeProjection[],
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {
    total: 0,
    direct: 0,
    routed: 0,
    grouped: 0,
    ungrouped: 0,
    set: 0,
    append: 0,
    withConditions: 0,
    withConditionGroups: 0,
    withRepeats: 0,
    missingJoin: 0,
    scoped: 0,
    withFilterId: 0,
  };
  const add = (key: string): void => {
    counts[key] = (counts[key] ?? 0) + 1;
  };

  for (const { modifier, grouped } of projectedModifiersWithOwnership(
    projections,
  )) {
    if (modifier.field !== "annotation") continue;
    const affects = modifier.node.attributes["affects"];
    if (affects !== undefined) {
      const selector = parseBattleScribeAffectsSelector(affects);
      if (selector.target !== "selections") continue;
      add("routed");
      if (selector.filterId !== undefined) add("withFilterId");
    } else {
      add("direct");
    }
    add("total");
    add(grouped ? "grouped" : "ungrouped");
    if (modifier.type === "set") add("set");
    if (modifier.type === "append") {
      add("append");
      if (modifier.node.attributes["join"] === undefined) add("missingJoin");
    }
    if (modifier.conditions.length > 0) add("withConditions");
    if (modifier.conditionGroups.length > 0) add("withConditionGroups");
    if (modifier.repeats.length > 0) add("withRepeats");
    if (modifier.scope !== undefined) add("scoped");
  }
  return counts;
}

function projectedSelectionEntryIds(
  projections: readonly BattleScribeProjection[],
): ReadonlySet<string> {
  const ids = new Set<string>();
  const visit = (container: SelectionContainerProjection): void => {
    for (const entry of container.selectionEntries) {
      if (entry.id !== undefined) ids.add(entry.id);
      visit(entry);
    }
    for (const group of container.selectionEntryGroups) {
      visit(group);
    }
    for (const link of container.entryLinks) {
      visit(link);
    }
  };
  for (const projection of projections) {
    for (const entry of [
      ...projection.selectionEntries,
      ...projection.sharedSelectionEntries,
    ]) {
      if (entry.id !== undefined) ids.add(entry.id);
      visit(entry);
    }
    for (const group of [
      ...projection.selectionEntryGroups,
      ...projection.sharedSelectionEntryGroups,
    ]) {
      visit(group);
    }
    for (const link of projection.entryLinks) {
      visit(link);
    }
  }
  return ids;
}

function categoryConditionImpactSummary(
  projections: readonly BattleScribeProjection[],
  roots: readonly OrderedXmlElement[],
): Readonly<Record<string, number>> {
  const categoryEntryIds = new Set<string>(
    projections.flatMap(({ categoryEntries }) =>
      categoryEntries.flatMap(({ id }) => id ?? []),
    ),
  );
  const behaviorAttributes = ["affects", "join", "arg", "position"] as const;
  const executableTargets = new Set<string>();
  const blockedTargets = new Set<string>();

  for (const { modifier } of projectedModifiersWithOwnership(projections)) {
    if (modifier.field !== "category") continue;
    const target = modifier.value;
    if (target === undefined) continue;
    const executable =
      (modifier.type === "add" ||
        modifier.type === "remove" ||
        modifier.type === "set-primary" ||
        modifier.type === "unset-primary") &&
      (modifier.scope === undefined ||
        modifier.scope === "parent" ||
        modifier.scope === "root-entry") &&
      modifier.repeats.length === 0 &&
      behaviorAttributes.every(
        (attribute) => modifier.node.attributes[attribute] === undefined,
      ) &&
      categoryEntryIds.has(target);
    (executable ? executableTargets : blockedTargets).add(target);
  }
  const controlled = new Set([...executableTargets, ...blockedTargets]);
  const executableOnly = new Set(
    [...executableTargets].filter((target) => !blockedTargets.has(target)),
  );

  const counts: Record<string, number> = {
    categoryReferencingConditions: 0,
    unaffected: 0,
    wouldBecomeKnown: 0,
    staysUnresolved: 0,
    controlledCategories: controlled.size,
    executableOnlyCategories: executableOnly.size,
    blockedCategories: blockedTargets.size,
  };
  const add = (key: string): void => {
    counts[key] = (counts[key] ?? 0) + 1;
  };

  // Conditions hang off modifiers, modifier groups, and nested condition
  // groups on many owner kinds, so the generic source tree is walked rather
  // than a typed subset that could silently miss one.
  const visit = (element: OrderedXmlElement): void => {
    if (element.name === "condition") {
      const target = [
        element.attributes.childId,
        element.attributes.scope,
      ].find(
        (candidate) =>
          candidate !== undefined && categoryEntryIds.has(candidate),
      );
      if (target !== undefined) {
        add("categoryReferencingConditions");
        add(
          !controlled.has(target)
            ? "unaffected"
            : executableOnly.has(target)
              ? "wouldBecomeKnown"
              : "staysUnresolved",
        );
      }
    }
    for (const child of element.children) {
      if (child.kind === "element") visit(child);
    }
  };
  for (const root of roots) visit(root);
  return counts;
}

function categoryModifierSummary(
  projections: readonly BattleScribeProjection[],
): Readonly<Record<string, number>> {
  const categoryEntryIds = new Set<string>(
    projections.flatMap(({ categoryEntries }) =>
      categoryEntries.flatMap(({ id }) => id ?? []),
    ),
  );
  const behaviorAttributes = ["affects", "join", "arg", "position"] as const;
  const counts: Record<string, number> = {
    total: 0,
    add: 0,
    setPrimary: 0,
    remove: 0,
    unsetPrimary: 0,
    otherOperations: 0,
    direct: 0,
    grouped: 0,
    scoped: 0,
    affects: 0,
    arg: 0,
    join: 0,
    withConditions: 0,
    withConditionGroups: 0,
    withRepeats: 0,
    valueResolvesToCategory: 0,
    executable: 0,
  };
  const add = (key: string): void => {
    counts[key] = (counts[key] ?? 0) + 1;
  };

  for (const { modifier, grouped } of projectedModifiersWithOwnership(
    projections,
  )) {
    if (modifier.field !== "category") continue;
    add("total");
    add(grouped ? "grouped" : "direct");
    add(
      modifier.type === "add"
        ? "add"
        : modifier.type === "remove"
          ? "remove"
          : modifier.type === "set-primary"
            ? "setPrimary"
            : modifier.type === "unset-primary"
              ? "unsetPrimary"
              : "otherOperations",
    );
    if (modifier.scope !== undefined) add("scoped");
    if (modifier.conditions.length > 0) add("withConditions");
    if (modifier.conditionGroups.length > 0) add("withConditionGroups");
    if (modifier.repeats.length > 0) add("withRepeats");
    const behavior = behaviorAttributes.filter(
      (attribute) => modifier.node.attributes[attribute] !== undefined,
    );
    for (const attribute of behavior) {
      if (attribute !== "position") add(attribute);
    }
    if (modifier.value !== undefined && categoryEntryIds.has(modifier.value)) {
      add("valueResolvesToCategory");
    }
    if (
      (modifier.type === "add" ||
        modifier.type === "remove" ||
        modifier.type === "set-primary" ||
        modifier.type === "unset-primary") &&
      (modifier.scope === undefined ||
        modifier.scope === "parent" ||
        modifier.scope === "root-entry") &&
      behavior.length === 0 &&
      modifier.repeats.length === 0 &&
      modifier.value !== undefined &&
      categoryEntryIds.has(modifier.value)
    ) {
      add("executable");
    }
  }
  return counts;
}

function affectsSelectorSummary(
  projections: readonly BattleScribeProjection[],
): Readonly<Record<string, number>> {
  const characteristicTypeIds = new Set<string>(
    projections.flatMap(({ profileTypes }) =>
      profileTypes.flatMap(({ characteristicTypes }) =>
        characteristicTypes.flatMap(({ id }) => id ?? []),
      ),
    ),
  );
  const declaredProfileTypeNames = new Set<string>(
    projections.flatMap(({ profileTypes }) =>
      profileTypes.flatMap(({ name }) => name ?? []),
    ),
  );
  const categoryEntryIds = new Set<string>(
    projections.flatMap(({ categoryEntries }) =>
      categoryEntries.flatMap(({ id }) => id ?? []),
    ),
  );
  const selectionEntryIds = projectedSelectionEntryIds(projections);

  const counts: Record<string, number> = {
    total: 0,
    distinctValues: 0,
    supported: 0,
    unsupported: 0,
    traversalOwn: 0,
    traversalChildren: 0,
    traversalDescendants: 0,
    forceTraversal: 0,
    targetProfiles: 0,
    targetSelections: 0,
    targetSelectionsCategoryField: 0,
    targetSelectionsCategoryFieldScoped: 0,
    missingProfileTypeName: 0,
    unexpectedSegment: 0,
    empty: 0,
    withFilterId: 0,
    filterCategoryEntry: 0,
    filterSelectionEntry: 0,
    filterUnresolved: 0,
    distinctProfileTypeNames: 0,
    undeclaredProfileTypeNames: 0,
    characteristicTargets: 0,
    characteristicTargetsSupported: 0,
  };
  const add = (key: string): void => {
    counts[key] = (counts[key] ?? 0) + 1;
  };
  const values = new Set<string>();
  const profileTypeNames = new Set<string>();
  const undeclared = new Set<string>();

  for (const modifier of projectedModifiers(projections)) {
    const value = modifier.node.attributes.affects;
    if (value === undefined) continue;
    add("total");
    values.add(value);
    const parsed = parseBattleScribeAffectsSelector(value);
    add(parsed.supported ? "supported" : "unsupported");
    add(
      parsed.traversal === "own"
        ? "traversalOwn"
        : parsed.traversal === "children"
          ? "traversalChildren"
          : "traversalDescendants",
    );
    for (const issue of parsed.issues) add(issue);
    add(parsed.target === "profiles" ? "targetProfiles" : "targetSelections");
    if (parsed.target === "selections" && modifier.field === "category") {
      add("targetSelectionsCategoryField");
      if (modifier.node.attributes.scope !== undefined) {
        add("targetSelectionsCategoryFieldScoped");
      }
    }
    if (parsed.filterId !== undefined) {
      add("withFilterId");
      add(
        categoryEntryIds.has(parsed.filterId)
          ? "filterCategoryEntry"
          : selectionEntryIds.has(parsed.filterId)
            ? "filterSelectionEntry"
            : "filterUnresolved",
      );
    }
    if (parsed.profileTypeName !== undefined) {
      profileTypeNames.add(parsed.profileTypeName);
      if (!declaredProfileTypeNames.has(parsed.profileTypeName)) {
        undeclared.add(parsed.profileTypeName);
      }
    }
    if (
      modifier.field !== undefined &&
      characteristicTypeIds.has(modifier.field)
    ) {
      add("characteristicTargets");
      if (parsed.supported) add("characteristicTargetsSupported");
    }
  }
  counts.distinctValues = values.size;
  counts.distinctProfileTypeNames = profileTypeNames.size;
  counts.undeclaredProfileTypeNames = undeclared.size;
  return counts;
}

function findProjectedCondition(
  projections: readonly BattleScribeProjection[],
  matches: (condition: ConditionProjection) => boolean,
): ConditionProjection | undefined {
  const fromGroup = (
    group: ConditionGroupProjection,
  ): ConditionProjection | undefined =>
    group.conditions.find(matches) ??
    group.conditionGroups.reduce<ConditionProjection | undefined>(
      (found, child) => found ?? fromGroup(child),
      undefined,
    );

  for (const { modifier } of projectedModifiersWithOwnership(projections)) {
    const direct = modifier.conditions.find(matches);
    if (direct !== undefined) return direct;
    for (const group of modifier.conditionGroups) {
      const nested = fromGroup(group);
      if (nested !== undefined) return nested;
    }
  }
  return undefined;
}

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

function profileOwnedCharacteristicModifierSummary(
  projections: readonly BattleScribeProjection[],
): Readonly<Record<string, number>> {
  const characteristicTypeIds = new Set<string>(
    projections.flatMap(({ profileTypes }) =>
      profileTypes.flatMap(({ characteristicTypes }) =>
        characteristicTypes.flatMap(({ id }) => id ?? []),
      ),
    ),
  );
  const behaviorAttributes = ["affects", "join", "arg", "position"] as const;
  const counts: Record<string, number> = {
    total: 0,
    direct: 0,
    grouped: 0,
    set: 0,
    append: 0,
    increment: 0,
    decrement: 0,
    floor: 0,
    replace: 0,
    otherOperations: 0,
    scoped: 0,
    withConditions: 0,
    withConditionGroups: 0,
    withRepeats: 0,
    missingValue: 0,
    affects: 0,
    join: 0,
    arg: 0,
    position: 0,
    behaviorFree: 0,
    targetOnProfile: 0,
    targetAbsent: 0,
    targetAmbiguous: 0,
    supportedSetSubset: 0,
    supportedSetDirect: 0,
    supportedSetGrouped: 0,
  };
  const add = (key: string): void => {
    counts[key] = (counts[key] ?? 0) + 1;
  };

  const visitModifier = (
    modifier: ModifierProjection,
    targetCounts: ReadonlyMap<string, number>,
    grouped: boolean,
  ): void => {
    const field = modifier.field;
    if (field === undefined || !characteristicTypeIds.has(field)) {
      return;
    }
    add("total");
    add(grouped ? "grouped" : "direct");
    add(
      modifier.type === "set" ||
        modifier.type === "append" ||
        modifier.type === "increment" ||
        modifier.type === "decrement" ||
        modifier.type === "floor" ||
        modifier.type === "replace"
        ? modifier.type
        : "otherOperations",
    );
    if (modifier.scope !== undefined) add("scoped");
    if (modifier.conditions.length > 0) add("withConditions");
    if (modifier.conditionGroups.length > 0) add("withConditionGroups");
    if (modifier.repeats.length > 0) add("withRepeats");
    if (modifier.value === undefined) add("missingValue");
    const behavior = behaviorAttributes.filter(
      (attribute) => modifier.node.attributes[attribute] !== undefined,
    );
    for (const attribute of behavior) add(attribute);
    if (behavior.length === 0) add("behaviorFree");

    const matches = targetCounts.get(field) ?? 0;
    add(
      matches === 1
        ? "targetOnProfile"
        : matches === 0
          ? "targetAbsent"
          : "targetAmbiguous",
    );
    if (
      modifier.type === "set" &&
      modifier.scope === undefined &&
      behavior.length === 0 &&
      matches === 1 &&
      modifier.value !== undefined
    ) {
      add("supportedSetSubset");
      add(grouped ? "supportedSetGrouped" : "supportedSetDirect");
    }
  };

  const visitModifierGroup = (
    group: ModifierGroupProjection,
    targetCounts: ReadonlyMap<string, number>,
  ): void => {
    for (const modifier of group.modifiers) {
      visitModifier(modifier, targetCounts, true);
    }
    for (const child of group.modifierGroups) {
      visitModifierGroup(child, targetCounts);
    }
  };
  for (const profile of projectedProfiles(projections)) {
    const targetCounts = new Map<string, number>();
    for (const { typeId } of profile.characteristics) {
      if (typeId !== undefined) {
        targetCounts.set(typeId, (targetCounts.get(typeId) ?? 0) + 1);
      }
    }
    for (const modifier of profile.modifiers) {
      visitModifier(modifier, targetCounts, false);
    }
    for (const group of profile.modifierGroups) {
      visitModifierGroup(group, targetCounts);
    }
  }

  return counts;
}

function projectedProfiles(
  projections: readonly BattleScribeProjection[],
): readonly ProfileProjection[] {
  const profiles: ProfileProjection[] = [];

  const visitInfoGroup = (group: InfoGroupProjection): void => {
    profiles.push(...group.profiles);
    for (const child of group.infoGroups) {
      visitInfoGroup(child);
    }
  };
  const visitSelectionContainer = (
    container: SelectionContainerProjection,
  ): void => {
    profiles.push(...container.profiles);
    for (const group of container.infoGroups) {
      visitInfoGroup(group);
    }
    for (const entry of container.selectionEntries) {
      visitSelectionContainer(entry);
    }
    for (const group of container.selectionEntryGroups) {
      visitSelectionContainer(group);
    }
    for (const link of container.entryLinks) {
      visitSelectionContainer(link);
    }
  };

  for (const projection of projections) {
    profiles.push(...projection.profiles);
    for (const entry of projection.categoryEntries) {
      profiles.push(...entry.profiles);
    }
    for (const group of projection.infoGroups) {
      visitInfoGroup(group);
    }
    for (const entry of projection.selectionEntries) {
      visitSelectionContainer(entry);
    }
    for (const group of projection.selectionEntryGroups) {
      visitSelectionContainer(group);
    }
    for (const entry of projection.sharedSelectionEntries) {
      visitSelectionContainer(entry);
    }
    for (const group of projection.sharedSelectionEntryGroups) {
      visitSelectionContainer(group);
    }
    for (const link of projection.entryLinks) {
      visitSelectionContainer(link);
    }
  }
  return profiles;
}

function profileOwnedVisibilityModifierSummary(
  projections: readonly BattleScribeProjection[],
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {
    profiles: 0,
    staticHidden: 0,
    total: 0,
    direct: 0,
    grouped: 0,
    set: 0,
    otherOperations: 0,
    booleanTrue: 0,
    booleanFalse: 0,
    scoped: 0,
    withConditions: 0,
    withConditionGroups: 0,
    withRepeats: 0,
    extensionAttributes: 0,
    supportedShape: 0,
  };
  const add = (key: string): void => {
    counts[key] = (counts[key] ?? 0) + 1;
  };

  const visitModifier = (
    modifier: ModifierProjection,
    grouped: boolean,
  ): void => {
    if (modifier.field !== "hidden") return;
    add("total");
    add(grouped ? "grouped" : "direct");
    add(modifier.type === "set" ? "set" : "otherOperations");
    if (modifier.value === "true") add("booleanTrue");
    if (modifier.value === "false") add("booleanFalse");
    if (modifier.scope !== undefined) add("scoped");
    if (modifier.conditions.length > 0) add("withConditions");
    if (modifier.conditionGroups.length > 0) add("withConditionGroups");
    if (modifier.repeats.length > 0) add("withRepeats");
    const extras = Object.keys(modifier.node.attributes).filter(
      (attribute) =>
        attribute !== "type" &&
        attribute !== "field" &&
        attribute !== "value" &&
        attribute !== "scope" &&
        attribute !== "comment",
    );
    if (extras.length > 0) add("extensionAttributes");
    if (
      modifier.type === "set" &&
      (modifier.value === "true" || modifier.value === "false") &&
      modifier.scope === undefined &&
      modifier.repeats.length === 0 &&
      extras.length === 0
    ) {
      add("supportedShape");
    }
  };
  const visitGroup = (group: ModifierGroupProjection): void => {
    for (const modifier of group.modifiers) {
      visitModifier(modifier, true);
    }
    for (const child of group.modifierGroups) {
      visitGroup(child);
    }
  };

  for (const profile of projectedProfiles(projections)) {
    add("profiles");
    if (profile.hidden === true) add("staticHidden");
    for (const modifier of profile.modifiers) {
      visitModifier(modifier, false);
    }
    for (const group of profile.modifierGroups) {
      visitGroup(group);
    }
  }
  return counts;
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

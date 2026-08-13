import { success, type Diagnostic, type ObjectId, type Result } from "@rosterforge/foundation";

import type {
  CharacteristicProjection,
  CharacteristicTypeProjection,
  ParsedBattleScribeDocument,
  ProfileProjection,
  ProfileTypeProjection,
  SelectionContainerProjection,
  SelectionEntryGroupProjection,
  SelectionEntryProjection,
} from "@rosterforge/battlescribe-data";

import type {
  BattleScribeDataGraph,
  BattleScribeGraphReference,
} from "./resolve.js";

export type BattleScribeTypeReferenceStatus =
  | "missingTargetId"
  | "missing"
  | "resolved"
  | "ambiguous";

export type BattleScribeCharacteristicContainmentStatus =
  | "contained"
  | "outsideProfileType"
  | "unresolved";

export interface BattleScribeProfileTypeTarget {
  readonly source: ProfileTypeProjection;
  readonly sourceDocument: ParsedBattleScribeDocument;
}

export interface BattleScribeCharacteristicTypeTarget {
  readonly source: CharacteristicTypeProjection;
  readonly sourceDocument: ParsedBattleScribeDocument;
}

export interface BattleScribeProfileTypeReference {
  readonly targetId: ObjectId | undefined;
  readonly status: BattleScribeTypeReferenceStatus;
  readonly targets: readonly BattleScribeProfileTypeTarget[];
}

export interface BattleScribeCharacteristicTypeReference {
  readonly targetId: ObjectId | undefined;
  readonly status: BattleScribeTypeReferenceStatus;
  readonly targets: readonly BattleScribeCharacteristicTypeTarget[];
}

export interface BattleScribeCharacteristicContainment {
  readonly source: CharacteristicProjection;
  readonly sourceDocument: ParsedBattleScribeDocument;
  readonly type: BattleScribeCharacteristicTypeReference;
  readonly containment: BattleScribeCharacteristicContainmentStatus;
}

export interface BattleScribeProfileTypeContainment {
  readonly source: ProfileProjection;
  readonly sourceDocument: ParsedBattleScribeDocument;
  readonly type: BattleScribeProfileTypeReference;
  readonly characteristics: readonly BattleScribeCharacteristicContainment[];
}

export interface BattleScribeProfileContainmentReport {
  readonly graph: BattleScribeDataGraph;
  readonly profiles: readonly BattleScribeProfileTypeContainment[];
  readonly byProfile: ReadonlyMap<
    ProfileProjection,
    BattleScribeProfileTypeContainment
  >;
}

interface LocatedProfile {
  readonly source: ProfileProjection;
  readonly sourceDocument: ParsedBattleScribeDocument;
}

export function inspectBattleScribeProfileTypeContainment(
  graph: BattleScribeDataGraph,
): Result<BattleScribeProfileContainmentReport> {
  const diagnostics: Diagnostic[] = [];
  const referencesBySource = new Map<object, BattleScribeGraphReference>();
  for (const reference of graph.references) {
    if (
      reference.kind === "profileType" ||
      reference.kind === "characteristicType"
    ) {
      referencesBySource.set(reference.source, reference);
    }
  }

  const profiles = graph.documents
    .flatMap((document) => profilesForDocument(document))
    .map(({ source, sourceDocument }) =>
      inspectProfile(
        source,
        sourceDocument,
        referencesBySource,
        diagnostics,
      ),
    );

  return success(
    {
      graph,
      profiles,
      byProfile: new Map(profiles.map((profile) => [profile.source, profile])),
    },
    diagnostics,
  );
}

function inspectProfile(
  source: ProfileProjection,
  sourceDocument: ParsedBattleScribeDocument,
  referencesBySource: ReadonlyMap<object, BattleScribeGraphReference>,
  diagnostics: Diagnostic[],
): BattleScribeProfileTypeContainment {
  const type = profileTypeReference(
    source.typeId,
    referencesBySource.get(source),
  );
  const characteristics = source.characteristics.map((characteristic) =>
    inspectCharacteristic(
      characteristic,
      source,
      sourceDocument,
      type,
      referencesBySource.get(characteristic),
      diagnostics,
    ),
  );
  return { source, sourceDocument, type, characteristics };
}

function inspectCharacteristic(
  source: CharacteristicProjection,
  profile: ProfileProjection,
  sourceDocument: ParsedBattleScribeDocument,
  profileType: BattleScribeProfileTypeReference,
  reference: BattleScribeGraphReference | undefined,
  diagnostics: Diagnostic[],
): BattleScribeCharacteristicContainment {
  const type = characteristicTypeReference(source.typeId, reference);
  const containment = containmentStatus(profileType, type);
  if (containment === "outsideProfileType") {
    diagnostics.push(containmentDiagnostic(profile, source, profileType, type));
  }
  return { source, sourceDocument, type, containment };
}

function profileTypeReference(
  targetId: ObjectId | undefined,
  reference: BattleScribeGraphReference | undefined,
): BattleScribeProfileTypeReference {
  const targets =
    reference?.targets
      .filter((target) => target.kind === "profileType")
      .map((target) => ({
        source: target.source as ProfileTypeProjection,
        sourceDocument: target.document,
      })) ?? [];
  return { targetId, status: referenceStatus(targetId, targets), targets };
}

function characteristicTypeReference(
  targetId: ObjectId | undefined,
  reference: BattleScribeGraphReference | undefined,
): BattleScribeCharacteristicTypeReference {
  const targets =
    reference?.targets
      .filter((target) => target.kind === "characteristicType")
      .map((target) => ({
        source: target.source as CharacteristicTypeProjection,
        sourceDocument: target.document,
      })) ?? [];
  return { targetId, status: referenceStatus(targetId, targets), targets };
}

function referenceStatus(
  targetId: ObjectId | undefined,
  targets: readonly unknown[],
): BattleScribeTypeReferenceStatus {
  if (targetId === undefined) {
    return "missingTargetId";
  }
  if (targets.length === 0) {
    return "missing";
  }
  return targets.length === 1 ? "resolved" : "ambiguous";
}

function containmentStatus(
  profileType: BattleScribeProfileTypeReference,
  characteristicType: BattleScribeCharacteristicTypeReference,
): BattleScribeCharacteristicContainmentStatus {
  if (
    profileType.status !== "resolved" ||
    characteristicType.status !== "resolved"
  ) {
    return "unresolved";
  }
  const profileTypeTarget = profileType.targets[0]?.source;
  const characteristicTypeTarget = characteristicType.targets[0]?.source;
  if (profileTypeTarget === undefined || characteristicTypeTarget === undefined) {
    return "unresolved";
  }
  return profileTypeTarget.characteristicTypes.includes(characteristicTypeTarget)
    ? "contained"
    : "outsideProfileType";
}

function containmentDiagnostic(
  profile: ProfileProjection,
  characteristic: CharacteristicProjection,
  profileType: BattleScribeProfileTypeReference,
  characteristicType: BattleScribeCharacteristicTypeReference,
): Diagnostic {
  return {
    code: "BS_PROFILE_CHARACTERISTIC_TYPE_MISMATCH",
    message: `Characteristic type ${characteristicType.targetId ?? "target"} is not declared by profile type ${profileType.targetId ?? "target"}.`,
    severity: "warning",
    impacts: ["compatibility", "resolution"],
    location: {
      source: characteristic.source,
      path: [...characteristic.path, "@typeId"],
    },
    details: {
      profileId: profile.id,
      profileTypeId: profileType.targetId,
      characteristicTypeId: characteristicType.targetId,
    },
  };
}

function profilesForDocument(
  document: ParsedBattleScribeDocument,
): readonly LocatedProfile[] {
  const projection = document.projection;
  return [
    ...projection.profiles.map((source) => ({ source, sourceDocument: document })),
    ...projection.selectionEntries.flatMap((entry) =>
      profilesForSelectionEntry(entry, document),
    ),
    ...projection.selectionEntryGroups.flatMap((group) =>
      profilesForSelectionEntryGroup(group, document),
    ),
    ...projection.sharedSelectionEntries.flatMap((entry) =>
      profilesForSelectionEntry(entry, document),
    ),
    ...projection.sharedSelectionEntryGroups.flatMap((group) =>
      profilesForSelectionEntryGroup(group, document),
    ),
    ...projection.entryLinks.flatMap((entryLink) =>
      profilesForContainer(entryLink, document),
    ),
  ];
}

function profilesForSelectionEntry(
  entry: SelectionEntryProjection,
  document: ParsedBattleScribeDocument,
): readonly LocatedProfile[] {
  return profilesForContainer(entry, document);
}

function profilesForSelectionEntryGroup(
  group: SelectionEntryGroupProjection,
  document: ParsedBattleScribeDocument,
): readonly LocatedProfile[] {
  return profilesForContainer(group, document);
}

function profilesForContainer(
  container: SelectionContainerProjection,
  document: ParsedBattleScribeDocument,
): readonly LocatedProfile[] {
  return [
    ...container.profiles.map((source) => ({ source, sourceDocument: document })),
    ...container.selectionEntries.flatMap((entry) =>
      profilesForSelectionEntry(entry, document),
    ),
    ...container.selectionEntryGroups.flatMap((group) =>
      profilesForSelectionEntryGroup(group, document),
    ),
    ...container.entryLinks.flatMap((entryLink) =>
      profilesForContainer(entryLink, document),
    ),
  ];
}

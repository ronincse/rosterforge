// Classification and ordering remain headless and never mutate source or roster.
import { expect, it } from "vitest";
import { parseBattleScribeXml } from "@rosterforge/battlescribe-data";
import { profilePresentationResolver, resolveBattleScribeDataGraph } from "@rosterforge/data-graph";
import { sourceId } from "@rosterforge/foundation";
import { classifyReferenceProfile, orderReferenceProfiles } from "./reference-profile-presentation.js";
import type { ReferenceProfileGroup } from "./unit-reference-model.js";
function group(kind: string, label = 'Unit', fields = '<characteristic typeId="f" name="Description">Text</characteristic>', index = ''): ReferenceProfileGroup {
  const parsed = parseBattleScribeXml(new TextEncoder().encode(`<gameSystem id="g" name="G" revision="1" battleScribeVersion="2.03"><profileTypes><profileType id="t" ${kind} ${index}><characteristicTypes><characteristicType id="f" name="Field"/></characteristicTypes></profileType></profileTypes><sharedProfiles><profile id="p" name="P" typeId="t" typeName="${label}"><characteristics>${fields}</characteristics></profile></sharedProfiles></gameSystem>`), { source: { sourceId: sourceId(kind + index), filename:'p.gst', kind:'synthetic', importedAt:'2026-09-17T00:00:00Z' } });
  if (!parsed.ok) throw new Error('parse');
  const graph = resolveBattleScribeDataGraph([parsed.value]); if (!graph.ok) throw new Error('graph');
  const profile = { origin:'Direct' as const, value:parsed.value.projection.profiles[0]! };
  return { profile, report:undefined, members:[], presentation:classifyReferenceProfile(profile, profilePresentationResolver(graph.value)(profile.value)) };
}
it.each([['model','model'],['weapon','weapon'],['ability','ability'],['tag','additional'],['dragon','additional'],['','additional']])('explicit kind %s outranks Unit/Description labels', (kind, section) => {
  expect(group(`kind="${kind}"`).presentation).toMatchObject({section, legacy:false});
});
it('retains only explicit legacy fallbacks when metadata is genuinely absent', () => {
  const fields = '<characteristic typeId="f" name="Power">2</characteristic>';
  expect(group('').presentation).toMatchObject({section:'ability', legacy:true});
  expect(group('', 'Unit', fields).presentation).toMatchObject({section:'model', legacy:true});
  expect(group('', 'Ranged Weapons', fields).presentation).toMatchObject({section:'weapon', legacy:true});
  expect(group('', 'Melee Weapons', fields).presentation).toMatchObject({section:'weapon', legacy:true});
  expect(group('', 'Alien schema', fields).presentation).toMatchObject({section:'additional', legacy:false});
});
it('orders valid indices first, keeps stable type ties and unsorted encounter order without mutation', () => {
  const absent = group('kind="ability"');
  const second = group('kind="ability"', 'Other', undefined, 'sortIndex="2"');
  const first = group('kind="ability"', 'First', undefined, 'sortIndex="1"');
  const invalid = group('kind="ability"', 'Invalid', undefined, 'sortIndex="no"');
  const tie = { ...second, presentation: { ...second.presentation!, typeKey:'distinct' } };
  const input = Object.freeze([absent, second, first, invalid, tie]);
  expect(orderReferenceProfiles(input)).toEqual([first, second, tie, absent, invalid]);
  expect(input).toEqual([absent, second, first, invalid, tie]);
});
it('retains duplicate characteristic values via fields instead of conflating columns', () => {
  expect(group('kind="weapon"', 'Tool', '<characteristic typeId="f">A</characteristic><characteristic typeId="f">B</characteristic>').presentation?.layout).toBe('fields');
});

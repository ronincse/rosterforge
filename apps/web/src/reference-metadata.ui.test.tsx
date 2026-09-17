// @vitest-environment jsdom
// Real import/create/reference rendering of deliberately unfamiliar metadata.
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { forceOccurrenceId, rosterId, selectionOccurrenceId } from "@rosterforge/roster-model";
import { addLocalRosterRootSelection, createLocalRosterSession, evaluateLocalRosterCosts, localRosterRootChoices } from "./roster-session.js";
import { createUnitReferenceModel } from "./unit-reference-model.js";
import { App } from "./App.js";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
afterEach(cleanup);
const encode = (s: string) => new TextEncoder().encode(s);
const fields = [['brief', 'Heading', 'Alpha'], ['rounds', 'Rounds', '5'], ['supply', 'Supply', '0'], ['score', 'Per Round', '2'], ['a', 'Parameters', 'Keep &amp;quot; literal.'], ['b', 'Scoring Conditions', 'Retain every authored scoring condition.'], ['c', 'Additional Conditions', '&lt;script&gt;harmless&lt;/script&gt;']] as const;
const chars = fields.map(([id, name, value]) => `<characteristic typeId="${id}" name="${name}">${value}</characteristic>`).join('');
const xml = `<gameSystem id="metadata" name="Fictional" revision="1" battleScribeVersion="2.03"><forceEntries><forceEntry id="force" name="Patrol"/></forceEntries><profileTypes>
<profileType id="ability" name="Transmission" kind="ability" sortIndex="2"><characteristicTypes>${fields.map(([id, name], i) => `<characteristicType id="${id}" name="${name}" ${i > 3 ? 'kind="longText"' : ''}/>`).join('')}<characteristicType id="cost" name="Cost" kind="annotation"/></characteristicTypes></profileType>
<profileType id="weapon" name="Instrument" kind="weapon" sortIndex="1"><characteristicTypes><characteristicType id="range" name="Span"/><characteristicType id="blank" name="Blank"><formatRules><formatRule type="replace" pattern="^$" replacement="EXECUTED"/></formatRules></characteristicType></characteristicTypes></profileType>
<profileType id="tag" name="Census" kind="tag"><characteristicTypes><characteristicType id="supply" name="Supply"/></characteristicTypes></profileType>
<profileType id="map" name="Deployment Map"><characteristicTypes><characteristicType id="setup" kind="longText"/></characteristicTypes></profileType>
</profileTypes><sharedProfiles><profile id="linked" name="Dependency dispatch" typeId="ability" typeName="Transmission"><characteristics><characteristic typeId="a" name="Parameters">Linked payload.</characteristic></characteristics></profile><profile id="unselected" name="Unselected alternative" typeId="ability" typeName="Transmission"/></sharedProfiles></gameSystem>`;
const cat = `<catalogue id="cat" name="Metadata Fleet" revision="1" battleScribeVersion="2.03" gameSystemId="metadata" library="false"><selectionEntries><selectionEntry id="unit" name="Signal team" type="unit"><profiles>
<profile id="packet" hidden="true" name="Unfamiliar dispatch" typeId="ability" typeName="Unit"><characteristics>${chars}<characteristic typeId="cost" name="Cost">Active (1 token)</characteristic></characteristics><modifiers><modifier type="set" field="brief" value="Beta"/></modifiers></profile>
<profile id="tool" name="Measured beam" typeId="weapon" typeName="Instrument"><characteristics><characteristic typeId="range" name="Span">12&quot;</characteristic><characteristic typeId="blank" name="Blank"></characteristic></characteristics></profile>
<profile id="census" name="Carrier census" typeId="tag" typeName="Census"><characteristics><characteristic typeId="supply" name="Supply">0</characteristic></characteristics></profile>
<profile id="map-profile" name="Quiet plateau" typeId="map" typeName="Deployment Map"><characteristics><characteristic typeId="setup">Full setup instruction.</characteristic></characteristics></profile>
</profiles><infoLinks><infoLink id="packet-link" type="profile" targetId="linked"/></infoLinks><infoGroups><infoGroup id="group" name="Authored scope"><infoGroups><infoGroup id="nested" name="Nested scope"><profiles><profile name="Nested dispatch" typeId="ability" typeName="Transmission"><characteristics><characteristic typeId="a" name="Parameters">Nested payload.</characteristic></characteristics></profile></profiles></infoGroup></infoGroups></infoGroup></infoGroups></selectionEntry></selectionEntries></catalogue>`;
it("routes declared abilities before legacy Unit guesses and retains every mixed field in one safe reader", async () => {
  const files = [{ filename: 'metadata.gst', bytes: encode(xml) }, { filename: 'metadata.cat', bytes: encode(cat) }];
  const prepared = await prepareLocalCatalogueLibrary(files, { import: { batchId: 'metadata', importedAt: '2026-09-17T00:00:00Z' } });
  if (!prepared.ok) throw new Error('import');
  let id = 0;
  render(<App prepareLibrary={async () => prepared} createEntityId={kind => `${kind}-${++id}`} />);
  fireEvent.change(screen.getByLabelText('Choose BattleScribe files'), { target: { files: files.map(f => ({ name: f.filename, arrayBuffer: async () => Uint8Array.from(f.bytes).buffer })) } });
  await screen.findByRole('heading', { name: 'Metadata Fleet' });
  fireEvent.click(screen.getByRole('button', { name: 'Create roster' }));
  fireEvent.click(await screen.findByRole('button', { name: /^Add unit,/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Add Signal team' }));
  fireEvent.click(screen.getByRole('button', { name: 'View unit card' }));
  const dialog = screen.getByRole('dialog', { name: 'Unit card for Signal team' });
  const abilities = dialog.querySelector('#unit-reference-rules')!;
  expect(abilities.textContent).toContain('Unfamiliar dispatch');
  expect(dialog.querySelector('#unit-reference-weapons')!.textContent).not.toContain('Unfamiliar dispatch');
  expect(dialog.querySelector('#unit-reference-weapons')!.textContent).toContain('12"');
  expect(dialog.querySelector('#unit-reference-weapons')!.textContent).toContain('Empty value');
  expect(dialog.textContent).not.toContain('EXECUTED');
  const packet = within(abilities as HTMLElement).getByText('Unfamiliar dispatch', { exact: true }).closest('article')!;
  for (const [, label] of fields) expect(within(packet).getByText(label, { exact: true })).toBeTruthy();
  expect(abilities.textContent).toContain('Keep &quot; literal.');
  expect(abilities.textContent).toContain('<script>harmless</script>');
  expect(abilities.querySelector('script')).toBeNull();
  expect(abilities.textContent).toContain('Active (1 token)');
  expect(abilities.textContent).toContain('Hidden by this catalogue.');
  expect(abilities.textContent).toContain('Beta');
  expect(abilities.textContent).toContain('Alpha');
  expect(abilities.querySelectorAll('[data-field-role="longText"]')).toHaveLength(4);
  expect(abilities.querySelector('[data-field-role="annotation"]')?.textContent).toContain('Cost');
  const additional = dialog.querySelector('#unit-reference-additional')!;
  expect(additional.textContent).toContain('Carrier census');
  expect(additional.textContent).toContain('Full setup instruction.');
  expect(within(dialog).getByRole('link', { name: 'Additional information' }).getAttribute('href')).toBe('#unit-reference-additional');
  expect(abilities.textContent).toContain('Dependency dispatch');
  expect(dialog.textContent).not.toContain('Unselected alternative');
  const nested = within(dialog).getByText('Nested dispatch', { exact: true }).closest('article')!;
  expect(nested.querySelector('[data-field-role="longText"]')?.textContent).toContain('Nested payload.');
  expect(dialog.querySelectorAll('.unit-reference-reader')).toHaveLength(1);
  expect(dialog.querySelectorAll('#unit-reference-rules')).toHaveLength(1);
  expect(within(dialog).getAllByText('Unfamiliar dispatch', { exact: true })).toHaveLength(1);
});


it("keeps numeric Cost annotations and tag Supply separate from purchase accounting", async () => {
  const game = xml.replace('<forceEntries>', '<costTypes><costType id="tokens" name="Tokens"/><costType id="supply" name="Supply"/></costTypes><forceEntries>');
  const catalogueXml = cat.replace('Active (1 token)', '999').replace('name="Supply">0</characteristic></characteristics></profile>', 'name="Supply">888</characteristic></characteristics></profile>').replace('<profiles>', '<costs><cost name="Tokens" typeId="tokens" value="7"/><cost name="Supply" typeId="supply" value="2"/></costs><profiles>');
  const prepared = await prepareLocalCatalogueLibrary([{filename:'test.gst',bytes:encode(game)},{filename:'test.cat',bytes:encode(catalogueXml)}], {import:{batchId:'accounting',importedAt:'2026-09-17T00:00:00Z'}});
  if (!prepared.ok) throw new Error('import');
  const catalogue = prepared.value.selectableCatalogues[0]!;
  const created = createLocalRosterSession(catalogue, catalogue.context.forces.definitions[0]!, {rosterId:rosterId('r'),forceId:forceOccurrenceId('f'),name:'Literal &quot; player label'});
  if (!created.ok) throw new Error('create');
  const added = addLocalRosterRootSelection(created.value, localRosterRootChoices(catalogue)[0]!, {selectionId:selectionOccurrenceId('s')});
  if (!added.ok) throw new Error('add');
  const before = evaluateLocalRosterCosts(added.value);
  if (!before.ok) throw new Error('costs');
  expect(before.value.totals.map(t => [t.typeId,t.value])).toEqual([['tokens',7],['supply',2]]);
  const rosterBefore = added.value.roster;
  const model = createUnitReferenceModel(added.value, added.value.roster.forces[0]!.selections[0]!);
  const packet = model.profiles.find(p => p.profile.value.id === 'packet')!;
  const census = model.profiles.find(p => p.profile.value.id === 'census')!;
  expect(packet.profile.value.characteristics.find(c => c.name === 'Cost')?.value).toBe('999');
  expect(census.profile.value.characteristics.find(c => c.name === 'Supply')?.value).toBe('888');
  expect(packet.presentation?.section).toBe('ability');
  expect(model.profiles.find(p => p.profile.value.id === 'census')?.presentation?.section).toBe('additional');
  expect(evaluateLocalRosterCosts(added.value)).toEqual(before);
  expect(added.value.roster).toBe(rosterBefore);
  expect(added.value.roster.name).toBe('Literal &quot; player label');
});

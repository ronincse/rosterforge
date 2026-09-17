// Fictional source definitions exercise projection and context, not label guesses.
import { expect, it } from "vitest";
import { parseBattleScribeXml, parseBattleScribeJson, type ParsedBattleScribeDocument } from "@rosterforge/battlescribe-data";
import { sourceId } from "@rosterforge/foundation";
import { resolveBattleScribeDataGraph } from "./resolve.js";
import { profilePresentationResolver } from "./profile-presentation.js";

function document(id: string, body: string, catalogue = false) {
  const root = catalogue ? `catalogue gameSystemId="base"` : "gameSystem";
  const xml = `<${root} id="${id}" name="${id}" revision="1" battleScribeVersion="2.03">${body}</${catalogue ? "catalogue" : "gameSystem"}>`;
  const result = parseBattleScribeXml(new TextEncoder().encode(xml), { source: { sourceId: sourceId(id), filename: `${id}.${catalogue ? "cat" : "gst"}`, kind: "synthetic", importedAt: "2026-09-17T00:00:00Z" } });
  if (!result.ok) throw new Error("parse failed");
  return result.value;
}
const type = (attrs: string, chars = '<characteristicType id="text" name="Payload" kind="longText"/><characteristicType id="note" name="Toll" kind="annotation"/>') => `<profileTypes><profileType id="type" name="Unfamiliar" ${attrs}><characteristicTypes>${chars}</characteristicTypes></profileType></profileTypes>`;
const profiles = '<sharedProfiles><profile id="p" name="Packet" typeId="type" typeName="Unit"><characteristics><characteristic typeId="text" name="Payload">&amp;quot;</characteristic><characteristic typeId="note" name="Toll">0</characteristic></characteristics></profile></sharedProfiles>';
function inspect(docs: ParsedBattleScribeDocument[], owner = docs[0]!) {
  const graph = resolveBattleScribeDataGraph(docs);
  if (!graph.ok) throw new Error("graph failed");
  const profile = owner.projection.profiles[0]!;
  return { result: profilePresentationResolver(graph.value)(profile), graph: graph.value, profile };
}
it("projects static XML metadata, exact fields, original bytes and single-decoded values", () => {
  const doc = document("base", type('kind="ability" sortIndex="4"') + profiles);
  const { result, graph, profile } = inspect([doc]);
  expect(doc.projection.profileTypes[0]).toMatchObject({ kind: "ability", sortIndex: 4 });
  expect(result).toMatchObject({ typeStatus: "resolved", role: { state: "supported", value: "ability" }, order: { state: "supported", value: 4 }, characteristics: [{ value: "longText" }, { value: "annotation" }] });
  expect(profile.characteristics[0]?.value).toBe("&quot;");
  expect(new TextDecoder().decode(doc.sourceBytes)).toContain("&amp;quot;");
  expect(profilePresentationResolver(graph)(profile)).toBe(result);
  expect(JSON.stringify(result)).not.toMatch(/sourceBytes|documentBytes|sourceNode/);
});
it.each([['', 'absent'], ['kind=""', 'malformed'], ['kind="dragon"', 'unknown'], ['kind="model"', 'supported'], ['kind="weapon"', 'supported'], ['kind="tag"', 'supported']])("keeps role states distinct: %s", (attrs, state) => {
  expect(inspect([document("base", type(attrs!) + profiles)]).result.role.state).toBe(state);
});
it.each([['', 'absent'], ['sortIndex="0"', 'supported'], ['sortIndex="2"', 'supported'], ['sortIndex="-1"', 'malformed'], ['sortIndex="1.5"', 'malformed'], ['sortIndex="NaN"', 'malformed'], ['sortIndex="1e3"', 'malformed'], ['sortIndex="9007199254740992"', 'malformed']])("validates static ordering: %s", (attrs, state) => {
  expect(inspect([document("base", type(attrs!) + profiles)]).result.order.state).toBe(state);
});
it("keeps reachable collisions ambiguous and ignores unrelated catalogues", () => {
  const base = document("base", type('kind="weapon"'));
  const cat = document("cat", type('kind="ability"') + profiles, true);
  const unrelated = document("unrelated", type('kind="tag"'));
  expect(inspect([base, cat, unrelated], cat).result.role.state).toBe("ambiguous");
  const dependent = document("dependent", profiles, true);
  expect(inspect([base, dependent, unrelated], dependent).result.role.value).toBe("weapon");
});
it("does not choose missing or conflicting types by name or traversal order", () => {
  expect(inspect([document("base", profiles)]).result).toMatchObject({ typeStatus: "missing", role: { state: "unresolved" } });
  const doc = document("base", (type('kind="weapon"') + type('kind="ability"')).replace("</profileTypes><profileTypes>", "") + profiles);
  expect(inspect([doc]).result).toMatchObject({ typeStatus: "ambiguous", role: { state: "ambiguous" } });
});
it("binds characteristics only within the chosen type and preserves duplicate ambiguity", () => {
  const other = '<profileTypes><profileType id="other"><characteristicTypes><characteristicType id="text" kind="annotation"/></characteristicTypes></profileType></profileTypes>';
  expect(inspect([document("base", (type('kind="ability"') + other).replace("</profileTypes><profileTypes>", "") + profiles)]).result.characteristics[0]?.value).toBe("longText");
  const duplicate = '<characteristicType id="text" kind="longText"/><characteristicType id="text" kind="annotation"/>';
  expect(inspect([document("base", type('kind="ability"', duplicate) + profiles)]).result.characteristics.map(c => c.state)).toEqual(["ambiguous", "unresolved"]);
});
it("keeps dynamic role/order and format expressions inert", () => {
  const xml = type('kind="ability" sortIndex="3"').replace('</profileType>', '<modifiers><modifier field="kind" type="set" value="weapon"/><modifier field="sortIndex" type="set" value="1"/></modifiers></profileType>');
  const result = inspect([document("base", xml + profiles)]).result;
  expect(result.role.state).toBe("dynamic"); expect(result.order.state).toBe("dynamic");
});
it("projects equivalent JSON metadata without decoding JSON strings", () => {
  const json = JSON.stringify({ gameSystem: { id: "json", name: "JSON", revision: 1, battleScribeVersion: "2.03", profileTypes: [{ id: "type", name: "Unknown", kind: "ability", sortIndex: 2, characteristicTypes: [{ id: "text", name: "Payload", kind: "longText" }] }], sharedProfiles: [{ id: "p", typeId: "type", characteristics: [{ typeId: "text", name: "Payload", $text: "&quot;" }] }] } });
  const parsed = parseBattleScribeJson(new TextEncoder().encode(json), { source: { sourceId: sourceId("json"), filename: "json.json", kind: "synthetic", importedAt: "2026-09-17T00:00:00Z" } });
  if (!parsed.ok) throw new Error("JSON failed");
  expect(parsed.value.projection.profileTypes[0]).toMatchObject({ kind: "ability", sortIndex: 2 });
  expect(inspect([parsed.value]).result.characteristics[0]?.value).toBe("longText");
  expect(parsed.value.sourceBytes).toEqual(new TextEncoder().encode(json));
});

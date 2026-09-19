// Explicit self includes the anchor, not transparent groups at zero entry steps.
import { expect, it } from "vitest";
import { reaches } from "./affects-routing.js";
import { parseBattleScribeAffectsSelector } from "./affects.js";
it.each(["self.entries", "self.entries.recursive", "self.entries.group.recursive"])("keeps a zero-entry group distinct from self: %s", selector => {
 const parsed = parseBattleScribeAffectsSelector(selector);
 expect(reaches(parsed, { reachable: true, entrySteps: 0, viaGroup: false })).toBe(true);
 expect(reaches(parsed, { reachable: true, entrySteps: 0, viaGroup: true })).toBe(false);
});

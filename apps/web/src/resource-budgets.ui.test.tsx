// @vitest-environment jsdom
// Real app edits prove that unfinished text stays out of roster history and
// that budget changes use the same immutable undo/redo path as selection edits.
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { App } from "./App.js";
import { prepareLocalCatalogueLibrary } from "./catalogue-library.js";
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it("commits explicit budgets, rejects unfinished text, resets and restores through history",async () => {
 const encode=(text:string)=>new TextEncoder().encode(text);
 const files=[{filename:"fiction.gst",bytes:encode('<gameSystem id="sys" name="Fiction" revision="1" battleScribeVersion="2.03"><costTypes><costType id="ore" name="Ore" defaultCostLimit="100"/><costType id="fuel" name="Fuel" defaultCostLimit="10"/></costTypes><forceEntries><forceEntry id="army" name="Army"/></forceEntries></gameSystem>')},
 {filename:"fiction.cat",bytes:encode('<catalogue id="cat" name="Budget Test" revision="1" gameSystemId="sys" gameSystemRevision="1" battleScribeVersion="2.03"><selectionEntries><selectionEntry id="unit" name="Unit" type="unit"><costs><cost typeId="ore" value="20"/><cost typeId="fuel" value="3"/></costs></selectionEntry></selectionEntries></catalogue>')}];
 const prepared=await prepareLocalCatalogueLibrary(files,{import:{batchId:"budget-ui",importedAt:"2026-09-14T00:00:00Z"}});
 if(!prepared.ok) throw new Error("Fixture import failed");
 let id=0; render(<App prepareLibrary={async()=>prepared} createEntityId={kind=>`${kind}-${++id}`} />);
 fireEvent.change(screen.getByLabelText("Choose BattleScribe files"),{target:{files:files.map(f=>({name:f.filename,arrayBuffer:async()=>Uint8Array.from(f.bytes).buffer}))}});
 await screen.findByRole("heading",{name:"Budget Test"}); fireEvent.click(screen.getByRole("button",{name:"Create roster"}));
 fireEvent.click(await screen.findByRole("button",{name:/^Add unit,/})); fireEvent.click(screen.getByRole("button",{name:"Add Unit"}));
 fireEvent.click(screen.getByText("Configure resource budgets",{exact:true}));
 const fuel=screen.getByRole("textbox",{name:"Fuel budget"}) as HTMLInputElement;
 const resources=screen.getByRole("region",{name:"Resources"});
 const apply=()=>fireEvent.click(screen.getByRole("button",{name:"Apply Fuel budget"}));
 fireEvent.change(fuel,{target:{value:""}}); apply();
 expect(screen.getByRole("alert").textContent).toContain("Enter a nonnegative number");
 expect(resources.textContent).toContain("3 total · limit 10");
 fireEvent.change(fuel,{target:{value:"2"}}); expect(resources.textContent).toContain("3 total · limit 10"); apply();
 expect(resources.textContent).toContain("3 total · limit 2 · 1 over budget");
 expect(within(resources).getByRole("textbox",{name:"Ore budget"}).getAttribute("value")).toBe("100");
 const reset=screen.getByRole("button",{name:"Reset Fuel budget"});fireEvent.click(reset);
 expect(fuel.value).toBe("10"); expect(document.activeElement).toBe(fuel);
 fireEvent.click(screen.getByRole("button",{name:/^Roster actions/}));fireEvent.click(screen.getByRole("menuitem",{name:"Undo"}));
 expect(fuel.value).toBe("2");
 fireEvent.click(screen.getByRole("button",{name:/^Roster actions/}));fireEvent.click(screen.getByRole("menuitem",{name:"Redo"}));
 expect(fuel.value).toBe("10");
});

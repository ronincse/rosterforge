// @vitest-environment jsdom
// Synthetic end-to-end designation and attachment workflow; no game data.
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { App } from "./App.js";
import { createLocalRosterDraftStore, type StoredRecord } from "./browser-drafts.js";
afterEach(cleanup);

it("surfaces two Warlords and supports independent, undoable leader assignments", async () => {
  const bound = (type:string) => ({id:`role-${type}`,type,scope:"roster",field:"selections",value:1,shared:true,includeChildSelections:true,includeChildForces:false});
  const system = {gameSystem:{id:"lead-system",name:"Leadership",battleScribeVersion:"2.03",forceEntries:[{id:"force",name:"Army"}],categoryEntries:[{id:"designation",name:"Warlord",constraints:[bound("min"),bound("max")]},{id:"bodyguard",name:"Bodyguard"}]}};
  const warlordLink = (id:string, required=false) => ({id,name:"Warlord",targetId:"role",type:"selectionEntry",...(required?{constraints:[{id:"required-role",type:"min",field:"selections",scope:"parent",value:1,shared:true}]}:{})});
  const catalogue={catalogue:{id:"lead-catalogue",name:"Leadership",gameSystemId:"lead-system",battleScribeVersion:"2.03",sharedSelectionEntries:[{id:"role",name:"Warlord",type:"upgrade",categoryLinks:[{id:"role-category",targetId:"designation"}],constraints:[{id:"role-max",type:"max",field:"selections",scope:"parent",value:1,shared:true}]}],selectionEntries:[
    {id:"mandatory",name:"Commander",type:"model",entryLinks:[warlordLink("mandatory-role",true)]},
    {id:"captain",name:"Captain",type:"model",entryLinks:[warlordLink("captain-role")],associations:[{id:"leading",name:"Leading",min:0,max:1,scope:"force",childId:"unit",includeChildSelections:true,action:"group",conditions:[{type:"instanceOf",field:"selections",scope:"self",childId:"bodyguard",value:1,shared:true}]}]},
    {id:"squad",name:"Squad",type:"unit",categoryLinks:[{id:"squad-category",targetId:"bodyguard"}]},
  ]}};
  const records=new Map<string,StoredRecord>();
  const draftStore=createLocalRosterDraftStore({getAll:async()=>[...records.values()],get:async id=>records.get(id),put:async r=>{records.set(r.id,r);},delete:async id=>{records.delete(id);}});
  let next=0;
  render(<App draftStore={draftStore} createEntityId={kind=>`${kind}-${++next}`} />);
  fireEvent.change(screen.getByLabelText("Choose BattleScribe files"),{target:{files:[system,catalogue].map((data,i)=>({name:`leadership-${i}.json`,type:"application/json",arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify(data)).buffer}))}});
  await screen.findByRole("button",{name:"Create roster"});fireEvent.click(screen.getByRole("button",{name:"Create roster"}));
  const add=(name:string)=>{fireEvent.click(screen.getByRole("button",{name:/Add unit, /}));fireEvent.click(screen.getByRole("button",{name:`Add ${name}`}));};
  add("Commander");add("Captain");
  fireEvent.click(within(screen.getByRole("region",{name:"Unit options for Captain"})).getByRole("button",{name:"Warlord"}));
  fireEvent.click(screen.getByRole("button",{name:/Open roster problems/}));
  const problems=screen.getByRole("dialog");expect(problems.textContent).toContain("Warlord");expect(problems.textContent).toContain("2 selected, limit 1");
  const review = within(problems).getAllByRole("link",{name:"Review"}).find(link => link.getAttribute("href")?.startsWith("#roster-selection-"));
  expect(review).toBeTruthy();
  expect(document.getElementById(review!.getAttribute("href")!.slice(1))).toBeTruthy();
  fireEvent.click(within(problems).getByRole("button",{name:"Close"}));
  add("Squad");fireEvent.click(screen.getByRole("button",{name:"Configure Captain"}));
  const target=screen.getByRole("button",{name:"Squad · squad 1"});fireEvent.click(target);expect(target.getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByText(/Attached to Squad/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:/Roster actions/}));fireEvent.click(screen.getByRole("menuitem",{name:"Undo"}));
  expect(screen.getByRole("button",{name:"Squad · squad 1"}).getAttribute("aria-pressed")).toBe("false");
});

# Supporting reference evidence — 2026-09-10

Investigation only; checkpoint3 implementation and RosterForge browser acceptance
remain outstanding. The ordinary UI roadmap stays paused.

## Catalogue and public editor

At immutable A `04c62fcd041b3808c39d5c46fd677c704027b979` and captured B
`5b261ec423d5d017bb733c4f3c0a760b085d5ca5`, Lieutenant `ce15-e87e-7cff-b129`
Supporting `c764-c8d8-f680-f17e` is min1/max1, force scope, unit target, group
action, includeChildSelections, defaultSelectionEntryId:none. A has14 eligibility
categories, B18; B also has sortIndex metadata. Do not hardcode either list.
Intercessor and Hellblaster separately constrain incoming Leader and Support to1.
Association-group enhancement bounds are another applicable surface, not covered
by permitting assignment alone.

Native reviewer measured A46 documents:448 association definitions,39 required
min1/max1 same-force definitions with defaultNone,494 self-association constraints
(mostly max1, four max2),763 modifiers containing affects `.group`.
[Pinned editor ComplexQuery](https://raw.githubusercontent.com/giloushaker/nr-editor/028526ee2bce36ce26f024e33d762ab9f257445b/components/catalogue/right_panel/fields/ComplexQuery.vue)
labels its group flag **Affect group associations**, separate from child selection
and force traversal. The old claim that it enters transparent selection-entry
groups is superseded. General [association documentation](https://raw.githubusercontent.com/giloushaker/nr-docs/4b93391d049b42f480851af125639cf1ce9d13a3/guide/concepts/associations.md)
does not by itself settle the defaultNone sentinel; actual reference behavior
below settles the tested missing-assignment case.

## Actual isolated New Recruit observation

Own in-app browser guest session, temporary roster
`RF temporary Supporting semantics 20260910`; not the owner's authenticated Edge
tab or saved armies. Installed40K11th in that guest session; Imperium-Adeptus
Astartes/Dark Angels, Army Roster. Reference data showed updated13hours ago;
exact running revision was not exposed or verified. It is a moving behavioral
reference, **not** an A/B cost parity claim. Observed unit bases45/80/80 for
Lieutenant/Intercessors/Captain. No selected battle size/detachment/force disposition
or Warlord; those expected violations are not defects.

1. Create Lieutenant45 alone. Unit and roster report missing one Supporting
   unit, explicitly0/1. DefaultNone therefore does not satisfy the measured minimum.
2. Create Intercessor Squad5 (default sergeant+4ordinary). Open Lieutenant and
   select Intercessor in Supporting. It groups under the squad and the missing
   Supporting violation disappears.
3. Lieutenant's Bolt pistol, Master-crafted bolter and Close combat weapon show
   Lethal Hits. Intercessor Bolt pistol, Bolt Rifle and Close combat weapon also
   show Lethal Hits once per profile.
4. Add Captain80, still unassigned. Its weapons have no Lethal Hits. Assign its
   separate Leading association to the same supported Intercessor; its pistol,
   bolter and close-combat profiles now show Lethal Hits. This distinguishes the
   association-connected group from direct Lieutenant counterparts only.
5. Detach Lieutenant through its own normal detach action. Captain stays Leading
   the Intercessor, but its weapon additions disappear. Open Lieutenant: missing
   Supporting0/1 returns and its own weapons also lose Lethal Hits. Effect context
   therefore includes the authored applicability gate, not an unconditional append
   to the source or a copied presentation property.

Assignment click rerendered before checkbox postcheck, causing one locator timeout;
subsequent unit/roster/profile inspections explicitly confirmed the new state.
This was not the separate RosterForge renderer crash.

Still to implement/verify: source-driven A/B eligibility, incoming and outgoing
bounds, retargeting, target deletion, duplicate/history/save/reopen, exact effect
provenance and idempotence, unrelated profiles, enhancement-group limits, and
the full reference army. No required-shape gate or `.group` production code was
changed in checkpoint2. Never mark assignment-only support as full compatibility.

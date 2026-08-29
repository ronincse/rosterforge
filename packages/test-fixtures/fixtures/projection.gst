<?xml version="1.0" encoding="UTF-8"?>
<bs:gameSystem xmlns:bs="http://www.battlescribe.net/schema/gameSystemSchema"
  xmlns:future="https://rosterforge.example/fixture/future"
  id="system-203" name="Projection System" revision="0"
  battleScribeVersion="2.03" authorName="" authorContact="fixture@example.test"
  authorUrl="https://rosterforge.example/fixture" type="future-game-system-kind">
  <bs:readme></bs:readme>
  <bs:publications>
    <bs:publication id="publication-core" name="Core Book" shortName=""
      publisher="RosterForge Press" publicationDate="2026-01-01" />
  </bs:publications>
  <bs:costTypes>
    <bs:costType id="cost-points" name="Points" defaultCostLimit="0" hidden="false" />
    <bs:costType id="cost-supply" name="Supply" defaultCostLimit="100" hidden="true" />
  </bs:costTypes>
  <bs:profileTypes>
    <bs:profileType id="profile-type-unit" name="Unit" future:format="retained">
      <bs:characteristicTypes>
        <bs:characteristicType id="characteristic-move" name="Move" defaultValue="" />
        <bs:characteristicType id="characteristic-save" name="Save" />
      </bs:characteristicTypes>
    </bs:profileType>
    <bs:profileType id="profile-type-ability" name="Ability">
      <bs:characteristicTypes>
        <bs:characteristicType id="characteristic-description" name="Description"
          defaultValue="None" />
      </bs:characteristicTypes>
    </bs:profileType>
  </bs:profileTypes>
  <bs:categoryEntries>
    <bs:categoryEntry id="category-unit" name="Unit" hidden="false">
      <bs:publicationLinks>
        <bs:publicationLink id="publication-link-category" name="Core" targetId="publication-core" />
      </bs:publicationLinks>
      <bs:profiles>
        <bs:profile id="category-profile" name="Category Profile"
          typeId="profile-type-unit" typeName="Unit">
          <bs:characteristics>
            <bs:characteristic name="Move" typeId="characteristic-move">5"</bs:characteristic>
          </bs:characteristics>
        </bs:profile>
      </bs:profiles>
      <bs:rules>
        <bs:rule id="category-rule" name="Category Rule">
          <bs:description>Owned by a category entry.</bs:description>
        </bs:rule>
      </bs:rules>
      <bs:infoLinks>
        <bs:infoLink id="category-info-link" name="Category Info"
          targetId="rule-steady" type="rule" />
      </bs:infoLinks>
    </bs:categoryEntry>
  </bs:categoryEntries>
  <bs:forceEntries>
    <bs:forceEntry id="force-patrol" name="Patrol" hidden="false">
      <bs:forceEntries>
        <bs:forceEntry id="force-patrol-child" name="Patrol Detachment" hidden="true">
          <bs:categoryLinks>
            <bs:categoryLink id="force-child-category" name="Unit"
              targetId="category-unit" primary="false">
              <bs:constraints>
                <bs:constraint id="force-category-min" type="min"
                  field="selections" scope="roster" value="1"
                  shared="true" includeChildSelections="true"
                  includeChildForces="true" />
              </bs:constraints>
              <bs:modifiers>
                <bs:modifier type="set" field="force-category-min" value="0">
                  <bs:conditions>
                    <bs:condition type="instanceOf" field="selections"
                      scope="primary-catalogue" childId="catalogue-exempt"
                      value="1" shared="true" />
                  </bs:conditions>
                </bs:modifier>
              </bs:modifiers>
            </bs:categoryLink>
          </bs:categoryLinks>
          <bs:modifiers>
            <bs:modifier type="set" field="force-child-roster-modified"
              value="2">
              <bs:conditions>
                <bs:condition type="atLeast" field="forces" scope="roster"
                  childId="force-patrol" value="1" shared="true"
                  includeChildForces="true" />
              </bs:conditions>
            </bs:modifier>
          </bs:modifiers>
          <bs:modifierGroups>
            <bs:modifierGroup type="and" comment="Grouped force limit">
              <bs:modifiers>
                <bs:modifier type="increment" field="force-child-roster-grouped"
                  value="1" />
              </bs:modifiers>
              <bs:conditions>
                <bs:condition type="atLeast" field="forces" scope="roster"
                  childId="force-patrol" value="1" shared="true"
                  includeChildForces="true" />
              </bs:conditions>
            </bs:modifierGroup>
          </bs:modifierGroups>
          <bs:constraints>
            <bs:constraint id="force-child-roster-max" type="max"
              field="forces" scope="roster" value="1" shared="true"
              includeChildForces="true" />
            <bs:constraint id="force-child-roster-modified" type="max"
              field="forces" scope="roster" value="1" shared="true"
              includeChildSelections="true" includeChildForces="true" />
            <bs:constraint id="force-child-roster-grouped" type="max"
              field="forces" scope="roster" value="1" shared="true"
              includeChildForces="true" />
          </bs:constraints>
        </bs:forceEntry>
      </bs:forceEntries>
      <bs:categoryLinks>
        <bs:categoryLink id="force-category" name="Unit" targetId="category-unit" primary="true" />
      </bs:categoryLinks>
      <bs:constraints>
        <bs:constraint id="constraint-force" type="min" field="selections" scope="force"
          value="0" percentValue="false" shared="false"
          includeChildSelections="false" includeChildForces="true" />
      </bs:constraints>
    </bs:forceEntry>
  </bs:forceEntries>
  <bs:sharedRules>
    <bs:rule id="rule-steady" name="Steady" hidden="false">
      <bs:description>Remain calm.</bs:description>
      <bs:publicationLinks>
        <bs:publicationLink id="publication-link-rule" name="Core" targetId="publication-core" hidden="false" />
      </bs:publicationLinks>
    </bs:rule>
  </bs:sharedRules>
  <bs:sharedProfiles>
    <bs:profile id="profile-scout" name="Scout" hidden="false"
      typeId="profile-type-unit" typeName="Unit">
      <bs:characteristics>
        <bs:characteristic name="Move" typeId="characteristic-move">6</bs:characteristic>
        <bs:characteristic name="Save" typeId="characteristic-save">4+</bs:characteristic>
      </bs:characteristics>
      <bs:modifiers>
        <bs:modifier type="append" field="characteristic-move" value="+1"
          join=" / " affects="self.profiles.Unit">
          <bs:conditions>
            <bs:condition type="atLeast" field="selections" scope="parent"
              childId="entry-alpha" value="1" />
          </bs:conditions>
        </bs:modifier>
        <bs:modifier type="future-display-kind" field="characteristic-save"
          value="Shielded" futureBehavior="retained" />
      </bs:modifiers>
      <bs:modifierGroups>
        <bs:modifierGroup type="and" comment="Profile characteristic group">
          <bs:modifiers>
            <bs:modifier type="replace" field="characteristic-save"
              arg="4+" join="" />
          </bs:modifiers>
          <bs:conditions>
            <bs:condition type="atLeast" field="selections" scope="self"
              value="1" />
          </bs:conditions>
        </bs:modifierGroup>
      </bs:modifierGroups>
    </bs:profile>
  </bs:sharedProfiles>
  <bs:selectionEntries>
    <bs:selectionEntry id="entry-alpha" name="Alpha" type="unit"
      defaultAmount="1,1" step="0"
      hidden="false" collective="false" import="true">
      <bs:selectionEntryGroups>
        <bs:selectionEntryGroup id="group-options" name="Options"
          hidden="false" collective="true" import="false"
          defaultSelectionEntryId="entry-option">
          <bs:selectionEntries>
            <bs:selectionEntry id="entry-option" name="Option" type="upgrade" />
          </bs:selectionEntries>
        </bs:selectionEntryGroup>
      </bs:selectionEntryGroups>
      <bs:categoryLinks>
        <bs:categoryLink id="category-link-entry" name="Unit"
          targetId="category-unit" primary="false" hidden="false" />
      </bs:categoryLinks>
      <bs:infoLinks>
        <bs:infoLink id="info-rule" name="Steady" targetId="rule-steady"
          type="rule" hidden="false" />
      </bs:infoLinks>
      <bs:profiles>
        <bs:profile id="profile-inline" name="Inline" typeId="profile-type-unit" typeName="Unit">
          <bs:characteristics>
            <bs:characteristic name="Move" typeId="characteristic-move">7</bs:characteristic>
          </bs:characteristics>
        </bs:profile>
      </bs:profiles>
      <bs:costs>
        <bs:cost name="pts" typeId="cost-points" value="0" />
      </bs:costs>
      <bs:constraints>
        <bs:constraint id="constraint-parent" type="max" field="selections" scope="parent" value="1" />
        <bs:constraint id="constraint-roster" type="max" field="selections" scope="roster" value="3" />
        <bs:constraint id="constraint-self" type="min" field="selections" scope="self" value="0" />
        <bs:constraint id="constraint-id" type="max" field="selections" scope="category-unit" value="2" />
      </bs:constraints>
      <bs:modifiers>
        <bs:modifier type="replace" field="name" value="Veteran">
          <bs:conditions>
            <bs:condition id="condition-option" type="atLeast" field="selections" scope="parent"
              childId="entry-option" childName="Option" comment="Fixture comment"
              value="1" percentValue="false" shared="false" />
          </bs:conditions>
          <bs:conditionGroups>
            <bs:conditionGroup type="and">
              <bs:conditions>
                <bs:condition type="equalTo" field="selections" scope="force" value="0" />
              </bs:conditions>
              <bs:conditionGroups>
                <bs:conditionGroup type="or">
                  <bs:conditions>
                    <bs:condition type="notInstanceOf" field="selections" scope="roster"
                      childId="entry-missing" value="0" />
                  </bs:conditions>
                </bs:conditionGroup>
              </bs:conditionGroups>
            </bs:conditionGroup>
          </bs:conditionGroups>
          <bs:repeats>
            <bs:repeat id="repeat-option" field="selections" scope="self" childId="entry-option"
              childName="Option"
              value="0" repeats="2" percentValue="false" shared="false"
              roundUp="false" />
          </bs:repeats>
        </bs:modifier>
        <bs:modifier type="floor" field="cost-points" value="1" />
        <bs:modifier type="future-kind" field="future-field" value="" future:flag="retained" />
      </bs:modifiers>
      <bs:modifierGroups>
        <bs:modifierGroup type="and" comment="Fixture modifier group">
          <bs:modifiers>
            <bs:modifier type="increment" field="cost-points" value="1" />
          </bs:modifiers>
        </bs:modifierGroup>
      </bs:modifierGroups>
      <future:extension future:attribute="observable" />
    </bs:selectionEntry>
  </bs:selectionEntries>
</bs:gameSystem>

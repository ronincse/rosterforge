// Pure occurrence-specific rule names. Reuses lexical operations without profile
// routing; source/link carriers stay intact and cross-carrier precedence is bounded.
import type { Diagnostic, ValidationCompleteness } from "@rosterforge/foundation";
import type { RosterSelection } from "@rosterforge/roster-model";
import { currentValue, effectiveValue, evaluateTextModifierStep, type RosterTextModifierStep, type RosterCharacteristicModifierSource } from "./characteristics.js";
import { effectiveRosterCategories } from "./effective-categories.js";
import { evaluateRosterModifierApplicability } from "./modifier-applicability.js";
import { collectRosterModifierGroupExecution, evaluateRosterModifierGroupApplicability, type RosterModifierGroupSource } from "./modifier-groups.js";
import { evaluateRosterRuleVisibility, type RuleVisibilityInput, type RuleVisibilitySource, type RuleVisibilityContext, type RosterRuleVisibilityReport } from "./rule-visibility.js";
import { indexEvaluationChoices, resolveEvaluationSelection, rosterMatchesCatalogueContext, rosterSelectionLocations } from "./selection-context.js";

export type RuleNameContext = Omit<RuleVisibilityContext, "owner"> & { readonly owner: RosterSelection };
export interface RuleNameLayer {
 readonly source: RuleVisibilitySource;
 readonly written: boolean;
 readonly value?: string;
 readonly completeness: ValidationCompleteness;
 readonly steps: readonly RosterTextModifierStep[];
}
export interface RosterRuleNameReport {
 readonly baseValue: string;
 readonly value?: string;
 readonly completeness: ValidationCompleteness;
 readonly layers: readonly RuleNameLayer[];
 readonly diagnostics: readonly Diagnostic[];
 readonly owner?: RosterSelection;
}
/** Visibility completeness remains independent of name completeness. */
export interface RosterRuleReport extends RosterRuleVisibilityReport { readonly name: RosterRuleNameReport }

/** Evaluates direct then grouped set/append operations within one carrier.
 * Static link name overrides the definition, as materialization already does.
 * Two possibly active writing carriers have unestablished operation precedence:
 * preserve both candidates and report unknown, even when they happen to agree.
 * Every evaluation starts at source values; effective labels never become IDs.
 */
export function evaluateRosterRuleName(rule: RuleVisibilityInput, environment?: RuleNameContext): RosterRuleNameReport {
 const sources = "definition" in rule ? [rule.definition, rule.link] : [rule];
 const base = rule.name ?? ("definition" in rule ? rule.link.name ?? rule.definition.name : undefined);
 const baseValue = base ?? "";
 const diagnostics: Diagnostic[] = [];
 const diagnose = (source: Pick<RuleVisibilitySource, "source" | "path">, message: string) => diagnostics.push({code:"EVALUATION_RULE_NAME_UNRESOLVED",severity:"warning",message,impacts:["validation","compatibility"],location:{source:source.source,path:source.path}});
 const contextKnown = environment === undefined || (rosterMatchesCatalogueContext(environment.roster, environment.context)
  && rosterSelectionLocations(environment.roster).some(l=>l.occurrence===environment.owner)
  && resolveEvaluationSelection(environment.owner,indexEvaluationChoices(environment.context),true).status === "resolved");
 const options = environment === undefined ? undefined : {effectiveCategories:effectiveRosterCategories(environment.roster,environment.context)};
 const layers = sources.map((source): RuleNameLayer => {
  const steps: RosterTextModifierStep[]=[];
  let incomplete=false, lost=false;
  const apply=(m:RosterCharacteristicModifierSource,grouped:boolean,status:"applicable"|"notApplicable"|"unresolved",complete=true)=>{
   incomplete ||= !complete;
   const result=evaluateTextModifierStep(currentValue(steps,baseValue),m,grouped,
    status === "notApplicable" ? status : !contextKnown || base === undefined || m.field === undefined ? "unresolved" : status,"own",["set","append"]);
   steps.push(result.step);
   if(result.step.status === "unapplied") diagnose(m,`This rule name operation is unresolved: ${result.step.issues.join(", ")}.`);
  };
  for(const m of source.modifiers.filter(relevant)) {
   if(environment===undefined){apply(m,false,m.conditions.length+m.conditionGroups.length ? "unresolved":"applicable");continue;}
   const r=evaluateRosterModifierApplicability(environment.roster,environment.context,environment.owner,m,options);
   diagnostics.push(...r.diagnostics);
   apply(m,false,r.ok&&r.value.evaluated?r.value.status:"unresolved",r.ok&&r.value.completeness==="complete");
  }
  for(const group of source.modifierGroups.filter(groupRelevant)) {
   if(environment===undefined){lost=true;incomplete=true;diagnose(source,"Grouped rule names require an occurrence context.");continue;}
   const r=evaluateRosterModifierGroupApplicability(environment.roster,environment.context,environment.owner,group,options);
   diagnostics.push(...r.diagnostics);
   if(!r.ok){lost=true;incomplete=true;continue;}
   incomplete ||= r.value.completeness==="incomplete";
   // Missing-field entries cannot be proven irrelevant; retain uncertainty.
   const all=collectRosterModifierGroupExecution([r.value],relevant).entries;
   if(r.value.status !== "notApplicable" && all.length!==countRelevant(group)){lost=true;incomplete=true;diagnose(source,"This rule name group has unresolved targets.");}
   for(const entry of all) apply(entry.modifier,true,entry.evaluated?entry.status:"unresolved",r.value.completeness==="complete");
  }
  const value=lost?undefined:effectiveValue(steps,baseValue);
  return {source,written:lost||steps.some(s=>s.status!=="notApplicable"),...(value===undefined?{}:{value}),completeness:incomplete||lost||steps.some(s=>s.status==="unapplied")?"incomplete":"complete",steps};
 });
 const writers=layers.filter(l=>l.written);
 if(writers.length>1) diagnose(sources[0]!,"Definition and link may both modify this rule name; their operation precedence is not established.");
 // Static inheritance alone does not establish whether a link's explicit name
 // overrides a dynamically modified definition. Keep that separate from the
 // demonstrated link-owned operation path and preserve its candidate evidence.
 const staticOverrideConflict = "definition" in rule && rule.link.name !== undefined && layers[0]!.written;
 if(staticOverrideConflict) diagnose(rule.link,"A definition name operation competes with an explicit link name; their precedence is not established.");
 if(base===undefined || !contextKnown) diagnose(sources[0]!,"This rule name lacks a resolved source name or occurrence identity.");
 const value=writers.length>1||staticOverrideConflict||base===undefined||!contextKnown?undefined:writers.length?writers[0]!.value:baseValue;
 return {baseValue,...(value===undefined?{}:{value}),completeness:value===undefined||layers.some(l=>l.completeness==="incomplete")?"incomplete":"complete",layers,diagnostics,...(environment===undefined?{}:{owner:environment.owner})};
}

/** Shared rule inspection retains independent visibility and effective-name evidence. */
export function evaluateRosterRule(rule: RuleVisibilityInput, environment?: RuleNameContext): RosterRuleReport {
 const visibility=evaluateRosterRuleVisibility(rule,environment);
 const name=evaluateRosterRuleName(rule,environment);
 return {...visibility,name,diagnostics:[...visibility.diagnostics,...name.diagnostics]};
}
function relevant(m:RosterCharacteristicModifierSource):boolean{return m.field==="name"||m.field===undefined;}
function groupRelevant(g:RosterModifierGroupSource<RosterCharacteristicModifierSource>):boolean{return g.modifiers.some(relevant)||g.modifierGroups.some(groupRelevant);}
function countRelevant(g:RosterModifierGroupSource<RosterCharacteristicModifierSource>):number{return g.modifiers.filter(relevant).length+g.modifierGroups.reduce((n,c)=>n+countRelevant(c),0);}

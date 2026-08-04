/**
 * @red-cup-engineering/communicating/speaking/listening/understanding — semantic readings of language.
 *
 * What a settled parse *means*: semantic frames (roles, polarity, scope, tense,
 * presupposition, logical form) and discourse structure (entity linking,
 * reference resolution). Everything here reads parsing's ParseResult and
 * produces measures and structures over it; it never re-settles the parse.
 */


export {
  roles, polarity, scope, temporal, presuppositions, logicalForm,
} from "./semantics/index.mjs";
export type {
  SemanticFrame,
  PolarityFrame,
  ScopeResult, Quantifier, ScopeReading,
  TemporalFrame, TenseValue, AspectValue, EvidentialValue,
  Presupposition, PresuppositionTrigger, TriggerKind,
  LogicalFormResult, LogicalFormReading, LogicalFormNode,
} from "./semantics/index.mjs";


export { linkEntity } from "./linking.mjs";
export { resolveReferences } from "./referring.mjs";
export {
  discourseStateCarrier,
  discourseStateOfForest,
  discourseStateSchema,
} from "./discourse-state.mjs";
export {
  discourseInformationCarrier,
  discourseInformationOfState,
  discourseInformationSchema,
} from "./discourse-information.mjs";


export type {
  DiscourseCommitment,
  DiscourseEntity,
  DiscoursePresupposition,
  DiscourseReference,
  DiscourseRepair,
  DiscourseRepairKind,
  DiscourseState,
  DiscourseTopic,
} from "./discourse-state.mjs";
export type {
  DiscourseInformation,
  DiscourseInformationChannel,
  DiscourseSurprisal,
} from "./discourse-information.mjs";
export type { LinkResult, ReferenceResolution, ReferenceResult } from "./types.mjs";

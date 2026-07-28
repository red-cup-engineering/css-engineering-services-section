/**
 * @red-cup-engineering/producing-content/topology - content topology through producing-content.
 *
 * This port keeps downstream producers and consumers attached to the
 * organizing-centered content package while the old content package is absorbed.
 */

export * from "./accountable-attention.mjs";
export * from "./content-topology.mjs";
export * from "./content-section.mjs";
export {
  AssignmentSchema,
  DraftSchema,
  DraftSurfaceSchema,
  assignment,
  assignmentCarrier,
  assignmentFromDemand,
  assignmentTerm,
  currentSurfaces,
  draft,
  draftCarrier,
  draftSurfaceCarrier,
  draftTerm,
  messageFromDraft,
  reviseDraft,
} from "./production.mjs";
export type {
  AssignmentCarrier,
  AssignmentFromDemandInput,
  AssignmentInput,
  AssignmentJsonCarrier,
  DraftCarrier,
  DraftInput,
  DraftJsonCarrier,
  DraftSurface,
  DraftSurfaceJsonCarrier,
} from "./production.mjs";
export * from "./demand.mjs";
export * from "./gates.mjs";
export * from "./article.mjs";
export * from "./copyedit.mjs";
export * from "./news/index.mjs";

/**
 * @packageDocumentation
 *
 * acting — the boundary: actions (cocone legs), the dispatcher, induceBins, and
 * invocation witnessing.
 *
 * Register each operation once as an `action`; `induceBins` assembles the
 * coproduct apex (the discovery carrier) from which CLI/OpenAPI/MCP/web are
 * projected; one package-pure `dispatch` runs any verb and witnesses the
 * play as EAVT in the package's own ledger.
 *
 * Formally, this module is the operational facade over a holographic object: a
 * finite action family has one apex, and CLI, HTTP, OpenAPI, MCP, form HTML,
 * carrier-node routes, and witness logs are faithful projections of that apex.
 * Face counts should agree because they read the same induced carrier: an action
 * list with `n` accepted actions should project `n` discovery bins, `n` OpenAPI
 * paths, and `n` MCP tools. Use the carrier/action kernel's `actionIrAudit` when you
 * need the adjacent invariant: carrier-to-carrier morphisms should carry
 * `runTerm`, while admissions and transports remain explicit boundaries.
 *
 * The source lives under `src/running` — a co-equal sibling of `writing/` and
 * `evaluating/`, not a child of either — because running is the projection
 * boundary: actions, routes, prompts, resources, and witnessed invocations are
 * all representation-facing forms of one induced apex. The whole boundary is
 * reached through the root package apex `@red-cup-engineering/relating`; the `./running`
 * subpath remains for the effectful/process-facing handle.
 */
export {
  action,
  composes,
  compose,
  isAction,
  fact,
  actionUtterances,
  type Action,
  type ActionSpec,
} from "./action.mjs";

// ── the MORPHISM half of the single-source category kernel (objects live in
//    src/carriers). The action constructor itself is the acting-boundary
//    wrapper above; these are the registry, the IR audit, and the serializable
//    morphism carrier face. ──
export {
  registeredCategory,
  actionIrAudit,
  freeTsActions,
  morphismCarrier,
  morphismSchemaCarrier,
  MorphismSchema,
  type CategoryRegistry,
  type ActionIrAuditEntry,
  type MorphismCarrier,
  type MaybePromise,
} from "./category.mjs";

export {
  dispatch,
  dispatchAsync,
  actionsByVerb,
  type DispatchOptions,
  type DispatchResult,
} from "./dispatch.mjs";

export {
  resource,
  isResource,
  resourceDescriptor,
  resourceUtterances,
  literalResource,
  type ResourceCarrier,
  type ResourceSpec,
  type ResourceDescriptor,
} from "./resource.mjs";

export {
  prompt,
  isPrompt,
  promptDescriptor,
  promptUtterances,
  actionPrompt,
  userMessage,
  type PromptCarrier,
  type PromptSpec,
  type PromptDescriptor,
  type PromptArgument,
  type PromptMessage,
} from "./prompt.mjs";

export {
  induceBins,
  collectActions,
  collectResources,
  collectPrompts,
  type InducedBins,
  type InduceOptions,
  type ActionEndpoint,
  type ActionDiscovery,
} from "./induce.mjs";

export {
  actionSettlementSignature,
  codomainSettlementWitness,
  codomainSettlementWitnessKey,
  type ActionSettlementRegime,
  type ActionSettlementSignature,
  type ActionTransport,
  type CodomainSettlementWitness,
} from "./settlement-signature.mjs";

export {
  operationsManifoldOf,
  operationsManifoldGraphOf,
  operationsManifoldUri,
  operationsManifoldResource,
  type OperationManifoldExtremum,
  type OperationManifoldEdge,
  type OperationManifoldApex,
  type PackageOperationsManifold,
  type OperationsManifoldGraphNode,
  type OperationsManifoldGraphEdge,
  type OperationsManifoldGraphFrontier,
  type OperationsManifoldGraph,
} from "./manifold.mjs";

export {
  invocationFeed,
  type Invocation,
} from "./invocation.mjs";

// The Scott transport: an append-only EAVT witness log streamed as resumable SSE
// (each row one `datom` event; monotone, coordination-free), and its served form.
export { streamWitnessLog, EAVT_EVENT, feedResponse, type FeedResponse } from "../ledger/stream.mjs";

// The transfinite transport over a WebSocket frame loop: a claim frame advances the
// session, the reply frame is the settled judgement. Pure core + the frame encoder.
export {
  exchangeClaim,
  parseClaimMessage,
  judgementReply,
  judgementFrame,
  type ClaimMessage,
} from "./ws-session.mjs";

// Each transport read through the σ×Δ skillful-work quartet: the four transports are
// the four work types (request-response Procedure, event-stream Process, claim-session
// Derivation, open/conflicted session Inquiry). A live session reads Derivation until
// a conflict drops it to Inquiry. The agent-site sibling is animating's classifySkillfulWork.
export {
  workType,
  determination,
  sessionWork,
  TRANSPORT_WORK,
  type WorkType,
  type WorkNuclei,
  type TransportKind,
} from "./transport-work.mjs";

// The transfinite transport: a bounded interactive claim session. Claims accumulate
// monotonically (never overwritten); the ∨ₖ JUDGEMENT moves — a cell flips to ⊤
// (`stable`) when for- and against-claims meet. `scott` when no cell conflicts,
// `transfinite` when one does; never aperiodic.
export {
  openSession,
  claim,
  judge,
  conflicts,
  sessionRegime,
  settle,
  type Claim,
  type Session,
} from "./session.mjs";

export {
  routeRequest,
  routeRequestAsync,
  routeManifold,
  routeManifoldAsync,
  tileManifold,
  actionMcpHandle,
  actionMcpHandleAsync,
  type ServeOptions,
  type ServedRequest,
  type ServedResponse,
  type ManifoldMount,
} from "./serving.mjs";

export {
  carrierNodeTree,
  tileCarrierNodes,
  routeCarrierManifold,
  routeCarrierManifoldAsync,
  domainNodeOf,
  isEndoMount,
  aggregateNodeApex,
  carrierManifoldIndexHtml,
  type CarrierMount,
  type CarrierNode,
} from "./mounting.mjs";

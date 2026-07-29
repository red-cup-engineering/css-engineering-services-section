/**
 * @red-cup-engineering/animating — the agency reading of the relating descent.
 *
 * animating is not endomorphic and not a single morphism: it is the AGENCY READING
 * of relating's descent `articulate → predicate → posit → settle`, traversed across
 * the four closure regimes (aperiodic → transfinite → Scott → finite) = the
 * void-math objects (cell → fiber → charged presheaf → glued sheaf) = the stage
 * names (becoming → doing → working → governing) = the agency faces (animate →
 * agential → agentic → individual). One structure, several readings; the engine
 * (`descend`) runs the relating descent once and the four stage morphisms
 * (`animate`/`enact`/`labor`/`individuate`) read it at each regime.
 *
 * Its bottom codomain is the interior `agent`: the glued individual sheaf (H¹=0)
 * read as a `perceive(input) → act(output)` loop, made of perception, action, and
 * goal — the first concrete bilattice-network-sheaf. The individual is "settled
 * below, open above": `reseed` re-poses it as the next-scale descent, the spiral
 * closed by the sibling `playing` faculty.
 *
 * The three sibling faculties are THREADED, not absorbed: communicating (speaking)
 * seats at `doing`, knowing (teaching/learning) at `working`, and playing closes
 * the spiral. animating provides the carriers they mount on (the `faculty` field on
 * the doing/working readings names the seat) and re-implements none of them. The
 * operations chain (task → work → assign → office/consensus) is the DOWNSTREAM
 * managing-operations reading, not animating.
 *
 * Each carrier is one single-source TypeBox declaration (`./carriers.mts` and the
 * per-stage `carriers.mts`) with a bare descent-path `$id` — the schema IS the static
 * type, the JSON Schema, and the Ajv validator, registered through relating's category
 * kernel (`carrier`); no codegen, no hand-authored `*.schema.json`. Each verb is one
 * relating `action` whose domain/codomain are these carriers, projected to
 * CLI/OpenAPI/MCP/web by the single relating dispatcher. The boundary machinery is
 * reused wholesale from @red-cup-engineering/relating, never re-implemented here.
 * See dev/docs/notes/2026-06-21-animating-as-agency-descent.md.
 */

// ── the apex: the holographic gluing node (three boundary faces → the interior agent) ──
export {
  glue,
  face,
  project,
  agentRobustness,
  type GluingInput,
  type AgentRobustness,
  type BoundaryProjection,
} from "./gluing.mjs";
export type { Face } from "./carriers.mjs";

// ── the substrate: the per-face agency descent (engine, four stage readings, embodying body) ──
export * from "./becoming/index.mjs";

// ── the across-face standards codec: the single agent as an ActivityPub Actor (C2S) ──
export {
  activityCarrier,
  utteranceFromActivity,
  activityFromUtterance,
  audience,
  illocutionOf,
  askQuestion,
  answer,
  openChannel,
  send,
  type Channel,
  visibility,
  ACTIVITYSTREAMS_CONTEXT,
  AS2_PUBLIC,
  type Activity,
  type ActivityOptions,
} from "./writing/activitypub/index.mjs";
export {
  actorCarrier,
  actorOfAgent,
  type Actor,
  type ActorOptions,
} from "./writing/activitypub/actor.mjs";
export {
  orderedCollection,
  outboxOf,
  perceiveInbox,
  type OrderedCollection,
} from "./writing/activitypub/collections.mjs";
// the RWIL functor: an agent's outbox IS its witness log (two channel-codes of one source)
export {
  activityCell,
  activityFromCell,
  standingKey,
  type WitnessRow,
} from "./writing/activitypub/ledger.mjs";
// the live AP transport (in lib, not a site): pure routing for the agent's HTTP surface
export {
  routeActor,
  parseInboxActivity,
  postOutbox,
  outboxWriteLocus,
  webfinger,
  ACTIVITY_JSON,
  type OutboxWrite,
} from "./writing/activitypub/serving.mjs";
// OCapped media upload: capability-gated, attenuable by kind + size, delegable, revocable
export {
  mediaObjectCarrier,
  admitMedia,
  kindOfMediaType,
  mediaUploadLocus,
  type MediaObject,
  type MediaKind,
  type MediaAsset,
  type MediaAdmission,
} from "./writing/activitypub/media.mjs";
// AS2 interop normalization + security strips (arrays↔singletons, id↔embedded, SSRF, bcc)
export {
  asArray,
  idOf,
  stripBlindCopy,
  safeRemoteUrl,
} from "./writing/activitypub/normalization.mjs";
// capability-discovery: what the server supports + the loci a client may request
export {
  activityPubApi,
  routeCapabilities,
  type ServerCapabilities,
} from "./writing/activitypub/discovery.mjs";
// realtime read leg (SSE) + S2S HTTP Signatures — the live federation transport pieces
export {
  inboxEvent,
  eventStreamHeaders,
  type InboxEventKind,
} from "./writing/activitypub/sse.mjs";
export {
  httpDigest,
  signingString,
  signRequest,
  verifyRequest,
  parseSignatureHeader,
  type SignedRequest,
} from "./writing/activitypub/signatures.mjs";
// object-capabilities (OCapPub) realized through the OUT/playing face (ActivityPub as CGS)
export {
  capabilityCarrier,
  grant,
  attenuate,
  delegate,
  invoke,
  canInvoke,
  revoke,
  interact,
  type Interaction,
  type Capability,
} from "./writing/activitypub/capability.mjs";

// Agent2Agent (A2A): Agent Cards project the agent's open act-cells/skills; tasks
// are capability invocations across agents (locus + cut + name-passing).
export {
  agentCardCarrier,
  a2aTaskCarrier,
  sessionCharacterA2aSurfaceCarrier,
  agentCardOfAgent,
  agentCardOfSessionCharacter,
  agentFromAgentCard,
  a2aTaskFromCapability,
  capabilityInvokeFromA2aTask,
  canRunA2aTask,
  canRunSessionA2aTask,
  sessionA2aAffordances,
  A2A_PROTOCOL_VERSION,
  A2A_AGENT_CARD_PATH,
  A2A_AGENT_CARD_LEGACY_PATH,
  type AgentCard,
  type A2ATask,
  type SessionCharacterA2ASurface,
  type AgentCardOptions,
  type A2ATaskOptions,
} from "./writing/a2a/index.mjs";
export {
  routeAgentCard,
  postA2aTask,
  A2A_JSON,
  type A2ATaskPost,
} from "./writing/a2a/serving.mjs";

// OCapN/CapTP object-capability transport realized through the OUT/playing face
// (distributed objects + promise pipelining = the *-autonomous cut composed before
// resolution). The out-face twin of the activitypub OCap brick; reuses its
// Capability + canInvoke. See dev/docs/notes/2026-06-25-captp-as-playing.md.
export {
  sturdyRefCarrier,
  deliveryCarrier,
  refOf,
  refOfMacaroon,
  deliver,
  pipeline,
  resultDesign,
  followOnDesign,
  composePipeline,
  sequentialFollow,
  composeSequentialCut,
  pipelineSequentialCutLaw,
  pipelineAuthorityGraph,
  authorityBa,
  captpWitnessLog,
  captpStandingKey,
  vectorClock,
  tickVectorClock,
  mergeVectorClocks,
  compareVectorClocks,
  turnTraceFromAuthorityGraph,
  turnTraceWitnessLog,
  causalFrontierFromTurnTraces,
  causalFrontierWitnessLog,
  baCausalFrame,
  baCausalFrameWitnessLog,
  capTpEventsIndependent,
  concurrentTraceFromCausalFrontier,
  concurrentTraceWitnessLog,
  causalCutFromClock,
  causalCutFromSelection,
  causalCutWitnessLog,
  causalCutQuiescence,
  causalCutQuiescenceWitnessLog,
  invocationSettlement,
  invocationSettlementWitnessLog,
  promiseRetirementCertificate,
  promiseRetirementWitnessLog,
  vatFromAuthorityGraph,
  dropPresence,
  resolvePromise,
  breakPromise,
  vatCanInvoke,
  vatWitnessLog,
  exportTable,
  trackExport,
  applyGcExports,
  exportTableWitnessLog,
  exportGcWitnessLog,
  handoffTable,
  offerHandoffGift,
  depositHandoffGift,
  withdrawHandoffGift,
  handoffWitnessLog,
  importObjectDesc,
  importPromiseDesc,
  exportDesc,
  answerDesc,
  sigEnvelope,
  handoffGiveDesc,
  handoffReceiveDesc,
  descriptorStandingKey,
  joinReferences,
  refJoinStandingKey,
  refJoinWitnessLog,
  startSessionOp,
  captpPublicIdentifier,
  captpSessionIdentifier,
  openSession,
  receiveStartSession,
  resolveCrossedHellos,
  deliverOp,
  listenOp,
  fulfillResolverOp,
  breakResolverOp,
  getOp,
  indexOp,
  untagOp,
  bootstrapFetchOp,
  bootstrapDepositGiftOp,
  bootstrapWithdrawGiftOp,
  gcAnswersOp,
  gcExportsOp,
  abortOp,
  abortSession,
  operationStandingKey,
  operationWitnessLog,
  foldSessionTranscript,
  sessionTranscriptWitnessLog,
  commitSessionTranscript,
  transcriptCommitWitnessLog,
  foldAnswerTable,
  answerTableWitnessLog,
  foldPromiseTrace,
  promiseTraceWitnessLog,
  foldProjectionTrace,
  projectionTraceWitnessLog,
  sessionWitnessLog,
  crossedHelloWitnessLog,
  admit,
  type SturdyRef,
  type Delivery,
  type Pipelined,
  type SequentialCut,
  type PipelineSequentialCutJudgment,
  type PipelineNode,
  type PipelineEdge,
  type PipelineAuthorityGraph,
  type AuthorityBa,
  type CapTpWitnessRow,
  type CapTpWitnessValue,
  type CapTpCausality,
  type CapTpVectorClock,
  type CapTpCausalTurnEvent,
  type CapTpCausalFrontier,
  type CapTpBaCausalEventStatus,
  type CapTpBaCausalEvent,
  type CapTpBaCausalFrame,
  type CapTpConcurrentTraceLayer,
  type CapTpConcurrentTrace,
  type CapTpCausalCutStatus,
  type CapTpCausalCutViolation,
  type CapTpCausalCut,
  type CapTpCutQuiescenceStatus,
  type CapTpCutPromiseStateStatus,
  type CapTpCutPromiseState,
  type CapTpCutQuiescence,
  type CapTpInvocationSettlementStatus,
  type CapTpInvocationDebt,
  type CapTpInvocationSettlement,
  type CapTpPromiseRetirementStatus,
  type CapTpPromiseRetirementItem,
  type CapTpPromiseRetirementCertificate,
  type CapTpTurnEventStatus,
  type CapTpTurnEvent,
  type CapTpTurnTrace,
  type VatPresence,
  type VatPresenceKind,
  type VatPresenceStatus,
  type VatTable,
  type VatDrop,
  type PromiseResolution,
  type PromiseBreak,
  type CapTpExportStatus,
  type CapTpExportCount,
  type CapTpExportTable,
  type CapTpExportGc,
  type HandoffGiftOptions,
  type HandoffGift,
  type HandoffGiftStatus,
  type HandoffClaimOptions,
  type HandoffClaim,
  type HandoffClaimRecord,
  type HandoffClaimStatus,
  type HandoffTable,
  type CapTpDescriptor,
  type CapTpUnsealedDescriptor,
  type CapTpImportObjectDescriptor,
  type CapTpImportPromiseDescriptor,
  type CapTpExportDescriptor,
  type CapTpAnswerDescriptor,
  type CapTpHandoffGiveDescriptor,
  type CapTpHandoffReceiveDescriptor,
  type CapTpSigEnvelope,
  type ReferenceJoinCandidate,
  type ReferenceJoin,
  type ReferenceJoinStatus,
  type CapTpVersion,
  type CapTpSessionStatus,
  type CapTpCrossedHelloWinner,
  type CapTpSessionOptions,
  type CapTpSession,
  type CapTpCrossedHelloResolution,
  type CapTpStartSessionOperation,
  type CapTpDeliverOperation,
  type CapTpListenOperation,
  type CapTpGetOperation,
  type CapTpIndexOperation,
  type CapTpUntagOperation,
  type CapTpProjectionOperation,
  type CapTpGcAnswersOperation,
  type CapTpGcExportsOperation,
  type CapTpAbortOperation,
  type CapTpOperation,
  type CapTpSessionStep,
  type CapTpTranscriptStatus,
  type CapTpTranscriptBlockedOperation,
  type CapTpSessionTranscript,
  type CapTpTranscriptCommit,
  type CapTpTranscriptCommitChain,
  type CapTpAnswerSlotStatus,
  type CapTpAnswerSlot,
  type CapTpAnswerAnomaly,
  type CapTpAnswerTable,
  type CapTpPromiseTraceStatus,
  type CapTpPromiseTraceEntry,
  type CapTpProjectionSelectorKind,
  type CapTpProjectionTraceEntry,
  type Admission,
} from "./writing/captp/index.mjs";

// DIDs + Verifiable Credentials — identity UNDER WMAP: a did:web DID re-reads the
// Actor's host+path as a portable, non-server-bound id; a VC is a charged claim
// (relating's claim + FOUR charge) with an RSA proof (the same crypto as HTTP
// Signatures). A credential-as-capability reuses the activitypub Capability carrier.
// See dev/docs/notes/2026-06-25-dids-vcs-as-communicating.md.
export {
  didDocumentCarrier,
  didFromActor,
  didOfIri,
  iriOfDid,
  actorIdFromDid,
  credentialCarrier,
  issueCredential,
  verifyCredential,
  claimOfCredential,
  credentialFromWitness,
  witnessFromCredential,
  credentialLogReading,
  credentialEnvelopeFromWitnessLog,
  issueCapabilityCredential,
  DID_CONTEXT,
  VC_CONTEXT,
  type DIDDocument,
  type DidOptions,
  type VerifiableCredential,
  type CredentialOptions,
  type CredentialWitnessOptions,
} from "./writing/did/index.mjs";

// Unified agent identity (bridge #5): one AgentIdentity root, five coherent facets —
// the ActivityPub Actor, did:web DID, A2A Agent Card, VC subject, and WebAuthn
// credential are functorial views of one identity, so a single rotation/revocation
// reflects across all of them. Each facet is an RWIL Reading; cohere proves any two
// commute through the shared identity witness.
// See dev/docs/notes/2026-06-26-unified-agent-identity.md.
export {
  agentIdentityCarrier,
  webauthnCredentialCarrier,
  mintIdentity,
  keyIdOf,
  agentOfIdentity,
  actorIriOf,
  rotate,
  revokeIdentity,
  actorFacet,
  didFacet,
  agentCardFacet,
  vcSubjectFacet,
  webauthnOfIdentity,
  facetIdOf,
  verifyFacet,
  identityWitness,
  identityFromWitness,
  identityReadings,
  identityReading,
  type AgentIdentity,
  type AgentIdentityOptions,
  type WebAuthnCredential,
  type FacetName,
} from "./writing/identity/index.mjs";

// UCAN — canonical ucanto Delegation/Invocation verification. EnterpriseAccount
// controller binding is deliberately a separate ERC-1271 observation.
export {
  verifyUcanInvocation,
  type UcanCapability,
  type VerifyUcanInvocationOptions,
  type UcanInvocationVerificationReceipt,
} from "./writing/ucan/index.mjs";

export {
  activityPubRsaCapabilityEnvelopeSchema,
  activityPubRsaCapabilityEnvelopeCarrier,
  activityPubRsaEnvelopeFromCapability,
  capabilityFromActivityPubRsaEnvelope,
  type ActivityPubRsaCapabilityEnvelope,
} from "./writing/activitypub-rsa-capability-envelope/index.mjs";

// OpenAI-compatible Chat Completions — the de-facto `/v1/chat/completions` wire
// as a projection of the animating perceive→act loop, with function tools read as
// playing capability invokes/cuts.
export {
  OpenAiChatToolCallSchema,
  OpenAiChatMessageSchema,
  OpenAiChatFunctionToolSchema,
  OpenAiResponseFormatSchema,
  OpenAiChatCompletionRequestSchema,
  OpenAiChatCompletionSchema,
  openAiChatToolCallCarrier,
  openAiChatMessageCarrier,
  openAiChatFunctionToolCarrier,
  openAiResponseFormatCarrier,
  openAiChatCompletionRequestCarrier,
  openAiChatCompletionCarrier,
  OPENAI_CHAT_COMPLETIONS_VERB,
  OPENAI_CHAT_COMPLETIONS_PATH,
  runOpenAiChatCompletion,
  createOpenAiChatCompletionAction,
  openAiChatCompletionAction,
  openAiChatActions,
  type OpenAiChatToolCall,
  type OpenAiChatMessage,
  type OpenAiChatFunctionTool,
  type OpenAiResponseFormat,
  type OpenAiChatCompletionRequest,
  type OpenAiChatCompletion,
  type OpenAiChatCompletionActionOptions,
} from "./writing/openai-chat/index.mjs";

// ── the boundary: animating's actions (cocone legs over the relating dispatcher) ──
export {
  actions,
  prehendAction,
  glueAction,
  faceAction,
  projectAction,
  animateAction,
  skillAction,
  becomingAction,
  doingAction,
  workingAction,
  governingAction,
  perceiveAction,
  actAction,
  reseedAction,
  factorAction,
} from "./actions.mjs";

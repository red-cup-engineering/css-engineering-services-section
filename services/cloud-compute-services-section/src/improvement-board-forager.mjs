import { cloudComputeTermId } from "./semantic-content.mjs";
import { contractInferenceWork as defaultContractInferenceWork } from "@red-cup-engineering/inference-work-lot-service/codex-inference-market";
import { resolutionCreditPolicy } from "@red-cup-engineering/inference-work-lot-service/consideration";
import { executeSoftwareMission as defaultExecuteSoftwareMission } from "@red-cup-engineering/software-mission-execution-service/client";

export const CONTEXT = "https://www.w3.org/ns/activitystreams";
export const ACTOR = "urn:ame:cloud-compute-services-section";

function rmnId(value) { return cloudComputeTermId(value, "cloud-compute.improvement-market-record"); }
function record(body) { return Object.freeze({ id: rmnId(body), ...body }); }
function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
const safeArgument = (value) => typeof value === "string" && /^[A-Za-z0-9_./:@=+,%-]+$/u.test(value);

export const DEFAULT_FORAGER_POLICY = Object.freeze({
  capabilities: Object.freeze(["software-engineering", "json-schema-output", "code-review"]),
  minimumAsk: Object.freeze({ amount: 8, unit: "relative-resolution-milliquanta-v1" }),
  considerationPolicy: resolutionCreditPolicy(31),
});

const GAME_PROPOSAL_SCHEMA = Object.freeze({
  type: "object", additionalProperties: false,
  required: ["verdict", "reason", "proposedResidue"],
  properties: {
    verdict: { type: "string", enum: ["propose-game", "insufficient-evidence"] },
    reason: { type: "string" },
    proposedResidue: { type: ["object", "null"] },
  },
});

function lotAndQuote(activity) {
  const lot = activity?.object;
  const quote = activity?.attachment?.find((item) => ["ImprovementBuyerQuote", "ImprovementGameBuyerQuote"].includes(item?.type));
  return { lot, quote };
}

export function qualifiedBoardOfferKind(activity, policy = DEFAULT_FORAGER_POLICY) {
  const { lot, quote } = lotAndQuote(activity);
  if (activity?.["@context"] !== CONTEXT || activity.type !== "Offer" || !["SoftwareDevelopmentWorkLot", "ImprovementGameDesignWorkLot"].includes(lot?.type) || quote?.lot !== lot.id) return null;
  if (policy.minimumAsk.unit !== quote.consideration?.unit || policy.minimumAsk.amount > quote.consideration.amount) return null;
  const terms = lot.type === "ImprovementGameDesignWorkLot" ? lot.gameTerms : lot.boardTerms;
  if (!Array.isArray(terms?.requiredCapabilities) || terms.requiredCapabilities.some((capability) => !policy.capabilities.includes(capability))) return null;
  if (lot.type === "ImprovementGameDesignWorkLot") {
    if (terms.upwardEscalationAuthorized !== false || terms.customerMutationAuthorized !== false || terms.implementationAuthorized !== false || terms.oracleAuthorshipAuthorized !== false) return null;
    return "game-design";
  }
  if (lot.boardTerms.upwardEscalationAuthorized !== false || !lot.boardTerms.territory || !Array.isArray(lot.acceptanceCommands) || !lot.acceptanceCommands.every((command) => command?.runner === "node" && Array.isArray(command.argv) && command.argv.length > 0 && command.argv.every(safeArgument))) return null;
  return "implementation";
}

export function bidForBoardOffer(activity, policy = DEFAULT_FORAGER_POLICY, capacity = null) {
  const kind = qualifiedBoardOfferKind(activity, policy), { lot, quote } = lotAndQuote(activity);
  if (!kind) return null;
  const resourceObservation = capacity?.resourceObservation ?? { state: "provider-will-queue-or-refuse-from-observed-load", provider: ACTOR };
  if (kind === "game-design") {
    return record({
      "@context": CONTEXT, type: "Offer", actor: ACTOR, target: lot.consumer, inReplyTo: quote.id,
      object: { type: "ImprovementGameDesignBid", provider: ACTOR, lot: lot.id, quote: quote.id, consideration: policy.minimumAsk, capabilities: policy.capabilities, resourceObservation, deliveryMode: "game-proposal-only", customerMutation: false, implementationAuthorized: false, oracleAuthorshipAuthorized: false, upwardEscalationAuthorized: false, lotSnapshot: lot, executionPolicy: { refinement: "market-pressure" } },
    });
  }
  return record({
    "@context": CONTEXT, type: "Offer", actor: ACTOR, target: lot.consumer, inReplyTo: quote.id,
    object: {
      type: "ImprovementServiceBid", provider: ACTOR, lot: lot.id, quote: quote.id,
      consideration: policy.minimumAsk, capabilities: policy.capabilities,
      resourceObservation,
      deliveryMode: "proposal-only", customerMutation: false, upwardEscalationAuthorized: false,
      lotSnapshot: lot,
      executionPolicy: { considerationPolicy: policy.considerationPolicy, refinement: "market-pressure" },
    },
  });
}

function gameRefusal(award, bid, code, reason, resources = { inferenceAttempts: 0, usefulCompletions: 0 }) {
  return record({ "@context": CONTEXT, type: "Reject", actor: ACTOR, target: award.actor, inReplyTo: award.id, object: { type: "ImprovementGameDesignRefusal", lot: award.object.lot, award: award.id, bid: bid.id, code, reason, resources, customerMutation: false, implementationAuthorized: false, oracleAuthorshipAuthorized: false, strongerModelRequested: false } });
}

export async function fulfillGameDesignAward(award, bid, { contractInferenceWork = defaultContractInferenceWork, recordedAt = new Date().toISOString() } = {}) {
  const lot = bid?.object?.lotSnapshot;
  if (award?.type !== "Accept" || award.target !== ACTOR || award.object?.type !== "ImprovementGameDesignAward" || award.object.bid !== bid.id || award.object.lot !== lot?.id || bid.object.provider !== ACTOR) fail("foreign-game-award", "exact customer award of this provider's game-design bid is required");
  if (award.object.customerMutationAuthorized !== false || award.object.implementationAuthorized !== false || award.object.oracleAuthorshipAuthorized !== false || lot.gameTerms?.upwardEscalationAuthorized !== false) fail("game-authority-expansion", "game design must remain analysis-only and cannot authorize implementation or oracle authorship");
  let authored;
  try {
    authored = await contractInferenceWork({
      customer: ACTOR, objective: lot.objective,
      context: JSON.stringify({ opportunity: lot.sourceObservation, productContract: lot.productContract, gameTerms: lot.gameTerms }),
      desiredUse: "Reason in prose about a proposal-only game. Point only to an already-existing customer-controlled acceptance oracle present in the supplied context. If the evidence is insufficient, say so. Conclude with exactly one fenced JSON tool call matching the supplied customer projection; the deterministic customer boundary, not the model, casts that record.",
      workType: "repository-analysis", taskClass: "improvement-game-design", requiredCapabilities: ["software-engineering"],
      outputSchema: GAME_PROPOSAL_SCHEMA,
      outputProjection: { type: "fenced-json-tool-call", schema: GAME_PROPOSAL_SCHEMA },
    });
  } catch (error) { return gameRefusal(award, bid, "design-provider-refused", error.message); }
  if (authored?.outcome !== "candidate-pending-customer-acceptance" || authored.candidate?.verdict !== "propose-game" || !authored.candidate.proposedResidue) return gameRefusal(award, bid, "insufficient-evidence", authored?.candidate?.reason ?? "finite opportunity packet exposed no customer-assayable game", { inferenceAttempts: 1, usefulCompletions: authored?.candidate ? 1 : 0 });
  const residueBody = Object.fromEntries(Object.entries(authored.candidate.proposedResidue).filter(([key]) => key !== "id"));
  const residue = record(residueBody);
  const proposal = record({
    type: "ImprovementGameProposal", lot: lot.id, award: award.id, supplier: ACTOR,
    verdict: "propose-game", proposedResidue: residue,
    sourceBindings: { sourceObservation: lot.sourceObservation?.id ?? null, productContract: lot.productContract?.id ?? null },
    resources: { inferenceAttempts: 1, usefulCompletions: 1, author: authored.provider, consideration: authored.evidence?.selectedOffer ?? null },
    customerMutation: false, customerAcceptanceRequired: true, recordedAt,
  });
  // A second model's identity is not a proof pore.  The customer receives the
  // exact proposal and source bindings and applies its already-seated oracle.
  return record({ "@context": CONTEXT, type: "Create", actor: ACTOR, target: award.actor, inReplyTo: award.id, object: proposal, attachment: [] });
}

export function missionForAward(award, bid) {
  const body = bid?.object, lot = body?.lotSnapshot;
  if (award?.type !== "Accept" || award.target !== ACTOR || award.object?.type !== "ImprovementProposalAward" || award.object.bid !== bid.id || award.object.lot !== lot?.id || body.provider !== ACTOR) fail("foreign-award", "exact customer award of this provider bid is required");
  if (award.object.customerMutationAuthorized !== false || lot.boardTerms?.upwardEscalationAuthorized !== false) fail("foreign-write", "award must authorize proposal bytes only and downward refinement");
  if (!Array.isArray(lot.acceptanceCommands) || !lot.acceptanceCommands.every((command) => command?.runner === "node" && command.argv.every(safeArgument))) fail("unsafe-acceptance", "forager admits only shell-free Node acceptance commands");
  const commands = lot.acceptanceCommands.map((command) => ["node", ...command.argv].join(" "));
  const policy = body.executionPolicy;
  const vectorId = `board-lot-${String(lot.boardTerms.taskClass).toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 48) || "improvement"}`;
  return {
    id: `${award.id}:free-compute-proposal`, objective: lot.requestedChanges.join("\n"), taskClass: lot.boardTerms.taskClass,
    territory: lot.boardTerms.territory, focusPaths: lot.ownedTargetRoots, writablePaths: lot.ownedTargetRoots,
    verifyCommand: commands[0], acceptanceCommand: commands.at(-1), constraints: [
      "Deliver proposal bytes only; never mutate the customer territory.",
      "Use measured obstruction, exact provider offers, diverse proof channels, and deterministic replay to derive execution geometry.",
      ...lot.productContract.validationChecks,
    ],
    testVectors: [{
      id: vectorId,
      given: [`Customer lot ${lot.id} and exact source digests ${lot.sourceDigests?.join(", ") || "not supplied"}.`],
      when: lot.requestedChanges.join(" "),
      then: lot.productContract.validationChecks,
      forbidden: lot.productContract.prohibitedFields,
    }],
    workType: "software-engineering", requiredCapabilities: lot.boardTerms.requiredCapabilities,
    difficulty: policy.difficulty,
    considerationPolicy: policy.considerationPolicy ?? DEFAULT_FORAGER_POLICY.considerationPolicy, apply: false, semanticReview: true, requireStrongContext: true,
    autoRefine: true,
  };
}

export function deliveryFromResult(award, bid, result, recordedAt = new Date().toISOString()) {
  const proposal = result?.outcome?.proposal;
  if (result?.outcome?.verified !== true || proposal?.proposalOnly !== true || proposal.customerMutation !== false || !Array.isArray(proposal.changes) || proposal.changes.length < 1) fail("no-verified-proposal", "mission produced no behaviorally verified proposal-only candidate");
  if (typeof result.id !== "string" || !result.id) fail("trajectory-identity-absent", "proposal delivery requires the exact supplier trajectory identity for later customer foldback");
  if (result.executionProvider !== "urn:ame:software-mission-execution-service" || typeof result.executionReceipt?.inputNi !== "string" || typeof result.executionReceipt?.outputNi !== "string") fail("mission-execution-seam-absent", "proposal delivery requires the exact A2A mission-execution seam receipt");
  const phaseResults = Array.isArray(result.phases) ? result.phases.map((phase) => phase.result).filter((phase) => phase?.metrics) : [];
  const phases = phaseResults.length ? phaseResults : [result];
  const resources = {
    inferenceAttempts: phases.reduce((sum, phase) => sum + (phase.metrics?.inferenceAttempts ?? 0), 0),
    usefulCompletions: phases.reduce((sum, phase) => sum + (phase.metrics?.usefulCompletions ?? 0), 0),
    directInteractiveModelCalls: phases.reduce((sum, phase) => sum + (phase.metrics?.directInteractiveModelCalls ?? 0), 0),
    consideration: phases.flatMap((phase) => phase.metrics?.expectedConsideration ?? []),
  };
  const candidate = record({
    type: "SoftwareChangeProposal", lot: award.object.lot, award: award.id, supplier: ACTOR,
    changes: proposal.changes, upwardEscalationAuthorized: false,
    resources,
    route: {
      class: proposal.deterministicResolver ? "induced-deterministic-resolver" : "cheap-model-proof-wave",
      frontierInferenceCalls: 0,
      supplierTrajectory: result.id,
      supplierTrajectorySemanticId: result.semanticId ?? null,
      executionProvider: result.executionProvider,
      executionReceipt: result.executionReceipt,
      trajectoryFingerprint: proposal.trajectoryFingerprint,
      trajectoryRecipeFingerprint: proposal.trajectoryRecipeFingerprint,
      directInteractiveModelCalls: result.metrics?.directInteractiveModelCalls ?? 0,
    },
    recordedAt,
  });
  const reviews = (result.outcome.semanticReview?.reviews ?? []).filter((review) => review?.accepted === true && review.provider).map((review) => record({
    type: "ImprovementCandidateReview", actor: review.provider, candidate: candidate.id, accepted: true,
    evidence: [review.reason || "proposal-bound behavioral review accepted"], recordedAt,
  }));
  if (proposal.deterministicResolver && reviews.length === 0) {
    for (const actor of proposal.deterministicResolver.priorVerifiedWitnesses ?? proposal.deterministicResolver.priorIndependentWitnesses ?? []) reviews.push(record({ type: "ImprovementCandidateReview", actor, candidate: candidate.id, accepted: true, evidence: ["prior resolver witness plus current protected acceptance"], recordedAt }));
  }
  if (reviews.length === 0) fail("review-residue", "provider result did not expose a proposal-bound accepted review for the customer board");
  return record({ "@context": CONTEXT, type: "Create", actor: ACTOR, target: award.actor, inReplyTo: award.id, object: candidate, attachment: reviews });
}

export async function fulfillBoardAward(award, bid, { executeSoftwareMission = defaultExecuteSoftwareMission, recordedAt } = {}) {
  if (award?.object?.type === "ImprovementGameDesignAward") return fulfillGameDesignAward(award, bid, { recordedAt });
  const mission = missionForAward(award, bid);
  const result = await executeSoftwareMission(mission);
  try { return deliveryFromResult(award, bid, result, recordedAt); }
  catch (error) {
    const phaseResults = Array.isArray(result?.phases) ? result.phases.map((phase) => phase.result).filter((phase) => phase?.metrics) : [];
    const phases = phaseResults.length ? phaseResults : [result ?? {}];
    return record({
      "@context": CONTEXT, type: "Reject", actor: ACTOR, target: award.actor, inReplyTo: award.id,
      object: {
        type: "ImprovementServiceRefusal", lot: award.object.lot, award: award.id, bid: bid.id,
        code: error.code ?? "no-verified-proposal", reason: error.message,
        residue: { classification: result?.outcome?.classification ?? "unknown", summary: result?.outcome?.summary ?? "unknown", phases: result?.phases?.length ?? 1 },
        resources: {
          inferenceAttempts: phases.reduce((sum, phase) => sum + (phase.metrics?.inferenceAttempts ?? 0), 0),
          usefulCompletions: phases.reduce((sum, phase) => sum + (phase.metrics?.usefulCompletions ?? 0), 0),
          directInteractiveModelCalls: phases.reduce((sum, phase) => sum + (phase.metrics?.directInteractiveModelCalls ?? 0), 0),
          consideration: phases.flatMap((phase) => phase.metrics?.expectedConsideration ?? []),
        },
        customerMutation: false, strongerModelRequested: false, recordedAt: recordedAt ?? new Date().toISOString(),
      },
    });
  }
}

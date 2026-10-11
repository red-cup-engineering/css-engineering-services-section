import { planCommunityResponse } from "@red-cup-engineering/programmable-community-response-service";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";

const plannerProgram = (program) => Object.freeze({
  ...program,
  commands: Object.freeze(program.commands.map((command) => Object.freeze({
    ...command,
    triggers: Object.freeze(command.triggers.map((value) => Object.freeze({ kind: "exact-text", value }))),
  }))),
});

/**
 * Plans a review record from injected data only. It has no Discord transport or
 * effect executor. The provider must return a fresh bounded observation; any
 * malformed or stale result rejects and therefore fails closed.
 */
export async function planZeloShadowCommunityResponse(event, config, readObservation, now = new Date()) {
  const response = config.communityResponse;
  if (config.mode === "disabled" || response === undefined) return Object.freeze([]);
  const selected = response.program.commands.find((command) => command.triggers.includes(event.content));
  if (selected === undefined) return Object.freeze([]);
  const request = Object.freeze({ type: "ZeloRateBudgetObservationRequest", version: 1, providerId: response.rateBudgetObservationProvider.id, commandId: selected.id, scopeId: event.scopeId, window: selected.rateBudget.window });
  const rateBudgetObservation = await readObservation(request);
  const result = planCommunityResponse(plannerProgram(response.program), event, { now, maxObservationAgeMs: response.rateBudgetObservationProvider.maxObservationAgeMs, variables: {}, rateBudgetObservation: rateBudgetObservation });
  if (result.kind === "ignore") return Object.freeze([]);
  if (result.kind === "block") return Object.freeze([Object.freeze({ type: "ZeloShadowCommunityResponseEvidence", version: 1, observedAt: now.toISOString(), decision: "block", executable: false, allowedMentions: "none", authority: "adapter-review-required" })]);
  const proposal = result.proposal;
  if (proposal === undefined || proposal.executable !== false || proposal.allowedMentions !== "none" || proposal.authority !== "adapter-review-required") throw new TypeError("upstream proposal is not shadow-safe");
  return Object.freeze([Object.freeze({ type: "ZeloShadowCommunityResponseEvidence", version: 1, observedAt: now.toISOString(), decision: "propose", proposalId: proposal.id, contentDigest: sha256Hex(proposal.content), visibility: proposal.visibility, executable: false, allowedMentions: "none", authority: "adapter-review-required" })]);
}

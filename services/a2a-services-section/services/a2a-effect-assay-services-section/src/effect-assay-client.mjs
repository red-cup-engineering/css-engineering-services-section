import { createHash } from "node:crypto";
import { conformTerm } from "@red-cup-engineering/rmn-semantic-conformance/client";
import { assayWitTransition } from "@lenticule-science/wit-transition-assay/client";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

export const artifactChecksum = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
export function semanticJsonId(objectKind, value) { return identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT }).token; }
export function semanticBytesId(objectKind, bytes) { return semanticJsonId(objectKind, { mediaType: "application/octet-stream", contentBase64: Buffer.from(bytes).toString("base64") }); }
export function textNi(value, objectKind = "resource-brokerage.effect-coordinate") { return semanticJsonId(objectKind, value); }

function agentUrl() {
  if (!process.env.RMN_CONFORMANCE_AGENT) throw new Error("RMN_CONFORMANCE_AGENT must name the hired RMN provider's A2A 1.0 Agent Card");
  return process.env.RMN_CONFORMANCE_AGENT;
}
function witAgentUrl() { if (!process.env.WIT_TRANSITION_ASSAY_AGENT) throw new Error("WIT_TRANSITION_ASSAY_AGENT must name the hired WIT transition provider's signed A2A 1.0 Agent Card"); return process.env.WIT_TRANSITION_ASSAY_AGENT; }

export async function proposeEffect(_actor, cell, _now) {
  const response = await conformTerm({ agentUrl: agentUrl(), term: ["effect", cell], expectedType: ["effect"] });
  return { semanticId: response.term, evidence: cell.evidenceRoot, conformance: response.exchange.outputNi };
}

export async function completeEffect(_actor, proposalCell, completionCell, evidence, _now) {
  const response = await assayWitTransition({ agentUrl: witAgentUrl(), proposalCell, completionCell, evidence });
  return { proposal: response.proposal, completion: response.completion, witness: response.witness, outcome: response.outcome, conformance: response.exchange.outputNi };
}

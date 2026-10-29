import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { agentCardSignatureEvidence } from "@red-cup-engineering/a2a-agent-card-discovery-service";
import { extractRmnPart, userRmnMessage } from "@red-cup-engineering/a2a-rmn-part-service";
import { a2aResultParts, sendRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { admitJsonSemanticContent, EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const A2A_CARRIER_KIND = "rsc-quiescent.a2a-json";
const semanticBytes = (value) => identifyJsonSemanticContent({ objectKind: A2A_CARRIER_KIND, value, witnessRoot: EMPTY_WITNESS_ROOT }).bytes;
const decodeSemantic = (bytes) => admitJsonSemanticContent({ bytes, objectKind: A2A_CARRIER_KIND }).value;
import { ACTOR, NODE_ROOT, contentId } from "./broker.mjs";

export function channelBinding(channel, path = join(NODE_ROOT, "content/config/channel-providers.json")) { const registry = JSON.parse(readFileSync(path, "utf8")), binding = registry.providers?.find((entry) => entry.channel === channel); if (!binding?.agentUrl || !binding?.agentCardIdentity) throw new TypeError("analytics channel has no pinned commission provider"); return binding; }
function exact(value) { if (!value || typeof value !== "object") return false; const { id, ...body } = value; return id === contentId(body); }
export function createAnalyticsChannelClient({ binding, send = sendRmnTask, cardEvidence = agentCardSignatureEvidence, timeoutMs = 30000 } = {}) {
  if (!binding) throw new TypeError("analytics channel client requires one pinned binding"); const authenticated = new WeakSet();
  return {
    async pickup(commission) { const body = { type: "AnalyticsCommissionPickupRequest", requester: ACTOR, channel: binding.channel, commission }, request = { id: contentId(body), ...body }, exchange = await send({ agentUrl: binding.agentUrl, message: userRmnMessage(semanticBytes(["analytics-commission-pickup-request", request]), "analytics-commission-pickup-request.rmn.cbor", randomUUID()), requireSignature: true, signal: AbortSignal.timeout(timeoutMs) }); const evidence = cardEvidence(exchange.agentCard); if (evidence.card !== binding.agentCardIdentity || (binding.agentCardSignature && evidence.signature !== binding.agentCardSignature)) throw new TypeError("analytics channel Agent Card changed"); const term = decodeSemantic(extractRmnPart(a2aResultParts(exchange.result)).bytes), result = term?.[0] === "analytics-commission-pickup-result" ? term[1] : null; if (result?.provider !== binding.channel || result.request !== request.id) throw new TypeError("analytics pickup result does not bind the request"); if (result.disposition === "refused") throw new Error(`analytics channel refused: ${result.detail ?? result.code}`); if (result.disposition !== "delivered" || !exact(result.delivery) || result.delivery.actor !== binding.channel || result.delivery.target !== ACTOR) throw new TypeError("analytics channel delivery is not exact"); authenticated.add(result.delivery); return result.delivery; },
    verifyDelivery(delivery) { return authenticated.has(delivery); },
  };
}

#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { agentRmnMessage, extractRmnPart, parseA2aMessage } from "@red-cup-engineering/a2a-rmn-part-service";
import { admitJsonSemanticContent, EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const A2A_CARRIER_KIND = "rsc-quiescent.a2a-json";
const semanticBytes = (value) => identifyJsonSemanticContent({ objectKind: A2A_CARRIER_KIND, value, witnessRoot: EMPTY_WITNESS_ROOT }).bytes;
const decodeSemantic = (bytes) => admitJsonSemanticContent({ bytes, objectKind: A2A_CARRIER_KIND }).value;
import { ACTOR } from "./broker.mjs";
import { pickupCuriosityOffer } from "./curiosity-offer-delivery.mjs";
export function executeCuriosityOfferMessage(message, options = {}) { const part = extractRmnPart(parseA2aMessage(message).parts), term = decodeSemantic(part.bytes); if (!semanticBytes(term).equals(part.bytes) || term?.[0] !== "analytics-curiosity-offer-pickup-request" || term.length !== 2) throw new TypeError("foreign curiosity offer operation"); let result; try { result = pickupCuriosityOffer(term[1], options); } catch (error) { result = { type: "AnalyticsCuriosityOfferPickupResult", provider: ACTOR, request: term[1]?.id ?? null, disposition: "refused", code: "offer-unavailable", detail: error.message, retryable: false }; } return agentRmnMessage(semanticBytes(["analytics-curiosity-offer-pickup-result", result]), "analytics-curiosity-offer-pickup-result.rmn.cbor"); }
async function main() { let input = ""; process.stdin.setEncoding("utf8"); for await (const chunk of process.stdin) input += chunk; process.stdout.write(`${JSON.stringify(executeCuriosityOfferMessage(JSON.parse(input), { dataRoot: process.env.ANALYTICS_BROKER_DATA_ROOT }))}\n`); }
if (process.argv[1] === fileURLToPath(import.meta.url)) await main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 2; });

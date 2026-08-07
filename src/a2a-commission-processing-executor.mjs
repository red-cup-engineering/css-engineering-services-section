#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { agentRmnMessage, extractRmnPart, parseA2aMessage } from "@red-cup-engineering/a2a-rmn-part-service";
import { admitJsonSemanticContent, EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
const A2A_CARRIER_KIND = "rsc-quiescent.a2a-json";
const semanticBytes = (value) => identifyJsonSemanticContent({ objectKind: A2A_CARRIER_KIND, value, witnessRoot: EMPTY_WITNESS_ROOT }).bytes;
const decodeSemantic = (bytes) => admitJsonSemanticContent({ bytes, objectKind: A2A_CARRIER_KIND }).value;
import { ACTOR, contentId } from "./broker.mjs";
import { processCommission } from "./process-commission.mjs";

const CHANNEL = "urn:ame:youtube-channel-enterprise";
const RECORD = /^urn:sha256:[a-f0-9]{64}$/u;
function exact(value) { if (!value || typeof value !== "object") return false; const { id, ...body } = value; return id === contentId(body); }

export async function executeCommissionProcessingMessage(message, options = {}) {
  const part = extractRmnPart(parseA2aMessage(message).parts);
  const term = decodeSemantic(part.bytes);
  if (!semanticBytes(term).equals(part.bytes) || term?.[0] !== "analytics-commission-processing-request" || term.length !== 2) throw new TypeError("foreign analytics processing operation");
  const request = term[1];
  let result;
  try {
    if (!exact(request) || request.type !== "AnalyticsCommissionProcessingRequest" || request.customer !== CHANNEL || request.provider !== ACTOR || !RECORD.test(request.commission ?? "")) throw new TypeError("invalid analytics processing request");
    const processed = await processCommission({ channel: request.customer, commission: request.commission }, options);
    const body = { type: "AnalyticsCommissionProcessingResult", provider: ACTOR, customer: request.customer, request: request.id, commission: request.commission, disposition: "processed", interpretation: processed.interpretation.id, curiosityOffer: processed.offer.id, candidate: processed.offer.object.id, authorityWithheld: ["analytics-measurements", "raw-rows", "credentials", "research-assignment", "spending", "research-truth", "publication"] };
    result = { id: contentId(body), ...body };
  } catch (error) {
    const body = { type: "AnalyticsCommissionProcessingResult", provider: ACTOR, customer: request?.customer ?? null, request: request?.id ?? null, commission: request?.commission ?? null, disposition: "refused", code: "commission-unprocessable", detail: error.message, retryable: false };
    result = { id: contentId(body), ...body };
  }
  return agentRmnMessage(semanticBytes(["analytics-commission-processing-result", result]), "analytics-commission-processing-result.rmn.cbor");
}

async function main() {
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) input += chunk;
  process.stdout.write(`${JSON.stringify(await executeCommissionProcessingMessage(JSON.parse(input), { dataRoot: process.env.ANALYTICS_BROKER_DATA_ROOT, runtimeRoot: process.env.ANALYTICS_BROKER_RUNTIME_ROOT, witnessJournalAgentUrl: process.env.WITNESS_JOURNAL_RDF_AGENT }))}\n`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 2; });

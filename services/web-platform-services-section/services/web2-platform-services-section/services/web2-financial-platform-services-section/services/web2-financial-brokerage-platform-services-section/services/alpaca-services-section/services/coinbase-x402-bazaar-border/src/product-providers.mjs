import { randomUUID } from "node:crypto";
import { admitNormalizedSemanticContent, EMPTY_WITNESS_ROOT, identifyJsonSemanticContent, identifyNormalizedSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { inferTy } from "@red-cup-engineering/relation-model-notation-typing";

const semanticId = (value) => identifyJsonSemanticContent({ objectKind: "brokerage.coinbase-x402-bazaar-border.record", value, witnessRoot: EMPTY_WITNESS_ROOT }).id;
import { SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION } from "@red-cup-engineering/inference-work-lot-service/sovereign-provider-interface";
import { extractRmnPart, userRmnMessage } from "@red-cup-engineering/a2a-rmn-part-service";
import { a2aResultMetadata, a2aResultParts, sendRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { normalizeDeltaPacket, renderDeterministicReportGraphic } from "@red-cup-engineering/deterministic-report-graphic-service/renderer";
import { formIssuerEvidencePacket, validateIssuerEvidenceRequest } from "@red-cup-engineering/issuer-research-media-service";
import { formAggressivePortfolioIntent, validateAggressivePortfolioIntentRequest } from "@red-cup-engineering/alpha-portfolio-order-intent-service";
import { normalizeAlpacaSnapshot, reconcileSnapshots } from "@red-cup-engineering/account-evidence-reconciliation-service";
import { createStrategySynthesisProvider } from "./strategy-synthesis-provider.mjs";
import { createAlpacaPrincipalAccountReadService } from "@red-cup-engineering/alpaca-principal-account-read-service";
import { createBrokerageMarketEventRecorder } from "@red-cup-engineering/brokerage-independent-witness-and-books";
import { computeDailyReadingTerm } from "@lenticule-science/divination-computer-system-service/rmn-daily-reading";
import {
  ACCOUNT as DIVINATION_ACCOUNT,
  ACTOR as DIVINATION_ACTOR,
  CONTEXT as DIVINATION_CONTEXT,
  CONTRACT as DIVINATION_CONTRACT,
} from "@lenticule-science/divination-computer-system-service/contract-daily-reading";

// Divination's own precondition/postcondition/refusal terms are private to
// its module (not exported) but are content-addressed and stable; this
// border hires Divination the same way its own test suite constructs a
// proposal (see divination/test/contract-daily-reading.test.mjs), by
// naming these three fixed ni:///sha-256 identifiers directly.
const DIVINATION_PRECONDITION = "ni:///sha-256;ntxOpkBcnbGVC6NeD1y4X54yLK7GmBmNf2ul7IhJV2I";
const DIVINATION_POSTCONDITION = "ni:///sha-256;am0o7fpff-A8Q_SdJFQDw0zJYBdAr8Q8EQEw4V0dWj4";
const DIVINATION_REFUSAL = "ni:///sha-256;IebXWZ-MmX6I7pLllQ4vNRHP9SdWr32AE_pC-w15YMk";
const DEFAULT_DIVINATION_BASE_URL = "http://127.0.0.1:8798";
const termContent = (term, objectKind) => identifyNormalizedSemanticContent({ objectKind, semanticType: inferTy([], term), term, witnessRoot: EMPTY_WITNESS_ROOT });
const termId = (term, objectKind) => termContent(term, objectKind).token;

function divinationProposalEnvelope(date, tradition, callerAccount) {
  const operation = ["pair", ["mark", date], ["mark", tradition]];
  const cell = Object.freeze({
    law: DIVINATION_CONTRACT, caller: callerAccount, provider: DIVINATION_ACCOUNT,
    precondition: DIVINATION_PRECONDITION, operation: termId(operation, "brokerage-control.divination-operation"), postcondition: DIVINATION_POSTCONDITION, refusal: DIVINATION_REFUSAL,
    evidenceRoot: termId(["mark", "proposal-at-four-bottom"], "brokerage-control.evidence-root"), outcome: { positiveEvidence: false, negativeEvidence: false },
    measures: Object.freeze([
      { dimension: "asset", quantity: "0", unit: "none" }, { dimension: "compute", quantity: "1", unit: "daily-reading" },
      { dimension: "erasure", quantity: "0", unit: "alternative" }, { dimension: "gas", quantity: "0", unit: "gas" },
      { dimension: "time", quantity: "0", unit: "millisecond" }, { dimension: "wit", quantity: "0", unit: "typed-four-cover" },
    ]), parent: null,
  });
  const term = ["pair", ["effect", cell], operation];
  const { token: id, bytes } = termContent(term, "brokerage-control.divination-proposal");
  return {
    "@context": DIVINATION_CONTEXT, id: `urn:uuid:${randomUUID()}`, type: "Accept", actor: "urn:ame:coinbase-x402-bazaar-border", target: DIVINATION_ACTOR,
    object: {
      type: "ServiceContract", contract: DIVINATION_CONTRACT, callerAccount,
      proposal: { type: "Document", id, mediaType: "application/rmn+cbor", content: bytes.toString("base64") },
    },
  };
}

/**
 * Hires the running Divination sovereign enterprise (port 8798 by default)
 * over its own ActivityStreams contract endpoint for one daily reading.
 * This function is only ever invoked by the border AFTER x402 settlement;
 * cheap, local, pure validation happens in .preflight below, so an unpaid
 * probe never reaches the network.
 */
export function createDivinationReadingProvider(env = process.env, dependencies = {}) {
  const baseUrl = env.DIVINATION_BASE_URL || DEFAULT_DIVINATION_BASE_URL;
  const callerAccount = env.BROKERAGE_X402_ACCOUNT || "eip155:31337:0x4c9a7b985d461cdd341dcdbd52d76473c66f4f5d";
  const fetchImpl = dependencies.fetch || globalThis.fetch;

  const provider = async function divinationReadingProvider(request) {
    const date = request?.date, tradition = request?.tradition;
    computeDailyReadingTerm(date, tradition); // cheap local re-validation; throws the same way preflight does
    const envelope = divinationProposalEnvelope(date, tradition, callerAccount);
    const response = await fetchImpl(`${baseUrl}/contracts/daily-reading`, {
      method: "POST", headers: { "content-type": "application/activity+json" }, body: JSON.stringify(envelope),
    });
    const result = await response.json();
    if (result?.type !== "Accept" || result.object?.disposition !== "completion") {
      throw new Error(`divination-refused:${result?.object?.disposition ?? result?.object?.type ?? "unreachable"}`);
    }
    const reading = (result.object.attachment ?? []).find((entry) => entry.profile === "org.emsenn.divination.daily-reading.v1");
    if (!reading) throw new Error("divination-reading-attachment-missing");
    return {
      id: result.object.witness, date, tradition, disposition: result.object.disposition,
      evidence: result.object.evidence, witness: result.object.witness,
      reading: { id: reading.id, mediaType: reading.mediaType, contentBase64: reading.content },
    };
  };
  provider.preflight = async (request) => { computeDailyReadingTerm(request?.date, request?.tradition); };
  provider.originatingActor = DIVINATION_ACTOR;
  provider.externalEvidence = (_request, output) => [
    { uri: `${DIVINATION_ACTOR}#evidence`, digest: output.evidence },
    { uri: `${DIVINATION_ACTOR}#witness`, digest: output.witness },
  ];
  return provider;
}

/**
 * Renders a HarmoniousUnionDeltaPacket into byte-stable SVG/PNG through the
 * deterministic-report-graphic-service renderer, imported in-process (the
 * renderer is a pure function; no network hop, matching how paid-ephemeris-
 * gateway calls its own ephemeris computation directly).
 */
export function createReportGraphicProvider() {
  const provider = function reportGraphicProvider(request) {
    const artifact = renderDeterministicReportGraphic(request?.packet ?? request);
    if (artifact.type !== "DeterministicReportGraphicArtifact") throw new Error(`report-graphic-refused:${artifact.reason ?? "unknown"}`);
    return { id: artifact.svgDigest, ...artifact };
  };
  provider.preflight = async (request) => { normalizeDeltaPacket(request?.packet ?? request); };
  provider.originatingActor = "urn:ame:deterministic-report-graphic-service";
  provider.externalEvidence = (_request, output) => [
    { uri: "urn:ame:deterministic-report-graphic-service#packet", digest: output.packetDigest },
    { uri: "urn:ame:deterministic-report-graphic-service#svg", digest: output.svgDigest },
    { uri: "urn:ame:deterministic-report-graphic-service#png", digest: output.pngDigest },
  ];
  return provider;
}

const DEFAULT_OCCUPATION_ENTROPY_AGENT_URL = "http://127.0.0.1:8812/.well-known/agent-card.json";

function decorateProvider(provider, { actor, preflight, evidence }) {
  Object.defineProperties(provider, {
    originatingActor: { value: actor, enumerable: true },
    preflight: { value: preflight, enumerable: true },
    externalEvidence: { value: evidence, enumerable: true },
  });
  return provider;
}

export function createIssuerEvidenceProvider() {
  return decorateProvider((request) => formIssuerEvidencePacket(request), {
    actor: "urn:ame:issuer-research-media-service",
    preflight: async (request) => { validateIssuerEvidenceRequest(request); },
    evidence: (request, output) => request.sources.map((source) => ({ uri: source.uri, digest: source.digest })).concat({ uri: `urn:brokerage:issuer-evidence:${output.ticker}`, digest: output.id }),
  });
}

export function createAggressiveAlphaProvider() {
  return decorateProvider((request) => {
    const intent = formAggressivePortfolioIntent(request);
    return Object.freeze({
      type: "AggressiveAlphaAnalysisPacket", version: 1, id: intent.id,
      symbol: intent.symbol, side: intent.side, notional: intent.notional,
      maximumLoss: intent.maximumLoss, concentration: intent.concentration,
      thesis: intent.thesis, falsifier: intent.falsifier,
      liquidityPremise: intent.liquidityPremise, executionPremise: intent.executionPremise,
      scenarios: intent.scenarios, evidence: intent.evidence, policyDigest: intent.policyDigest,
      effect: "analysis-only", liveVenueEffect: false,
    });
  }, {
    actor: "urn:ame:alpha-portfolio-order-intent-service",
    preflight: async (request) => { validateAggressivePortfolioIntentRequest(request); },
    evidence: (request, output) => request.evidencePackets.map((packet) => ({ uri: `urn:brokerage:issuer-evidence:${packet.id}`, digest: packet.id })).concat({ uri: `urn:brokerage:aggressive-alpha:${output.symbol}`, digest: output.id }),
  });
}

export function createPaperIntentProvider() {
  return decorateProvider((request) => formAggressivePortfolioIntent(request), {
    actor: "urn:ame:alpha-portfolio-order-intent-service",
    preflight: async (request) => { validateAggressivePortfolioIntentRequest(request); },
    evidence: (_request, output) => [{ uri: `urn:brokerage:paper-intent:${output.symbol}`, digest: output.id }],
  });
}

function normalizedSnapshot(value) {
  return value?.type === "NormalizedBrokerageAccountSnapshot" ? value : normalizeAlpacaSnapshot(value);
}

export function createAccountReconciliationProvider() {
  const normalizeRequest = (request) => ({ expected: normalizedSnapshot(request?.expected), observed: normalizedSnapshot(request?.observed), ...(request?.tolerances ? { tolerances: request.tolerances } : {}) });
  return decorateProvider((request) => reconcileSnapshots(normalizeRequest(request)), {
    actor: "urn:ame:account-evidence-reconciliation-service",
    preflight: async (request) => { reconcileSnapshots(normalizeRequest(request)); },
    evidence: (_request, output) => [{ uri: `urn:brokerage:account-reconciliation:${encodeURIComponent(output.accountReference)}`, digest: output.id }],
  });
}

export { createStrategySynthesisProvider };

export function createPrincipalAccountReadProvider(env = process.env, dependencies = {}) {
  if (typeof dependencies.resolveAuthorityGrant !== "function" || typeof dependencies.authorityCustody?.authorizedRequest !== "function") return undefined;
  const recordObservation = dependencies.recordPrincipalAccountObservation ?? createBrokerageMarketEventRecorder({ originatingActor: "urn:ame:alpaca-principal-account-read-service", nodeId: "alpaca-principal-account-read-service" }, env, dependencies);
  return createAlpacaPrincipalAccountReadService({ resolveAuthorityGrant: dependencies.resolveAuthorityGrant, authorityCustody: dependencies.authorityCustody, recordObservation, clock: dependencies.now });
}

function isNonNegSafeInt(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function validateOccupation(occupation) {
  if (!Array.isArray(occupation) || occupation.length === 0 || !occupation.every(isNonNegSafeInt)) {
    throw new Error("occupation must be a non-empty array of non-negative safe integers");
  }
}

/**
 * Hires the occupation-entropy-readout die's signed A2A face — its only
 * served face (Leader ruling 2026-07-24) — for one Boltzmann
 * occupation-entropy readout: one RMN Mark request in, one Mark result out.
 * Like the Divination provider above, this border only ever calls the die's
 * provider AFTER x402 settlement; cheap, local, pure validation happens in
 * .preflight below, so an unpaid probe never reaches the network.
 */
export function createOccupationEntropyProvider(env = process.env) {
  const agentUrl = env.OCCUPATION_ENTROPY_AGENT_URL || DEFAULT_OCCUPATION_ENTROPY_AGENT_URL;

  const provider = async function occupationEntropyProvider(request) {
    validateOccupation(request?.occupation);
    const bytes = termContent(["mark", JSON.stringify({ occupation: request.occupation })], "brokerage-control.occupation-request").bytes;
    const exchange = await sendRmnTask({
      agentUrl,
      extensions: [SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION],
      requireSignature: true,
      message: userRmnMessage(bytes, "occupation-entropy-request.rmn.cbor", randomUUID()),
      signal: AbortSignal.timeout(20_000),
    });
    if (a2aResultMetadata(exchange.result).disposition !== "completion") throw new Error("occupation-entropy-readout-refused");
    const term = admitNormalizedSemanticContent(extractRmnPart(a2aResultParts(exchange.result)).bytes).envelope.settledBody;
    if (!Array.isArray(term) || term[0] !== "mark") throw new Error("occupation-entropy-readout-refused:result was not one Mark term");
    return JSON.parse(term[1]);
  };
  provider.preflight = async (request) => { validateOccupation(request?.occupation); };
  provider.originatingActor = "urn:ame:occupation-entropy-readout";
  provider.externalEvidence = (_request, output) => [
    { uri: "urn:ame:occupation-entropy-readout#certificate", digest: semanticId(output?.certificate ?? null) },
  ];
  return provider;
}

export function createDefaultProviders(env = process.env, dependencies = {}) {
  return {
    issuer: createIssuerEvidenceProvider(),
    alpha: createAggressiveAlphaProvider(),
    paperIntent: createPaperIntentProvider(),
    reconcile: createAccountReconciliationProvider(),
    alpacaRead: createPrincipalAccountReadProvider(env, dependencies),
    strategySynthesis: createStrategySynthesisProvider(env, dependencies),
    divinationReading: createDivinationReadingProvider(env, dependencies),
    reportGraphic: createReportGraphicProvider(),
    occupationEntropy: createOccupationEntropyProvider(env, dependencies),
  };
}

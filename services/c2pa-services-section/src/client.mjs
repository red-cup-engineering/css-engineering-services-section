import { createHash, randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { a2aResultParts, sendRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { conformTerm } from "@red-cup-engineering/rmn-semantic-conformance/client";
import { projectTypedCommitment } from "@red-cup-engineering/ethereum-services-section/typed-commitment";
import { circuitInterfaceFromAgentCard, SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION } from "@red-cup-engineering/relation-model-notation-runtime/hierarchical-circuit";
import { makeNiUri } from "@red-cup-engineering/ni-uri-services-section";
import { admitC2paTerm, C2PA_LAW, C2PA_OPERATION_TYPE, decodeC2paResponse, encodeC2paOperation, identifyC2paTerm } from "./c2pa-rmn.mjs";

const EFFECT_OPERATION_TYPE = ["product", ["effect"], C2PA_OPERATION_TYPE];
const CAIP10 = /^[a-z0-9-]+:[A-Za-z0-9-]+:0x[0-9a-fA-F]{40}$/u;
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u;
export const C2PA_BINDING_PREDICATE = identifyC2paTerm(["predicate", "has-c2pa-manifest", ["base", "ContentDigest"], ["base", "ManifestDigest"]], "c2pa.binding-predicate").token;

function fail(message) { throw new Error(message); }
function exact(value, pattern, label) {
  if (typeof value !== "string" || !pattern.test(value)) fail(`${label} is not a conforming identifier`);
  return value;
}
const rawNi = (value) => makeNiUri(Buffer.from(value));
const responseParts = a2aResultParts;

/**
 * Hire the C2PA provider for one publication act. The caller supplies the
 * complete typed effect-cell boundary; this client neither invents policy nor
 * offers an unsigned path.
 */
export async function signArticle50Asset({
  c2paAgentUrl,
  rmnAgentUrl,
  caller,
  provider,
  asset,
  mediaType,
  title,
  digitalSourceType,
  model,
  humanOversight,
  accessibleDisclosure,
  precondition,
  postcondition,
  refusal,
  evidenceRoot,
  measures = [],
  parent = null,
  signal = AbortSignal.timeout(120_000)
}) {
  if (typeof c2paAgentUrl !== "string" || typeof rmnAgentUrl !== "string") fail("C2PA and RMN Agent Card URLs are required");
  exact(caller, CAIP10, "caller"); exact(provider, CAIP10, "provider");
  exact(precondition, NI, "precondition"); exact(postcondition, NI, "postcondition");
  exact(refusal, NI, "refusal"); exact(evidenceRoot, NI, "evidenceRoot");
  if (!Array.isArray(measures)) fail("measures must be a typed resource vector");
  const authoredOperation = encodeC2paOperation({ asset, mediaType, title, digitalSourceType, model, humanOversight, accessibleDisclosure });
  const normalizedOperation = await conformTerm({ agentUrl: rmnAgentUrl, term: authoredOperation, expectedType: C2PA_OPERATION_TYPE, signal });
  const operation = normalizedOperation.normalForm;
  const operationNi = identifyC2paTerm(operation, "c2pa.operation").token;
  const cell = {
    law: C2PA_LAW,
    caller,
    provider,
    precondition,
    operation: operationNi,
    postcondition,
    refusal,
    evidenceRoot,
    outcome: { positiveEvidence: false, negativeEvidence: false },
    measures,
    parent
  };
  const proposal = await conformTerm({ agentUrl: rmnAgentUrl, term: ["pair", ["effect", cell], operation], expectedType: EFFECT_OPERATION_TYPE, signal });
  const bytes = identifyC2paTerm(proposal.response, "c2pa.proposal").bytes;
  const message = Message.toJSON({
    messageId: randomUUID(), contextId: "", taskId: "", role: Role.ROLE_USER,
    parts: [rmnPart(bytes, "c2pa-publication-proposal.rmn.cbor")],
    metadata: {}, extensions: [], referenceTaskIds: []
  });
  const exchange = await sendRmnTask({ agentUrl: c2paAgentUrl, extensions: [SOVEREIGN_CIRCUIT_INTERFACE_EXTENSION], requireSignature: true, message, signal });
  const providerInterface = circuitInterfaceFromAgentCard(exchange.agentCard);
  if (providerInterface.account !== provider || providerInterface.component.law !== C2PA_LAW) fail("C2PA signed circuit interface does not own the requested account and law");
  const part = extractRmnPart(responseParts(exchange.result));
  const ascribed = admitC2paTerm(part.bytes, part.ni).envelope.settledBody;
  if (ascribed?.[0] !== "ascribe") fail("C2PA provider returned a bare or untyped RMN term");
  const result = decodeC2paResponse(ascribed[2]);
  if (result.disposition !== "completion" || result.completionCell?.outcome?.positiveEvidence !== true || result.completionCell?.outcome?.negativeEvidence !== false) fail("C2PA provider did not return a positive witnessed completion");
  const returnedOperationNi = identifyC2paTerm(result.operationTerm, "c2pa.operation").token;
  if (result.completionCell.operation !== operationNi || returnedOperationNi !== operationNi) fail(`C2PA completion does not close the authorized operation (${operationNi}; cell ${result.completionCell.operation}; body ${returnedOperationNi})`);
  if (rawNi(result.signedAsset) !== result.assetNi || rawNi(result.manifest) !== result.manifestNi) fail("C2PA provider returned bytes outside its typed identities");
  return Object.freeze({ ...result, requestNi: proposal.requestNi, responseNi: part.ni, operationNi });
}

/**
 * Complete an Article 50 media publication: hire the C2PA signer, then require
 * the accountable publisher's own ERC-4337 account to project the exact
 * content/manifest/RMN/evidence relation. There is no C2PA-only success path.
 */
export async function publishArticle50Asset({ signing, anchor, project = projectTypedCommitment }) {
  const signed = await signArticle50Asset(signing);
  const evidenceRoot = rawNi(signed.reportBytes);
  const commitment = await project({
    ...anchor,
    rmnAct: signed.operationNi,
    predicate: C2PA_BINDING_PREDICATE,
    subject: signed.assetNi,
    object: signed.manifestNi,
    evidenceRoot
  });
  if (commitment?.account !== signing.caller || commitment?.rmnSemanticDigest !== `0x${Buffer.from(signed.operationNi.slice("ni:///sha-256;".length), "base64url").toString("hex")}`) fail("EVM receipt was not authorized by the accountable publisher for the exact RMN act");
  return Object.freeze({ ...signed, evidenceRoot, commitment });
}

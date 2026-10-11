import { randomBytes } from "node:crypto";
import { closeSync, constants, existsSync, fsyncSync, linkSync, mkdirSync, openSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { materializeSenActivity, extractSenActivity, projectSenActivity } from "@red-cup-engineering/activitypub-services-section/sen-activity";
import { serveActivityPubProvider } from "@red-cup-engineering/activitypub-server";
import { deliverActivity } from "@red-cup-engineering/activitypub-services-section";
import { admitJsonSemanticContent, EMPTY_WITNESS_ROOT, identifyJsonSemanticContent, semanticIdOf } from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";
import { canonicalJson as canonical } from "@red-cup-engineering/json-services-section/canonical-json";
const A2A_CARRIER_KIND = "rsc-quiescent.a2a-json";
const semanticBytes = (value) => identifyJsonSemanticContent({ objectKind: A2A_CARRIER_KIND, value, witnessRoot: EMPTY_WITNESS_ROOT }).bytes;
const decodeSemantic = (bytes) => admitJsonSemanticContent({ bytes, objectKind: A2A_CARRIER_KIND }).value;

const semanticId = semanticIdOf("brokerage.union-products-market-border.record");
import { contractUnionBrokerageOffer, deliverUnionBrokerageContract } from "./union-border.mjs";
import { ACTIVITYSTREAMS_PUBLIC } from "@red-cup-engineering/activitypub-services-section/activitystreams";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
export { ACTIVITYSTREAMS_PUBLIC };

const exactUrl = (value, label) => { let url; try { url = new URL(value); } catch { throw new TypeError(`${label}-must-be-absolute-url`); } if (url.protocol !== "https:" && !["127.0.0.1", "localhost"].includes(url.hostname)) throw new TypeError(`${label}-must-use-https`); return url.href; };
export const encodeUnionMarketSen = (value) => semanticBytes(value);
export function decodeUnionMarketSen(bytes) { const value = decodeSemantic(bytes); if (!semanticBytes(value).equals(Buffer.from(bytes)) || value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError("union-market-sen-must-be-canonical-json-object"); return value; }
export const projectUnionMarketActivity = (input) => projectSenActivity(input);
export const extractUnionMarketActivity = (activity, expected) => extractSenActivity(activity, expected);

function privateDirectory(path) { if (!existsSync(path)) mkdirSync(path, { recursive: true, mode: 0o700 }); const stat = statSync(path); if (!stat.isDirectory() || (stat.mode & 0o077) !== 0) throw new TypeError("union-market-state-root-must-be-private"); return path; }
function syncDirectory(path) { const descriptor = openSync(path, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0)); try { fsyncSync(descriptor); } finally { closeSync(descriptor); } }
function createOnly(path, value) { privateDirectory(dirname(path)); const temporary = join(dirname(path), `.${process.pid}.${randomBytes(12).toString("hex")}.tmp`); let descriptor;
  try { descriptor = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600); writeFileSync(descriptor, `${JSON.stringify(value)}\n`); fsyncSync(descriptor); } finally { if (descriptor !== undefined) closeSync(descriptor); }
  try { linkSync(temporary, path); syncDirectory(dirname(path)); return true; } catch (error) { if (error.code !== "EEXIST") throw error; return false; } finally { unlinkSync(temporary); } }
const read = (path) => JSON.parse(readFileSync(path, "utf8"));

export function createUnionMarketState({ stateRoot, now = () => new Date().toISOString() }) {
  const root = privateDirectory(resolve(stateRoot)), contractRoot = (id) => privateDirectory(join(root, "contracts", sha256Hex(id)));
  return Object.freeze({ root,
    claim(contract, sourceActivity, response) { const path = join(contractRoot(contract.id), "claim.json"), body = { type: "UnionMarketContractClaim", version: 1, contract, sourceActivity, response, claimedAt: now() };
      if (createOnly(path, body)) return body; const existing = read(path); if (existing.contract.id !== contract.id || canonical(existing.contract) !== canonical(contract) || existing.sourceActivity !== sourceActivity || canonical(existing.response) !== canonical(response)) throw new TypeError("union-market-contract-claim-conflict"); return existing; },
    receipt(id) { const path = join(contractRoot(id), "receipt.json"); return existsSync(path) ? read(path) : null; },
    work(id) { const path = join(contractRoot(id), "work.json"); return existsSync(path) ? read(path) : null; },
    recordWork(id, work) { const path = join(contractRoot(id), "work.json"); if (createOnly(path, work)) return work; const existing = read(path); if (canonical(existing) !== canonical(work)) throw new TypeError("union-market-work-conflict"); return existing; },
    recordReceipt(id, receipt) { const path = join(contractRoot(id), "receipt.json"); if (createOnly(path, receipt)) return receipt; const existing = read(path); if (canonical(existing) !== canonical(receipt)) throw new TypeError("union-market-receipt-conflict"); return existing; },
    response(id, kind, create) { const path = join(contractRoot(id), `${kind}-response.json`); if (existsSync(path)) return Object.freeze({ value: read(path), created: false }); const value = create(); if (!createOnly(path, value)) return Object.freeze({ value: read(path), created: false }); return Object.freeze({ value, created: true }); },
    confirmedEffect(id, effect) { const path = join(contractRoot(id), `${effect}-confirmation.json`); return existsSync(path) ? read(path) : null; },
    async effect(id, effect, payload, perform) { const directory = contractRoot(id), attemptPath = join(directory, `${effect}-attempt.json`), confirmationPath = join(directory, `${effect}-confirmation.json`), payloadDigest = semanticId(payload);
      if (existsSync(confirmationPath)) { const confirmation = read(confirmationPath); if (confirmation.payloadDigest !== payloadDigest) throw new TypeError(`union-market-${effect}-payload-mismatch`); return confirmation; }
      if (!createOnly(attemptPath, { type: "UnionMarketEffectAttempt", version: 1, contract: id, effect, payloadDigest, attemptedAt: now() })) throw new TypeError(`union-market-${effect}-effect-uncertain-refused`);
      const result = await perform(), confirmation = { type: "UnionMarketEffectConfirmation", version: 1, contract: id, effect, payload, payloadDigest, result, resultDigest: semanticId(result), confirmedAt: now() };
      if (!createOnly(confirmationPath, confirmation)) throw new TypeError(`union-market-${effect}-confirmation-conflict`); return confirmation; },
  });
}

function actorAt(origin, identifier) { return new URL(`/actors/${identifier}`, exactUrl(origin, "union-market-origin")).href; }
export function createUnionBrokerageActivityPubCallbacks({ origin, identifier, agentCard, offers, providers, state, settle, recordDelivery, recordEvent, deliverResponse, pageSize = 50 }) {
  if (!Array.isArray(offers) || offers.length === 0 || !state || typeof settle !== "function" || typeof recordDelivery !== "function" || typeof recordEvent !== "function" || typeof deliverResponse !== "function" || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new TypeError("union-activitypub-runtime-configuration-invalid");
  const localActor = actorAt(origin, identifier), offerMap = new Map(offers.map((offer) => [offer.id, offer]));
  const responseActivity = (type, recipient, value) => projectSenActivity({ type, origin, identifier, recipient, objectBytes: encodeUnionMarketSen(value), agentCard });
  async function deliverTyped(type, response, value) { const activity = responseActivity(type, response.actor, value); return state.effect(value.contract ?? value.sourceActivity, `activitypub-${type.toLowerCase()}`, { activity: activity.id, recipient: response.actor, inbox: response.inbox }, () => deliverResponse({ activity, recipient: response.actor, inbox: response.inbox })); }
  return Object.freeze({
    async listOutbox({ cursor }) { const offset = cursor === undefined ? 0 : Number(cursor); if (!Number.isSafeInteger(offset) || offset < 0) throw new TypeError("union-market-outbox-cursor-invalid"); const page = offers.slice(offset, offset + pageSize);
      const items = await Promise.all(page.map((offer) => materializeSenActivity({ type: "Offer", origin, identifier, recipient: ACTIVITYSTREAMS_PUBLIC, objectBytes: encodeUnionMarketSen(offer), agentCard })));
      return Object.freeze({ items, ...(offset + page.length >= offers.length ? {} : { nextCursor: String(offset + page.length) }) }); },
    async onActivity(arrival) {
      const activity = arrival?.jsonLd, sourceActivity = exactUrl(activity?.id, "union-market-source-activity"), remoteActor = exactUrl(activity?.actor, "union-market-customer-actor");
      let response = null, committed = null;
      try {
        if (activity?.type !== "Offer") throw new TypeError("union-market-ingress-requires-offer");
        const projection = extractSenActivity(activity, { expectedActor: remoteActor, expectedRecipient: localActor }), purchase = decodeUnionMarketSen(projection.objectBytes);
        if (purchase?.type !== "UnionBrokeragePurchaseRequest" || purchase.version !== 1 || purchase.customerActor !== remoteActor) throw new TypeError("union-market-purchase-request-invalid");
        response = { actor: remoteActor, inbox: exactUrl(purchase.customerInbox, "union-market-customer-inbox") }; const offer = offerMap.get(purchase.offer);
        if (!offer) throw new TypeError("union-market-offer-not-found"); const provider = providers?.[offer.service];
        const contract = await contractUnionBrokerageOffer({ offer, customer: remoteActor, request: purchase.request, considerationGrant: purchase.considerationGrant, acceptedAt: purchase.acceptedAt, provider });
        state.claim(contract, sourceActivity, response); const prior = state.receipt(contract.id); let prepared = state.work(contract.id);
        if (!prior && !prepared) { const output = await provider(contract.request), recorded = await recordDelivery({ originatingActor: provider.originatingActor, inputs: [contract.request], output, externalEvidence: provider.externalEvidence(contract.request, output) }); prepared = state.recordWork(contract.id, { output, witness: recorded.witness ?? recorded }); }
        const receipt = prior ?? await deliverUnionBrokerageContract({ contract, provider, prepared, settle: (input) => state.effect(contract.id, "settlement", { contract: contract.id, output: input.output.id, witness: input.witness.id }, async () => settle(input)).then((confirmation) => confirmation.result) });
        state.recordReceipt(contract.id, receipt); const accepted = state.response(contract.id, "accept", () => ({ type: "UnionBrokerageActivityPubAcceptance", version: 1, contract: contract.id, sourceActivity, deliveryReceipt: receipt, recordedAt: new Date().toISOString() }));
        committed = { contract: contract.id, receipt: receipt.id, acceptance: accepted.value };
        if (!prior) await recordEvent({ type: "union-brokerage-purchase-delivered", sourceActivity, contract: contract.id, receipt: receipt.id, recordedAt: accepted.value.recordedAt });
        await deliverTyped("Accept", response, accepted.value);
        return Object.freeze({ disposition: "accepted", contract: contract.id, receipt: receipt.id });
      } catch (error) {
        if (committed) return Object.freeze({ disposition: "accepted-response-pending", contract: committed.contract, receipt: committed.receipt, reason: error.message });
        const refused = state.response(sourceActivity, "reject", () => ({ type: "UnionBrokerageActivityPubRefusal", version: 1, sourceActivity, reason: error.message, recordedAt: new Date().toISOString() }));
        if (refused.created) await recordEvent(refused.value); if (response) await deliverTyped("Reject", response, refused.value); return Object.freeze({ disposition: "rejected", reason: refused.value.reason });
      }
    },
  });
}

export async function serveUnionBrokerageActivityPub(options, dependencies = {}) {
  let service;
  const callbacks = createUnionBrokerageActivityPubCallbacks({ ...options, deliverResponse: async (input) => (dependencies.deliver ?? deliverActivity)(service.provider, input) });
  service = await (dependencies.serveProvider ?? serveActivityPubProvider)({ origin: options.origin, identifier: options.identifier, actorName: options.actorName,
    summary: options.summary, keyPath: options.keyPath, statePath: options.activityPubStatePath, bearerTokenPath: options.bearerTokenPath, bearerToken: options.bearerToken,
    hostname: options.hostname, port: options.port, allowPrivateAddress: options.allowPrivateAddress, queue: options.queue, onActivity: callbacks.onActivity, listOutbox: callbacks.listOutbox });
  return Object.freeze({ ...service, callbacks, marketState: options.state });
}

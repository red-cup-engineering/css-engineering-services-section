import { semanticIdOf } from "@red-cup-engineering/computer-content-engineering-services-section/semantic-content-identity";
import { canonicalJson as canonical } from "@red-cup-engineering/json-services-section/canonical-json";

const semanticId = semanticIdOf("brokerage.union-products-market-border.record");

const identify = (body) => ({ id: semanticId(body), ...body });
const credential = /^(authorization|api[-_]?key|api[-_]?secret|secret|token|private[-_]?key|password)$/iu;
function rejectCredentials(value, seen = new Set()) { if (!value || typeof value !== "object" || seen.has(value)) return; seen.add(value); for (const [key, member] of Object.entries(value)) { if (credential.test(key)) throw new TypeError("credential-bearing-union-market-request-refused"); rejectCredentials(member, seen); } }
const providerAvailable = (provider) => typeof provider === "function" && typeof provider.preflight === "function"
  && typeof provider.originatingActor === "string" && typeof provider.externalEvidence === "function";
export function formUnionBrokerageOffer({ provider, service, price, validUntil, terms }) {
  if (!price?.asset || !price?.unit || !Number.isFinite(Number(price.amount)) || Number(price.amount) <= 0 || !Number.isFinite(Date.parse(validUntil))) throw new TypeError("union-offer-price-or-expiry-invalid");
  return Object.freeze(identify({ type: "UnionBrokerageProductOffer", version: 1, provider: String(provider), service: String(service), price: { asset: price.asset, unit: price.unit, amount: String(price.amount) },
    validUntil, terms, conversionRate: null, rule: "exact named consideration only; no implicit cross-asset conversion", brokerageCredentialCustody: false }));
}
export async function contractUnionBrokerageOffer({ offer, customer, request, considerationGrant, acceptedAt, provider }) {
  rejectCredentials(request);
  if (offer?.type !== "UnionBrokerageProductOffer" || !Number.isFinite(Date.parse(acceptedAt)) || Date.parse(acceptedAt) >= Date.parse(offer.validUntil)) throw new TypeError("current-union-offer-required");
  if (typeof considerationGrant?.id !== "string" || considerationGrant.id.trim() === "" || considerationGrant?.asset !== offer.price.asset || considerationGrant?.unit !== offer.price.unit || String(considerationGrant?.amount) !== offer.price.amount) throw new TypeError("union-consideration-does-not-exactly-match-offer");
  if (!providerAvailable(provider) || provider.originatingActor !== offer.provider) throw new TypeError("union-offer-provider-unavailable-or-mismatched");
  await provider.preflight(request);
  return Object.freeze(identify({ type: "UnionBrokerageProductContract", version: 1, offer: offer.id, provider: offer.provider, customer: String(customer), service: offer.service,
    request, considerationGrant: { id: considerationGrant.id, asset: considerationGrant.asset, unit: considerationGrant.unit, amount: String(considerationGrant.amount) }, price: offer.price,
    acceptedAt, singleUse: true, providerWorkPending: true, preflightAdmitted: true }));
}
export async function deliverUnionBrokerageContract({ contract, provider, settle, recordDelivery, prepared, witness = async (value) => value }) {
  if (contract?.type !== "UnionBrokerageProductContract" || !providerAvailable(provider) || provider.originatingActor !== contract.provider || typeof settle !== "function" || (!prepared && typeof recordDelivery !== "function")) throw new TypeError("union-delivery-contract-invalid");
  let output, independentWitness;
  if (prepared) { output = prepared.output; independentWitness = prepared.witness; if (!output?.id || !independentWitness?.id) throw new TypeError("union-prepared-delivery-invalid"); }
  else { output = await provider(contract.request); const recorded = await recordDelivery({ originatingActor: provider.originatingActor, inputs: [contract.request], output,
    externalEvidence: provider.externalEvidence(contract.request, output) }); independentWitness = recorded.witness ?? recorded; }
  const settlement = await settle({ contract, output, witness: independentWitness });
  if (settlement?.success !== true || settlement.contract !== contract.id || !settlement.receipt) throw new TypeError("union-settlement-receipt-invalid");
  return witness(Object.freeze(identify({ type: "UnionBrokerageProductDeliveryReceipt", version: 1, contract: contract.id, provider: contract.provider, customer: contract.customer,
    service: contract.service, output: output?.id ?? identify(output).id, independentWitness: independentWitness.id, considerationReceipt: settlement.receipt, price: contract.price,
    revenueRecognized: true, customerBrokerageProfitRecognizedAsRevenue: false, crossMarketReceiptSubstitution: false })));
}

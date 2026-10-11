import { createPrincipalAlpacaBrokerageSystem } from "@red-cup-engineering/alpaca-services-section/principal-brokerage-system";

import { createAlpacaVenueAuthority } from "./venue-authority.mjs";

const modeFor = (contract, authorityGrant) => {
  const mode = contract?.venue?.match(/^alpaca-trading-(paper|live)$/u)?.[1];
  if (!mode || authorityGrant?.venue !== contract.venue || authorityGrant?.adapter !== contract.venue || authorityGrant.principalContract !== contract.id) throw new TypeError("contract-and-authority-must-bind-one-alpaca-trading-mode");
  return mode;
};

/**
 * Execute an already-authorized Alpaca intent in the contract's actual venue.
 *
 * Strategy selection, capital allocation, and risk limits remain upstream: this
 * is the narrow effect boundary. A live effect is possible only for a supplied
 * live contract and grant, current custodied live credentials, a funded current
 * account, and the execution transport's just-in-time capacity admission.
 */
export async function executeAuthorizedAlpacaIntent({ contract, authorityGrant, intent, revocation = null, key, secret, booksDataRoot, venueAuthority: injectedVenueAuthority, clock = () => new Date().toISOString() }) {
  const mode = modeFor(contract, authorityGrant);
  if (intent?.type !== "AggressiveBrokerageOrderIntent" || intent.contract !== contract.id) throw new TypeError("contract-bound-order-intent-required");
  const authority = injectedVenueAuthority ?? createAlpacaVenueAuthority({ mode, key, secret, principal: contract.principal, accountReference: contract.accountReference, contract, authorityGrant, booksDataRoot, clock });
  if (!["recordOutcomeWitness", "resolveAuthorityGrant", "transport"].every((method) => typeof authority?.[method] === "function")
    || !["store", "retrieve", "revoke"].every((method) => typeof authority?.authorityCustody?.[method] === "function")) throw new TypeError("bound-venue-authority-required");
  const references = Object.freeze({ contractReference: contract.id, authorityGrantReference: authorityGrant.id, intentReference: intent.id });
  const system = createPrincipalAlpacaBrokerageSystem({
    authorityCustody: authority.authorityCustody,
    transport: authority.transport,
    resolveAuthorityGrant: authority.resolveAuthorityGrant,
    resolveExecutionRecords: async (requested) => {
      if (requested?.contractReference !== contract.id || requested?.authorityGrantReference !== authorityGrant.id || requested?.intentReference !== intent.id) throw new TypeError("exact-authorized-intent-records-required");
      return { contract, authorityGrant, intent, revocation };
    },
    recordObservation: async ({ value, recordedAt }) => authority.recordOutcomeWitness({
      originatingActor: "urn:ame:alpaca-principal-account-observation",
      inputs: [authorityGrant], output: value,
      externalEvidence: [{ uri: `urn:brokerage:alpaca-account:${encodeURIComponent(contract.accountReference)}`, digest: value.id }],
      observedAt: recordedAt,
    }),
    recordExecution: async ({ outcome, recordedAt }) => authority.recordOutcomeWitness({
      originatingActor: "urn:ame:alpaca-authorized-intent-execution",
      inputs: [contract, authorityGrant, intent], output: outcome,
      externalEvidence: [{ uri: `urn:brokerage:${mode}-execution:${encodeURIComponent(outcome.clientOrderId)}`, digest: outcome.id }],
      observedAt: recordedAt,
    }),
    clock,
  });
  const receipt = await system.execute(references);
  return Object.freeze({
    type: "AuthorizedAlpacaIntentExecutionCycle",
    version: 1,
    mode,
    liveVenueEffect: mode === "live",
    contract: contract.id,
    authorityGrant: authorityGrant.id,
    intent: intent.id,
    selectedVenueAccount: null,
    receipt,
    witness: receipt.executionRecord,
    observedAt: receipt.observedAt,
  });
}

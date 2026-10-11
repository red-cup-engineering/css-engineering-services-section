import { semanticIdOf } from "@red-cup-engineering/computer-content-engineering-services-section/semantic-content-identity";
import { canonicalJson as canonical } from "@red-cup-engineering/json-services-section/canonical-json";

const semanticId = semanticIdOf("brokerage.principal-brokerage-interface.record");


const identify = (body) => ({ id: semanticId(body), ...body });
const text = (value, label) => { if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label}-required`); return value; };
const amount = (value, label) => { const n = Number(value); if (!Number.isFinite(n) || n < 0) throw new TypeError(`${label}-invalid`); return n; };
const positive = (value, label) => { const n = amount(value, label); if (n <= 0) throw new TypeError(`${label}-must-be-positive`); return n; };
const CREDENTIAL_KEYS = /^(api[-_]?key|api[-_]?secret|secret|token|access[-_]?token|refresh[-_]?token|private[-_]?key|mnemonic|password)$/iu;
function refuseCredentials(value, seen = new Set()) { if (!value || typeof value !== "object" || seen.has(value)) return; seen.add(value); for (const [key, member] of Object.entries(value)) { if (CREDENTIAL_KEYS.test(key)) throw new TypeError("credential-bearing-principal-contract-refused"); refuseCredentials(member, seen); } }

export const NORMAL_MARKET_PRICES = Object.freeze({
  "issuer-evidence-packet": "0.25 USDC",
  "aggressive-alpha-research-packet": "1.00 USDC",
  "obsmetrologia-blk-topological-accumulation": "3.00 USDC",
  "paper-portfolio-and-order-intents": "2.00 USDC",
  "account-normalization-and-reconciliation": "0.50 USDC + 0.00001 USDC/record",
  "venue-adapter-read": "0.01 USDC/request",
  "execution-transport": "0.02 USDC/request + disclosed fees",
});

export function formPrincipalOnboardingOffer(input) {
  refuseCredentials(input);
  const expectedCapitalAmount = positive(input?.expectedCapital?.amount, "expected-capital");
  const maximumLossFraction = positive(input?.riskPolicy?.maximumLossFraction, "maximum-loss-fraction");
  const maximumOrderFraction = positive(input?.riskPolicy?.maximumOrderFraction, "maximum-order-fraction");
  const maximumAggregateMultiple = positive(input?.riskPolicy?.maximumAggregateMultiple, "maximum-aggregate-multiple");
  const concentrationLimit = positive(input?.riskPolicy?.concentrationLimit, "concentration-limit");
  if (maximumLossFraction > 1 || concentrationLimit > 1 || maximumOrderFraction > maximumAggregateMultiple) throw new RangeError("onboarding-risk-policy-invalid");
  const scopes = [...new Set((input.scopes ?? []).map(String))].sort();
  if (scopes.length === 0 || !Number.isFinite(Date.parse(input.validUntil))) throw new TypeError("onboarding-scope-or-expiry-invalid");
  return Object.freeze(identify({
    type: "PrincipalBrokerageOnboardingOffer", version: 1, principal: text(input.principal, "principal"), venue: text(input.venue, "venue"),
    expectedCapital: { amount: expectedCapitalAmount, currency: text(input.expectedCapital.currency, "capital-currency"), role: "planning-observation-not-product-ceiling" },
    riskPolicy: { maximumLossFraction, maximumOrderFraction, maximumAggregateMultiple, concentrationLimit,
      leverageLimit: amount(input.riskPolicy.leverageLimit ?? 1, "leverage-limit"), shorting: Boolean(input.riskPolicy.shorting), options: Boolean(input.riskPolicy.options) },
    scopes, validUntil: input.validUntil, sponsored: input.sponsored === true,
    acceptanceRequires: ["principal-acceptance-reference", "non-secret-account-reference", "observed-capital-at-acceptance"],
    effect: "offer-only-no-brokerage-authority-no-wallet-authority",
  }));
}

export function acceptPrincipalOnboardingOffer({ offer, accountReference, observedCapitalAmount, acceptanceReference }) {
  if (offer?.type !== "PrincipalBrokerageOnboardingOffer") throw new TypeError("principal-onboarding-offer-required");
  const capital = positive(observedCapitalAmount, "observed-capital");
  return formPrincipalBrokerageContract({
    principal: offer.principal, venue: offer.venue, accountReference: text(accountReference, "account-reference"),
    capital: { amount: capital, currency: offer.expectedCapital.currency },
    risk: {
      maximumLossAmount: capital * offer.riskPolicy.maximumLossFraction,
      maximumOrderNotional: capital * offer.riskPolicy.maximumOrderFraction,
      maximumAggregateNotional: capital * offer.riskPolicy.maximumAggregateMultiple,
      concentrationLimit: offer.riskPolicy.concentrationLimit, leverageLimit: offer.riskPolicy.leverageLimit,
      shorting: offer.riskPolicy.shorting, options: offer.riskPolicy.options,
    },
    scopes: offer.scopes, validUntil: offer.validUntil, sponsored: offer.sponsored,
    acceptanceReference: text(acceptanceReference, "acceptance-reference"),
  });
}

// This deliberately precedes a service contract: it can establish only the
// readonly facts needed to price a later mandate, never capital or order power.
export function formPrincipalPaperAccountObservationAuthorization({ offer, acceptanceReference, accountAlias, credentialReference, validUntil, now = new Date().toISOString() }) {
  refuseCredentials({ offer, acceptanceReference, accountAlias, credentialReference, validUntil, now });
  if (offer?.type !== "PrincipalBrokerageOnboardingOffer" || offer.venue !== "alpaca-trading-paper" || offer.sponsored !== true) throw new TypeError("sponsored-paper-onboarding-offer-required");
  if (!offer.scopes?.includes("account:read") || !offer.scopes?.includes("positions:read")) throw new TypeError("paper-observation-scopes-unavailable");
  const issued = Date.parse(now), expiry = Date.parse(validUntil), offerExpiry = Date.parse(offer.validUntil);
  if (!Number.isFinite(issued) || !Number.isFinite(expiry) || expiry <= issued || expiry - issued > 15 * 60 * 1000 || expiry > offerExpiry) throw new TypeError("paper-observation-lifetime-refused");
  return Object.freeze(identify({ type: "PrincipalPaperAccountObservationAuthorization", version: 1,
    onboardingOffer: offer.id, principal: offer.principal, venue: "alpaca-trading-paper", acceptanceReference: text(acceptanceReference, "acceptance-reference"),
    accountAlias: text(accountAlias, "account-alias"), credentialReference: text(credentialReference, "credential-reference"),
    scopes: ["account:read", "positions:read"], issuedAt: now, validUntil, revoked: false,
    effect: "readonly-paper-account-and-positions-observation-no-capital-claim-no-order-authority" }));
}

export function revokePrincipalPaperAccountObservationAuthorization(authorization, revokedAt, reason) {
  if (authorization?.type !== "PrincipalPaperAccountObservationAuthorization") throw new TypeError("paper-observation-authorization-required");
  return Object.freeze(identify({ type: "PrincipalPaperAccountObservationAuthorizationRevocation", version: 1, authorization: authorization.id,
    revokedAt: text(revokedAt, "revoked-at"), reason: text(reason, "reason"), effective: true }));
}

export function formPrincipalBrokerageContract(input) {
  refuseCredentials(input);
  const capital = amount(input?.capital?.amount, "capital-amount");
  if (capital <= 0) throw new TypeError("capital-must-be-positive");
  const maximumLoss = amount(input?.risk?.maximumLossAmount, "maximum-loss");
  const maximumOrderNotional = amount(input?.risk?.maximumOrderNotional, "maximum-order-notional");
  const maximumAggregateNotional = amount(input?.risk?.maximumAggregateNotional, "maximum-aggregate-notional");
  const concentrationLimit = Number(input?.risk?.concentrationLimit);
  if (maximumLoss > capital || maximumOrderNotional > maximumAggregateNotional || concentrationLimit <= 0 || concentrationLimit > 1) throw new RangeError("principal-risk-boundary-invalid");
  const body = {
    type: "PrincipalBrokerageServiceContract", version: 1,
    principal: text(input.principal, "principal"), venue: text(input.venue, "venue"),
    accountReference: text(input.accountReference, "account-reference"),
    capital: { amount: capital, currency: text(input.capital.currency, "capital-currency") },
    risk: { maximumLossAmount: maximumLoss, maximumOrderNotional, maximumAggregateNotional, concentrationLimit,
      leverageLimit: amount(input.risk.leverageLimit ?? 1, "leverage-limit"), shorting: Boolean(input.risk.shorting), options: Boolean(input.risk.options) },
    scopes: [...new Set((input.scopes ?? []).map(String))].sort(),
    validUntil: text(input.validUntil, "valid-until"), revocable: true,
    ...(input.acceptanceReference ? { acceptanceReference: text(input.acceptanceReference, "acceptance-reference") } : {}),
    consideration: input.sponsored === true ? { kind: "sponsored-first-customer", charged: false, referencePrices: NORMAL_MARKET_PRICES }
      : { kind: "market-priced", charged: true, referencePrices: NORMAL_MARKET_PRICES },
  };
  if (body.scopes.length === 0 || !Number.isFinite(Date.parse(body.validUntil))) throw new TypeError("contract-scope-or-expiry-invalid");
  return Object.freeze(identify(body));
}

export function grantBrokerageAuthority({ contract, adapter, credentialReference, scopes, validUntil }) {
  refuseCredentials({ contract, adapter, credentialReference, scopes, validUntil });
  if (contract?.type !== "PrincipalBrokerageServiceContract" || contract.revocable !== true) throw new TypeError("principal-contract-required");
  const granted = [...new Set((scopes ?? []).map(String))].sort();
  if (granted.length === 0 || granted.some((scope) => !contract.scopes.includes(scope))) throw new TypeError("authority-scope-widening-refused");
  if (!Number.isFinite(Date.parse(validUntil)) || Date.parse(validUntil) > Date.parse(contract.validUntil)) throw new TypeError("authority-expiry-widening-refused");
  return Object.freeze(identify({ type: "RevocableBrokerageAuthorityGrant", version: 1, principalContract: contract.id,
    principal: contract.principal, venue: contract.venue, accountReference: contract.accountReference, adapter: text(adapter, "adapter"),
    credentialReference: text(credentialReference, "credential-reference"), scopes: granted, validUntil, revoked: false,
    rule: "opaque reference crosses; credential bytes remain inside authority custody and venue adapter" }));
}

export function revokeBrokerageAuthority(grant, revokedAt, reason) {
  if (grant?.type !== "RevocableBrokerageAuthorityGrant") throw new TypeError("authority-grant-required");
  return Object.freeze(identify({ type: "BrokerageAuthorityRevocation", version: 1, grant: grant.id,
    revokedAt: text(revokedAt, "revoked-at"), reason: text(reason, "reason"), effective: true }));
}

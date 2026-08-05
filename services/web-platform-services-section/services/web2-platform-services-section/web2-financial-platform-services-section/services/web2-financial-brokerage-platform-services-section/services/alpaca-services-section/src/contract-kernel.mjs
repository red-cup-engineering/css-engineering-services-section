import { relationalId } from "./relational-id.mjs";

const digest = (objectKind, value) => relationalId(value, { objectKind });
const positive = (value, label) => { const number = Number(value); if (!Number.isFinite(number) || number <= 0) throw new TypeError(`${label}-must-be-positive`); return number; };
const nonnegative = (value, label) => { const number = Number(value); if (!Number.isFinite(number) || number < 0) throw new TypeError(`${label}-must-be-nonnegative`); return number; };
const text = (value, label) => { if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label}-required`); return value; };
const credentialKeys = new Set(["apikey", "apisecret", "secret", "accesstoken", "refreshtoken", "privatekey", "mnemonic"]);

function containsCredential(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  for (const [key, member] of Object.entries(value)) {
    if (credentialKeys.has(key.toLowerCase().replaceAll(/[^a-z]/gu, ""))) return true;
    if (containsCredential(member, seen)) return true;
  }
  return false;
}

function assertNonCredential(value) {
  if (containsCredential(value)) throw new TypeError("credential-bearing-crossing-refused");
}

export const BROKERAGE_CONTROL_PRODUCT_CLASS = Object.freeze({
  id: "brokerage-control-api-market",
  outcome: "Customer-funded metered compute coordinates customer-authorized brokerage services through independently priced and witnessed providers.",
  enterpriseRoles: [
    "principal-mandate-registry", "compute-payment-treasury", "venue-adapter-market",
    "account-evidence-reconciliation-market", "issuer-research-media-market",
    "aggressive-portfolio-intent-market", "execution-transport-market", "independent-books-witness",
    "coinbase-x402-bazaar-border", "virtuals-border", "union-market-border",
  ],
  venueAdapters: ["alpaca-connect", "alpaca-broker"],
});

export function formPrincipalMandate(input) {
  assertNonCredential(input);
  const capitalAmount = positive(input?.capital?.amount, "capital-amount");
  const maximumLoss = positive(input?.risk?.maximumLossAmount, "maximum-loss");
  if (maximumLoss > capitalAmount) throw new RangeError("maximum-loss-exceeds-capital");
  const maximumOrderNotional = positive(input?.risk?.maximumOrderNotional, "maximum-order-notional");
  const maximumAggregateNotional = positive(input?.risk?.maximumAggregateNotional, "maximum-aggregate-notional");
  if (maximumOrderNotional > maximumAggregateNotional) throw new RangeError("order-limit-exceeds-aggregate-limit");
  const mandate = {
    type: "PrincipalBrokerageMandate", principal: text(input.principal, "principal"),
    venue: text(input.venue, "venue"), accountReference: text(input.accountReference, "account-reference"),
    capital: { amount: capitalAmount, currency: text(input.capital.currency, "capital-currency") },
    risk: {
      maximumLossAmount: maximumLoss, maximumOrderNotional, maximumAggregateNotional,
      concentrationLimit: positive(input.risk.concentrationLimit, "concentration-limit"),
      leverageLimit: nonnegative(input.risk.leverageLimit ?? 1, "leverage-limit"),
      shorting: Boolean(input.risk.shorting), options: Boolean(input.risk.options),
    },
    scopes: [...new Set((input.scopes ?? []).map(String))].sort(),
    validUntil: text(input.validUntil, "valid-until"), revocable: true,
  };
  if (mandate.risk.concentrationLimit > 1) throw new RangeError("concentration-limit-exceeds-one");
  if (mandate.scopes.length === 0) throw new TypeError("at-least-one-scope-required");
  return Object.freeze({ id: digest("brokerage-control.principal-mandate", mandate), ...mandate });
}

export function formWalletRoleGrant(input) {
  assertNonCredential(input);
  const role = text(input?.role, "wallet-role");
  if (!["compute-payment", "brokerage-funding", "provider-revenue"].includes(role)) throw new TypeError("unknown-wallet-role");
  const grant = {
    type: "WalletRoleGrant", controller: text(input.controller, "wallet-controller"),
    wallet: text(input.wallet, "wallet"), role,
    network: text(input.network, "wallet-network"), asset: text(input.asset, "wallet-asset"),
    maximumTotalSpend: nonnegative(input.maximumTotalSpend ?? 0, "maximum-total-spend"),
    maximumPerRequest: nonnegative(input.maximumPerRequest ?? 0, "maximum-per-request"),
    validUntil: text(input.validUntil, "valid-until"), revocable: true,
  };
  if (role !== "compute-payment" && (grant.maximumTotalSpend !== 0 || grant.maximumPerRequest !== 0)) throw new TypeError("spend-authority-only-valid-for-compute-payment-wallet");
  return Object.freeze({ id: digest("brokerage-control.wallet-role-grant", grant), ...grant });
}

export function admitMeteredComputePurchase({ walletGrant, quote, alreadySpent = 0 }) {
  assertNonCredential({ walletGrant, quote });
  if (walletGrant?.role !== "compute-payment") throw new TypeError("compute-payment-wallet-grant-required");
  const amount = positive(quote?.price?.amount, "quote-price");
  if (quote.price.asset !== walletGrant.asset || quote.network !== walletGrant.network) throw new TypeError("quote-wallet-rail-mismatch");
  if (amount > walletGrant.maximumPerRequest || amount + nonnegative(alreadySpent, "already-spent") > walletGrant.maximumTotalSpend) throw new RangeError("compute-payment-budget-exceeded");
  const authorization = { type: "MeteredComputePaymentAuthorization", walletGrant: walletGrant.id, provider: text(quote.provider, "quote-provider"), service: text(quote.service, "quote-service"), amount, asset: quote.price.asset, network: quote.network, quoteDigest: digest("brokerage-control.metered-compute-quote", quote), effect: "authorize-one-payment-payload; no key custody" };
  return Object.freeze({ id: digest("brokerage-control.metered-compute-payment-authorization", authorization), ...authorization });
}

export function formAggressiveOrderIntent({ mandate, evidence, symbol, side, notional, maximumLoss, thesis, falsifier, liquidityPremise, executionPremise }) {
  assertNonCredential({ mandate, evidence });
  if (!mandate?.id || mandate.type !== "PrincipalBrokerageMandate") throw new TypeError("principal-mandate-required");
  if (!mandate.scopes.includes("orders:intent")) throw new TypeError("order-intent-scope-refused");
  if (!Array.isArray(evidence) || evidence.length === 0 || evidence.some((source) => !source?.uri || !source?.observedAt || !source?.digest)) throw new TypeError("dated-content-addressed-evidence-required");
  const orderNotional = positive(notional, "notional"), loss = positive(maximumLoss, "maximum-loss");
  if (orderNotional > mandate.risk.maximumOrderNotional || loss > mandate.risk.maximumLossAmount) throw new RangeError("mandate-risk-boundary-exceeded");
  const concentration = orderNotional / mandate.capital.amount;
  if (concentration > mandate.risk.concentrationLimit) throw new RangeError("mandate-concentration-boundary-exceeded");
  const intent = { type: "AggressiveBrokerageOrderIntent", mandate: mandate.id, effect: "intent-only", symbol: text(symbol, "symbol").toUpperCase(), side: side === "sell" ? "sell" : "buy", notional: orderNotional, currency: mandate.capital.currency, maximumLoss: loss, concentration, thesis: text(thesis, "thesis"), falsifier: text(falsifier, "falsifier"), liquidityPremise: text(liquidityPremise, "liquidity-premise"), executionPremise: text(executionPremise, "execution-premise"), evidenceDigest: digest("brokerage-control.order-evidence-bundle", evidence) };
  return Object.freeze({ id: digest("brokerage-control.aggressive-order-intent", intent), ...intent });
}

export function admitVenueOperation({ mandate, authorityGrant, operation }) {
  assertNonCredential({ mandate, authorityGrant, operation });
  if (authorityGrant?.mandate !== mandate?.id || authorityGrant?.revoked === true) throw new TypeError("current-mandate-authority-grant-required");
  if (!BROKERAGE_CONTROL_PRODUCT_CLASS.venueAdapters.includes(authorityGrant.adapter)) throw new TypeError("unsupported-venue-adapter");
  const requiredScope = operation?.kind === "read-account" ? "account:read" : operation?.kind === "place-order" ? "orders:live" : null;
  if (!requiredScope || !mandate.scopes.includes(requiredScope) || !authorityGrant.scopes?.includes(requiredScope)) throw new TypeError("venue-operation-scope-refused");
  if (operation.kind === "place-order") {
    const notional = positive(operation.notional, "operation-notional");
    if (notional > mandate.risk.maximumOrderNotional) throw new RangeError("live-order-notional-exceeds-mandate");
  }
  const admission = { type: "VenueOperationAdmission", mandate: mandate.id, authorityGrant: authorityGrant.id, adapter: authorityGrant.adapter, operationDigest: digest("brokerage-control.venue-operation", operation), credentialReference: text(authorityGrant.credentialReference, "credential-reference"), rule: "reference crosses; credential bytes remain inside venue adapter" };
  return Object.freeze({ id: digest("brokerage-control.venue-operation-admission", admission), ...admission });
}

export function x402DiscoveryOffer({ service, provider, price, network, inputSchema, outputSchema }) {
  const offer = { type: "PaidBrokerageApiOffer", service: text(service, "service"), provider: text(provider, "provider"), accepts: { scheme: "exact", price: text(price, "price"), network: text(network, "network"), payTo: "runtime-required" }, extensions: { bazaar: { discoverable: true, inputSchema, outputSchema } }, indexingClaim: "none-until-successful-CDP-settlement", settlementEvidenceRequired: true };
  return Object.freeze({ id: digest("brokerage-control.paid-api-offer", offer), ...offer });
}

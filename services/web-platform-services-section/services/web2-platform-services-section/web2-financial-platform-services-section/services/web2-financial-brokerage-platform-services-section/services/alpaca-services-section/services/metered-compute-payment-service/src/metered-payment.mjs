import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

const semanticId = (value) => identifyJsonSemanticContent({ objectKind: "brokerage.metered-compute-payment.record", value, witnessRoot: EMPTY_WITNESS_ROOT }).id;
const canonical = (value) => value === null || typeof value !== "object" ? JSON.stringify(value) : Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
const identified = (body) => ({ id: semanticId(body), ...body });
const positive = (value, label) => { const n = Number(value); if (!Number.isFinite(n) || n <= 0) throw new TypeError(`${label}-must-be-positive`); return n; };

export function quoteMeteredCompute({ service, provider, amount, asset = "USDC", network = "eip155:8453", payTo, meter }) {
  const body = { type: "MeteredComputeQuote", version: 1, service: String(service), provider: String(provider),
    price: { amount: positive(amount, "quote-amount"), asset: String(asset) }, network: String(network), payTo: String(payTo),
    meter: Object.freeze({ ...meter }), singleUse: true };
  if (!body.payTo) throw new TypeError("quote-payment-invalid");
  return Object.freeze(identified(body));
}

export async function settleMeteredCompute({ walletGrant, quote, paymentPayload, verifyAndSettle, now = new Date().toISOString() }) {
  if (walletGrant?.role !== "compute-payment") throw new TypeError("compute-payment-wallet-grant-required");
  if (quote?.type !== "MeteredComputeQuote" || quote.singleUse !== true) throw new TypeError("single-use-quote-required");
  if (walletGrant.asset !== quote.price.asset || walletGrant.network !== quote.network
    || quote.price.amount > walletGrant.maximumPerRequest || quote.price.amount > walletGrant.maximumTotalSpend) throw new RangeError("wallet-grant-budget-refused");
  if (typeof verifyAndSettle !== "function") throw new TypeError("settlement-verifier-required");
  const receipt = await verifyAndSettle({ quote, paymentPayload });
  if (receipt?.success !== true || receipt.quote !== quote.id || receipt.amount !== quote.price.amount
    || receipt.asset !== quote.price.asset || receipt.network !== quote.network || !receipt.transaction) throw new TypeError("settlement-receipt-invalid");
  return Object.freeze(identified({ type: "MeteredComputeSettlementReceipt", version: 1, quote: quote.id,
    walletGrant: walletGrant.id, service: quote.service, provider: quote.provider, amount: receipt.amount,
    asset: receipt.asset, network: receipt.network, transaction: receipt.transaction, settledAt: receipt.settledAt ?? now,
    keyCustody: false, brokerageFundingAuthority: false, providerRevenueOwnership: false }));
}

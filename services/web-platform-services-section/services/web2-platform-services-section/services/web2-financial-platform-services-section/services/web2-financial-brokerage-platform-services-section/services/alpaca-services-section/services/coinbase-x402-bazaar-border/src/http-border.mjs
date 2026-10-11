import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";
const canonical = (v) => v === null || typeof v !== "object" ? JSON.stringify(v) : Array.isArray(v) ? `[${v.map(canonical).join(",")}]` : `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
const id = (value) => identifyJsonSemanticContent({ objectKind: "brokerage-control.http-record", value, witnessRoot: EMPTY_WITNESS_ROOT }).token;
const CREDENTIAL = /^(authorization|api[-_]?key|api[-_]?secret|secret|token|access[-_]?token|refresh[-_]?token|private[-_]?key|password)$/iu;
function rejectCredentials(value, seen = new Set()) { if (!value || typeof value !== "object" || seen.has(value)) return; seen.add(value); for (const [key, member] of Object.entries(value)) { if (CREDENTIAL.test(key)) throw new TypeError("credential-bearing-commercial-request-refused"); rejectCredentials(member, seen); } }
export const assertNoCommercialCredentials = rejectCredentials;
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64");
const json = (status, body, headers = {}) => ({ status, headers: { "content-type": "application/json", ...headers }, body });

export const PRODUCT_OFFERS = Object.freeze({
  "/v1/issuer-evidence": { service: "issuer-evidence-packet", amount: "0.25", description: "Dated source-grounded issuer evidence packet" },
  "/v1/aggressive-alpha": { service: "aggressive-alpha-research-packet", amount: "1.00", description: "Evidence/falsifier/liquidity/execution-aware aggressive alpha packet" },
  "/v1/strategies/blk-topological-accumulation": { service: "obsmetrologia-blk-topological-accumulation", amount: "3.00", description: "BLK-versus-SPY topological evidence charge and long-only fractional accumulation intent" },
  "/v1/paper-intent": { service: "paper-portfolio-and-order-intents", amount: "2.00", description: "Mandate-bound paper portfolio and typed order intent" },
  "/v1/reconcile": { service: "account-normalization-and-reconciliation", amount: "0.50", description: "Customer-supplied Alpaca statement normalization and reconciliation" },
  "/v1/alpaca/read": { service: "venue-adapter-read", amount: "0.01", description: "Authorized Principal-owned Alpaca account read" },
  "/v1/alpaca/execute": { service: "execution-transport", amount: "0.02", description: "Trusted mandate-bound order intent execution transport" },
  "/v1/strategies/synthesize": { service: "strategy-program-synthesis", amount: "15.00", description: "Provider-distinct statically assayed strategy program candidates" },
});

export function createX402BrokerageBorder({ network = "eip155:8453", asset = "USDC", payTo, facilitator, verifyAndSettle, providers }) {
  if (!payTo || !facilitator || typeof verifyAndSettle !== "function") throw new TypeError("x402-border-configuration-invalid");
  return async function handle({ method = "POST", path, headers = {}, body = {} }) {
    if (method !== "POST" || !PRODUCT_OFFERS[path]) return json(404, { error: "product-not-found" });
    try { rejectCredentials(body); } catch (error) { return json(422, { error: error.message }); }
    const offer = PRODUCT_OFFERS[path], requirement = { x402Version: 2, scheme: "exact", network, asset, amount: offer.amount, payTo,
      resource: { url: path, description: offer.description, mimeType: "application/json" },
      extensions: { bazaar: { info: { input: { type: "http", method: "POST", bodyType: "json" }, output: { type: "json" } } } } };
    const payment = headers["payment-signature"] ?? headers["PAYMENT-SIGNATURE"];
    if (!payment) return json(402, { error: "payment-required", service: offer.service }, { "payment-required": b64({ accepts: [requirement] }) });
    let settlement; try { settlement = await verifyAndSettle({ payment, requirement, facilitator }); } catch (error) { return json(402, { error: "payment-refused", reason: error.message }, { "payment-required": b64({ accepts: [requirement] }) }); }
    if (settlement?.success !== true || !settlement.transaction) return json(402, { error: "payment-refused" }, { "payment-required": b64({ accepts: [requirement] }) });
    const provider = providers?.[offer.service]; if (typeof provider !== "function") return json(503, { error: "product-provider-unavailable", settlement: settlement.transaction });
    try {
      const output = await provider(body);
      const receipt = { type: "X402BrokerageProductDeliveryReceipt", version: 1, service: offer.service, price: offer.amount, asset, network,
        transaction: settlement.transaction, facilitator, deliveredOutput: output?.id ?? id(output), bazaarCatalogEligible: true,
        bazaarIndexedClaim: false, settledAt: settlement.settledAt ?? new Date().toISOString() };
      return json(200, { output, receipt: { id: id(receipt), ...receipt } }, { "payment-response": b64(settlement) });
    } catch (error) { return json(422, { error: "product-refused", reason: error.message, settlement: settlement.transaction }); }
  };
}

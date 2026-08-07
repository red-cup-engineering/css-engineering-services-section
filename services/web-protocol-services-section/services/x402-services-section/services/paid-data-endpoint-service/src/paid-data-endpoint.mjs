import { createHash } from "node:crypto";

import { createPricedCapabilityBoundary } from "@red-cup-engineering/x402-services-section/src/priced-capability-boundary.mjs";

const OPERATIONS = new Set(["read-data", "write-data", "trade-data-rights"]);

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function decodePaymentHeader(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 65_536) {
    throw new TypeError("one bounded x402 payment-signature header is required");
  }
  try {
    return JSON.parse(Buffer.from(value, "base64").toString("utf8"));
  } catch (error) {
    throw new TypeError("payment-signature is not an x402 JSON payload", { cause: error });
  }
}

export function x402InvocationIdentity(value) {
  const payload = typeof value === "string" ? decodePaymentHeader(value) : value;
  if (payload?.x402Version !== 2) throw new TypeError("one x402 v2 payment payload is required");
  return `sha256:${createHash("sha256").update(canonical(payload)).digest("hex")}`;
}

export function exactSettlementEvidence(context) {
  const result = context?.result;
  const payload = context?.paymentPayload;
  if (result?.success !== true) throw new TypeError("successful x402 settlement is required");
  if (!/^0x[0-9a-fA-F]{64}$/u.test(result.transaction ?? "")) {
    throw new TypeError("settlement transaction must be one EVM transaction hash");
  }
  if (!/^eip155:[1-9][0-9]*$/u.test(result.network ?? "")) {
    throw new TypeError("settlement network must be one EVM CAIP-2 identifier");
  }
  const amount = String(payload?.accepted?.amount ?? result.amount ?? "");
  if (!/^(?:0|[1-9][0-9]*)$/u.test(amount)) {
    throw new TypeError("settlement amount must be canonical atomic units");
  }
  if (result.amount !== undefined && String(result.amount) !== amount) {
    throw new TypeError("settlement amount disagrees with signed x402 payment");
  }
  return Object.freeze({
    type: "X402SettlementEvidence",
    invocation: x402InvocationIdentity(payload),
    success: true,
    network: result.network,
    transaction: result.transaction.toLowerCase(),
    payer: /^0x[0-9a-fA-F]{40}$/u.test(result.payer ?? "") ? result.payer.toLowerCase() : null,
    amount,
  });
}

/**
 * Form exactly one autonomous priced endpoint actor. A deployment chooses one
 * operation, one price, one durable append capability, and one endpoint effect.
 * Read, write, and rights-trade actors therefore remain separately addressable
 * and independently priced while sharing the same x402 causal law.
 */
export function createPaidDataEndpointActor({
  operation,
  basePath,
  offer,
  priceTerms,
  admit,
  append,
  execute,
  recoveredRecords,
  facilitatorUrl,
  facilitatorClient,
  paymentBoundaryFactory,
  paymentIdentity = x402InvocationIdentity,
  settlementProjection = exactSettlementEvidence,
} = {}) {
  if (!OPERATIONS.has(operation)) {
    throw new TypeError("operation must be read-data, write-data, or trade-data-rights");
  }
  if (typeof basePath !== "string" || !/^\/\S+$/u.test(basePath)) {
    throw new TypeError("basePath must be one absolute HTTP path");
  }
  return createPricedCapabilityBoundary({
    operation,
    resourcePath: `${basePath}/invoke`,
    offerPath: `${basePath}/offer`,
    resultPath: `${basePath}/result`,
    offer,
    priceTerms,
    admit,
    append,
    execute,
    recoveredRecords,
    facilitatorUrl,
    facilitatorClient,
    paymentBoundaryFactory,
    paymentIdentity,
    settlementProjection,
    createIntent: ({ invocation, request }) => ({
      type: "PaidDataEndpointIntent",
      invocation,
      operation,
      request,
    }),
    createReceipt: ({ invocation, settlement, result }) => ({
      type: "PaidDataEndpointReceipt",
      invocation,
      operation,
      settlement,
      result,
    }),
    createRefusal: ({ invocation, settlement, error }) => ({
      type: "PaidDataEndpointRefusal",
      invocation,
      operation,
      settlement,
      refusal: {
        type: "PaidDataEndpointExecutionRefusal",
        reason: error instanceof Error ? error.message : String(error),
      },
    }),
  });
}

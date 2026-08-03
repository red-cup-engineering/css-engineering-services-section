import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { decodePaymentSignatureHeader } from "@x402/core/http";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { BatchSettlementEvmScheme } from "@x402/evm/batch-settlement/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
export { declareDiscoveryExtension } from "@x402/extensions/bazaar";

/** Identify one exact x402 payment payload consistently at HTTP and hook faces. */
export function x402PaymentIdentity(value) {
  const payload = typeof value === "string" ? decodePaymentSignatureHeader(value) : value;
  if (payload?.x402Version !== 2) throw new TypeError("one x402 v2 payment payload is required");
  return identifyJsonSemanticContent({ objectKind: "x402.payment-payload", value: payload, witnessRoot: EMPTY_WITNESS_ROOT }).token;
}

/**
 * Project the official library's read-only settlement context into the small,
 * prototype-free value carried across durable RMN boundaries.  Library return
 * objects are protocol adapters, not persistent application state.
 */
export function x402SettlementEvidence(context) {
  const result = context?.result;
  if (result?.success !== true) throw new TypeError("one successful x402 settlement result is required");
  if (typeof result.transaction !== "string" || !/^0x[0-9a-fA-F]{64}$/u.test(result.transaction)) {
    throw new TypeError("x402 settlement transaction must be one EVM transaction hash");
  }
  const network = evmNetwork(result.network);
  const payer = typeof result.payer === "string" && /^0x[0-9a-fA-F]{40}$/u.test(result.payer)
    ? result.payer.toLowerCase()
    : null;
  const amount = result.amount === undefined ? null : String(result.amount);
  if (amount !== null && !/^(?:0|[1-9][0-9]*)$/u.test(amount)) {
    throw new TypeError("x402 settlement amount must be canonical atomic units");
  }
  return Object.freeze({
    type: "X402SettlementEvidence",
    invocation: x402PaymentIdentity(context.paymentPayload),
    success: true,
    network,
    transaction: result.transaction.toLowerCase(),
    payer,
    amount,
  });
}

function evmNetwork(value) {
  if (!/^eip155:[1-9][0-9]*$/u.test(value ?? "")) {
    throw new TypeError("x402 network must be one explicit EVM CAIP-2 identifier");
  }
  return value;
}

function routeSet(value, scheme) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length === 0) {
    throw new TypeError("x402 routes must be one nonempty official route configuration");
  }
  for (const [route, configuration] of Object.entries(value)) {
    if (!/^(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) \/\S*$/u.test(route)) throw new TypeError(`invalid x402 route ${route}`);
    const accepts = Array.isArray(configuration?.accepts) ? configuration.accepts : [configuration?.accepts];
    if (accepts.length === 0 || accepts.some((entry) => entry?.scheme !== scheme)) {
      throw new TypeError(`${route} must use the official x402 ${scheme} scheme`);
    }
  }
  return value;
}

/**
 * Procure an official x402 v2 exact-EVM resource boundary. The customer owns
 * the protected operation and its books; this provider owns only the public
 * protocol projection. Settlement remains with the explicitly hired
 * facilitator and never becomes an ambient Union ledger.
 */
export function createExactEvmPaymentBoundary({
  network,
  routes,
  facilitatorUrl,
  facilitatorClient,
  afterSettle,
}) {
  const selectedNetwork = evmNetwork(network);
  if (facilitatorClient === undefined && (typeof facilitatorUrl !== "string" || !/^https?:\/\//u.test(facilitatorUrl))) {
    throw new TypeError("x402 facilitatorUrl is required when no contracted facilitator client is supplied");
  }
  const facilitator = facilitatorClient ?? new HTTPFacilitatorClient({ url: facilitatorUrl });
  const resourceServer = new x402ResourceServer(facilitator).register(selectedNetwork, new ExactEvmScheme());
  if (afterSettle !== undefined) resourceServer.onAfterSettle(afterSettle);
  return Object.freeze({
    network: selectedNetwork,
    resourceServer,
    middleware: paymentMiddleware(routeSet(routes, "exact"), resourceServer),
  });
}

/** Procure the official cumulative-voucher batch-settlement boundary. */
export function createBatchEvmPaymentBoundary({
  network,
  receiver,
  routes,
  storage,
  facilitatorUrl,
  facilitatorClient,
  receiverAuthorizerSigner,
  withdrawDelay,
  afterSettle,
}) {
  const selectedNetwork = evmNetwork(network);
  if (!/^0x[0-9a-fA-F]{40}$/u.test(receiver ?? "")) throw new TypeError("batch receiver must be one EVM smart-account address");
  if (storage === undefined) throw new TypeError("batch settlement requires explicit sovereign channel storage");
  if (facilitatorClient === undefined && (typeof facilitatorUrl !== "string" || !/^https?:\/\//u.test(facilitatorUrl))) {
    throw new TypeError("x402 facilitatorUrl is required when no contracted facilitator client is supplied");
  }
  const facilitator = facilitatorClient ?? new HTTPFacilitatorClient({ url: facilitatorUrl });
  const scheme = new BatchSettlementEvmScheme(receiver, {
    storage,
    ...(receiverAuthorizerSigner === undefined ? {} : { receiverAuthorizerSigner }),
    ...(withdrawDelay === undefined ? {} : { withdrawDelay }),
  });
  const resourceServer = new x402ResourceServer(facilitator).register(selectedNetwork, scheme);
  if (afterSettle !== undefined) resourceServer.onAfterSettle(afterSettle);
  return Object.freeze({
    network: selectedNetwork,
    scheme,
    resourceServer,
    middleware: paymentMiddleware(routeSet(routes, "batch-settlement"), resourceServer),
  });
}

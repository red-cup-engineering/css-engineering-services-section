import { createHash } from "node:crypto";
import {
  admitPublicHttpsUrl,
} from "@red-cup-engineering/public-https-url-admission-service";

import { decodePaymentRequiredHeader } from "@x402/core/http";
import { validatePaymentRequired } from "@x402/core/schemas";
import {
  isValidRouteTemplate,
  sanitizeResourceServiceMetadata,
  validateAndExtract,
  validateDiscoveryExtensionSpec,
} from "@x402/extensions/bazaar";
import { extractOffersFromPaymentRequired } from "@x402/extensions";

const PROFILE = "org.emsenn.x402.public-resource-observation.v1";
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
const EVM_NETWORK = /^eip155:[1-9][0-9]*$/u;
const UINT = /^(?:0|[1-9][0-9]*)$/u;
const SUPPORTED_METHODS = new Set(["GET", "HEAD"]);
const SUPPORTED_SCHEMES = new Set(["exact", "batch-settlement"]);

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function ni(value) {
  const bytes = JSON.stringify(stableValue(value));
  return `ni:///sha-256;${createHash("sha256").update(bytes).digest("base64url")}`;
}

export function publicHttpsUrl(value, label = "URL") {
  return admitPublicHttpsUrl(value, label);
}

function selectedMethod(value) {
  const method = typeof value === "string" ? value.toUpperCase() : "";
  if (!SUPPORTED_METHODS.has(method)) throw new TypeError("x402 observation method must be GET or HEAD");
  return method;
}

function timeout(value) {
  if (!Number.isSafeInteger(value) || value < 250 || value > 30_000) {
    throw new TypeError("x402 observation timeoutMs must be an integer from 250 through 30000");
  }
  return value;
}

function validateAcceptance(entry, index) {
  if (!SUPPORTED_SCHEMES.has(entry.scheme)) throw new TypeError(`accepts[${index}] uses an unsupported scheme`);
  if (!EVM_NETWORK.test(entry.network)) throw new TypeError(`accepts[${index}] must name one EVM CAIP-2 network`);
  if (!UINT.test(entry.amount) || entry.amount.length > 78 || BigInt(entry.amount) === 0n) {
    throw new TypeError(`accepts[${index}] amount must be one positive uint256 decimal string`);
  }
  if (entry.asset !== "native" && !EVM_ADDRESS.test(entry.asset)) {
    throw new TypeError(`accepts[${index}] asset must be native or one EVM contract address`);
  }
  if (!EVM_ADDRESS.test(entry.payTo)) throw new TypeError(`accepts[${index}] payTo must be one public EVM address`);
  if (!Number.isSafeInteger(entry.maxTimeoutSeconds) || entry.maxTimeoutSeconds <= 0) {
    throw new TypeError(`accepts[${index}] maxTimeoutSeconds must be a positive integer`);
  }
  return Object.freeze({
    ...entry,
    asset: entry.asset === "native" ? "native" : entry.asset.toLowerCase(),
    payTo: entry.payTo.toLowerCase(),
  });
}

function inspectBazaar(extensions, method) {
  const extension = extensions?.bazaar;
  if (extension === undefined) return Object.freeze({ present: false });
  if (extension === null || typeof extension !== "object" || Array.isArray(extension)) {
    throw new TypeError("x402 Bazaar extension is malformed");
  }
  const spec = validateDiscoveryExtensionSpec(extension);
  if (!spec.valid) throw new TypeError(`x402 Bazaar extension violates the protocol: ${spec.errors?.join("; ")}`);
  const extracted = validateAndExtract(extension);
  if (!extracted.valid || extracted.info === undefined) {
    throw new TypeError(`x402 Bazaar extension violates its schema: ${extracted.errors?.join("; ")}`);
  }
  if (extracted.info.input.type !== "http") throw new TypeError("x402 HTTP observation refuses a non-HTTP Bazaar entry");
  if (extracted.info.input.method !== method) throw new TypeError("x402 Bazaar method does not match the observed request");
  if (extension.routeTemplate !== undefined && !isValidRouteTemplate(extension.routeTemplate)) {
    throw new TypeError("x402 Bazaar routeTemplate is invalid");
  }
  return Object.freeze({
    present: true,
    info: stableValue(extracted.info),
    ...(extension.routeTemplate === undefined ? {} : { routeTemplate: extension.routeTemplate }),
  });
}

/**
 * Observe one public x402 v2 resource without providing payment credentials or
 * attempting verification, settlement, signing, or resource access.
 */
export async function observeX402Resource({
  resourceUrl,
  method = "GET",
  fetchImpl = globalThis.fetch,
  timeoutMs = 10_000,
  signal,
} = {}) {
  const url = publicHttpsUrl(resourceUrl, "x402 resourceUrl");
  const verb = selectedMethod(method);
  const boundedTimeout = timeout(timeoutMs);
  if (typeof fetchImpl !== "function") throw new TypeError("x402 observation requires one fetch implementation");
  const timeoutSignal = AbortSignal.timeout(boundedTimeout);
  const requestSignal = signal === undefined ? timeoutSignal : AbortSignal.any([signal, timeoutSignal]);
  const response = await fetchImpl(url, {
    method: verb,
    headers: { accept: "application/json" },
    redirect: "manual",
    signal: requestSignal,
  });
  if (response.redirected || (response.status >= 300 && response.status < 400)) {
    throw new Error("x402 observation refuses redirects");
  }
  if (response.status !== 402) throw new Error(`x402 resource returned HTTP ${response.status}, not 402`);
  const header = response.headers.get("payment-required");
  if (header === null || header.length === 0 || header.length > 65_536) {
    throw new Error("x402 resource did not return one bounded payment-required header");
  }
  let decoded;
  try { decoded = decodePaymentRequiredHeader(header); } catch (error) {
    throw new Error(`x402 payment-required header could not be decoded: ${error instanceof Error ? error.message : String(error)}`);
  }
  let paymentRequired;
  try { paymentRequired = validatePaymentRequired(decoded); } catch (error) {
    throw new Error(`x402 payment-required value violates the official schema: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (paymentRequired.x402Version !== 2) throw new TypeError("x402 observation refuses legacy v1 challenges");
  const declaredUrl = publicHttpsUrl(paymentRequired.resource.url, "x402 declared resource URL");
  if (declaredUrl !== url) throw new TypeError("x402 declared resource URL does not match the observed URL");
  if (paymentRequired.accepts.length === 0 || paymentRequired.accepts.length > 32) {
    throw new TypeError("x402 challenge must contain from one through 32 payment alternatives");
  }
  const accepts = paymentRequired.accepts.map(validateAcceptance);
  const normalized = stableValue({ ...paymentRequired, accepts });
  const bazaar = inspectBazaar(normalized.extensions, verb);
  let signedOffers;
  try { signedOffers = stableValue(extractOffersFromPaymentRequired(normalized)); } catch (error) {
    throw new TypeError(`x402 signed-offer extension is malformed: ${error instanceof Error ? error.message : String(error)}`);
  }
  const catalogResource = stableValue({
    url,
    ...(normalized.resource.description === undefined ? {} : { description: normalized.resource.description }),
    ...(normalized.resource.mimeType === undefined ? {} : { mimeType: normalized.resource.mimeType }),
    ...sanitizeResourceServiceMetadata(normalized.resource),
  });
  const observationDigest = ni({ method: verb, paymentRequired: normalized });
  return Object.freeze({
    profile: PROFILE,
    method: verb,
    resourceUrl: url,
    transport: Object.freeze({
      status: 402,
      redirected: false,
      paymentRequiredHeaderDigest: ni(header),
    }),
    paymentRequired: normalized,
    catalogResource,
    bazaar,
    signedOffers,
    signedOfferSignatureVerification: "not-performed",
    observationDigest,
    authority: Object.freeze({
      publicReadOnly: true,
      paymentAttempted: false,
      signingAttempted: false,
      settlementAttempted: false,
      resourceBodyConsumed: false,
    }),
  });
}

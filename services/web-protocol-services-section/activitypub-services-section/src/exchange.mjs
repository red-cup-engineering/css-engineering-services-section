import { createHash } from "node:crypto";

export const ACTIVITYPUB_ACCEPT = "application/activity+json, application/ld+json";
export const DEFAULT_BOUNDED_EXCHANGE_RESPONSE_BYTES = 16_384;

function httpsUrl(value, label) {
  if (typeof value !== "string") throw new TypeError(`${label} must be an HTTPS URL`);
  const parsed = new URL(value);
  if (parsed.protocol !== "https:") throw new TypeError(`${label} must be an HTTPS URL`);
  return parsed.href;
}

function boundedBody(text, maximumBytes) {
  const bytes = Buffer.from(text);
  const digest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (bytes.byteLength > maximumBytes) return Object.freeze({ digest, bytes: bytes.byteLength, truncated: true, prefix: bytes.subarray(0, Math.min(2048, bytes.byteLength)).toString("utf8") });
  try { return Object.freeze({ digest, bytes: bytes.byteLength, truncated: false, value: text ? JSON.parse(text) : null }); }
  catch { return Object.freeze({ digest, bytes: bytes.byteLength, truncated: false, value: text }); }
}

/**
 * One proof-path-bounded HTTPS exchange.  The caller supplies the exact actor
 * configuration and a credential resource resolver; this transport operation
 * never reads a process environment, mints authority, or interprets payloads.
 */
export async function exchangeBoundedActivityPubA2a(input, { credentialResource = async () => null, fetcher = fetch } = {}) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new TypeError("bounded exchange input must be an object");
  const protocol = input.protocol;
  if (protocol !== "activitypub" && protocol !== "a2a-jsonrpc") throw new TypeError("protocol must be activitypub or a2a-jsonrpc");
  const endpoint = httpsUrl(input.endpoint, "endpoint");
  if (input.body === null || typeof input.body !== "object" || Array.isArray(input.body)) throw new TypeError("body must be one JSON object");
  const maximumResponseBytes = input.maximumResponseBytes ?? DEFAULT_BOUNDED_EXCHANGE_RESPONSE_BYTES;
  if (!Number.isInteger(maximumResponseBytes) || maximumResponseBytes < 1024 || maximumResponseBytes > 65_536) throw new RangeError("maximumResponseBytes must be an integer from 1024 through 65536");
  const authentication = input.authentication ?? "public";
  const credential = await credentialResource(authentication);
  if (credential !== null && (typeof credential !== "object" || typeof credential.reference !== "string" || typeof credential.token !== "string")) throw new TypeError("credential resource must provide one reference and token");
  const headers = {
    accept: protocol === "activitypub" ? ACTIVITYPUB_ACCEPT : "application/json",
    "content-type": protocol === "activitypub" ? "application/activity+json" : "application/json",
  };
  if (credential?.token && authentication === "actuator-capability") headers["x-actuator-capability"] = credential.token;
  else if (credential?.token) headers.authorization = `Bearer ${credential.token}`;
  if (protocol === "a2a-jsonrpc") {
    headers["a2a-version"] = input.a2aVersion ?? "1.0";
    if (Array.isArray(input.extensions) && input.extensions.length) headers["a2a-extensions"] = input.extensions.join(", ");
  }
  const response = await fetcher(endpoint, { method: "POST", headers, body: JSON.stringify(input.body) });
  const text = await response.text();
  return Object.freeze({
    type: "BoundedActivityPubA2aExchange",
    version: 1,
    state: response.ok ? "exchanged" : response.status === 401 || response.status === 403 ? "authorization-required" : "provider-refused",
    protocol,
    endpoint,
    authentication: Object.freeze({ kind: authentication, credentialResource: credential?.reference ?? null }),
    status: response.status,
    contentType: response.headers.get("content-type"),
    response: boundedBody(text, maximumResponseBytes),
  });
}

/**
 * @module receipts
 * The deterministic content-identity pair (`identifyValue`/`digestValue`)
 * every receipt-shaped function in this section shares -- canonical
 * key-sorted JSON, sha-256, `ni:///sha-256;<base64url>` -- so callers of
 * youtube-services-section's `identify`/`digest` capabilities and this
 * section's own record-receipt.mjs compute the same id for the same value.
 */
import { createHash } from "node:crypto";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
}

/**
 * @param {unknown} value
 * @returns {string} deterministic key-sorted JSON
 */
export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

/**
 * @param {unknown} value
 * @returns {string} `ni:///sha-256;<base64url digest of canonicalJson(value)>`
 */
export function identifyValue(value) {
  return `ni:///sha-256;${createHash("sha256").update(Buffer.from(canonicalJson(value), "utf8")).digest("base64url")}`;
}

/**
 * @param {unknown} value
 * @returns {string} the hex sha-256 digest of `canonicalJson(value)`
 */
export function digestValue(value) {
  return createHash("sha256").update(Buffer.from(canonicalJson(value), "utf8")).digest("hex");
}

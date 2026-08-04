// ni-uri — builds and validates RFC 6920 ("Naming Things with Hashes")
// `ni:` content-identity URIs over a SHA-256 digest. The named-information
// scheme this module speaks is the narrow `ni:///sha-256;<base64url-digest>`
// form the WitnessJournal RDF projection service uses for graph and document
// identity; this package owns that construction and validation as a
// self-contained receiver-facing boundary.
import { createHash } from "node:crypto";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest();
}

const NI_PREFIX = "ni:///sha-256;";

// RFC 6920 base64url digests of a 32-byte SHA-256 hash are exactly 43
// characters without padding. The last character contains four digest bits
// and two zero pad bits, so only every fourth base64url character is canonical.
// Enforcing that final sextet prevents four different URI strings from naming
// the same digest bytes.
export const NI_URI_PATTERN = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u;

function fail(message) {
  const error = new Error(message);
  error.code = "invalid-ni-uri";
  throw error;
}

function byteString(value) {
  if (!(value instanceof Uint8Array)) {
    throw new TypeError("ni URI input must be a Uint8Array");
  }
  return Buffer.from(value);
}

function digestBytes(value) {
  if (typeof value !== "string" || !NI_URI_PATTERN.test(value)) return null;
  const encoded = value.slice(NI_PREFIX.length);
  const digest = Buffer.from(encoded, "base64url");
  return digest.length === 32 && digest.toString("base64url") === encoded
    ? digest
    : null;
}

// Build the `ni:` URI for the given bytes, digesting them with SHA-256 and
// base64url-encoding the result per RFC 6920.
export function makeNiUri(bytes) {
  const digest = sha256(byteString(bytes)).toString("base64url");
  return `${NI_PREFIX}${digest}`;
}

// Report whether a value is a well-formed sha-256 `ni:` URI.
export function isNiUri(value) {
  return digestBytes(value) !== null;
}

// Extract the base64url digest from a validated sha-256 `ni:` URI, throwing
// on anything that does not match the RFC 6920 sha-256 form.
export function niUriDigest(value) {
  if (digestBytes(value) === null) fail(`invalid sha-256 ni URI ${JSON.stringify(value)}`);
  return value.slice(NI_PREFIX.length);
}

// Recover the named 32-byte SHA-256 digest from a canonical URI.
export function niUriDigestBytes(value) {
  const digest = digestBytes(value);
  if (digest === null) fail(`invalid sha-256 ni URI ${JSON.stringify(value)}`);
  return Buffer.from(digest);
}

// Verify the complete receiver-facing relation: these exact bytes must hash
// to this exact canonical RFC 6920 name.
export function verifyNiUri(bytes, value) {
  if (!isNiUri(value)) return false;
  return makeNiUri(bytes) === value;
}

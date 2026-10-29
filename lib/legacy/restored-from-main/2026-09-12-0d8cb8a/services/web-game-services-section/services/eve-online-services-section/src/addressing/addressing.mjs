// Canonical JSON and content-addressing utilities. Generic: no EVE-specific
// knowledge, no imports from elsewhere in this repo (Web APIs -- crypto.subtle,
// TextEncoder -- only) so the eventual extraction into a standalone
// @red-cup-engineering/addressing package is a pure file move. Mirrors the
// network's semantic-record-journal identity convention -- see README.md.

const IS_PLAIN_OBJECT = (value) =>
  typeof value === "object" &&
  value !== null &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

/**
 * Serialize `value` to a deterministic JSON string: object keys sorted by
 * UTF-16 code unit (the same key ordering RFC 8785's JSON Canonicalization
 * Scheme specifies), array element order preserved as given. Two
 * structurally-equal values that differ only in object key insertion order
 * always canonicalize to the identical string, which is what makes hashing
 * the result a stable content id (see `contentId`).
 *
 * Only JSON-representable shapes are accepted: null, boolean, finite
 * number, string, array, and plain object (an object literal, or
 * `Object.create(null)` -- no class instances, `Map`, `Set`, `Date`,
 * typed arrays, etc). `undefined`, `NaN`, `Infinity`/`-Infinity`,
 * functions, symbols, and bigints all throw `TypeError` rather than being
 * silently dropped or coerced, unlike `JSON.stringify` (which drops
 * undefined object values, turns NaN/Infinity into `null`, and turns
 * bigint into a thrown error only for the top-level case). Sparse array
 * holes are read as `undefined` and therefore throw too, rather than
 * silently becoming empty segments.
 */
export function canonicalJson(value) {
  return canonicalize(value, "$");
}

function canonicalize(value, path) {
  if (value === null) return "null";
  const type = typeof value;

  if (type === "boolean") return value ? "true" : "false";

  if (type === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(
        `canonicalJson: value at ${path} is ${value}, which has no canonical JSON representation`,
      );
    }
    return JSON.stringify(value);
  }

  if (type === "string") return JSON.stringify(value);

  if (type === "undefined") {
    throw new TypeError(`canonicalJson: value at ${path} is undefined; canonicalJson never drops values silently`);
  }

  if (Array.isArray(value)) {
    const items = new Array(value.length);
    for (let i = 0; i < value.length; i++) {
      // Explicit indexed access (not Array#map) so sparse-array holes read
      // as undefined and hit the undefined check above instead of being
      // skipped and silently rendered as an empty join segment.
      items[i] = canonicalize(value[i], `${path}[${i}]`);
    }
    return `[${items.join(",")}]`;
  }

  if (type === "object") {
    if (!IS_PLAIN_OBJECT(value)) {
      const ctorName = value.constructor ? value.constructor.name : "unknown";
      throw new TypeError(
        `canonicalJson: value at ${path} is a ${ctorName} instance; only plain objects, arrays, and JSON primitives are supported`,
      );
    }
    const keys = Object.keys(value).sort();
    const entries = keys.map(
      (key) => `${JSON.stringify(key)}:${canonicalize(value[key], `${path}.${key}`)}`,
    );
    return `{${entries.join(",")}}`;
  }

  // function, symbol, bigint
  throw new TypeError(`canonicalJson: value at ${path} has unsupported type "${type}"`);
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  // Web APIs only (btoa), then RFC 4648 §5 base64url: '+'/'/' swapped for
  // '-'/'_', padding stripped -- the encoding RFC 6920's `ni:` URI scheme
  // uses for its digest component.
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * SHA-256 digest of `text`, returned as unpadded base64url (RFC 4648 §5).
 * WebCrypto (`crypto.subtle`) only, so this runs unmodified on Node 24 and
 * on Cloudflare Workers.
 */
export async function sha256Base64Url(text) {
  if (typeof text !== "string") {
    throw new TypeError("sha256Base64Url: text must be a string");
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return bytesToBase64Url(new Uint8Array(digest));
}

/**
 * Content-derived id for `value`: canonicalize it, hash the canonical
 * string, and wrap the hash as an RFC 6920 `ni:` URI
 * (`ni:///sha-256;<base64url-digest>`). Any two calls whose values are
 * structurally equal (regardless of object key order) return the same id;
 * any change to the value's content changes it. Not tied to any record
 * shape -- callers needing a record's identity (id-if-present, else
 * content hash) want `recordIdentityOrHash` instead.
 */
export async function contentId(value) {
  const hash = await sha256Base64Url(canonicalJson(value));
  return `ni:///sha-256;${hash}`;
}

/**
 * Synchronous identity for a record that may declare its own id:
 * `"id:<id>"` when `record.id` is present (not null/undefined), else
 * `null`. Never hashes, and never throws for a record with no id --
 * callers that want a total function (always returns something) should use
 * `recordIdentityOrHash` instead.
 */
export function recordIdentity(record) {
  if (typeof record !== "object" || record === null) {
    throw new TypeError("recordIdentity: record must be a non-null object");
  }
  return record.id != null ? `id:${record.id}` : null;
}

/**
 * `recordIdentity(record)`, falling back to a content-hash id
 * (`"rmn:<base64url-digest>"`) when the record carries no id of its own.
 * This is the network's semantic-record-journal convention for giving
 * every record a stable identity whether or not the source system assigned
 * one: known identity wins when present, content-derived identity is the
 * fallback, and the two id shapes (`id:` vs `rmn:`) stay visibly
 * distinguishable rather than being unified into one ambiguous string.
 */
export async function recordIdentityOrHash(record) {
  const declared = recordIdentity(record);
  if (declared !== null) return declared;
  const hash = await sha256Base64Url(canonicalJson(record));
  return `rmn:${hash}`;
}

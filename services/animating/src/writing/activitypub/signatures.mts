/**
 * writing/activitypub/signatures — HTTP Signatures for S2S (memo §12, §18): the
 * Fediverse authenticates server-to-server delivery by signing requests, not by bearer
 * tokens. This is the draft-cavage scheme every surveyed implementation supports:
 * build a signing string over `(request-target)` + selected headers, RSA-SHA256 sign it,
 * and carry it in a `Signature` header; the receiver re-derives the string and verifies
 * against the actor's published public key.
 *
 * Pure crypto over explicit inputs (node:crypto). The HTTP binding supplies the header
 * map and the actor's key; this lib owns the signing/verification logic.
 */
import { createSign, createVerify, createHash } from "node:crypto";

/** The `Digest` header value for a body: `SHA-256=<base64>` (bind a POST to its body). */
export function httpDigest(body: string): string {
  return `SHA-256=${createHash("sha256").update(body).digest("base64")}`;
}

/** Build the draft-cavage signing string over `(request-target)` + the named headers. */
export function signingString(method: string, path: string, headers: Readonly<Record<string, string>>, signedHeaders: readonly string[]): string {
  return signedHeaders
    .map((name) => (name === "(request-target)" ? `(request-target): ${method.toLowerCase()} ${path}` : `${name}: ${headers[name.toLowerCase()] ?? ""}`))
    .join("\n");
}

/** A signed request: the `Signature` header value and the headers it commits to. */
export interface SignedRequest {
  readonly signature: string;
  readonly signedHeaders: readonly string[];
}

/**
 * signRequest — sign an outbound S2S request as `keyId` with `privateKeyPem`
 * (RSA-SHA256). Returns the `Signature` header value listing the covered headers; the
 * binding sets it alongside the headers it signed.
 */
export function signRequest(
  method: string,
  path: string,
  headers: Readonly<Record<string, string>>,
  keyId: string,
  privateKeyPem: string,
  signedHeaders: readonly string[] = ["(request-target)", "host", "date", "digest"],
): SignedRequest {
  const data = signingString(method, path, headers, signedHeaders);
  const signature = createSign("sha256").update(data).sign(privateKeyPem, "base64");
  const header = `keyId="${keyId}",algorithm="rsa-sha256",headers="${signedHeaders.join(" ")}",signature="${signature}"`;
  return { signature: header, signedHeaders };
}

/** Parse a `Signature` header into its `keyId`/`headers`/`signature` fields. */
export function parseSignatureHeader(header: string): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    out[key] = part.slice(eq + 1).trim().replace(/^"|"$/g, "");
  }
  return out;
}

/**
 * verifyRequest — verify an inbound S2S request's `Signature` against the sender's
 * `publicKeyPem`. Re-derives the signing string from the named headers and checks the
 * RSA-SHA256 signature. The caller must also confirm the `keyId` belongs to the claimed
 * actor and that `digest`/`date` are fresh (replay window).
 */
export function verifyRequest(
  method: string,
  path: string,
  headers: Readonly<Record<string, string>>,
  signatureHeader: string,
  publicKeyPem: string,
): boolean {
  const fields = parseSignatureHeader(signatureHeader);
  const signed = (fields["headers"] ?? "(request-target) host date").split(" ");
  const signature = fields["signature"];
  if (signature === undefined || signature === "") return false;
  const data = signingString(method, path, headers, signed);
  try {
    return createVerify("sha256").update(data).verify(publicKeyPem, signature, "base64");
  } catch {
    return false;
  }
}

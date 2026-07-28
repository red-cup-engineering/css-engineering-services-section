/**
 * JavaScript host cryptographic encodings.
 *
 * These helpers are the host-runtime leaf for deterministic hashes and small
 * wire signatures. Relational material asks for a stable commitment or a
 * timing-safe comparison; this leaf records that Node's crypto implementation is
 * the concrete JavaScript host codec used to produce it.
 *
 * @packageDocumentation
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function sha1Base64(value: string): string {
  return createHash("sha1").update(value, "utf8").digest("base64");
}

export function hmacSha256Base64Url(secret: string, parts: readonly string[]): string {
  const hmac = createHmac("sha256", secret);
  for (const part of parts) hmac.update(part);
  return hmac.digest("base64url");
}

export function timingSafeStringEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

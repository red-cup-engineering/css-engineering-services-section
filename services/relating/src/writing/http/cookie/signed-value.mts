// signed-value.mts — HMAC-signed cookie values.
//
// Semantic value: a string. Wire form: "value.signature" with an HMAC
// over a salt-scoped key. The pair is a RETRACTION onto the image of
// sign: unsignCookieValue ∘ signCookieValue = id, and everything outside
// the image (tampered or unsigned text) decodes to null. Verification is
// timing-safe.

import { hmacSha256Base64Url, timingSafeStringEqual } from "../../../codecs/host/javascript/crypto/index.mjs";

export function signCookieValue(value: string, secret: string, salt = "cookie"): string {
  if (!secret) throw new TypeError("signCookieValue: secret is required");
  const signature = hmacSha256Base64Url(secret, [salt, "\0", value]);
  return `${value}.${signature}`;
}

export function unsignCookieValue(signedValue: string, secret: string, salt = "cookie"): string | null {
  const marker = signedValue.lastIndexOf(".");
  if (marker <= 0) return null;
  const value = signedValue.slice(0, marker);
  const signature = signedValue.slice(marker + 1);
  const expected = signCookieValue(value, secret, salt).slice(value.length + 1);
  return safeEqual(signature, expected) ? value : null;
}

function safeEqual(left: string, right: string): boolean {
  return timingSafeStringEqual(left, right);
}

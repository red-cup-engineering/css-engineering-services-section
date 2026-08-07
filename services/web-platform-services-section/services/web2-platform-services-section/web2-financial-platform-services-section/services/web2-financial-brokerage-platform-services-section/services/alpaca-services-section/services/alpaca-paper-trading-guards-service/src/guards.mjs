// Shared PAPER-ONLY guards for Esther Davis Alpaca paper trading loops.
//
// Extracted unmodified (behaviorally) from alpaca-esther-paper-trading-loop's
// original run-loop.mjs so that every standing loop touching this account
// (the BLK accumulation loop and the diversified-basket redistributor loop)
// enforces the exact same three independent refusals:
//
//   1. TRADING_HOST is a literal constant, not read from env or config, so
//      no environment drift can point a loop at a live venue. Every
//      outbound URL is rebuilt from this constant and re-checked
//      (protocol + hostname) immediately before use, in tradingUrl().
//   2. Before doing anything else, the process environment is scanned for
//      any key that looks like an Alpaca *live* trading credential
//      (matches /ALPACA/i and /LIVE/i). If one is present -- even unused --
//      the run refuses and exits nonzero.
//   3. After (1)+(2) pass, GET /v2/account is called against the
//      hard-coded paper host and the returned account_number is checked
//      against Alpaca's paper-account prefix ("PA..."). Any failure to
//      authenticate, or an account number that doesn't carry that prefix,
//      refuses.
//
// Callers own their own journaling; these functions only throw or return.

export const TRADING_HOST = "paper-api.alpaca.markets";

export function refuseUnlessNoLiveCredentialPresent(env) {
  const suspect = Object.keys(env).filter((k) => /alpaca/iu.test(k) && /live/iu.test(k));
  if (suspect.length > 0) {
    throw new Error(`refused-live-alpaca-credential-present-in-environment:${suspect.sort().join(",")}`);
  }
}

export function requirePaperCredentials(env, {
  keyVar = "ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_KEY",
  secretVar = "ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_SECRET",
} = {}) {
  const key = env[keyVar];
  const secret = env[secretVar];
  if (typeof key !== "string" || !key.trim() || typeof secret !== "string" || !secret.trim()) {
    throw new Error("paper-trading-credentials-missing");
  }
  return { key, secret };
}

export function tradingUrl(path) {
  const url = new URL(path, `https://${TRADING_HOST}/`);
  if (url.protocol !== "https:" || url.hostname !== TRADING_HOST) {
    throw new Error(`refused-non-paper-trading-host:${url.hostname}`);
  }
  return url;
}

export async function tradingFetch(key, secret, method, path, body) {
  const url = tradingUrl(path);
  const response = await fetch(url, {
    method,
    headers: {
      "APCA-API-KEY-ID": key,
      "APCA-API-SECRET-KEY": secret,
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }
  return { status: response.status, ok: response.ok, body: parsed };
}

export async function verifyPaperAccount(key, secret) {
  const { status, ok, body } = await tradingFetch(key, secret, "GET", "/v2/account");
  if (!ok) throw new Error(`paper-account-authentication-refused:${status}`);
  if (typeof body?.account_number !== "string" || !/^PA/u.test(body.account_number)) {
    throw new Error(`refused-account-not-flagged-paper:${body?.account_number ?? "unknown"}`);
  }
  return body;
}

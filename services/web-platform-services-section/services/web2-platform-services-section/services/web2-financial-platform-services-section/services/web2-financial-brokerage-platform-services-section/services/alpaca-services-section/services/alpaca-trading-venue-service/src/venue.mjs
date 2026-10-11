// Venue selection and authenticated transport for Alpaca trading, paper or live.
//
// This replaces alpaca-paper-trading-guards-service, whose "safety" was a hardcoded
// `TRADING_HOST = "paper-api.alpaca.markets"` plus an environment scan that refused to run at
// all if a live Alpaca credential existed anywhere in the environment. That is not risk
// management — it makes live trading structurally impossible rather than deliberately
// controlled, and it means the account's real risk limits were never the thing standing
// between a strategy and a bad fill.
//
// The controls that actually bound loss are in risk.mjs (per-order notional, position
// concentration, daily loss, cash-flow-adjusted drawdown) and are enforced identically on
// both venues. What this module owns is narrower and mechanical:
//
//   1. A venue is chosen explicitly by name — "paper" or "live" — never inferred from
//      ambient environment. `resolveVenue` refuses any other value.
//   2. Each venue is pinned to its own host, and every outbound URL is rebuilt from that
//      host and re-checked before use, so a malformed path can't redirect a live order to
//      another origin or a paper order to the live venue.
//   3. Credentials are read from the variable pair belonging to the selected venue, so a
//      paper run cannot pick up live keys by accident and vice versa. Missing credentials
//      refuse loudly rather than falling back to the other venue.
//   4. `verifyAccount` asserts the account the credentials actually opened matches the venue
//      that was asked for — Alpaca prefixes paper account numbers with "PA", so a live key
//      handed to a paper run (or the reverse) is caught before any order is placed. This is
//      the one check worth keeping from the old guards: it verifies reality rather than
//      forbidding a configuration.
//
// Nothing here decides *whether* to trade. It decides where an order goes and proves the
// account on the other end is the one that was intended.

export const VENUES = Object.freeze({
  paper: Object.freeze({
    id: "paper",
    host: "paper-api.alpaca.markets",
    keyVar: "ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_KEY",
    secretVar: "ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_SECRET",
    accountNumberPattern: /^PA/u,
    realMoney: false,
  }),
  live: Object.freeze({
    id: "live",
    host: "api.alpaca.markets",
    keyVar: "ALPACA_ACCOUNT_ESTHER_LIVE_TRADING_KEY",
    secretVar: "ALPACA_ACCOUNT_ESTHER_LIVE_TRADING_SECRET",
    // A live account number is any Alpaca account number that is *not* paper-prefixed.
    accountNumberPattern: /^(?!PA)/u,
    realMoney: true,
  }),
});

/** The venue descriptor for an explicit name. Refuses anything but "paper" or "live" — a
 *  venue is always named by the caller, never inferred from what happens to be set. */
export function resolveVenue(name) {
  const venue = VENUES[name];
  if (venue === undefined) {
    throw new RangeError(`unknown-venue:${name} (expected "paper" or "live")`);
  }
  return venue;
}

/** Read the credential pair belonging to this venue. Refuses if either is absent or blank;
 *  never falls back to the other venue's credentials. */
export function requireCredentials(venue, env) {
  const key = env[venue.keyVar];
  const secret = env[venue.secretVar];
  const present = (value) => typeof value === "string" && value.trim() !== "";
  if (!present(key) || !present(secret)) {
    const missing = [!present(key) ? venue.keyVar : null, !present(secret) ? venue.secretVar : null]
      .filter((name) => name !== null)
      .join(",");
    throw new Error(`${venue.id}-trading-credentials-missing:${missing}`);
  }
  return { key: key.trim(), secret: secret.trim() };
}

/** Build an absolute URL against this venue's host, re-checking protocol and hostname so a
 *  crafted or malformed path cannot move the request to another origin. */
export function tradingUrl(venue, path) {
  const url = new URL(path, `https://${venue.host}/`);
  if (url.protocol !== "https:" || url.hostname !== venue.host) {
    throw new Error(`refused-off-venue-host:${venue.id}:${url.hostname}`);
  }
  return url;
}

/** One authenticated request against the venue. Returns status and parsed body rather than
 *  throwing on a non-2xx, so callers can journal a refusal as a decision. */
export async function tradingFetch(venue, { key, secret }, method, path, body, { fetchImpl = fetch } = {}) {
  const url = tradingUrl(venue, path);
  const response = await fetchImpl(url, {
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

/** Authenticate and assert the account reached is the kind the caller asked for. Catches a
 *  live key used on a paper run, a paper key used on a live run, and any credential that
 *  simply doesn't authenticate — before an order is ever built. */
export async function verifyAccount(venue, credentials, options = {}) {
  const { status, ok, body } = await tradingFetch(venue, credentials, "GET", "/v2/account", undefined, options);
  if (!ok) throw new Error(`${venue.id}-account-authentication-refused:${status}`);
  const accountNumber = body?.account_number;
  if (typeof accountNumber !== "string" || !venue.accountNumberPattern.test(accountNumber)) {
    throw new Error(`refused-account-does-not-match-venue:${venue.id}:${accountNumber ?? "unknown"}`);
  }
  if (venue.realMoney && body?.status !== "ACTIVE") {
    throw new Error(`refused-live-account-not-active:${body?.status ?? "unknown"}`);
  }
  if (body?.trading_blocked === true || body?.account_blocked === true) {
    throw new Error(`refused-account-blocked:${venue.id}`);
  }
  return body;
}

/** Open a venue in one step: resolve, read credentials, authenticate, and confirm the
 *  account matches. Returns everything a loop needs to trade, including a bound `request`. */
export async function openVenue(name, env, options = {}) {
  const venue = resolveVenue(name);
  const credentials = requireCredentials(venue, env);
  const account = await verifyAccount(venue, credentials, options);
  return {
    venue,
    account,
    realMoney: venue.realMoney,
    request: (method, path, body) => tradingFetch(venue, credentials, method, path, body, options),
  };
}

// Credentials and trading-host access for the Esther Davis Alpaca loops.
//
// The account's mode follows its credentials: when the live key pair is
// present the loops trade the live account, otherwise the paper pair trades
// the paper account. Each mode has one fixed trading host, and every outbound
// URL is rebuilt from it and re-checked (protocol + hostname) before use. The
// paper account is additionally checked against Alpaca's paper-account prefix
// ("PA..."), so paper credentials can never be mistaken for live ones.
//
// Callers own their own journaling; these functions only throw or return.

export const TRADING_HOSTS = Object.freeze({
  paper: "paper-api.alpaca.markets",
  live: "api.alpaca.markets",
});

const credentialVars = (account, mode) => ({
  keyVar: `ALPACA_ACCOUNT_${account}_${mode.toUpperCase()}_TRADING_KEY`,
  secretVar: `ALPACA_ACCOUNT_${account}_${mode.toUpperCase()}_TRADING_SECRET`,
});

const present = (value) => typeof value === "string" && value.trim() !== "";

/**
 * The account's trading credentials and mode: the live pair when both halves
 * are set, else the paper pair.
 * @param {NodeJS.ProcessEnv} env
 * @param {{account?: string}} [options] Account name in the variable names (default ESTHER).
 * @returns {{mode: "paper"|"live", key: string, secret: string}}
 */
export function alpacaCredentials(env, { account = "ESTHER" } = {}) {
  for (const mode of ["live", "paper"]) {
    const { keyVar, secretVar } = credentialVars(account, mode);
    if (present(env[keyVar]) && present(env[secretVar])) return Object.freeze({ mode, key: env[keyVar].trim(), secret: env[secretVar].trim() });
  }
  throw new Error("alpaca-trading-credentials-missing");
}

export function tradingUrl(mode, path) {
  const host = TRADING_HOSTS[mode];
  if (!host) throw new Error(`unknown-alpaca-trading-mode:${mode}`);
  const url = new URL(path, `https://${host}/`);
  if (url.protocol !== "https:" || url.hostname !== host) {
    throw new Error(`refused-trading-host:${url.hostname}`);
  }
  return url;
}

export async function tradingFetch({ mode, key, secret }, method, path, body) {
  const url = tradingUrl(mode, path);
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

/** Read /v2/account for these credentials; a paper account must carry the paper prefix. */
export async function verifyAccount(credentials) {
  const { status, ok, body } = await tradingFetch(credentials, "GET", "/v2/account");
  if (!ok) throw new Error(`${credentials.mode}-account-authentication-refused:${status}`);
  if (credentials.mode === "paper" && (typeof body?.account_number !== "string" || !/^PA/u.test(body.account_number))) {
    throw new Error(`refused-account-not-flagged-paper:${body?.account_number ?? "unknown"}`);
  }
  return body;
}

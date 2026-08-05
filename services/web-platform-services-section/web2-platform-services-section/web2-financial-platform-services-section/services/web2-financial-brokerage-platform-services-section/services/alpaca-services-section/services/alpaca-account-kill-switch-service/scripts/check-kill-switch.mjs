#!/usr/bin/env node
// PAPER-ONLY account kill switch check.
//
// Run in two places:
//   1. As ExecStartPre= of each Alpaca paper loop's systemd service, so a
//      tripped account blocks that run's ExecStart entirely (no trade
//      happens on a tripped state).
//   2. On its own systemd timer (ops/systemd/alpaca-kill-switch-check.timer),
//      independent of whether any loop happens to run in a given window, so
//      a trip gets caught and the timers get disabled even if the loop
//      itself is not currently scheduled to run.
//
// On trip (drawdown over the high-water mark exceeds 10%, or today's loss
// against Alpaca's own last-close equity exceeds 3%): disable --now every
// alpaca loop timer that currently exists on this host, write a
// tripped-record JSON, and exit non-zero.
//
// On a failure to safely establish today's equity (auth refused, network
// error, account not flagged paper, live credential present) this also
// exits non-zero -- fail closed -- but does NOT disable timers or write a
// tripped record, since that is an operational fault, not an evidenced risk
// breach. It is reported distinctly on stderr as "check-error".
//
// PAPER-ONLY GUARD: identical in spirit to
// alpaca-esther-paper-trading-loop/src/run-loop.mjs -- TRADING_HOST is a
// literal constant never read from env, live-looking credentials in the
// environment refuse the run outright, and the returned account_number must
// carry Alpaca's paper-account "PA" prefix.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  evaluateKillSwitch,
  loadHighWaterMark,
  saveHighWaterMark,
  writeTrippedRecord,
} from "../src/kill-switch.mjs";
import { disableAllExistingAlpacaTimers } from "../src/systemd-timers.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = join(HERE, "..", "data", "state");
const HIGH_WATER_MARK_PATH = join(STATE_DIR, "high-water-mark.json");
const TRIPPED_DIR = join(STATE_DIR, "tripped");

const TRADING_HOST = "paper-api.alpaca.markets";

function tradingUrl(path) {
  const url = new URL(path, `https://${TRADING_HOST}/`);
  if (url.protocol !== "https:" || url.hostname !== TRADING_HOST) {
    throw new Error(`refused-non-paper-trading-host:${url.hostname}`);
  }
  return url;
}

function refuseUnlessNoLiveCredentialPresent(env) {
  const suspect = Object.keys(env).filter((k) => /alpaca/iu.test(k) && /live/iu.test(k));
  if (suspect.length > 0) {
    throw new Error(`refused-live-alpaca-credential-present-in-environment:${suspect.sort().join(",")}`);
  }
}

function requirePaperCredentials(env) {
  const key = env.ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_KEY;
  const secret = env.ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_SECRET;
  if (typeof key !== "string" || !key.trim() || typeof secret !== "string" || !secret.trim()) {
    throw new Error("paper-trading-credentials-missing");
  }
  return { key, secret };
}

async function readPaperAccount(key, secret) {
  const response = await fetch(tradingUrl("/v2/account"), {
    method: "GET",
    headers: { "APCA-API-KEY-ID": key, "APCA-API-SECRET-KEY": secret, Accept: "application/json" },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!response.ok) throw new Error(`paper-account-authentication-refused:${response.status}`);
  if (typeof body?.account_number !== "string" || !/^PA/u.test(body.account_number)) {
    throw new Error(`refused-account-not-flagged-paper:${body?.account_number ?? "unknown"}`);
  }
  return body;
}

async function main() {
  const env = process.env;
  const timestamp = new Date().toISOString();

  let account;
  try {
    refuseUnlessNoLiveCredentialPresent(env);
    const { key, secret } = requirePaperCredentials(env);
    account = await readPaperAccount(key, secret);
  } catch (error) {
    console.error(`check-error: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const equity = Number(account.equity);
  const lastEquity = Number(account.last_equity);
  const priorHighWaterMark = loadHighWaterMark(HIGH_WATER_MARK_PATH);

  let reading;
  try {
    reading = evaluateKillSwitch({ equity, lastEquity, priorHighWaterMark });
  } catch (error) {
    console.error(`check-error: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  saveHighWaterMark(HIGH_WATER_MARK_PATH, reading.highWaterMark, { asOf: timestamp });

  if (!reading.tripped) {
    console.log(
      `kill-switch OK: equity=${equity.toFixed(2)} highWaterMark=${reading.highWaterMark.toFixed(2)} ` +
      `drawdown=${(reading.drawdownPct * 100).toFixed(3)}% dailyLoss=${(reading.dailyLossPct * 100).toFixed(3)}%`,
    );
    return;
  }

  const disabledUnits = disableAllExistingAlpacaTimers();
  const record = {
    timestamp,
    outcome: "tripped",
    reasons: reading.reasons,
    equity,
    lastEquity: reading.lastEquity,
    priorHighWaterMark: reading.priorHighWaterMark,
    highWaterMark: reading.highWaterMark,
    drawdownPct: reading.drawdownPct,
    dailyPnlPct: reading.dailyPnlPct,
    dailyLossPct: reading.dailyLossPct,
    disabledUnits,
  };
  const recordPath = writeTrippedRecord(TRIPPED_DIR, record);

  console.error(`KILL-SWITCH TRIPPED: ${reading.reasons.join("; ")}`);
  console.error(`tripped record: ${recordPath}`);
  console.error(`disabled units: ${JSON.stringify(disabledUnits)}`);
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`check-error: unhandled: ${error?.message ?? error}`);
  process.exitCode = 1;
});

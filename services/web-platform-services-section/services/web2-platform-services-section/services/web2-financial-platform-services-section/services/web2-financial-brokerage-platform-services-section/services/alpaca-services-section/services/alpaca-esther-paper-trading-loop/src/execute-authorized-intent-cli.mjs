#!/usr/bin/env node
import { executeAuthorizedAlpacaIntent } from "./execute-authorized-intent.mjs";

const credentialNamesFor = (venue) => {
  if (venue === "alpaca-trading-paper") return ["ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_KEY", "ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_SECRET"];
  if (venue === "alpaca-trading-live") return ["ALPACA_ACCOUNT_ESTHER_LIVE_TRADING_KEY", "ALPACA_ACCOUNT_ESTHER_LIVE_TRADING_SECRET"];
  throw new TypeError("alpaca-trading-venue-required");
};

const required = (value, label) => {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label}-required`);
  return value.trim();
};

async function readExecutionRequest(input = process.stdin) {
  let text = "";
  for await (const chunk of input) text += chunk;
  if (text.trim() === "") throw new TypeError("authorized-intent-request-required");
  let request;
  try {
    request = JSON.parse(text);
  } catch {
    throw new TypeError("authorized-intent-request-json-required");
  }
  if (!request || typeof request !== "object" || Array.isArray(request)) throw new TypeError("authorized-intent-request-object-required");
  return request;
}

/**
 * One intentional brokerage effect, fed by a contract, grant, and bounded
 * order intent on stdin. The process never accepts credentials in its input:
 * it selects one named venue from the contract and reads only that venue's
 * credential pair from the environment. `--execute` is required so piping a
 * record into the binary cannot accidentally place an order.
 */
export async function main({ argv = process.argv.slice(2), env = process.env, input = process.stdin, output = process.stdout } = {}) {
  if (argv.length !== 1 || argv[0] !== "--execute") throw new TypeError("explicit---execute-required");
  const request = await readExecutionRequest(input);
  const venue = request.contract?.venue;
  const [keyName, secretName] = credentialNamesFor(venue);
  const cycle = await executeAuthorizedAlpacaIntent({
    contract: request.contract,
    authorityGrant: request.authorityGrant,
    intent: request.intent,
    revocation: request.revocation ?? null,
    key: required(env[keyName], keyName),
    secret: required(env[secretName], secretName),
    booksDataRoot: required(env.BROKERAGE_BOOKS_DATA_ROOT, "BROKERAGE_BOOKS_DATA_ROOT"),
  });
  output.write(`${JSON.stringify(cycle)}\n`);
  return cycle;
}

if (import.meta.main) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

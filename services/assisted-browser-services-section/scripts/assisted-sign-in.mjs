#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ACCOUNTS, captureSignIn, sessionStatus } from "../src/accounts.mjs";

const USAGE = `usage: assisted-sign-in <${Object.keys(ACCOUNTS).join("|")}>\n`
  + "       assisted-sign-in --status [--verify]\n"
  + "  Opens a visible browser window on the account's sign-in page; the person signs in there, and the\n"
  + "  session is kept (0600, outside the repository). --status lists each account's saved session;\n"
  + "  --verify also checks, headless, that each one still signs in.";

export async function runSignInCli(args, { stdout = process.stdout } = {}, capabilities = {}) {
  if (args[0] === "--status") {
    if (args.some((arg, index) => index > 0 && arg !== "--verify")) throw new TypeError(USAGE);
    const rows = await sessionStatus({ verify: args.includes("--verify") }, capabilities);
    stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
    return rows;
  }
  if (args.length !== 1 || args[0].startsWith("-")) throw new TypeError(USAGE);
  const result = await captureSignIn(args[0], {}, capabilities);
  stdout.write(`${result.path}\n${result.cookieCount}\n`);
  return result;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await runSignInCli(process.argv.slice(2));
  } catch (error) {
    console.error(error.message ?? error);
    process.exitCode = 1;
  }
}

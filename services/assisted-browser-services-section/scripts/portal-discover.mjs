#!/usr/bin/env node
/**
 * Read-only: record the form controls of an account portal's pages in a
 * browser the person at the node supervises. Clicks and saves nothing.
 *
 * usage: portal-discover <account> [--out <file>] [--walk [--start <url>] | <portal page url>...]
 *
 * With page URLs it loads each one. With --walk (the default when no URL is
 * given) the person moves through the portal and clicks Record on each form.
 */
import { parseArgs } from "node:util";
import { ACCOUNTS } from "../src/accounts.mjs";
import { discoverPortalForms, walkPortalForms } from "../src/discovery.mjs";

const usage = `usage: portal-discover <${Object.keys(ACCOUNTS).join("|")}> [--out <file>] [--walk [--start <url>] | <portal page url>...]`;
const { values, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: "string" }, walk: { type: "boolean", default: false }, start: { type: "string" } } });
const [account, ...pages] = positionals;
if (!account || (values.walk && pages.length) || (values.start && pages.length)) throw new Error(usage);
const options = { ...(values.out ? { out: values.out } : {}) };
const result = pages.length
  ? await discoverPortalForms(account, { ...options, pages })
  : await walkPortalForms(account, { ...options, ...(values.start ? { start: values.start } : {}) });
process.stdout.write(`${JSON.stringify(result)}\n`);

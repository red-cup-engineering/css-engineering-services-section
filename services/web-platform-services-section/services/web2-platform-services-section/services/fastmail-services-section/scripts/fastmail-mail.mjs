#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { assistedPerson } from "@red-cup-engineering/assisted-browser-services-section/person";
import { openCredentials } from "../src/credentials.mjs";
import { identities } from "../src/jmap.mjs";
import { mailSession, readySender } from "../src/provision.mjs";

const USAGE = "usage: fastmail-mail <command> [--account fastmail] [--unattended]\n"
  + "  status                          whether a token is on file, whether it sends, and the identities it sends as\n"
  + "  token                           walk the person through making the API token (opens the assisted browser)\n"
  + "  sender <address> --name <name>  make <address> ready to send as <name>, walking the person through an alias if needed\n"
  + "  The token is a credential of the host's store (fastmail/<account>.json in CREDENTIALS_DIRECTORY) and is never printed.";

export async function main(argv, { output = process.stdout } = {}) {
  const { values, positionals: [command, address, ...rest] } = parseArgs({
    args: argv, allowPositionals: true,
    options: { account: { type: "string", default: "fastmail" }, name: { type: "string" }, unattended: { type: "boolean" } },
  });
  if (!command || rest.length) throw new Error(USAGE);
  const notify = (message) => process.stderr.write(`${message}\n`);
  const credentials = openCredentials();
  const person = values.unattended || command === "status" ? null : assistedPerson({ account: values.account, notify });
  const write = (value) => output.write(`${JSON.stringify(value, null, 2)}\n`);
  try {
    if (command === "status") {
      const opened = await mailSession({ account: values.account, credentials });
      if (!opened.session) return write({ account: values.account, ...opened });
      return write({ account: values.account, state: "ready", username: opened.session.username, sendsAs: await identities(opened.session) });
    }
    if (command === "token") {
      if (await credentials.read(values.account)) await credentials.write(values.account, {}); // a token is remade on request
      const opened = await mailSession({ account: values.account, person, credentials });
      return write({ account: values.account, state: opened.session ? "ready" : opened.state, username: opened.session?.username });
    }
    if (command === "sender") {
      if (!address || !values.name) throw new Error(USAGE);
      const { session, ...ready } = await readySender({ address, name: values.name, account: values.account, person, credentials });
      return write(ready);
    }
    throw new Error(USAGE);
  } finally {
    await person?.close();
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => { console.error(error.message ?? error); process.exitCode = 1; });
}

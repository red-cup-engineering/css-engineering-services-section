#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createActivityPubProvider, deliverActivity, importActorKeyPairs } from "./provider.mjs";

function requiredEnvironment(name) {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

export async function deliverFromEnvironment(activity, options = {}) {
  const origin = options.origin ?? requiredEnvironment("ACTIVITYPUB_ORIGIN");
  const identifier = options.identifier ?? requiredEnvironment("ACTIVITYPUB_IDENTIFIER");
  const keyPath = path.resolve(options.keyPath ?? requiredEnvironment("ACTIVITYPUB_KEYS_PATH"));
  const provider = createActivityPubProvider({
    origin,
    identifier,
    actorName: options.actorName ?? process.env.ACTIVITYPUB_ACTOR_NAME ?? identifier,
    summary: options.summary ?? process.env.ACTIVITYPUB_ACTOR_SUMMARY ?? "A customer hiring an ActivityPub delivery face.",
    keyPairs: await importActorKeyPairs(JSON.parse(await readFile(keyPath, "utf8"))),
    onActivity: async () => { throw new Error("delivery-only provider cannot receive an activity"); },
    authorizeInbox: async () => false,
    listInbox: async () => ({ items: [], totalItems: 0 }),
    listOutbox: async () => ({ items: [] }),
  });
  return deliverActivity(provider, {
    activity,
    recipient: options.recipient ?? requiredEnvironment("ACTIVITYPUB_RECIPIENT"),
    inbox: options.inbox ?? requiredEnvironment("ACTIVITYPUB_RECIPIENT_INBOX"),
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  deliverFromEnvironment(JSON.parse(readFileSync(0, "utf8"))).then((receipt) => {
    process.stdout.write(`${JSON.stringify(receipt)}\n`);
  }).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}

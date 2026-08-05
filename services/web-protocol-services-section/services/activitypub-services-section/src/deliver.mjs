#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createActivityPubProvider, deliverActivity, importActorKeyPairs } from "./provider.mjs";

export const MAX_ACTIVITYPUB_ACTIVITY_JSON_BYTES = 1024 * 1024;

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

function parseActivityJson(json, source) {
  let activity;
  try {
    activity = JSON.parse(json);
  } catch {
    throw new TypeError(`${source} must contain valid JSON`);
  }
  if (activity === null || typeof activity !== "object" || Array.isArray(activity)) {
    throw new TypeError(`${source} must contain one ActivityStreams activity object`);
  }
  return activity;
}

/**
 * Read one already-authored ActivityStreams activity for the delivery command.
 * Cloud jobs can set ACTIVITYPUB_ACTIVITY_JSON; interactive callers retain the
 * standard-input contract.  The environment form is deliberately bounded so
 * it remains an invocation parameter rather than a work queue.
 */
export function readActivityFromEnvironmentOrStdin({
  environment = process.env,
  readStandardInput = () => readFileSync(0, "utf8"),
} = {}) {
  if (Object.hasOwn(environment, "ACTIVITYPUB_ACTIVITY_JSON")) {
    const json = environment.ACTIVITYPUB_ACTIVITY_JSON;
    if (typeof json !== "string") throw new TypeError("ACTIVITYPUB_ACTIVITY_JSON must be a string");
    if (Buffer.byteLength(json, "utf8") > MAX_ACTIVITYPUB_ACTIVITY_JSON_BYTES) {
      throw new RangeError(`ACTIVITYPUB_ACTIVITY_JSON must not exceed ${MAX_ACTIVITYPUB_ACTIVITY_JSON_BYTES} bytes`);
    }
    return parseActivityJson(json, "ACTIVITYPUB_ACTIVITY_JSON");
  }
  return parseActivityJson(readStandardInput(), "standard input");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  deliverFromEnvironment(readActivityFromEnvironmentOrStdin()).then((receipt) => {
    process.stdout.write(`${JSON.stringify(receipt)}\n`);
  }).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}

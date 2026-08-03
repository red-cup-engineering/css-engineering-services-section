#!/usr/bin/env node

import { randomBytes } from "node:crypto";
import { createCloudActivityPubRuntime } from "./cloud-runtime.mjs";
import { createActivityPubR2Custody } from "./r2-custody.mjs";
import { serveActivityPubProvider } from "./server.mjs";

function required(environment, name) {
  const value = environment[name];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required for the cloud ActivityPub provider`);
  return value;
}

/** Serve one customer actor using only network-owned production authorities. */
export async function serveCloudActivityPubProvider(options = {}) {
  const environment = options.environment ?? process.env;
  const runtime = options.runtime ?? createCloudActivityPubRuntime({ environment });
  const identifier = options.identifier ?? required(environment, "ACTIVITYPUB_IDENTIFIER");
  const custody = options.custody ?? createActivityPubR2Custody({ actor: identifier });
  const running = await (options.serve ?? serveActivityPubProvider)({
    origin: runtime.origin,
    identifier,
    actorName: options.actorName ?? required(environment, "ACTIVITYPUB_ACTOR_NAME"),
    summary: options.summary ?? required(environment, "ACTIVITYPUB_ACTOR_SUMMARY"),
    keyPath: options.keyPath ?? required(environment, "ACTIVITYPUB_KEYS_PATH"),
    bearerToken: options.bearerToken ?? randomBytes(32).toString("base64url"),
    kv: custody.kv,
    inbox: custody.inbox,
    queue: runtime.queue,
    hostname: options.hostname ?? environment.HOST ?? "0.0.0.0",
    port: Number(options.port ?? environment.PORT ?? "8080"),
    listOutbox: options.listOutbox ?? (async () => ({ items: [] })),
    onActivity: options.onActivity ?? (async () => {}),
    workerRoute: {
      path: new URL(runtime.targetUrl).pathname,
      consume: (request) => runtime.queue.consume(request),
    },
  });
  void running.provider.federation.startQueue(undefined).catch((error) => {
    process.stderr.write(`ActivityPub queue worker stopped: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  });
  return Object.freeze({ ...running, origin: runtime.origin, identifier });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  serveCloudActivityPubProvider().then((running) => {
    process.stdout.write(`${running.origin}/actors/${running.identifier}\n`);
  }).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

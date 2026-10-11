#!/usr/bin/env node

import { runMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { createLocalActivityPubProvider } from "@red-cup-engineering/activitypub-services-section/local-server";
import { serveActivityPubProvider } from "./server.mjs";

/**
 * Serve one customer actor from a single local SQLite file. Durable KV, the
 * message queue, and verified-arrival custody all share one `DatabaseSync`
 * handle (activitypub-services-section's sqlite-runtime.mjs +
 * sqlite-custody.mjs) — the devbox counterpart to serveActivityPubProvider's
 * purchased-network stack. No network credentials, no purchased authority:
 * intended for loopback federation and local development, exactly the "no
 * live deploy target" gap this module exists to close.
 */
export async function serveLocalActivityPubProvider(options = {}) {
  const environment = options.environment ?? process.env;
  const local = await createLocalActivityPubProvider(options);
  const running = await (options.serve ?? serveActivityPubProvider)({
    provider: local.provider,
    origin: local.provider.origin,
    hostname: options.hostname ?? environment.HOST ?? "127.0.0.1",
    port: Number(options.port ?? environment.PORT ?? "8000"),
  });
  void running.provider.federation.startQueue(undefined).catch((error) => {
    process.stderr.write(`ActivityPub local queue worker stopped: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  });
  return Object.freeze({
    ...running,
    bearerToken: local.bearerToken,
    bearerTokenPath: local.bearerTokenPath,
    close: async () => { await running.close(); await local.close(); },
  });
}

await runMain(async ({ stdout }) => {
  const running = await serveLocalActivityPubProvider();
    // Never print the bearer token itself here: this line lands in the
    // service journal at every boot. Print where it was persisted instead
    // (or `null` when no state path was configured to persist it under).
    stdout.write(`${JSON.stringify({
      actor: new URL(`/actors/${running.provider.identifier}`, running.provider.origin).href,
      bearerTokenPath: running.bearerTokenPath,
    })}\n`);
}, { moduleUrl: import.meta.url, formatError: (error) => `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`, exitCode: 1 });

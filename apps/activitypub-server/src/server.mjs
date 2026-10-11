#!/usr/bin/env node

import { runMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import { startWebServer } from "@red-cup-engineering/computer-web-server/node";
import { createWebServer } from "@red-cup-engineering/computer-web-server";
import { timingSafeEqual } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { createActivityPubProvider, importActorKeyPairs } from "@red-cup-engineering/activitypub-services-section";
import { createActivityPubOutboxStore, loadActivityPubOutbox } from "@red-cup-engineering/activitypub-services-section/outbox-store";

function requiredEnvironment(name) {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

async function readBearerToken(tokenPath) {
  const resolved = path.resolve(tokenPath);
  const metadata = await stat(resolved);
  if (!metadata.isFile() || (metadata.mode & 0o077) !== 0) {
    throw new TypeError("ActivityPub inbox bearer token must be one private regular file");
  }
  const token = (await readFile(resolved, "utf8")).trim();
  if (token.length < 32) throw new TypeError("ActivityPub inbox bearer token must contain at least 32 characters");
  return token;
}

function bearerMatches(request, expected) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return false;
  const presented = Buffer.from(authorization.slice("Bearer ".length));
  const wanted = Buffer.from(expected);
  return presented.length === wanted.length && timingSafeEqual(presented, wanted);
}

/**
 * Compose the provider's Fetch protocol surface into the one house Web engine.
 *
 * The private worker and injected well-known documents remain provider-local
 * policy.  Node listening is deliberately delegated to the shared transport.
 */
export function createActivityPubServerEngine({ provider, wellKnownResources = {}, workerRoute } = {}) {
  if (!provider || typeof provider.fetch !== "function") throw new TypeError("ActivityPub server engine requires a provider with fetch");
  const delegate = (request) => provider.fetch(request);
  const resources = [
    ...(workerRoute === undefined ? [] : [{
      match: workerRoute.path,
      handler: async (context) => {
        if (context.request.method !== "POST") return new Response(null, { status: 404 });
        const response = await workerRoute.consume(context.request);
        if (!(response instanceof Response)) throw new TypeError("ActivityPub private worker consume must return a Response");
        return response;
      },
    }]),
    ...Object.entries(wellKnownResources).map(([resourcePath, document]) => ({
      match: resourcePath,
      handler: (context) => context.request.method === "GET"
        ? new Response(`${JSON.stringify(document)}\n`, { status: 200, headers: { "content-type": "application/json" } })
        : delegate(context.request),
    })),
    { match: () => true, handler: (context) => delegate(context.request) },
  ];
  return createWebServer({
    resources,
    onError: async (error) => {
      process.stderr.write(`ActivityPub request failed: ${(error instanceof Error ? error.stack ?? error.message : String(error)).slice(0, 8000)}\n`);
    },
  });
}

export async function serveActivityPubProvider(options = {}) {
  const origin = new URL(options.origin ?? options.provider?.origin ?? requiredEnvironment("ACTIVITYPUB_ORIGIN"));
  if (origin.protocol !== "https:" && origin.hostname !== "127.0.0.1" && origin.hostname !== "localhost") {
    throw new TypeError("ACTIVITYPUB_ORIGIN must use HTTPS outside loopback development");
  }
  let provider = options.provider;
  let ownedOutbox;
  // Standalone publishing binds the shared SQLite custody; an existing
  // authored JSON file is import input only. Explicit projections stay read-only.
  try {
    if (provider === undefined) {
      const identifier = options.identifier ?? requiredEnvironment("ACTIVITYPUB_IDENTIFIER");
      const actorName = options.actorName ?? requiredEnvironment("ACTIVITYPUB_ACTOR_NAME");
      const summary = options.summary ?? requiredEnvironment("ACTIVITYPUB_ACTOR_SUMMARY");
      const keyPath = path.resolve(options.keyPath ?? requiredEnvironment("ACTIVITYPUB_KEYS_PATH"));
      const bearerToken = options.bearerToken ?? await readBearerToken(options.bearerTokenPath ?? requiredEnvironment("ACTIVITYPUB_INBOX_BEARER_TOKEN_FILE"));
      if (typeof bearerToken !== "string" || bearerToken.length < 32) throw new TypeError("ActivityPub inbox bearer token must contain at least 32 characters");
      const testOnlyInProcess = options.testOnlyInProcess === true;
      if (!options.kv || !options.inbox) throw new TypeError("ActivityPub service requires purchased network KV and inbox custody adapters");
      if (options.queue === undefined && !testOnlyInProcess) throw new TypeError("ActivityPub service requires a purchased durable network queue");
      const keyPairs = await importActorKeyPairs(JSON.parse(await readFile(keyPath, "utf8")));
      const inbox = options.inbox;
      const onActivity = options.onActivity ?? (async () => {});
      if (typeof onActivity !== "function") throw new TypeError("ActivityPub customer onActivity must be a function");
      const outboxPath = options.outboxPath ?? process.env.ACTIVITYPUB_OUTBOX_PATH;
      const outboxStore = options.listOutbox === undefined && options.appendToOutbox === undefined && outboxPath !== undefined
        ? await createActivityPubOutboxStore({ outboxPath })
        : undefined;
      ownedOutbox = outboxStore;
      const listOutbox = options.listOutbox ?? (outboxStore === undefined ? await loadActivityPubOutbox(undefined) : undefined);
      const appendToOutbox = options.appendToOutbox ?? outboxStore?.append;
      provider = createActivityPubProvider({
        origin: origin.href,
        identifier,
        actorName,
        summary,
        ...(options.cell ?? process.env.ACTIVITYPUB_CELL_ID
          ? { cell: options.cell ?? process.env.ACTIVITYPUB_CELL_ID }
          : {}),
        ...(options.controller ?? process.env.ACTIVITYPUB_CONTROLLER
          ? { controller: options.controller ?? process.env.ACTIVITYPUB_CONTROLLER }
          : {}),
        keyPairs,
        kv: options.kv,
        ...(options.queue === undefined ? {} : { queue: options.queue }),
        ...(options.allowPrivateAddress === undefined ? {} : { allowPrivateAddress: options.allowPrivateAddress }),
        onActivity: async (arrival) => {
          const settlement = await inbox.retain(arrival);
          await onActivity(Object.freeze({ ...arrival, ...(settlement === undefined ? {} : { settlement }) }));
        },
        authorizeInbox: ({ request }) => bearerMatches(request, bearerToken),
        ...(options.inboxIndex === undefined ? {} : { inboxIndex: options.inboxIndex }),
        ...(options.followers === undefined ? {} : { followers: options.followers }),
        ...(outboxStore === undefined ? {} : { outbox: outboxStore }),
        ...(listOutbox === undefined ? {} : { listOutbox }),
        ...(appendToOutbox === undefined ? {} : { appendToOutbox }),
      });
    } else if (typeof provider.fetch !== "function") {
      throw new TypeError("ActivityPub provider must expose fetch");
    }
    const port = Number(options.port ?? process.env.PORT ?? origin.port ?? "8000");
    const hostname = options.hostname ?? process.env.HOST ?? "127.0.0.1";
    const wellKnownResources = options.wellKnownResources ?? {};
    for (const [resourcePath, document] of Object.entries(wellKnownResources)) {
      if (!resourcePath.startsWith("/.well-known/") || document === undefined) throw new TypeError("well-known resources require exact /.well-known/* paths and JSON documents");
    }
    const workerRoute = options.workerRoute;
    if (workerRoute !== undefined) {
      if (!workerRoute || typeof workerRoute !== "object" || typeof workerRoute.path !== "string" || !workerRoute.path.startsWith("/_private/") || typeof workerRoute.consume !== "function") {
        throw new TypeError("ActivityPub worker route requires one private path and consume function");
      }
    }
    const engine = createActivityPubServerEngine({ provider, wellKnownResources, workerRoute });
    const running = await startWebServer(engine, { host: hostname, port });
    return Object.freeze({ provider, server: running.server, close: async () => { try { await running.close(); } finally { ownedOutbox?.close(); } } });
  } catch (error) { ownedOutbox?.close(); throw error; }
}

await runMain(() => serveActivityPubProvider(), { moduleUrl: import.meta.url, formatError: (error) => `${error instanceof Error ? error.stack : String(error)}\n`, exitCode: 1 });

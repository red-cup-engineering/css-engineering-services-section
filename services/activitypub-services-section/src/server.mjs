#!/usr/bin/env node

import { serve } from "@hono/node-server";
import { timingSafeEqual } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { Activity } from "@fedify/vocab";
import { createActivityPubProvider, importActorKeyPairs } from "./provider.mjs";

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

export async function loadActivityPubOutbox(outboxPath) {
  if (outboxPath === undefined) return async () => ({ items: [] });
  const source = JSON.parse(await readFile(path.resolve(outboxPath), "utf8"));
  if (!Array.isArray(source) || source.length === 0) {
    throw new TypeError("ActivityPub outbox file must contain a nonempty JSON array");
  }
  const items = await Promise.all(source.map(async (item, index) => {
    try {
      return await Activity.fromJsonLd(item);
    } catch (error) {
      throw new TypeError(`ActivityPub outbox item ${index} is invalid: ${error.message}`);
    }
  }));
  return async ({ cursor }) => ({
    items: cursor === undefined || cursor === null ? items : [],
  });
}

export async function serveActivityPubProvider(options = {}) {
  const origin = new URL(options.origin ?? requiredEnvironment("ACTIVITYPUB_ORIGIN"));
  if (origin.protocol !== "https:" && origin.hostname !== "127.0.0.1" && origin.hostname !== "localhost") {
    throw new TypeError("ACTIVITYPUB_ORIGIN must use HTTPS outside loopback development");
  }
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
  const listOutbox = options.listOutbox
    ?? await loadActivityPubOutbox(options.outboxPath ?? process.env.ACTIVITYPUB_OUTBOX_PATH);
  const provider = createActivityPubProvider({
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
    listInbox: (input) => inbox.list(input),
    listOutbox,
  });
  const port = Number(options.port ?? process.env.PORT ?? origin.port ?? "8000");
  const hostname = options.hostname ?? process.env.HOST ?? "127.0.0.1";
  const server = serve({
    hostname,
    port,
    fetch: async (request) => {
      try {
        return await provider.fetch(request);
      } catch (error) {
        process.stderr.write(`ActivityPub request failed: ${(error instanceof Error ? error.stack ?? error.message : String(error)).slice(0, 8000)}\n`);
        throw error;
      }
    },
    overrideGlobalObjects: false,
  });
  return Object.freeze({ provider, server, close: () => new Promise((resolve) => server.close(resolve)) });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  serveActivityPubProvider().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}

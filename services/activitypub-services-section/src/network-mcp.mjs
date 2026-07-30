#!/usr/bin/env node

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { promisify } from "node:util";
import { ACTIVITYPUB_ACCEPT, exchangeBoundedActivityPubA2a } from "./exchange.mjs";

const DEFAULT_ORIGIN = "https://bare-cedar-fog.561.group";
const UFTN_DISCOVERY_AGENT_CARD = "https://federated-capability-offer-discovery-cell-a2d7mjqbfa-uc.a.run.app/.well-known/agent-card.json";
const CLOUD_RUN_ACTUATOR_ORIGIN = "https://gcloud-cloud-run-actuator-1019481907460.us-central1.run.app";
const execFileAsync = promisify(execFile);

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}
const actorIdentifier = option("--actor") ?? process.env.UNION_ACTIVITYPUB_ACTOR;
const actor = option("--actor-urn") ?? process.env.UNION_ACTIVITYPUB_ACTOR_URN;
if (!actorIdentifier || !actor) throw new TypeError("--actor and --actor-urn are required");

function origin() { return (process.env.UNION_ACTIVITYPUB_ORIGIN ?? DEFAULT_ORIGIN).replace(/\/$/u, ""); }
function url(path) { return `${origin()}${path}`; }
async function textResource(path, reference) { return Object.freeze({ reference, token: (await readFile(path, "utf8")).trim() }); }
async function credentialResource(kind) {
  if (kind === "public") return null;
  if (kind === "activitypub-bearer") {
    const path = process.env.ACTIVITYPUB_INBOX_BEARER_TOKEN_FILE;
    if (!path) throw new Error("ACTIVITYPUB_INBOX_BEARER_TOKEN_FILE is required for ActivityPub bearer exchange");
    return textResource(path, "env:ACTIVITYPUB_INBOX_BEARER_TOKEN_FILE");
  }
  if (kind === "actuator-capability") {
    const path = process.env.GCLOUD_CLOUD_RUN_ACTUATOR_TOKEN_FILE;
    if (!path) throw new Error("GCLOUD_CLOUD_RUN_ACTUATOR_TOKEN_FILE is required for Cloud Run actuation");
    return textResource(path, "env:GCLOUD_CLOUD_RUN_ACTUATOR_TOKEN_FILE");
  }
  if (kind === "google-identity") {
    const path = process.env.UFTN_CLOUD_RUN_IDENTITY_TOKEN_FILE;
    if (path) return textResource(path, "env:UFTN_CLOUD_RUN_IDENTITY_TOKEN_FILE");
    const executable = process.env.GCLOUD_EXECUTABLE ?? "/home/emsenn/.local/google-cloud-sdk/bin/gcloud";
    try { const { stdout } = await execFileAsync(executable, ["auth", "print-identity-token"], { maxBuffer: 1024 * 1024 }); if (stdout.trim()) return Object.freeze({ reference: "gcloud:auth-print-identity-token", token: stdout.trim() }); }
    catch { /* exact unavailable outcome below */ }
    throw new Error("Google identity is unavailable from UFTN_CLOUD_RUN_IDENTITY_TOKEN_FILE or gcloud auth");
  }
  throw new TypeError(`unknown network authentication ${kind}`);
}
async function get(path, authenticated = false) {
  const headers = { accept: ACTIVITYPUB_ACCEPT };
  if (authenticated) { const credential = await credentialResource("activitypub-bearer"); headers.authorization = `Bearer ${credential.token}`; }
  const response = await fetch(url(path), { headers }); const text = await response.text();
  let body; try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 2000) }; }
  if (!response.ok) throw new Error(`ActivityPub ${response.status} for ${path}: ${JSON.stringify(body).slice(0, 1000)}`);
  return body;
}
async function getAbsolute(endpoint, headers = {}) {
  const response = await fetch(endpoint, { headers: { accept: ACTIVITYPUB_ACCEPT, ...headers } }); const text = await response.text();
  let body; try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 2000) }; }
  return response.ok ? { state: "reachable", endpoint, body } : { state: response.status === 401 || response.status === 403 ? "authorization-required" : "obstructed", status: response.status, endpoint, body };
}
function workOrders(collection) { return (collection?.orderedItems ?? collection?.items ?? []).filter((item) => { const value = item?.object ?? item; return /work|order|duty|obligation|task|mission|requirement|offer|dispatch/iu.test(`${item?.type ?? ""} ${value?.type ?? ""} ${value?.name ?? ""} ${value?.summary ?? ""} ${value?.content ?? ""}`); }); }
const tools = Object.freeze([
  { name: `observe_activitypub_${actorIdentifier}_actor`, description: `Read the sovereign ${actorIdentifier} Actor projection from the live ActivityPub network.`, inputSchema: { type: "object", additionalProperties: false } },
  { name: `observe_activitypub_${actorIdentifier}_inbox`, description: `Read current work Activities addressed to the ${actorIdentifier} Actor from its authenticated ActivityPub inbox.`, inputSchema: { type: "object", additionalProperties: false } },
  { name: `observe_activitypub_${actorIdentifier}_outbox`, description: `Read the ${actorIdentifier} Actor's network outbox as provider and receiver evidence.`, inputSchema: { type: "object", additionalProperties: false } },
  { name: "observe_uftn_entry", description: "Read the live UFTN bounded capability-discovery Actor Card.", inputSchema: { type: "object", additionalProperties: false } },
  { name: "observe_uftn_cloud_run_actuator", description: "Resolve the UFTN Cloud Run actuator and report exact authorization obstruction when unavailable.", inputSchema: { type: "object", additionalProperties: false } },
  { name: "observe_uftn_activitypub_actor", description: "Read one exact public ActivityPub actor by HTTPS URL.", inputSchema: { type: "object", required: ["actorUrl"], properties: { actorUrl: { type: "string", pattern: "^https://" } }, additionalProperties: false } },
  { name: "exchange_with_union_actor", description: "Make one proof-path-bounded HTTPS ActivityPub or A2A JSON-RPC exchange. Credentials remain a referenced resource; no x402 payment or chain write occurs.", inputSchema: { type: "object", required: ["protocol", "endpoint", "body"], properties: { protocol: { enum: ["activitypub", "a2a-jsonrpc"] }, endpoint: { type: "string", pattern: "^https://" }, body: { type: "object" }, authentication: { enum: ["public", "google-identity", "activitypub-bearer", "actuator-capability"], default: "public" }, a2aVersion: { type: "string", default: "1.0" }, extensions: { type: "array", items: { type: "string" } }, maximumResponseBytes: { type: "integer", minimum: 1024, maximum: 65536, default: 16384 } }, additionalProperties: false } },
]);
async function call(name, args = {}) {
  if (name === `observe_activitypub_${actorIdentifier}_actor`) return { actor, endpoint: url(`/actors/${actorIdentifier}`), projection: await get(`/actors/${actorIdentifier}`) };
  if (name === `observe_activitypub_${actorIdentifier}_inbox`) { const collection = await get(`/actors/${actorIdentifier}/inbox?page=true`, true); return { actor, source: url(`/actors/${actorIdentifier}/inbox`), activities: workOrders(collection), totalItems: collection?.totalItems ?? null, networkOnly: true }; }
  if (name === `observe_activitypub_${actorIdentifier}_outbox`) { const collection = await get(`/actors/${actorIdentifier}/outbox?page=true`); return { actor, source: url(`/actors/${actorIdentifier}/outbox`), activities: collection?.orderedItems ?? collection?.items ?? [], totalItems: collection?.totalItems ?? null, networkOnly: true }; }
  if (name === "observe_uftn_entry") return { network: "Union Federated Trade Network", role: "bounded capability discovery entry", ...await getAbsolute(UFTN_DISCOVERY_AGENT_CARD) };
  if (name === "observe_uftn_cloud_run_actuator") {
    const credential = await credentialResource("google-identity");
    return { network: "Union Federated Trade Network", actor: "urn:ame:gcloud-cloud-run-actuator-service", actorEndpoint: `${CLOUD_RUN_ACTUATOR_ORIGIN}/actor`, inboxEndpoint: `${CLOUD_RUN_ACTUATOR_ORIGIN}/inbox`, outboxEndpoint: `${CLOUD_RUN_ACTUATOR_ORIGIN}/outbox`, a2aEndpoint: `${CLOUD_RUN_ACTUATOR_ORIGIN}/a2a`, capabilitySlot: "GCLOUD_CLOUD_RUN_ACTUATOR_TOKEN_FILE", ...await getAbsolute(`${CLOUD_RUN_ACTUATOR_ORIGIN}/.well-known/agent-card.json`, { authorization: `Bearer ${credential.token}` }) };
  }
  if (name === "observe_uftn_activitypub_actor") return { actor: args.actorUrl, ...await getAbsolute(args.actorUrl) };
  if (name === "exchange_with_union_actor") return exchangeBoundedActivityPubA2a(args, { credentialResource });
  throw new TypeError(`unknown ActivityPub network operation ${name}`);
}
function response(value) { return { content: [{ type: "text", text: JSON.stringify(value) }], structuredContent: value }; }
const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of lines) { if (!line.trim()) continue; let request; try { request = JSON.parse(line); let result; if (request.method === "initialize") result = { protocolVersion: request.params?.protocolVersion ?? "2025-03-26", capabilities: { tools: { listChanged: false } }, serverInfo: { name: `bare-cedar-fog-${actorIdentifier}-activitypub-network`, version: "2.0.0" } }; else if (request.method === "notifications/initialized") continue; else if (request.method === "tools/list") result = { tools }; else if (request.method === "tools/call") result = response(await call(request.params?.name, request.params?.arguments ?? {})); else if (request.method === "ping") result = {}; else throw new TypeError(`unsupported MCP method ${request.method}`); if (request.id !== undefined) process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: request.id, result })}\n`); } catch (error) { if (request?.id !== undefined) process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: request.id, error: { code: -32602, message: error instanceof Error ? error.message : String(error) } })}\n`); } }

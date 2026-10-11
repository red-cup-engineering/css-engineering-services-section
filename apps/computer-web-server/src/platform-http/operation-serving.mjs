/**
 * Serving an operation family over HTTP and MCP: the discovery, OpenAPI, MCP and HTML faces of
 * an induced surface, one route per operation with content negotiation, manifolds of several
 * mounted families, continuation and event-stream reads of the witness log, and claim sessions
 * over WebSocket. Any engine or platform that offers operations serves them through here.
 */
import { createMcpServer } from "@red-cup-engineering/mcp-engineering-services-section/server";
import { createNativeApplicationServer } from "../native-application.mjs";
import { slotRef } from "@red-cup-engineering/computer-system-engine/rpc/manifold";
import { readTextBody } from "@red-cup-engineering/http-services-section/body";
import { sse } from "@red-cup-engineering/http-services-section/sse";
import { wellKnown } from "@red-cup-engineering/http-services-section/well-known";
import { induceSurface } from "@red-cup-engineering/computer-system-engine/rpc/induce";
import { wireCodec, wireByMediaType, WIRE_CODEC_NAMES } from "@red-cup-engineering/computer-system-engine/wire";
import { actionByMcpToolName, actionMcpPrompts, actionMcpResources, actionMcpToolsWithEndpoints, actionOpenApi } from "@red-cup-engineering/computer-system-engine/rpc/apex";
import { sseFrame, sseHeaders } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/server-sent-event";
import { isCompressible } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/media-type";
import { leqK } from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";
import { negotiateType } from "@red-cup-engineering/http-services-section/negotiation";
import { encodeFrame, acceptKey, FrameDecoder } from "@red-cup-engineering/code-websocket-frame-service";
const isReadingInKnowledge = (name) => isReading(name, "knowledge");
import { claim, conflicts, judge, sessionRegime, openSession } from "@red-cup-engineering/relating/running/session";
import { eavtId } from "@red-cup-engineering/eavt-services-section/row";
import { jsonRepr } from "@red-cup-engineering/http-services-section/representation";
import { mediaTypeCorner } from "@red-cup-engineering/computer-web-server/platform-http/codec/negotiation/media-type";
import { exchangeClaim } from "@red-cup-engineering/computer-web-server/platform-http/claim-sessions/ws-session";
import { negotiateRepresentation } from "@red-cup-engineering/computer-web-server/platform-http/codec/negotiation/representation";
import { isReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

/** Write one routed response ({ status, type, body, headers? }) to a Node response. */
export function send(response, routed) {
  const body = typeof routed.body === "string" ? routed.body : String(routed.body ?? "");
  response.writeHead(routed.status ?? 200, { "content-type": routed.type, "content-length": Buffer.byteLength(body), "cache-control": "no-store", ...(routed.headers ?? {}) });
  response.end(body);
}

// ---- merged from relating-http-app.mjs (2026-09-22) ----
/**
 * @packageDocumentation
 * services/http/app: the small HTTP app object language below the action
 * apex — representation objects, resource descriptors, body readers,
 * `.well-known` resources, and an SSE writer over relating's own frame
 * codecs. Owns none of listener lifecycle, deployment policy, durable
 * sessions, middleware, a web framework contract, or a projected-event hub
 * (that multi-subscriber concern lives above relating, in the servers layer).
 */

export { sse, wellKnown };

/** Representation data a handler returns before it is written to `node:http`. */

/** Shared metadata options for constructing a response representation. */

/** Options for `jsonRepr`, including media type and pretty-print controls. */

/** Options for text-like response representations. */

/** A handler result: representation data, a Web `Response`, or no response. */

/** Resource handler over a fully matched request context. */

/** Middleware can append trace rows, continue routing, or return a response. */

export function emptyRepr(status = 204, options = {}) {
  return repr({ ...options, status });
}

function repr(options) {
  const out = {};
  if (options.status !== undefined) out.status = options.status;
  if (options.headers !== undefined) out.headers = options.headers;
  if (options.trailers !== undefined) out.trailers = options.trailers;
  if (options.type !== undefined) out.type = options.type;
  if (options.body !== undefined) out.body = options.body;
  if (options.cacheControl !== undefined) out.cacheControl = options.cacheControl;
  if (options.security !== undefined) out.security = options.security;
  if (options.etag !== undefined) out.etag = options.etag;
  if (options.lastModified !== undefined) out.lastModified = options.lastModified;
  return out;
}

// ---- merged from relating-http-server.mjs (2026-09-22) ----
/**
 * HTTP server service bindings for relating action routers.
 *
 * `src/running` owns pure route decisions over induced apices. This service
 * module binds those routes to `node:http` sockets.
 */

function lastEventIdOf(req) {
  const id = req.headers["last-event-id"];
  return typeof id === "string" ? id : undefined;
}

async function servedRequest(req, options) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const query = {};
  for (const [key, value] of url.searchParams) query[key] = value;
  const accept = req.headers["accept"];
  return {
    method: req.method ?? "GET",
    path: url.pathname,
    query,
    body: req.method === "POST" ? await readTextBody(req, options.body) : "",
    accept: typeof accept === "string" ? accept : undefined,
    lastEventId: lastEventIdOf(req),
  };
}

function operationServer(route, options) {
  return createNativeApplicationServer({
    problems: true,
    resources: [{
      match: () => ({}),
      handler: async ({ req }) => route(await servedRequest(req, options)),
    }],
  });
}

export function serveManifold(mounts, options = {}) {
  const server = operationServer((request) => routeManifold(mounts, request, options), options);
  attachClaimSession(server);
  return server;
}

export function serve(actions, options = {}) {
  const server = operationServer((request) => routeRequest(options.induced ?? induceSurface(actions), request, options), options);
  attachClaimSession(server);
  return server;
}

export function serveCarrierManifold(mounts, options = {}, registry) {
  return operationServer((request) => routeCarrierManifold(mounts, request, options, registry), options);
}

// ---- merged from relating-serving.mjs (2026-09-22) ----
/**
 * acting/serving — the four transports as functorial images of the apex.
 *
 * `induceSurface` gives one `InducedSurface` carrier (the coproduct apex of a module's
 * actions). This module projects it, with no second ontology, to:
 *   - CLI         — `dispatch` (elsewhere; the `relate` bin)
 *   - HTTP        — `POST /:verb` (body→stdin, stdout→response), `GET /` discovery, `GET /health`
 *   - OpenAPI     — `GET /openapi.json` (a 3.1.1 document derived from the actions)
 *   - MCP         — `POST /mcp` (tools, resources, and prompts over one apex)
 *   - web UX      — `GET /:verb` (a basic HTML form) and `GET /` (the index)
 *
 * The MCP projection is the full standard knowledge-vault surface: `tools/list`
 * and `tools/call` run the morphisms; `resources/list` and `resources/read`
 * serve the package's schemas and discovery carrier; `prompts/list` and
 * `prompts/get` serve the guided per-action (and registered) prompts. All three
 * are functorial images of the same `induceSurface` apex — no second ontology.
 *
 * Every routed POST goes through `dispatch`, so an HTTP/MCP/form call is a
 * scripted play and is witnessed as EAVT exactly like a CLI call. Pure routing
 * (`routeRequest`) is separated from the thin live HTTP binding in
 * `services/http`.
 */

/**
 * Pure routed response returned by the serving projection.
 *
 * This is deliberately smaller than a live HTTP response: the router
 * computes only status, content type, and body bytes. The `serve*` helpers bind
 * this value to Node's mutable socket API at the edge.
 */

/**
 * Pure routed request consumed by the serving projection.
 *
 * `accept` drives corner-aware content negotiation when no explicit
 * `output-format` is selected; absent, the action's declared output is served.
 * This keeps the core router testable without an HTTP listener while still
 * preserving the one header that changes the representation face.
 */

/**
 * Options shared by pure routing and live HTTP bindings.
 *
 * Dispatch options flow through unchanged, so a routed HTTP/MCP/form call can be
 * witnessed in the same append-only ledger as CLI dispatch. The extra fields
 * affect only mounted paths and generated descriptive documents.
 */

  

/** Project a value to a JSON routed response. */
export const json = (value, status = 200) => ({ status, type: "application/json; charset=utf-8", body: `${JSON.stringify(value, null, 2)}\n` });
/** Project HTML text to a routed response. */
export const html = (body, status = 200) => ({ status, type: "text/html; charset=utf-8", body });
/** Project plain text to a routed response. */
export const text = (body, status) => ({ status, type: "text/plain; charset=utf-8", body });

/** The content corner the settled value commits to: the corner of the action's
 *  declared output wire. A value crosses the boundary down this corner but never up
 *  — negotiation may settle it to a lower corner, never fabricate a richer one. */
function valueCorner(endpoint) {
  const codec = wireByMediaType(endpoint.output);
  return codec?.corner ?? mediaTypeCorner(endpoint.output);
}

/** Choose the wire to emit a response down, honoring the bilattice asymmetry.
 *
 *  An explicit `output-format` is a NAMED selection and always wins (the caller
 *  asked for that wire by name). Otherwise, when an `Accept` header is present, the
 *  offered wires are negotiated against it BUT restricted to those whose content
 *  corner does not exceed the settled value's: a `data` value may be served as
 *  json but never as turtle/sen (`assertion`), because that would fabricate
 *  assertivity the value does not carry. With no `Accept` and no explicit format,
 *  the action's declared output is served. Returns the wire NAME for dispatch and
 *  the media type to label the response. */
export function negotiateOutputWire(
  endpoint,
  explicitOutName,
  accept,
) {
  if (explicitOutName !== undefined) {
    return { name: explicitOutName, mediaType: wireCodec(explicitOutName).mediaType };
  }
  if (accept === undefined || accept.trim() === "") {
    return { name: undefined, mediaType: endpoint.output };
  }
  const offered = WIRE_CODEC_NAMES.map((n) => wireCodec(n).mediaType);
  const chosen = negotiateRepresentation(accept, offered, valueCorner(endpoint));
  if (chosen === null) return { name: undefined, mediaType: endpoint.output };
  const codec = wireByMediaType(chosen);
  // The declared output already matches the negotiated representation: serve it as-is.
  if (codec === undefined || codec.mediaType === endpoint.output) {
    return { name: undefined, mediaType: endpoint.output };
  }
  return { name: codec.name, mediaType: codec.mediaType };
}

function mcpResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}
function mcpError(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

export function promptArguments(value) {
  if (typeof value !== "object" || value === null) return {};
  const out = {};
  for (const [key, raw] of Object.entries(value)) {
    out[key] = typeof raw === "string" ? raw : JSON.stringify(raw);
  }
  return out;
}

/** The boundary document for an action's input from an MCP `arguments.input`. */
export function stdinOf(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * An apex's catalog on the house's one MCP server: each tool, resource and prompt the apex projects,
 * served by the MCP section's dispatcher. `callTool(name, args, context)` runs a tool;
 * `readResource(uri)` is `{ mimeType, text }` or undefined; `getPrompt(name, args)` is the prompt.
 */
export function apexMcpServer({ name, version, tools, callTool, resources = [], readResource, prompts = [], getPrompt }) {
  return createMcpServer({
    name,
    version,
    tools: tools.map((tool) => Object.freeze({ ...tool, inputSchema: tool.inputSchema ?? { type: "object" }, admitArguments: false, handler: (args, context) => callTool(tool.name, args, context) })),
    resources: resources.map((resource) => Object.freeze({ ...resource, read: (uri) => readResource(uri) })),
    prompts: prompts.map((prompt) => Object.freeze({ ...prompt, get: (args) => getPrompt(prompt.name, args) })),
  });
}

function promptOf(induced, name, args) {
  const prompt = induced.prompts.find((candidate) => candidate.name === name);
  if (prompt === undefined) throw new Error(`no such prompt: ${name}`);
  return { ...(prompt.description === undefined ? {} : { description: prompt.description }), messages: prompt.compose(promptArguments(args)) };
}

function resourceOf(induced, uri) {
  const resource = induced.resources.find((candidate) => candidate.uri === uri);
  return resource === undefined ? undefined : { mimeType: resource.mimeType, text: resource.read() };
}

const actionServers = new WeakMap();

function actionMcpServer(induced, version) {
  if (!actionServers.has(induced)) {
    actionServers.set(induced, apexMcpServer({
      name: induced.discovery.package,
      version,
      tools: actionMcpToolsWithEndpoints(induced.operations, induced.discovery.programs),
      callTool: async (name, args, context) => {
        const action = actionByMcpToolName(induced.operations, name);
        const options = context.options ?? {};
        const result = await induced.dispatchAsync([action.verb], stdinOf(args.input), options);
        if (result.code !== 0) return { isError: true, content: [{ type: "text", text: result.stderr.trim() }] };
        const endpoint = induced.discovery.programs.find((bin) => bin.name === action.verb);
        const text = endpoint !== undefined && endpoint.settlement.finality !== "normal-form"
          ? JSON.stringify(partialObservation(endpoint, result.stdout, options.basePath ?? ""), null, 2)
          : result.stdout.trim();
        return {
          content: [{ type: "text", text }],
          _meta: { "relating/action-identity": action.verb },
          ...(endpoint?.settlement.finality === "normal-form" && action?.codomain !== undefined ? { structuredContent: { output: parseOutput(result.stdout) } } : {}),
        };
      },
      resources: actionMcpResources(induced),
      readResource: (uri) => resourceOf(induced, uri),
      prompts: actionMcpPrompts(induced),
      getPrompt: (name, args) => promptOf(induced, name, args),
    }));
  }
  return actionServers.get(induced);
}

/**
 * One MCP JSON-RPC message against an induced action apex: its tools (routed through the apex's
 * dispatcher, so codecs and witnessing stay those of CLI and HTTP dispatch), resources and prompts,
 * served by the one MCP server. Notifications answer undefined.
 */
export async function actionMcpHandle(induced, message, options = {}) {
  const answer = await actionMcpServer(induced, options.version ?? "0.0.0").handleMessage(message, { options });
  return answer ?? undefined;
}

/** The Scott transport route: `GET /feed` streams the witness log as resumable SSE,
 *  resuming after `Last-Event-ID`. The log is read through `options.witnessLog`, so
 *  pure routing stays I/O-free; the live bindings inject today's invocation log. */
function feedRoute(request, options) {
  return {
    status: 200,
    type: "text/event-stream; charset=utf-8",
    headers: { "cache-control": "no-cache", connection: "keep-alive" },
    body: streamWitnessLog(options.witnessLog?.() ?? [], request.lastEventId),
  };
}

function parseOutput(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    return stdout;
  }
}

export function continuationHandle(endpoint, base) {
  const endpointHref = endpoint.href.startsWith("/") ? endpoint.href : `/${endpoint.href}`;
  const href = base !== "" && endpointHref.startsWith(`${base}/`) ? endpointHref : `${base}${endpointHref}`;
  if (endpoint.settlement.transport === "event-stream") {
    return { kind: "sse", href, cursor: null, lastEventId: null };
  }
  if (endpoint.settlement.transport === "websocket-session") {
    return { kind: "websocket", href, subscriptionUrl: href };
  }
  return { kind: "none" };
}

function partialObservation(endpoint, stdout, base) {
  return {
    kind: "relating.action.partial-settlement",
    final: false,
    regime: endpoint.settlement.regime,
    transport: endpoint.settlement.transport,
    partial: parseOutput(stdout),
    continuation: continuationHandle(endpoint, base),
  };
}

/** A result's approximation chain: a settlement's or filtration's stages as they were told, else what
 *  the host's `approximate` makes of the value (by default the one value). The server settles nothing
 *  itself: a host whose results are sites passes the settling that approximates them. */
export function approximationChain(stdout, approximate = (value) => [value]) {
  const value = parseOutput(stdout);
  if (value?.kind === "signcraft.settlement" || value?.kind === "signcraft.filtration") return value.stages;
  return approximate(value);
}

export function eventIndexAfter(lastEventId) {
  if (lastEventId === undefined || lastEventId.trim() === "") return 0;
  const parsed = Number(lastEventId);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed + 1 : 0;
}

function actionEventStreamResponse(endpoint, result, request, options = {}) {
  const chain = approximationChain(result.stdout, options.approximate);
  const from = eventIndexAfter(request.lastEventId);
  const frames = chain.slice(from).map((partial, offset) =>
    sseFrame("approximation", {
      kind: "relating.action.approximation",
      regime: endpoint.settlement.regime,
      final: false,
      partial,
    }, String(from + offset))).join("");
  return {
    status: 200,
    type: "text/event-stream; charset=utf-8",
    headers: { "cache-control": "no-cache", connection: "keep-alive" },
    body: frames,
  };
}

export function wantsEventStream(request) {
  const transport = request.query["transport"];
  return transport === "sse"
    || transport === "event-stream"
    || (request.accept ?? "").split(",").some((part) => part.trim().toLowerCase().startsWith("text/event-stream"));
}

/**
 * Route one request against an induced action apex: its discovery, health, OpenAPI and feed faces,
 * `POST /mcp`, and each action at `/<verb>` (negotiated input and output wires, awaited dispatch,
 * so an action body may return a promise).
 */
export async function routeRequest(induced, request, options = {}) {
  const base = (options.basePath ?? "").replace(/\/+$/, "");
  const path = request.path.startsWith(base) ? request.path.slice(base.length) : request.path;
  const verbOf = (p) => decodeURIComponent(p.replace(/^\//, ""));

  if (request.method === "GET" && (path === "" || path === "/")) {
    return options.renderIndex ? html(options.renderIndex(induced.discovery, base)) : json(induced.discovery);
  }
  if (request.method === "GET" && path === "/health") return json({ status: "ok", package: induced.discovery.package });
  if (request.method === "GET" && path === "/openapi.json") return json(actionOpenApi(induced, options));
  if (request.method === "GET" && path === "/discovery") return json(induced.discovery);
  if (request.method === "GET" && path === "/feed") return feedRoute(request, options);

  if (request.method === "POST" && path === "/mcp") {
    let message;
    try {
      message = JSON.parse(request.body);
    } catch {
      return json(mcpError(null, -32700, "parse error"), 200);
    }
    const response = await actionMcpHandle(induced, message, options);
    return response === undefined ? { status: 202, type: "application/json; charset=utf-8", body: "" } : json(response);
  }

  const verb = verbOf(path);
  const endpoint = induced.discovery.programs.find((bin) => bin.name === verb);
  if (endpoint === undefined) return text(`no such operation: ${verb}\n`, 404);

  const outName = request.query["output-format"];
  const carrierFields = Object.entries(request.query).filter(([key]) => key !== "input-format" && key !== "output-format" && key !== "transport");
  if (request.method === "GET" && carrierFields.length === 0) {
    return options.renderForm ? html(options.renderForm(endpoint, base)) : json(endpoint);
  }

  if (request.method === "GET" || request.method === "POST") {
    let stdin;
    let inName;
    if (carrierFields.length > 0) {
      stdin = new URLSearchParams(carrierFields).toString();
      inName = request.query["input-format"] ?? "form";
    } else {
      stdin = request.body.startsWith("body=") ? decodeURIComponent(request.body.slice(5).replace(/\+/g, " ")) : request.body;
      inName = request.query["input-format"];
    }
    const negotiated = negotiateOutputWire(endpoint, outName, request.accept);
    const argv = [verb, ...(inName ? ["--input-format", inName] : []), ...(negotiated.name ? ["--output-format", negotiated.name] : [])];
    const result = await induced.dispatchAsync(argv, stdin, options);
    if (result.code !== 0) return text(result.stderr, result.code === 2 ? 400 : 422);
    if (endpoint.settlement.finality !== "normal-form") {
      if (endpoint.settlement.transport === "event-stream" && wantsEventStream(request)) {
        return actionEventStreamResponse(endpoint, result, request, options);
      }
      return json(partialObservation(endpoint, result.stdout, base));
    }
    return { status: 200, type: negotiated.mediaType, body: result.stdout };
  }

  return text("method not allowed\n", 405);
}

// ── the manifold: a bundle of modules served as one tiled app ────────────────
//
// `serve` mounts ONE module's apex. A manifold mounts a chosen set of modules on
// one origin, each under its own name, TILED: a module mounts at the tail of
// whatever produces its domain carrier, so the URL path spells the data-flow
// composition rather than a flat `/<pkg>/<verb>` list. The wiring graph is derived
// from carrier identities: edge producer->consumer iff a consumer action's domain
// carrier id equals a producer action's codomain carrier id. `routeRequest` is
// reused unchanged: each mount is routed with its tiled basePath, so every mounted
// call is witnessed into its OWN package's EAVT ledger exactly as a standalone call.

/**
 * One induced package mounted into a tiled manifold.
 *
 * The mount name supplies the URL segment; the induced apex supplies every face
 * below that segment. Tiling derives placement from carrier identities rather than a
 * hand-written route tree.
 */

/**
 * Read the carrier `$id` from a domain/codomain schema slot.
 *
 * Only direct `$ref` slots participate in action composition and manifold
 * tiling. Richer schema structure remains schema data; it is not treated as a
 * mount edge.
 */

/**
 * Carrier `$id`s emitted by a mounted package's actions.
 *
 * These are codomain refs, the local outputs a downstream module may consume.
 */
export function producedIds(induced) {
  const ids = new Set();
  for (const act of induced.operations) if (act.codomain !== undefined) ids.add(act.codomain.id);
  return ids;
}

/**
 * Carrier `$id`s admitted by a mounted package's actions.
 *
 * These are domain refs, the local inputs an upstream module may produce.
 */
export function consumedIds(induced) {
  const ids = new Set();
  for (const act of induced.operations) if (act.domain !== undefined) ids.add(act.domain.id);
  return ids;
}

/**
 * Test whether package `a` can feed package `b` by carrier identity.
 *
 * This is the manifold-level version of action composition: an edge exists when
 * a produced carrier `$id` equals a consumed carrier `$id`.
 */
export function feeds(a, b) {
  const produced = producedIds(a);
  for (const id of consumedIds(b)) if (produced.has(id)) return true;
  return false;
}

/**
 * Derive the tiled base path of each mount, keyed by mount name.
 *
 * A module mounts under a producer of its domain carrier
 * (`/<producer>/<module>`); a source with no internal producer mounts at the
 * root (`/<module>`). The path spells the composition. Resolution is
 * order-independent and cycle-safe: an unplaceable module (its producer cycles,
 * or is not placed) falls back to a root mount.
 */
export function tileManifold(mounts) {
  const byName = new Map(mounts.map((m) => [m.name, m]));
  // For each module, the producer it tiles under (deterministic: first by name).
  const producerOf = new Map();
  for (const m of mounts) {
    const producers = mounts
      .filter((p) => p.name !== m.name && feeds(p.induced, m.induced))
      .map((p) => p.name)
      .sort();
    if (producers.length > 0) producerOf.set(m.name, producers[0]);
  }
  const paths = new Map();
  const place = (name, seen) => {
    const existing = paths.get(name);
    if (existing !== undefined) return existing;
    const producer = producerOf.get(name);
    const path = producer === undefined || seen.has(producer) || !byName.has(producer)
      ? `/${name}`
      : `${place(producer, new Set([...seen, name]))}/${name}`;
    paths.set(name, path);
    return path;
  };
  for (const m of mounts) place(m.name, new Set([m.name]));
  return paths;
}

/**
 * Route one request across a tiled manifold: the longest tiled base path wins, and the request is
 * routed against that mount's apex.
 */
export async function routeManifold(mounts, request, options = {}) {
  const root = (options.basePath ?? "").replace(/\/+$/, "");
  const path = request.path.startsWith(root) ? request.path.slice(root.length) : request.path;
  const paths = tileManifold(mounts);

  if (request.method === "GET" && (path === "" || path === "/")) {
    return options.renderManifoldIndex
      ? html(options.renderManifoldIndex(mounts, paths))
      : json({ mounts: [...paths.entries()].map(([name, path]) => ({ name, path })) });
  }

  const ranked = [...mounts]
    .map((m) => ({ mount: m, base: paths.get(m.name) ?? `/${m.name}` }))
    .sort((x, y) => y.base.length - x.base.length);
  for (const { mount, base } of ranked) {
    if (path === base || path.startsWith(`${base}/`)) {
      return routeRequest(mount.induced, request, { ...options, ...mount.options, basePath: `${root}${base}` });
    }
  }
  return text(`no such module for path: ${path}\n`, 404);
}

// ---- merged from relating-mounting.mjs (2026-09-22) ----
/**
 * acting/mounting — the carrier-node mounting layer: a four-faced apex at every
 * carrier `$id`-node of a served subtree.
 *
 * `routeManifold`/`tileManifold` tile mounts by *module tail* — a consumer mounts
 * under whatever produces its domain carrier, so the URL spells the data-flow
 * composition. This layer generalizes that: it addresses each mount by the carrier
 * node its domain acts ON, mounting at the carrier's bare `$id` descent path (the
 * `$id` IS the path; refactor decision #1). Every carrier node then gets the four
 * faces — `GET /`, `GET /:verb`, `POST /:verb`, `GET /openapi.json`, `POST /mcp`,
 * `GET /health`, `GET /discovery` — for free, because routing delegates to the
 * existing `routeRequest` at the node's base path with NO per-node hand-wiring.
 *
 * The "carrier $id a mount acts on" is read from its actions' domain carrier ids
 * (the same `$id` match `tileManifold` already uses). A mount with no resolvable
 * domain carrier (a pure source) falls back to the existing module-tail placement
 * via `tileManifold`, so there is no regression: carrier-node match → mount at the
 * `$id` path; else → module-tail path. Both kinds coexist in one map.
 *
 * Everything here is additive and pure. The live HTTP binding lives in
 * `services/http/server`.
 */

/** Minimal HTML text escape for the namespace web-UX projection. */
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] ?? ch));
}

/** A carrier-node mount: a guest apex plus the carrier `$id` its domain acts on. */

/** One node of the namespace tree: a carrier `$id`-path and the mounts at it. */

/** The mount's domain carrier `$id` — the node it mounts at. Deterministic
 *  (first by sort) when several domain carriers are referenced. Undefined for a
 *  pure source (no domain `$ref`). */
export function domainNodeOf(induced) {
  for (const act of induced.operations) {
    const id = act.domain?.id;
    if (id !== undefined) return id;
  }
  return undefined;
}

/** True iff the mount both consumes and produces `nodeId` — the self-loop case
 *  (communicating is endomorphic on the meme carrier: meme in, meme out). */
export function isEndoMount(induced, nodeId) {
  return consumedIds(induced).has(nodeId) && producedIds(induced).has(nodeId);
}

/** The carrier `$id`s a mount's actions reference on either slot. */
function referencedIds(induced) {
  const ids = new Set();
  for (const act of induced.operations) {
    if (act.domain !== undefined) ids.add(act.domain.id);
    if (act.codomain !== undefined) ids.add(act.codomain.id);
  }
  return [...ids];
}

/** Build the namespace tree from carrier `$id`s. The node-id universe is every
 *  registered `$id` (when a registry is passed) plus every domain/codomain `$id`
 *  any mount references, so even a carrier the host did not pre-register gets a
 *  node. Mounts are bucketed by their `nodeId`; a registry node with no mounts is
 *  still materialized (an empty, navigable carrier node) so the tree is whole.
 *  Returned sorted by path length descending — longest-base-first for routing. */
export function carrierNodeTree(
  mounts,
  registry,
) {
  const universe = new Set();
  if (registry !== undefined) for (const id of registry.ids()) universe.add(id);
  for (const m of mounts) for (const id of referencedIds(m.induced)) universe.add(id);

  const byNode = new Map();
  for (const m of mounts) {
    const id = m.nodeId ?? domainNodeOf(m.induced);
    if (id === undefined) continue;
    universe.add(id);
    const bucket = byNode.get(id);
    if (bucket === undefined) byNode.set(id, [m]);
    else bucket.push(m);
  }

  const nodes = [];
  for (const id of universe) {
    const at = byNode.get(id) ?? [];
    nodes.push({
      id,
      path: `/${id}`,
      mounts: at,
      endo: at.some((m) => isEndoMount(m.induced, id)),
    });
  }
  nodes.sort((a, b) => b.path.length - a.path.length);
  return nodes;
}

/** The base path of each mount, keyed by name — the generalization of
 *  `tileManifold`. A mount whose domain resolves to a carrier node mounts at that
 *  carrier's `$id` path (`/<id>`); a mount with no resolvable domain carrier (a
 *  pure source) falls back to the existing module-tail placement via
 *  `tileManifold` for exactly those unplaceable mounts. Both kinds coexist. */
export function tileCarrierNodes(
  mounts,
  registry,
) {
  const nodeIds = new Set(carrierNodeTree(mounts, registry).map((n) => n.id));
  const paths = new Map();
  const unplaceable = [];
  for (const m of mounts) {
    const id = m.nodeId ?? domainNodeOf(m.induced);
    if (id !== undefined && nodeIds.has(id)) paths.set(m.name, `/${id}`);
    else unplaceable.push({ name: m.name, induced: m.induced });
  }
  if (unplaceable.length > 0) {
    const fallback = tileManifold(unplaceable);
    for (const [name, base] of fallback) if (!paths.has(name)) paths.set(name, base);
  }
  return paths;
}

/** The HTML index of the whole namespace: every node at its `$id` path, with the
 *  mount package names and `↻` for self-loops — the space navigable as one. */
export function carrierManifoldIndexHtml(nodes) {
  const items = nodes.map((node) => {
    const guests = node.mounts.map((m) => escapeHtml(m.induced.discovery.package)).join(", ");
    const endo = node.endo ? " ↻" : "";
    const tail = guests === "" ? "" : ` — ${guests}`;
    return `<li><a href="${escapeHtml(node.path)}"><code>${escapeHtml(node.id)}</code></a>${endo}${tail}</li>`;
  }).join("\n");
  return [
    "<!doctype html><meta charset=utf-8>",
    "<title>carrier manifold</title>",
    "<h1>carrier manifold</h1>",
    "<p>A namespace of carrier nodes; each mounts a four-faced apex at its <code>$id</code> descent path. <code>↻</code> marks a self-loop.</p>",
    `<ol>${items}</ol>`,
  ].join("\n");
}

/** One four-faced apex over several guests co-mounted at one route point: the coproduct
 *  of their actions through the existing `induceSurface`. The node-level `GET /`,
 *  `GET /openapi.json`, and `POST /mcp` are projected from this pooled apex; each
 *  individual POST still dispatches through the OWNING mount so witnessing lands
 *  in the right per-package ledger. */
export function aggregateNodeApex(mounts, nodeId) {
  const actions = mounts.flatMap((m) => [...m.induced.operations]);
  return induceSurface(actions, { packageName: nodeId });
}

/** Route one request against a carrier manifold, awaiting async action bodies. */
export async function routeCarrierManifold(
  mounts,
  request,
  options = {},
  registry,
) {
  const root = (options.basePath ?? "").replace(/\/+$/, "");
  const path = request.path.startsWith(root) ? request.path.slice(root.length) : request.path;

  if (request.method === "GET" && (path === "" || path === "/")) {
    return html(carrierManifoldIndexHtml(carrierNodeTree(mounts, registry)));
  }

  const paths = tileCarrierNodes(mounts, registry);
  const byBase = new Map();
  for (const m of mounts) {
    const base = paths.get(m.name);
    if (base === undefined) continue;
    const bucket = byBase.get(base);
    if (bucket === undefined) byBase.set(base, [m]);
    else bucket.push(m);
  }

  const ranked = [...byBase.entries()].sort((x, y) => y[0].length - x[0].length);
  for (const [base, at] of ranked) {
    if (path !== base && !path.startsWith(`${base}/`)) continue;
    const opts = { ...options, basePath: `${root}${base}` };
    if (at.length === 1) return routeRequest(at[0].induced, request, opts);

    const tail = path === base ? "" : path.slice(base.length + 1);
    const verb = decodeURIComponent(tail);
    const owner = at.find((m) => m.induced.discovery.programs.some((bin) => bin.name === verb));
    if (owner !== undefined && verb !== "" && verb !== "mcp" && verb !== "openapi.json" && verb !== "health" && verb !== "discovery") {
      return routeRequest(owner.induced, request, opts);
    }
    const pooled = aggregateNodeApex(at, base.replace(/^\//, ""));
    return routeRequest(pooled, request, opts);
  }
  return text(`no carrier node for path: ${path}\n`, 404);
}

// ---- merged from relating-http-media-type.mjs (2026-09-22) ----
// media-type.mts — media-type knowledge that negotiation leans on: the
// file-extension table, compressibility classification, and the content-commitment
// corner each media type carries.

export { isCompressible };

// The content-commitment corner ⟨addressability, assertivity⟩ a media type carries.
// Opaque/blob and plain text degrade to `bottom` (any value may serialize there);
// structured-but-non-asserting data is `data`; truth-apt linked/marked forms are
// `assertion`. Used to keep negotiation from fabricating a richer corner than the
// settled value holds.
const TYPE_CORNERS = {
  "application/octet-stream": "bottom",
  "text/plain": "bottom",
  "application/json": "data",
  "application/jsonl": "data",
  "application/xml": "data",
  "application/xmi+xml": "assertion",
  "text/vnd.mermaid": "assertion",
  "text/x-plantuml": "assertion",
  "text/markdown": "assertion",
  "text/html": "assertion",
  "image/svg+xml": "assertion",
  "text/turtle": "assertion",
  "application/n-quads": "assertion",
  "application/eavt+jsonl": "assertion",
  "application/sen+json": "assertion",
  "application/activity+json": "assertion",
  "application/cloudevents+json": "assertion",
  "application/didcomm-plain+json": "assertion",
  "application/didcomm-encrypted+json": "data",
  "application/vnd.npm.manifest+json": "assertion",
  "application/vnd.npm.bin-surface+json": "assertion",
  "application/vnd.npm.export-surface+json": "assertion",
  "application/vnd.npm.type-graph+json": "assertion",
  "application/vnd.pnpm.workspace+json": "assertion",
  "application/vnd.pnpm.dependency-graph+json": "assertion",
  "application/vnd.pnpm.cover+json": "assertion",
  "application/vnd.pnpm.resolution+json": "assertion",
  "application/vnd.git.commit-graph+json": "assertion",
  "application/vnd.git.causal-set+json": "assertion",
};

// ---- merged from relating-http-representation.mjs (2026-09-22) ----
// representation.mts — corner-aware content negotiation.
//
// Plain `negotiateType` ranks offered media types by the Accept header. This
// layer adds the bilattice asymmetry: a settled value may be projected DOWN to a
// lower content corner (drop addressability/assertivity — lossy but sound), but
// never UP, which would fabricate structure the value does not carry. So the
// admissible representations are exactly those whose corner does not exceed the
// value's in the knowledge order ≤_k.

// ---- merged from relating-ledger-stream.mjs (2026-09-22) ----
// ledger/stream — the Scott transport: an append-only EAVT witness log
// streamed as Server-Sent Events.
//
// The witness log is monotone (append-only), so streaming it is the κ=ω Scott
// session: each new row is one SSE event, the row's content identity is its event
// id, and `Last-Event-ID` resumes from the next row. Appending rows only appends
// frames — coordination-free, the same CALM property the log itself has. Pure: no
// I/O (the caller reads the log via ./store and binds the HTTP response).

/** The SSE event name carrying one witnessed EAVT row. */
export const EAVT_EVENT = "datom";

/** The index of the first row to send after `lastEventId` (0 if absent/unknown). */
function resumeIndex(log, lastEventId) {
  if (lastEventId === undefined) return 0;
  const at = log.findIndex((row) => eavtId(row) === lastEventId);
  return at < 0 ? 0 : at + 1;
}

/** Project an append-only EAVT witness log into SSE frames, resuming after
 *  `lastEventId`. Each row becomes one `datom` event whose id is the row's content
 *  identity, so a reconnecting client replays from exactly where it left off.
 *  Monotone: extending the log only extends the output (the Scott/CALM property). */
export function streamWitnessLog(log, lastEventId) {
  return log
    .slice(resumeIndex(log, lastEventId))
    .map((row) => sseFrame(EAVT_EVENT, row, eavtId(row)))
    .join("");
}

/** A served SSE response: a status, the event-stream headers, and the resumable
 *  frame body. Kept separate from the running `ServedResponse` because SSE needs
 *  its own headers (no-cache, keep-alive). */

/** Project a witness log into the full SSE response — the Scott transport as a
 *  served value. A route is the thin glue: read the log, then
 *  `feedResponse(log, request.headers["last-event-id"])`. */
export function feedResponse(log, lastEventId) {
  return { status: 200, headers: sseHeaders(), body: streamWitnessLog(log, lastEventId) };
}

// ---- merged from relating-ws-session.mjs (2026-09-22) ----
// running/ws-session — the transfinite transport over a WebSocket frame loop.
//
// A WebSocket carries the bounded interactive claim session: each text frame is a
// claim `{cell, reading}` advancing the monotone log, and the reply frame is the
// settled judgement (per-cell verdict, contested cells, regime). The pure core
// (`exchangeClaim`, text → text) is split from the ws-frame encoder and the
// node-socket binding, exactly as `routeRequest` is split from `serve`. Nothing is
// overwritten: a contradicting claim flips a cell's verdict to ⊤ (`stable`) with no
// retraction.

/** One claim carried on a frame: a valued predication about a cell. */

/** Parse and validate a claim message from frame text; throws on a malformed claim. */
export function parseClaimMessage(text) {
  const value = JSON.parse(text);
  const cell = (value)?.cell;
  const reading = (value)?.reading;
  if (typeof cell !== "string" || typeof reading !== "string" || !isReadingInKnowledge(reading)) {
    throw new TypeError("ws-session: not a {cell:string, reading:ReadingValueName} claim");
  }
  return { cell, reading };
}

/** The settled judgement reply for a session: per-cell verdict, contested cells, and
 *  the regime (`scott` until a cell conflicts, then `transfinite`). */
export function judgementReply(session) {
  return JSON.stringify({
    judgement: Object.fromEntries(judge(session)),
    conflicts: conflicts(session),
    regime: sessionRegime(session),
  });
}

/** Encode a judgement reply as a WebSocket text frame (opcode 0x1, fin). */
export function judgementFrame(reply) {
  return encodeFrame(0x1, Buffer.from(reply, "utf-8"));
}

// ---- merged from relating-http-ws-session.mjs (2026-09-22) ----
/**
 * WebSocket claim-session service binding.
 *
 * The pure transfinite claim exchange lives in `src/running/ws-session`. This
 * module binds it to `node:http` upgrade sockets.
 */

/** Attach a transfinite claim-session WebSocket endpoint to an HTTP server. */
export function attachClaimSession(server) {
  server.on("upgrade", (req, socket) => {
    const key = req.headers["sec-websocket-key"];
    if (typeof key !== "string") {
      socket.destroy();
      return;
    }
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\nConnection: Upgrade\r\n" +
        `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`,
    );
    let session = openSession();
    const decoder = new FrameDecoder();
    socket.on("data", (chunk) => {
      for (const frame of decoder.push(chunk)) {
        if (frame.opcode === 0x8) {
          socket.end();
          return;
        }
        if (frame.opcode !== 0x1) continue;
        try {
          const exchanged = exchangeClaim(session, frame.payload.toString("utf-8"));
          session = exchanged.session;
          socket.write(judgementFrame(exchanged.reply));
        } catch (error) {
          socket.write(judgementFrame(JSON.stringify({ error: String(error) })));
        }
      }
    });
    socket.on("error", () => {
      /* client reset; drop the session */
    });
  });
  return server;
}


/**
 * acting/serving — the four transports as functorial images of the apex.
 *
 * `induceBins` gives one `InducedBins` carrier (the coproduct apex of a module's
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
 * are functorial images of the same `induceBins` apex — no second ontology.
 *
 * Every routed POST goes through `dispatch`, so an HTTP/MCP/form call is a
 * scripted play and is witnessed as EAVT exactly like a CLI call. Pure routing
 * (`routeRequest`) is separated from the thin live HTTP binding in
 * `services/http`.
 */
import { wireCodec, wireByMediaType, WIRE_CODEC_NAMES } from "../codecs/boundary/wire/index.mjs";
import { mediaTypeCorner, negotiateRepresentation } from "../writing/http/negotiation/index.mjs";
import {
  actionMcpPrompts,
  actionMcpResources,
  actionMcpToolsWithEndpoints,
  actionOpenApi,
} from "../projections/action-apex.mjs";
import {
  actionFormHtml,
  actionIndexHtml,
  actionManifoldIndexHtml,
} from "../projections/action-html.mjs";
import type { ActionEndpoint, InducedBins } from "./induce.mjs";
import type { DispatchOptions, DispatchResult } from "./dispatch.mjs";
import type { EAVTRecord } from "../codecs/text/json/jsonl/eavt/index.mjs";
import { streamWitnessLog } from "../ledger/stream.mjs";
import { sseFrame } from "../writing/http/sse/index.mjs";
import {
  freeSettlementFiltration,
  type SettlementFiltration,
  type SettlementFiltrationGenerators,
} from "@lenticule-science/articulating/predicating/positing/settling/index";

/**
 * Pure routed response returned by the serving projection.
 *
 * This is deliberately smaller than a live HTTP response: the router
 * computes only status, content type, and body bytes. The `serve*` helpers bind
 * this value to Node's mutable socket API at the edge.
 */
export interface ServedResponse {
  /** HTTP status code to write at the binding boundary. */
  readonly status: number;
  /** Full response media type, usually including `charset=utf-8`. */
  readonly type: string;
  /** Serialized response body. */
  readonly body: string;
  /** Extra response headers (e.g. SSE `cache-control`/`connection`); merged after `type`. */
  readonly headers?: Readonly<Record<string, string>> | undefined;
}

/**
 * Pure routed request consumed by the serving projection.
 *
 * `accept` drives corner-aware content negotiation when no explicit
 * `output-format` is selected; absent, the action's declared output is served.
 * This keeps the core router testable without an HTTP listener while still
 * preserving the one header that changes the representation face.
 */
export interface ServedRequest {
  /** HTTP method as observed by the binding. */
  readonly method: string;
  /** URL pathname, optionally including the configured `basePath`. */
  readonly path: string;
  /** Query parameters flattened to the last string value per key. */
  readonly query: Readonly<Record<string, string>>;
  /** Request body already decoded as UTF-8 text by the binding. */
  readonly body: string;
  /** Optional HTTP `Accept` header used for representation negotiation. */
  readonly accept?: string | undefined;
  /** Optional `Last-Event-ID` for resuming the SSE feed from the next row. */
  readonly lastEventId?: string | undefined;
}

/**
 * Options shared by pure routing and live HTTP bindings.
 *
 * Dispatch options flow through unchanged, so a routed HTTP/MCP/form call can be
 * witnessed in the same append-only ledger as CLI dispatch. The extra fields
 * affect only mounted paths and generated descriptive documents.
 */
export interface ServeOptions extends DispatchOptions {
  /** URL prefix this induced apex is mounted under. */
  readonly basePath?: string;
  /** OpenAPI title; defaults to the induced package name. */
  readonly title?: string;
  /** OpenAPI/MCP server version string; defaults to `0.0.0`. */
  readonly version?: string;
  /** Reads the current witness log for the `GET /feed` Scott transport; the live
   *  bindings inject today's invocation log. Absent ⇒ the feed is empty. */
  readonly witnessLog?: (() => readonly EAVTRecord[]) | undefined;
}

/** Project a value to a JSON routed response. */
export const json = (value: unknown, status = 200): ServedResponse => ({ status, type: "application/json; charset=utf-8", body: `${JSON.stringify(value, null, 2)}\n` });
/** Project HTML text to a routed response. */
export const html = (body: string, status = 200): ServedResponse => ({ status, type: "text/html; charset=utf-8", body });
/** Project plain text to a routed response. */
export const text = (body: string, status: number): ServedResponse => ({ status, type: "text/plain; charset=utf-8", body });

/** The content corner the settled value commits to: the corner of the action's
 *  declared output wire. A value crosses the boundary down this corner but never up
 *  — negotiation may settle it to a lower corner, never fabricate a richer one. */
function valueCorner(endpoint: ActionEndpoint): import("../projections/kernel.mjs").Corner {
  const codec = wireByMediaType(endpoint.output);
  return codec?.corner ?? mediaTypeCorner(endpoint.output);
}

/** Choose the wire to emit a response down, honoring the bilattice asymmetry.
 *
 *  An explicit `output-format` is a NAMED selection and always wins (the caller
 *  asked for that wire by name). Otherwise, when an `Accept` header is present, the
 *  offered wires are negotiated against it BUT restricted to those whose content
 *  corner does not exceed the settled value's: a `data` value may be served as
 *  json but never as turtle/rmn (`assertion`), because that would fabricate
 *  assertivity the value does not carry. With no `Accept` and no explicit format,
 *  the action's declared output is served. Returns the wire NAME for dispatch and
 *  the media type to label the response. */
function negotiateOutputWire(
  endpoint: ActionEndpoint,
  explicitOutName: string | undefined,
  accept: string | undefined,
): { readonly name: string | undefined; readonly mediaType: string } {
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

function mcpResult(id: unknown, result: unknown): Record<string, unknown> {
  return { jsonrpc: "2.0", id, result };
}
function mcpError(id: unknown, code: number, message: string): Record<string, unknown> {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function promptArguments(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null) return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    out[key] = typeof raw === "string" ? raw : JSON.stringify(raw);
  }
  return out;
}

/** The boundary document for an action's input from an MCP `arguments.input`. */
function stdinOf(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * Handle one MCP JSON-RPC message against an induced apex.
 *
 * The handler implements the package's knowledge-vault face: initialize/ping,
 * `tools/list`, `tools/call`, `resources/list`, `resources/read`,
 * `prompts/list`, and `prompts/get`. Tool calls are routed through the induced
 * dispatcher, so codecs and optional witnessing stay identical to CLI/HTTP
 * dispatch. Notifications return `undefined`, matching JSON-RPC's no-response
 * rule.
 */
export function actionMcpHandle(induced: InducedBins, message: unknown, options: ServeOptions): Record<string, unknown> | undefined {
  if (typeof message !== "object" || message === null) return mcpError(null, -32600, "invalid request");
  const record = message as Record<string, unknown>;
  const id = record["id"];
  const method = record["method"];
  if (record["jsonrpc"] !== "2.0" || typeof method !== "string") return mcpError(id ?? null, -32600, "invalid request");
  if (id === undefined) return undefined; // notification
  if (method === "initialize") {
    return mcpResult(id, { protocolVersion: "2025-06-18", serverInfo: { name: induced.discovery.package, version: options.version ?? "0.0.0" }, capabilities: { tools: {}, resources: {}, prompts: {} } });
  }
  if (method === "ping") return mcpResult(id, {});
  if (method === "tools/list") return mcpResult(id, { tools: actionMcpToolsWithEndpoints(induced.actions, induced.discovery.bins) });
  if (method === "tools/call") {
    const params = (record["params"] ?? {}) as Record<string, unknown>;
    const name = String(params["name"] ?? "");
    const args = (params["arguments"] ?? {}) as Record<string, unknown>;
    const result = induced.dispatch([name], stdinOf(args["input"]), options);
    if (result.code !== 0) return mcpResult(id, { isError: true, content: [{ type: "text", text: result.stderr.trim() }] });
    const endpoint = induced.discovery.bins.find((bin) => bin.name === name);
    const text = endpoint !== undefined && endpoint.settlement.regime !== "strict-finite"
      ? JSON.stringify(partialObservation(endpoint, result.stdout, options.basePath ?? ""), null, 2)
      : result.stdout.trim();
    return mcpResult(id, { content: [{ type: "text", text }] });
  }
  if (method === "resources/list") return mcpResult(id, { resources: actionMcpResources(induced) });
  if (method === "resources/read") {
    const params = (record["params"] ?? {}) as Record<string, unknown>;
    const uri = String(params["uri"] ?? "");
    const res = induced.resources.find((candidate) => candidate.uri === uri);
    if (res === undefined) return mcpError(id, -32602, `no such resource: ${uri}`);
    let text: string;
    try {
      text = res.read();
    } catch (error) {
      return mcpError(id, -32603, `resource read failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return mcpResult(id, { contents: [{ uri: res.uri, mimeType: res.mimeType, text }] });
  }
  if (method === "prompts/list") return mcpResult(id, { prompts: actionMcpPrompts(induced) });
  if (method === "prompts/get") {
    const params = (record["params"] ?? {}) as Record<string, unknown>;
    const name = String(params["name"] ?? "");
    const pr = induced.prompts.find((candidate) => candidate.name === name);
    if (pr === undefined) return mcpError(id, -32602, `no such prompt: ${name}`);
    let messages: readonly { readonly role: string; readonly content: { readonly type: "text"; readonly text: string } }[];
    try {
      messages = pr.compose(promptArguments(params["arguments"]));
    } catch (error) {
      return mcpError(id, -32603, `prompt compose failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return mcpResult(id, { ...(pr.description === undefined ? {} : { description: pr.description }), messages });
  }
  return mcpError(id, -32601, "method not found");
}

/**
 * Async variant of `actionMcpHandle`.
 *
 * Use this when any action body may return a promise. The MCP shape is the same
 * as the synchronous handler; only tool execution awaits `dispatchAsync`.
 */
export async function actionMcpHandleAsync(induced: InducedBins, message: unknown, options: ServeOptions): Promise<Record<string, unknown> | undefined> {
  if (typeof message !== "object" || message === null) return mcpError(null, -32600, "invalid request");
  const record = message as Record<string, unknown>;
  const id = record["id"];
  const method = record["method"];
  if (record["jsonrpc"] !== "2.0" || typeof method !== "string") return mcpError(id ?? null, -32600, "invalid request");
  if (id === undefined) return undefined;
  if (method === "initialize") {
    return mcpResult(id, { protocolVersion: "2025-06-18", serverInfo: { name: induced.discovery.package, version: options.version ?? "0.0.0" }, capabilities: { tools: {}, resources: {}, prompts: {} } });
  }
  if (method === "ping") return mcpResult(id, {});
  if (method === "tools/list") return mcpResult(id, { tools: actionMcpToolsWithEndpoints(induced.actions, induced.discovery.bins) });
  if (method === "tools/call") {
    const params = (record["params"] ?? {}) as Record<string, unknown>;
    const name = String(params["name"] ?? "");
    const args = (params["arguments"] ?? {}) as Record<string, unknown>;
    const result = await induced.dispatchAsync([name], stdinOf(args["input"]), options);
    if (result.code !== 0) return mcpResult(id, { isError: true, content: [{ type: "text", text: result.stderr.trim() }] });
    const endpoint = induced.discovery.bins.find((bin) => bin.name === name);
    const text = endpoint !== undefined && endpoint.settlement.regime !== "strict-finite"
      ? JSON.stringify(partialObservation(endpoint, result.stdout, options.basePath ?? ""), null, 2)
      : result.stdout.trim();
    return mcpResult(id, { content: [{ type: "text", text }] });
  }
  if (method === "resources/list") return mcpResult(id, { resources: actionMcpResources(induced) });
  if (method === "resources/read") {
    const params = (record["params"] ?? {}) as Record<string, unknown>;
    const uri = String(params["uri"] ?? "");
    const res = induced.resources.find((candidate) => candidate.uri === uri);
    if (res === undefined) return mcpError(id, -32602, `no such resource: ${uri}`);
    try {
      return mcpResult(id, { contents: [{ uri: res.uri, mimeType: res.mimeType, text: res.read() }] });
    } catch (error) {
      return mcpError(id, -32603, `resource read failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (method === "prompts/list") return mcpResult(id, { prompts: actionMcpPrompts(induced) });
  if (method === "prompts/get") {
    const params = (record["params"] ?? {}) as Record<string, unknown>;
    const name = String(params["name"] ?? "");
    const pr = induced.prompts.find((candidate) => candidate.name === name);
    if (pr === undefined) return mcpError(id, -32602, `no such prompt: ${name}`);
    try {
      return mcpResult(id, { ...(pr.description === undefined ? {} : { description: pr.description }), messages: pr.compose(promptArguments(params["arguments"])) });
    } catch (error) {
      return mcpError(id, -32603, `prompt compose failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return mcpError(id, -32601, "method not found");
}

/** The Scott transport route: `GET /feed` streams the witness log as resumable SSE,
 *  resuming after `Last-Event-ID`. The log is read through `options.witnessLog`, so
 *  pure routing stays I/O-free; the live bindings inject today's invocation log. */
function feedRoute(request: ServedRequest, options: ServeOptions): ServedResponse {
  return {
    status: 200,
    type: "text/event-stream; charset=utf-8",
    headers: { "cache-control": "no-cache", connection: "keep-alive" },
    body: streamWitnessLog(options.witnessLog?.() ?? [], request.lastEventId),
  };
}

function parseOutput(stdout: string): unknown {
  try {
    return JSON.parse(stdout);
  } catch {
    return stdout;
  }
}

function continuationHandle(endpoint: ActionEndpoint, base: string): Record<string, unknown> {
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

function partialObservation(endpoint: ActionEndpoint, stdout: string, base: string): Record<string, unknown> {
  return {
    kind: "relating.action.partial-settlement",
    final: false,
    regime: endpoint.settlement.regime,
    closureRegime: endpoint.settlement.closureRegime,
    transport: endpoint.settlement.transport,
    partial: parseOutput(stdout),
    continuation: continuationHandle(endpoint, base),
  };
}

function isSettlementFiltration(value: unknown): value is SettlementFiltration {
  return typeof value === "object"
    && value !== null
    && (value as { readonly kind?: unknown }).kind === "predication.settlement.filtration"
    && Array.isArray((value as { readonly stages?: unknown }).stages);
}

function isSettlementFiltrationGenerators(value: unknown): value is SettlementFiltrationGenerators {
  return typeof value === "object"
    && value !== null
    && (value as { readonly kind?: unknown }).kind === "predication.settlement.filtration"
    && Array.isArray((value as { readonly cells?: unknown }).cells)
    && Array.isArray((value as { readonly specializations?: unknown }).specializations);
}

function approximationChain(stdout: string): readonly unknown[] {
  const value = parseOutput(stdout);
  if (isSettlementFiltration(value)) return value.stages;
  if (isSettlementFiltrationGenerators(value)) return freeSettlementFiltration(value).stages;
  return [value];
}

function eventIndexAfter(lastEventId: string | undefined): number {
  if (lastEventId === undefined || lastEventId.trim() === "") return 0;
  const parsed = Number(lastEventId);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed + 1 : 0;
}

function actionEventStreamResponse(endpoint: ActionEndpoint, result: DispatchResult, request: ServedRequest): ServedResponse {
  const chain = approximationChain(result.stdout);
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

function wantsEventStream(request: ServedRequest): boolean {
  const transport = request.query["transport"];
  return transport === "sse"
    || transport === "event-stream"
    || (request.accept ?? "").split(",").some((part) => part.trim().toLowerCase().startsWith("text/event-stream"));
}

export function routeRequest(induced: InducedBins, request: ServedRequest, options: ServeOptions = {}): ServedResponse {
  const base = (options.basePath ?? "").replace(/\/+$/, "");
  const path = request.path.startsWith(base) ? request.path.slice(base.length) : request.path;
  const verbOf = (p: string): string => decodeURIComponent(p.replace(/^\//, ""));

  if (request.method === "GET" && (path === "" || path === "/")) return html(actionIndexHtml(induced.discovery, base));
  if (request.method === "GET" && path === "/health") return json({ status: "ok", package: induced.discovery.package });
  if (request.method === "GET" && path === "/openapi.json") return json(actionOpenApi(induced, options));
  if (request.method === "GET" && path === "/discovery") return json(induced.discovery);
  if (request.method === "GET" && path === "/feed") return feedRoute(request, options);

  if (request.method === "POST" && path === "/mcp") {
    let message: unknown;
    try {
      message = JSON.parse(request.body);
    } catch {
      return json(mcpError(null, -32700, "parse error"), 200);
    }
    const response = actionMcpHandle(induced, message, options);
    return response === undefined ? { status: 202, type: "application/json; charset=utf-8", body: "" } : json(response);
  }

  const verb = verbOf(path);
  const endpoint = induced.discovery.bins.find((bin) => bin.name === verb);
  if (endpoint === undefined) return text(`no such operation: ${verb}\n`, 404);

  // `input-format`/`output-format` are codec selectors; every other query field is
  // part of the input carrier, encoded as a form (`?token=foo&claim=bar` is the `form` wire).
  const outName = request.query["output-format"];
  const carrierFields = Object.entries(request.query).filter(([key]) => key !== "input-format" && key !== "output-format" && key !== "transport");

  // A GET with no carrier fields is the web-UX form; with fields it is an invocation.
  if (request.method === "GET" && carrierFields.length === 0) return html(actionFormHtml(endpoint, base));

  if (request.method === "GET" || request.method === "POST") {
    let stdin: string;
    let inName: string | undefined;
    if (carrierFields.length > 0) {
      // query/form fields ARE the input carrier, in its form encoding.
      stdin = new URLSearchParams(carrierFields).toString();
      inName = request.query["input-format"] ?? "form";
    } else {
      // a POST body: the web form posts `body=...`; a raw post is the body itself.
      stdin = request.body.startsWith("body=") ? decodeURIComponent(request.body.slice(5).replace(/\+/g, " ")) : request.body;
      inName = request.query["input-format"];
    }
    // Corner-aware negotiation: an explicit `output-format` wins by name; else the
    // `Accept` header selects a wire, but never one richer than the value's corner.
    const negotiated = negotiateOutputWire(endpoint, outName, request.accept);
    const argv = [verb, ...(inName ? ["--input-format", inName] : []), ...(negotiated.name ? ["--output-format", negotiated.name] : [])];
    const result = induced.dispatch(argv, stdin, options);
    if (result.code !== 0) return text(result.stderr, result.code === 2 ? 400 : 422);
    if (endpoint.settlement.regime !== "strict-finite") {
      if (endpoint.settlement.transport === "event-stream" && wantsEventStream(request)) {
        return actionEventStreamResponse(endpoint, result, request);
      }
      return json(partialObservation(endpoint, result.stdout, base));
    }
    return { status: 200, type: negotiated.mediaType, body: result.stdout };
  }

  return text("method not allowed\n", 405);
}

/**
 * Async variant of `routeRequest`.
 *
 * Use this when any action body may return a promise. Routing, negotiation,
 * error statuses, and discovery faces are otherwise identical.
 */
export async function routeRequestAsync(induced: InducedBins, request: ServedRequest, options: ServeOptions = {}): Promise<ServedResponse> {
  const base = (options.basePath ?? "").replace(/\/+$/, "");
  const path = request.path.startsWith(base) ? request.path.slice(base.length) : request.path;
  const verbOf = (p: string): string => decodeURIComponent(p.replace(/^\//, ""));

  if (request.method === "GET" && (path === "" || path === "/")) return html(actionIndexHtml(induced.discovery, base));
  if (request.method === "GET" && path === "/health") return json({ status: "ok", package: induced.discovery.package });
  if (request.method === "GET" && path === "/openapi.json") return json(actionOpenApi(induced, options));
  if (request.method === "GET" && path === "/discovery") return json(induced.discovery);
  if (request.method === "GET" && path === "/feed") return feedRoute(request, options);

  if (request.method === "POST" && path === "/mcp") {
    let message: unknown;
    try {
      message = JSON.parse(request.body);
    } catch {
      return json(mcpError(null, -32700, "parse error"), 200);
    }
    const response = await actionMcpHandleAsync(induced, message, options);
    return response === undefined ? { status: 202, type: "application/json; charset=utf-8", body: "" } : json(response);
  }

  const verb = verbOf(path);
  const endpoint = induced.discovery.bins.find((bin) => bin.name === verb);
  if (endpoint === undefined) return text(`no such operation: ${verb}\n`, 404);

  const outName = request.query["output-format"];
  const carrierFields = Object.entries(request.query).filter(([key]) => key !== "input-format" && key !== "output-format" && key !== "transport");
  if (request.method === "GET" && carrierFields.length === 0) return html(actionFormHtml(endpoint, base));

  if (request.method === "GET" || request.method === "POST") {
    let stdin: string;
    let inName: string | undefined;
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
    if (endpoint.settlement.regime !== "strict-finite") {
      if (endpoint.settlement.transport === "event-stream" && wantsEventStream(request)) {
        return actionEventStreamResponse(endpoint, result, request);
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
export interface ManifoldMount {
  /** Stable mount segment used when deriving base paths. */
  readonly name: string;
  /** The package apex to serve at the mount. */
  readonly induced: InducedBins;
}

/**
 * Read the carrier `$id` from a domain/codomain schema slot.
 *
 * Only direct `$ref` slots participate in action composition and manifold
 * tiling. Richer schema structure remains schema data; it is not treated as a
 * mount edge.
 */
export function slotRef(schema: Record<string, unknown> | undefined): string | undefined {
  const ref = schema?.["$ref"];
  return typeof ref === "string" ? ref : undefined;
}

/**
 * Carrier `$id`s emitted by a mounted package's actions.
 *
 * These are codomain refs, the local outputs a downstream module may consume.
 */
export function producedIds(induced: InducedBins): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const act of induced.actions) if (act.codomain !== undefined) ids.add(act.codomain.id);
  return ids;
}

/**
 * Carrier `$id`s admitted by a mounted package's actions.
 *
 * These are domain refs, the local inputs an upstream module may produce.
 */
export function consumedIds(induced: InducedBins): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const act of induced.actions) if (act.domain !== undefined) ids.add(act.domain.id);
  return ids;
}

/**
 * Test whether package `a` can feed package `b` by carrier identity.
 *
 * This is the manifold-level version of action composition: an edge exists when
 * a produced carrier `$id` equals a consumed carrier `$id`.
 */
export function feeds(a: InducedBins, b: InducedBins): boolean {
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
export function tileManifold(mounts: readonly ManifoldMount[]): ReadonlyMap<string, string> {
  const byName = new Map(mounts.map((m) => [m.name, m] as const));
  // For each module, the producer it tiles under (deterministic: first by name).
  const producerOf = new Map<string, string>();
  for (const m of mounts) {
    const producers = mounts
      .filter((p) => p.name !== m.name && feeds(p.induced, m.induced))
      .map((p) => p.name)
      .sort();
    if (producers.length > 0) producerOf.set(m.name, producers[0] as string);
  }
  const paths = new Map<string, string>();
  const place = (name: string, seen: ReadonlySet<string>): string => {
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
 * Route one pure request against a manifold of tiled mounts.
 *
 * The router selects the longest tiled base path that prefixes the URL and then
 * delegates to that mount's `routeRequest`. This keeps each mounted apex's
 * dispatch and witness namespace intact while exposing many packages on one
 * origin.
 */
export function routeManifold(mounts: readonly ManifoldMount[], request: ServedRequest, options: ServeOptions = {}): ServedResponse {
  const root = (options.basePath ?? "").replace(/\/+$/, "");
  const path = request.path.startsWith(root) ? request.path.slice(root.length) : request.path;
  const paths = tileManifold(mounts);

  if (request.method === "GET" && (path === "" || path === "/")) return html(actionManifoldIndexHtml(mounts, paths));

  // Longest tiled-basePath match wins, so `/a/b/verb` routes to the mount at `/a/b`,
  // not the one at `/a`.
  const ranked = [...mounts]
    .map((m) => ({ mount: m, base: paths.get(m.name) ?? `/${m.name}` }))
    .sort((x, y) => y.base.length - x.base.length);
  for (const { mount, base } of ranked) {
    if (path === base || path.startsWith(`${base}/`)) {
      return routeRequest(mount.induced, request, { ...options, basePath: `${root}${base}` });
    }
  }
  return text(`no such module for path: ${path}\n`, 404);
}

/**
 * Async variant of `routeManifold`.
 *
 * Use this for a tiled app whose mounted actions may return promises. Placement
 * and longest-prefix routing match the synchronous manifold router.
 */
export async function routeManifoldAsync(mounts: readonly ManifoldMount[], request: ServedRequest, options: ServeOptions = {}): Promise<ServedResponse> {
  const root = (options.basePath ?? "").replace(/\/+$/, "");
  const path = request.path.startsWith(root) ? request.path.slice(root.length) : request.path;
  const paths = tileManifold(mounts);

  if (request.method === "GET" && (path === "" || path === "/")) return html(actionManifoldIndexHtml(mounts, paths));

  const ranked = [...mounts]
    .map((m) => ({ mount: m, base: paths.get(m.name) ?? `/${m.name}` }))
    .sort((x, y) => y.base.length - x.base.length);
  for (const { mount, base } of ranked) {
    if (path === base || path.startsWith(`${base}/`)) {
      return routeRequestAsync(mount.induced, request, { ...options, basePath: `${root}${base}` });
    }
  }
  return text(`no such module for path: ${path}\n`, 404);
}

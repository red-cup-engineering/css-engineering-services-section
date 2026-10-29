// The one MCP-over-HTTP resource of the house: a Fetch-native web-application
// resource that serves the official SDK's Streamable HTTP lifecycle over one
// tool catalog — either native MCP tools, or the typed operations of the
// computer platform the request runs over, projected to tools by id, domain
// and codomain. Bearer authentication resolves a principal; origin and
// protocol-version policy, bounded intake, and stateless-or-session transport
// are decided here once, so no application forms an MCP endpoint of its own.
import { bearerChallenge, bearerToken } from "@red-cup-engineering/code-http-bearer-authentication-service";
import { mcpToolsOfOperations, createMcpToolServer, type Json, type McpServerInfo, type McpTool, type McpToolAnnotations } from "@red-cup-engineering/computer-platform/mcp-server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { WebApplicationContext, WebApplicationResource } from "@red-cup-engineering/http-server-application-contract-service/web";
import type { ComputerPlatform } from "@red-cup-engineering/computer-platform";
import type { ExecutionOptions, Operation } from "@red-cup-engineering/computer-platform/operations";

export const DEFAULT_PROTOCOL_VERSION = "2025-06-18";
export type { Json, McpTool, McpToolAnnotations };
export { mcpToolsOfOperations } from "@red-cup-engineering/computer-platform/mcp-server";

/** What a tool call knows about its caller: the bearer it presented, the principal `auth.verify` resolved, and the request context. */
export type McpRequestMeta<Principal = unknown> = Readonly<{ bearer?: string; principal?: Principal; context: WebApplicationContext }>;
export type McpAuth<Principal = unknown> = Readonly<{
  /** Resolve the bearer to a principal, or undefined to refuse. */
  verify: (bearer: string, context: WebApplicationContext) => Principal | undefined | Promise<Principal | undefined>;
  realm?: string;
  resourceMetadataUrl?: string;
  /** Requests from the loopback address need no bearer (a local MCP client); default false. */
  loopbackBypass?: boolean;
}>;
export type McpOriginPolicy = readonly (string | RegExp)[] | ((origin: string, context: WebApplicationContext) => boolean);
export type McpDispatch<Principal = unknown> = (name: string, args: Readonly<Record<string, unknown>>, meta: McpRequestMeta<Principal>) => unknown | Promise<unknown>;
/** The per-request execution options for typed operations (the host bound to this caller's principal). */
export type McpExecutionOptions<Principal = unknown> = (meta: McpRequestMeta<Principal>, operation: Operation) => Omit<ExecutionOptions, "resolveType" | "resolveHost">;

export type McpResourceOptions<Principal = unknown> = Readonly<{
  path?: string;
  serverInfo: McpServerInfo;
  protocolVersion?: string;
  acceptedProtocolVersions?: readonly string[];
  instructions?: string;
  /** A native tool catalog; or */
  tools?: readonly McpTool[];
  /** typed operations, projected to tools and executed by the request's computer platform unless `dispatch` is given. */
  operations?: readonly Operation[];
  dispatch?: McpDispatch<Principal>;
  /** Bind the authenticated caller to its platform; this resource closes the returned platform. */
  platform?: (meta: McpRequestMeta<Principal>) => ComputerPlatform | Promise<ComputerPlatform>;
  /** Execution options for the platform's operations (per caller); defaults to the operation's own effects and the platform's host. */
  execution?: McpExecutionOptions<Principal>;
  auth?: McpAuth<Principal>;
  allowedOrigins?: McpOriginPolicy;
  maxBodyBytes?: number;
  toolsPageSize?: number;
  /** Keep server sessions across requests (a long-lived process); default false: every request is one stateless JSON exchange. */
  sessions?: boolean;
}>;

const DEFAULT_PATH = "/mcp";
const DEFAULT_MAX_BODY_BYTES = 65_536;
const LEGACY_MCP_PROTOCOL_VERSION = "2025-03-26";
const ACCEPT = "application/json, text/event-stream";

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

function loopback(context: WebApplicationContext): boolean {
  if (context.request.headers.has("x-forwarded-for") || context.request.headers.has("forwarded")) return false;
  const address = context.remoteAddress ?? "";
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

function originRefusal(context: WebApplicationContext, policy: McpOriginPolicy | undefined): Response | undefined {
  const raw = context.request.headers.get("origin");
  if (raw === null) return undefined;
  let requested: string;
  try { const url = new URL(raw); if (url.pathname !== "/" || url.search || url.hash) throw new Error(); requested = url.origin; } catch { return json({ error: "forbidden_origin" }, 403); }
  if (requested === context.url.origin) return undefined;
  const allowed = policy !== undefined && (typeof policy === "function" ? policy(requested, context) : policy.some((item) => item instanceof RegExp ? item.test(requested) : new URL(item).origin === requested));
  return allowed ? undefined : json({ error: "forbidden_origin" }, 403);
}

function protocolRefusal(context: WebApplicationContext, accepted: ReadonlySet<string>): Response | undefined {
  const version = context.request.headers.get("mcp-protocol-version");
  return version === null || accepted.has(version) ? undefined : json({ error: "unsupported_protocol_version" }, 400);
}

function prefersSse(context: WebApplicationContext): boolean {
  const accept = context.request.headers.get("accept")?.toLowerCase() ?? "";
  return accept.includes("text/event-stream") && !accept.includes("application/json");
}

/** The SDK transport requires an Accept naming both JSON and the event stream; simple clients send one or neither. */
function transportRequest(context: WebApplicationContext, body: Uint8Array | undefined): Request {
  const headers = new Headers(context.request.headers);
  const accept = headers.get("accept") ?? "";
  if (!accept.includes("application/json") || !accept.includes("text/event-stream")) headers.set("accept", accept === "" ? ACCEPT : `${accept}, ${ACCEPT}`);
  headers.delete("content-length");
  return new Request(context.url, { method: context.request.method, headers, signal: context.signal, ...(body === undefined ? {} : { body: body as BodyInit }) });
}

/**
 * Form the MCP resource of one web application.
 *
 * @param options The tool catalog (native tools or typed operations), authentication, and HTTP policy.
 * @returns One web-application resource at the MCP path.
 */
export function mcpResource<Principal = unknown>(options: McpResourceOptions<Principal>): WebApplicationResource {
  if (options.tools === undefined && options.operations === undefined) throw new TypeError("mcpResource requires tools or operations");
  const tools = options.tools ?? mcpToolsOfOperations(options.operations ?? []);
  if (options.dispatch === undefined && options.operations === undefined) throw new TypeError("mcpResource requires dispatch when the catalog is native tools");
  const accepted = new Set(options.acceptedProtocolVersions ?? [options.protocolVersion ?? DEFAULT_PROTOCOL_VERSION, LEGACY_MCP_PROTOCOL_VERSION]);
  const path = options.path ?? DEFAULT_PATH;
  const maxBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  const sessions = new Map<string, WebStandardStreamableHTTPServerTransport>();

  const serverFor = async (meta: McpRequestMeta<Principal>) => {
    const owned = await options.platform?.(meta);
    const platform = owned ?? meta.context.platform;
    const server = createMcpToolServer({
    serverInfo: options.serverInfo,
    ...(options.instructions === undefined ? {} : { instructions: options.instructions }),
    tools,
    ...(options.toolsPageSize === undefined ? {} : { toolsPageSize: options.toolsPageSize }),
    ...(options.dispatch !== undefined ? {
      dispatch: (name: string, args: Readonly<Record<string, unknown>>) => options.dispatch!(name, args, meta),
    } : platform !== undefined ? {
      platform,
      executionOptions: (name: string) => {
        const operation = platform!.operation(name)!;
        return options.execution?.(meta, operation) ?? { allowedEffects: operation.effects };
      },
    } : {
      dispatch: () => { throw new Error("HostUnavailable: the request runs over no computer platform"); },
    }),
    });
    if (owned) {
      server.onclose = () => { void owned.close(); };
      const close = server.close.bind(server);
      server.close = async () => { try { await close(); } finally { await owned.close(); } };
    }
    return server;
  };

  const handler = async (context: WebApplicationContext): Promise<Response> => {
    const protocol = protocolRefusal(context, accepted); if (protocol !== undefined) return protocol;
    const origin = originRefusal(context, options.allowedOrigins); if (origin !== undefined) return origin;
    const bearer = bearerToken(context.request.headers.get("authorization") ?? undefined);
    let principal: Principal | undefined;
    if (options.auth !== undefined) {
      principal = bearer === undefined ? undefined : await options.auth.verify(bearer, context);
      if (principal === undefined && !(options.auth.loopbackBypass === true && loopback(context))) {
        return json({ error: "invalid_token" }, 401, { "www-authenticate": bearerChallenge({ error: "invalid_token", ...(options.auth.realm === undefined ? {} : { realm: options.auth.realm }), ...(options.auth.resourceMetadataUrl === undefined ? {} : { resourceMetadata: options.auth.resourceMetadataUrl }) }) });
      }
    }
    const meta: McpRequestMeta<Principal> = Object.freeze({ ...(bearer === undefined ? {} : { bearer }), ...(principal === undefined ? {} : { principal }), context });
    const method = context.request.method;
    if (!options.sessions && (method === "GET" || method === "HEAD")) {
      return new Response(method === "HEAD" ? null : "Method Not Allowed", { status: 405, headers: { allow: "POST", "content-type": "text/plain; charset=utf-8" } });
    }
    const body = method === "POST" ? await context.input.bytes() : undefined;
    if (!options.sessions) {
      const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: !prefersSse(context) });
      const server = await serverFor(meta);
      await server.connect(transport);
      try { return await transport.handleRequest(transportRequest(context, body)); } finally { await server.close().catch(() => {}); }
    }
    const sessionId = context.request.headers.get("mcp-session-id");
    let transport = sessionId === null ? undefined : sessions.get(sessionId);
    if (sessionId === null) {
      transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        enableJsonResponse: !prefersSse(context),
        onsessioninitialized: (id) => { sessions.set(id, transport!); },
        onsessionclosed: (id) => { sessions.delete(id); },
      });
      await (await serverFor(meta)).connect(transport);
    }
    if (transport === undefined) return json({ error: "unknown_session" }, 404);
    return transport.handleRequest(transportRequest(context, body));
  };

  return Object.freeze({ match: path, methods: ["GET", "HEAD", "POST", "DELETE"], body: { maxBytes }, handler });
}

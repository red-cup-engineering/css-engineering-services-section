/**
 * MCP streamable-HTTP envelope helpers.
 *
 * The MCP helpers build the small JSON-RPC and result vocabulary needed by a
 * streamable HTTP surface: initialize results, reachability records, tools/list
 * results, success and error envelopes, and text or structured tool-call
 * results. They deliberately stop before server dispatch, authorization,
 * transport sessions, or tool execution.
 *
 * Use this subpath when a relating-powered HTTP adapter needs MCP-shaped values
 * while keeping protocol envelopes separate from the application that serves
 * them.
 *
 * @packageDocumentation
 */
export const DEFAULT_MCP_PROTOCOL_VERSION = "2025-06-18";

/** Media type used for MCP JSON-RPC requests and replies over HTTP. */
export const MCP_JSON_TYPE = "application/json";

/** JSON object carrier accepted by the MCP structured-result helpers. */
export type JsonObject = { readonly [key: string]: Json };

/** JSON value carrier used where MCP envelopes carry structured content. */
export type Json = null | boolean | number | string | readonly Json[] | JsonObject;

/** Tool annotation carrier for MCP tool-list entries. */
export type McpToolAnnotations = Readonly<{
  readOnlyHint?: boolean;
  openWorldHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  title?: string;
}>;

/** Tool description carrier exposed through MCP tools/list. */
export type McpTool = Readonly<{
  name: string;
  title?: string;
  description?: string;
  inputSchema?: Readonly<Record<string, unknown>>;
  outputSchema?: Readonly<Record<string, unknown>>;
  annotations?: McpToolAnnotations;
}>;

/** Server identity carrier returned from initialize and reachability reads. */
export type McpServerInfo = Readonly<{
  name: string;
  version: string;
}>;

/** Tools capability flag advertised by this small MCP envelope surface. */
export type McpToolsCapability = Readonly<{
  listChanged: boolean;
}>;

/** Capability carrier for the MCP server projection. */
export type McpCapabilities = Readonly<{
  tools: McpToolsCapability;
}>;

/** Initialize result carrier returned from an MCP initialize request. */
export type McpInitializeResult = Readonly<{
  protocolVersion: string;
  capabilities: McpCapabilities;
  serverInfo: McpServerInfo;
  instructions?: string;
}>;

/** Reachability witness for an HTTP surface that can project MCP tools. */
export type McpReachability = Readonly<{
  status: "ok";
  transport: "mcp";
  protocol: "streamable_http";
  serverInfo: McpServerInfo;
  capabilities: McpCapabilities;
  tools: readonly string[];
}>;

/** MCP tools/call result carrier for text, structured content, and errors. */
export type McpToolCallResult = Readonly<{
  content: readonly [Readonly<{ type: "text"; text: string }>];
  structuredContent?: JsonObject;
  isError?: true;
}>;

/** MCP tools/list result carrier, including the optional pagination cursor. */
export type McpToolsListResult = Readonly<{
  tools: readonly McpTool[];
  nextCursor?: string;
}>;

/** JSON-RPC id carrier normalized by outgoing success and failure envelopes. */
export type JsonRpcId = string | number | null | undefined;

/** Minimal JSON-RPC request shape consumed by MCP-facing dispatchers. */
export type JsonRpcRequest = Readonly<{
  jsonrpc?: "2.0";
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, unknown>;
}>;

/** Successful JSON-RPC envelope returned by MCP helpers. */
export type JsonRpcSuccess = Readonly<{
  jsonrpc: "2.0";
  id: string | number | null;
  result: unknown;
}>;

/** Failed JSON-RPC envelope returned by MCP helpers. */
export type JsonRpcFailure = Readonly<{
  jsonrpc: "2.0";
  id: string | number | null;
  error: Readonly<{
    code: number;
    message: string;
  }>;
}>;

/** Union of the success and failure envelopes this module constructs. */
export type JsonRpcEnvelope = JsonRpcSuccess | JsonRpcFailure;

const CAPABILITIES: McpCapabilities = Object.freeze({ tools: Object.freeze({ listChanged: false }) });

function rpcId(id: JsonRpcId): string | number | null {
  return id ?? null;
}

/** Build a successful JSON-RPC envelope while normalizing a missing id to null. */
export function mcpOk(id: JsonRpcId, result: unknown): JsonRpcSuccess {
  return Object.freeze({ jsonrpc: "2.0" as const, id: rpcId(id), result });
}

/** Build a JSON-RPC error envelope while preserving the request id relation. */
export function mcpRpcError(id: JsonRpcId, code: number, message: string): JsonRpcFailure {
  return Object.freeze({
    jsonrpc: "2.0" as const,
    id: rpcId(id),
    error: Object.freeze({ code, message }),
  });
}

/** Build the initialize result for a streamable-HTTP MCP projection. */
export function mcpInitializeResult(options: {
  serverInfo: McpServerInfo;
  protocolVersion?: string;
  instructions?: string;
}): McpInitializeResult {
  return Object.freeze({
    protocolVersion: options.protocolVersion ?? DEFAULT_MCP_PROTOCOL_VERSION,
    capabilities: CAPABILITIES,
    serverInfo: options.serverInfo,
    ...(options.instructions === undefined ? {} : { instructions: options.instructions }),
  });
}

/** Describe the MCP tools reachable through a mounted HTTP surface. */
export function mcpReachability(serverInfo: McpServerInfo, tools: readonly McpTool[]): McpReachability {
  return Object.freeze({
    status: "ok" as const,
    transport: "mcp" as const,
    protocol: "streamable_http" as const,
    serverInfo,
    capabilities: CAPABILITIES,
    tools: Object.freeze(tools.map((tool) => tool.name)),
  });
}

/** Build the MCP tools/list result without exposing a mutable tool array. */
export function mcpToolsListResult(tools: readonly McpTool[], nextCursor?: string): McpToolsListResult {
  return Object.freeze({
    tools: Object.freeze([...tools]),
    ...(nextCursor === undefined ? {} : { nextCursor }),
  });
}

/** Encode an arbitrary value as the single text content item MCP expects. */
export function mcpToolTextResult(value: unknown): McpToolCallResult {
  return Object.freeze({
    content: Object.freeze([{ type: "text" as const, text: JSON.stringify(value, null, 1) }]) as McpToolCallResult["content"],
  });
}

/** Encode a JSON object as both text content and structured MCP content. */
export function mcpToolStructuredResult(value: JsonObject): McpToolCallResult {
  return Object.freeze({
    content: Object.freeze([{ type: "text" as const, text: JSON.stringify(value, null, 1) }]) as McpToolCallResult["content"],
    structuredContent: value,
  });
}

/** Encode a thrown value as an MCP error result with text content. */
export function mcpToolTextError(error: unknown): McpToolCallResult {
  const text = error instanceof Error ? error.message : String(error);
  return Object.freeze({
    content: Object.freeze([{ type: "text" as const, text }]) as McpToolCallResult["content"],
    isError: true as const,
  });
}

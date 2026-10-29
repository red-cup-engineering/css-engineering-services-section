// @emsenn/organizing-with-the-web/mcp
//
// MCP's protocol vocabulary is HTTP-adjacent, so its reusable value layer lives
// in @emsenn/relating. Service bindings such as createMcpApp live in
// @emsenn/http-server; this library package deliberately does not import
// service packages.

export {
  DEFAULT_MCP_PROTOCOL_VERSION,
  MCP_JSON_TYPE,
  mcpInitializeResult,
  mcpOk,
  mcpReachability,
  mcpRpcError,
  mcpToolStructuredResult,
  mcpToolTextError,
  mcpToolTextResult,
  mcpToolsListResult,
} from "@emsenn/relating/writing/http";
export type {
  Json,
  JsonObject,
  JsonRpcEnvelope,
  JsonRpcFailure,
  JsonRpcId,
  JsonRpcRequest,
  JsonRpcSuccess,
  McpCapabilities,
  McpInitializeResult,
  McpReachability,
  McpServerInfo,
  McpTool,
  McpToolAnnotations,
  McpToolCallResult,
  McpToolsCapability,
  McpToolsListResult,
} from "@emsenn/relating/writing/http";

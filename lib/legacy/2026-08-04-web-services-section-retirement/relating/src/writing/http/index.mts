/**
 * HTTP codecs for relating's writing boundary.
 *
 * This module collects the pure representation vocabulary that an HTTP adapter
 * needs before it touches sockets or framework request objects: header field
 * values, `Content-Type`, IMF-fixdate, entity tags and precondition evaluators,
 * byte ranges, `Cache-Control`, bearer authorization, cookies, negotiation,
 * content-coding names, multipart forms, SSE frames, WebSocket frames, and MCP
 * JSON-RPC envelopes.
 *
 * Everything here is representation. Functions receive field values, bytes,
 * frame text, and semantic records. Binding those values to a live request or
 * response belongs to a server adapter.
 *
 * @packageDocumentation
 */

export {
  firstHeader,
  joinedHeader,
  parseDirectiveList,
  quoteHeaderValue,
  splitHeaderParameters,
  unquoteHeaderValue,
} from "./header-value.mjs";
export type { HeaderValue } from "./header-value.mjs";

export { parseContentType, serializeContentType } from "./content-type.mjs";
export type { ContentType } from "./content-type.mjs";

export { httpDate, parseHttpDate } from "./date.mjs";

export {
  etagList,
  ifMatch,
  ifModifiedSince,
  ifNoneMatch,
  ifRange,
  ifUnmodifiedSince,
  strongEtagMatch,
  weakEtagMatch,
} from "./conditional.mjs";

export {
  byterangesCloseDelimiter,
  byterangesPartHeader,
  contentRange,
  multipartByterangesBody,
  multipartRangeBoundary,
  parseRange,
  parseRanges,
} from "./range.mjs";
export type { ByteRange } from "./range.mjs";

export { cacheControl, parseCacheControl } from "./cache-control.mjs";
export type { CacheControl } from "./cache-control.mjs";

export { linkHeader, parseLinkHeader } from "./link.mjs";
export type { LinkValue } from "./link.mjs";

export { bearerChallenge, bearerToken } from "./auth.mjs";
export type { BearerChallengeOptions } from "./auth.mjs";

export {
  negotiateType,
  parseAccept,
  negotiateEncoding,
  parseAcceptEncoding,
  negotiateLanguage,
  parseAcceptLanguage,
  extensionType,
  isCompressible,
  mediaTypeCorner,
  negotiateRepresentation,
  representationFits,
} from "./negotiation/index.mjs";
export type {
  AcceptEntry,
  Coding,
  AcceptLanguageEntry,
} from "./negotiation/index.mjs";

export {
  parseMultipartForm,
  serializeMultipartForm,
} from "./multipart/index.mjs";
export type {
  MultipartForm,
  MultipartPart,
  MultipartPartInit,
} from "./multipart/index.mjs";

export {
  acceptKey,
  encodeFrame,
  FrameDecoder,
} from "./ws/index.mjs";
export type { WsFrame } from "./ws/index.mjs";

export {
  assertCookieName,
  isCookieName,
  parseCookieHeader,
  parseSetCookie,
  serializeCookieHeader,
  serializeSetCookie,
  signCookieValue,
  unsignCookieValue,
} from "./cookie/index.mjs";
export type {
  CookieOptions,
  CookiePriority,
  SameSite,
  SetCookie,
} from "./cookie/index.mjs";

export {
  parseSseStream,
  sseCommentFrame,
  sseEventFrame,
  sseFrame,
  isEventStream,
  sseHeaders,
} from "./sse/index.mjs";
export type { SseEvent } from "./sse/index.mjs";

export {
  DEFAULT_MCP_PROTOCOL_VERSION,
  MCP_JSON_TYPE,
  mcpInitializeResult,
  mcpOk,
  mcpRpcError,
  mcpReachability,
  mcpToolStructuredResult,
  mcpToolTextError,
  mcpToolTextResult,
  mcpToolsListResult,
} from "./mcp/index.mjs";
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
} from "./mcp/index.mjs";

export * as negotiation from "./negotiation/index.mjs";
export * as cookie from "./cookie/index.mjs";
export * as multipart from "./multipart/index.mjs";
export * as sse from "./sse/index.mjs";
export * as ws from "./ws/index.mjs";
export * as mcp from "./mcp/index.mjs";

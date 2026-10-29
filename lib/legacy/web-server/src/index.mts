// @red-cup-engineering/web-server — deployable web-tier services.
//
// WebTics holds the web tier's utterance log. The binary gateway transports
// whole HTTP requests through configured Node binaries over stdio.

export {
  createWebBinaryGatewayService,
  normalizeWebBinaryGatewayConfig,
  parseWebGatewayResponse,
  reprFromWebGatewayResponse,
  runWebBinaryGateway,
  webGatewayRequestCarrier,
  WebBinaryGatewayService,
} from "./binary-gateway.mjs";
export type {
  WebBinaryGatewayConfig,
  WebBinaryGatewayRunResult,
  WebBinaryGatewaySnapshot,
  WebGatewayHeaders,
  WebGatewayHeaderValue,
  WebGatewayRequestCarrier,
  WebGatewayResponseCarrier,
} from "./binary-gateway.mjs";
export {
  createWebTicsService,
  normalizeJudgments,
  normalizeTraceEntries,
  normalizeWebTicsConfig,
  WebTicsService,
} from "./service.mjs";
export type {
  WebTicsAdmission,
  WebTicsConfig,
  WebTicsProvenanceRecord,
  WebTicsSnapshot,
} from "./service.mjs";
export { runCli, parseArgs, usage } from "./cli.mjs";
export type { WebServerCliIo, WebTicsCliIo } from "./cli.mjs";

/**
 * actions - computing's public operation apex.
 *
 * The core OUT-face actions remain in `core-actions.mts`. This wrapper adds the
 * IN-face actions that let the manifold describe itself as LSP and step RMN as
 * DAP, while keeping both routes ordinary carrier-to-carrier boundaries.
 */
import {
  action,
  jsonResource,
  tm,
  tmCarrier,
  type Action,
  type JsonValue,
  type Tm,
} from "@red-cup-engineering/relating";
import {
  coreActions,
  computeAction,
  composeAction,
  relayAction,
  bangAction,
  classifyWorkAction,
  decideCapabilitiesAction,
  decideAction,
  reconstructFromHashesAction,
  diffFromBoundaryHashesAction,
  foldTraceAction,
  deriveProvenanceAction,
  projectObservationGameAction,
  coordinateHolographicComputeAction,
  ecosystemInfoTilingAction,
  regulateEcosystemCausalWidthAction,
  stabilizeEcosystemCausalWidthAction,
  ecosystemRecursiveControlAction,
  ecosystemRecursiveUnitAction,
  reconstructEcosystemConeAction,
  diffEcosystemConesAction,
  aperiodicPatchAction,
  aperiodicSelfOrganizeAction,
  aperiodicTheoryAtlasAction,
  aperiodicBridgePlanAction,
  eventualConsistencyAction,
} from "./core-actions.mjs";
import {
  lspRequestEnvelopeCarrier,
  lspResponseEnvelopeCarrier,
  projectLsp,
  type LspRequestEnvelope,
} from "./lsp.mjs";
import {
  dapRequestEnvelopeCarrier,
  dapResponseEnvelopeCarrier,
  projectDap,
  type ComputingDapProjection,
  type DapRequestEnvelope,
} from "./dap.mjs";

export {
  computeAction,
  composeAction,
  relayAction,
  bangAction,
  classifyWorkAction,
  decideCapabilitiesAction,
  decideAction,
  reconstructFromHashesAction,
  diffFromBoundaryHashesAction,
  foldTraceAction,
  deriveProvenanceAction,
  projectObservationGameAction,
  coordinateHolographicComputeAction,
  ecosystemInfoTilingAction,
  regulateEcosystemCausalWidthAction,
  stabilizeEcosystemCausalWidthAction,
  ecosystemRecursiveControlAction,
  ecosystemRecursiveUnitAction,
  reconstructEcosystemConeAction,
  diffEcosystemConesAction,
  aperiodicPatchAction,
  aperiodicSelfOrganizeAction,
  aperiodicTheoryAtlasAction,
  aperiodicBridgePlanAction,
  eventualConsistencyAction,
};
export {
  eventualConsistency,
  stochasticConvergenceReceipt,
  type EventualConsistency,
  type StochasticConvergenceReceipt,
} from "./core-actions.mjs";

function admitJsonActionInput(input: unknown, verb: string): JsonValue {
  return jsonResource(input, `${verb} input`);
}

export const lspAction: Action = action({
  verb: "lsp",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Answer one dependency-free JSON-RPC request against computing's LSP projection.",
  description: "Domain: computing/lsp/request. Codomain: computing/lsp/response. The handler reads the same carrier/action apex served by the kernel, so hover, definition, references, and diagnostics are reflections of the live manifold rather than a second code model.",
  domain: lspRequestEnvelopeCarrier,
  codomain: lspResponseEnvelopeCarrier,
  run: (input: unknown): JsonValue => {
    const request = lspRequestEnvelopeCarrier.assert(admitJsonActionInput(input, "lsp")) as LspRequestEnvelope;
    const response = projectLsp({ actions }).handle(request);
    return jsonResource(response, "lsp-response");
  },
});

const defaultDapTerm = tm.app(tm.lam(tm.var(0)), tm.charge("potential"));
const dapSessions = new Map<string, ComputingDapProjection>();

function requestParams(request: DapRequestEnvelope): Readonly<Record<string, unknown>> {
  return typeof request.params === "object" && request.params !== null && !Array.isArray(request.params)
    ? request.params as Readonly<Record<string, unknown>>
    : Object.freeze({});
}

function dapSessionId(request: DapRequestEnvelope): string {
  const params = requestParams(request);
  return typeof params["sessionId"] === "string" && params["sessionId"].trim() !== ""
    ? params["sessionId"]
    : "computing-dap";
}

function dapTerm(request: DapRequestEnvelope): Tm | undefined {
  const params = requestParams(request);
  const candidate = params["term"];
  return candidate === undefined ? undefined : tmCarrier.assert(candidate) as Tm;
}

function dapProjection(request: DapRequestEnvelope): ComputingDapProjection {
  const sessionId = dapSessionId(request);
  const existing = dapSessions.get(sessionId);
  if (existing !== undefined) return existing;
  const projection = projectDap({ sessionId, term: dapTerm(request) ?? defaultDapTerm });
  dapSessions.set(sessionId, projection);
  return projection;
}

export const dapAction: Action = action({
  verb: "dap",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Answer one dependency-free JSON-RPC request against computing's DAP projection.",
  description: "Domain: computing/dap/request. Codomain: computing/dap/response. The handler keeps per-session RMN reduction cursors and delegates initialize, launch, next, stepIn, stepOut, continue, stack, scopes, variables, breakpoints, and disconnect to projectDap().handle.",
  domain: dapRequestEnvelopeCarrier,
  codomain: dapResponseEnvelopeCarrier,
  run: (input: unknown): JsonValue => {
    const request = dapRequestEnvelopeCarrier.assert(admitJsonActionInput(input, "dap")) as DapRequestEnvelope;
    const response = dapProjection(request).handle(request);
    return jsonResource(response, "dap-response");
  },
});

export const actions: readonly Action[] = Object.freeze([
  ...coreActions,
  lspAction,
  dapAction,
]);

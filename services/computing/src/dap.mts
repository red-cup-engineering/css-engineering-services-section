/**
 * dap - computing's IN-face temporal protocol over RMN reduction.
 *
 * Debug Adapter Protocol is the time-shaped sibling of LSP: a client does not
 * ask for another machine to execute code, it drives the relating RMN evaluator.
 * `next` reads `step(term)`, `continue` reads `evaluate(term)`, the stack is the
 * focused evaluation context, and variables expose the de-Bruijn environment at
 * that focus.
 */
import {
  carrierFrom,
  evaluate,
  step,
  tmCarrier,
  type FromSchema,
  type Tm,
} from "@red-cup-engineering/relating";

export const DAP_JSONRPC_VERSION = "2.0";

export const DAP_METHODS = Object.freeze({
  initialize: "initialize",
  launch: "launch",
  setBreakpoints: "setBreakpoints",
  stackTrace: "stackTrace",
  scopes: "scopes",
  variables: "variables",
  next: "next",
  stepIn: "stepIn",
  stepOut: "stepOut",
  continue: "continue",
  disconnect: "disconnect",
} as const);

export const dapRequestEnvelopeSchema = {
  $id: "computing/dap/request",
  title: "DapRequestEnvelope",
  description: "A dependency-free JSON-RPC request envelope for the computing DAP projection.",
  type: "object",
  required: ["jsonrpc", "id", "method", "params"],
  additionalProperties: false,
  properties: {
    jsonrpc: { const: DAP_JSONRPC_VERSION },
    id: { type: ["string", "number"] },
    method: { enum: Object.values(DAP_METHODS) },
    params: {},
  },
} as const;

export const dapResponseEnvelopeSchema = {
  $id: "computing/dap/response",
  title: "DapResponseEnvelope",
  description: "A dependency-free JSON-RPC response envelope for the computing DAP projection.",
  type: "object",
  required: ["jsonrpc", "id", "result"],
  additionalProperties: false,
  properties: {
    jsonrpc: { const: DAP_JSONRPC_VERSION },
    id: { type: ["string", "number"] },
    result: {},
  },
} as const;

export const dapDebugSessionSchema = {
  $id: "computing/dap/session",
  title: "DapDebugSession",
  description: "A DAP-visible cursor over an RMN term reduction.",
  type: "object",
  required: ["kind", "sessionId", "stage", "term", "normal"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.dap.session" },
    sessionId: { type: "string" },
    stage: { type: "integer", minimum: 0 },
    term: { $ref: "relating/term/tm" },
    normal: { type: "boolean" },
  },
} as const;

export type DapRequestEnvelope = FromSchema<typeof dapRequestEnvelopeSchema>;
export type DapResponseEnvelope = FromSchema<typeof dapResponseEnvelopeSchema>;
export type DapDebugSession = FromSchema<typeof dapDebugSessionSchema>;

export const dapRequestEnvelopeCarrier = carrierFrom(dapRequestEnvelopeSchema);
export const dapResponseEnvelopeCarrier = carrierFrom(dapResponseEnvelopeSchema);
export const dapDebugSessionCarrier = carrierFrom(dapDebugSessionSchema);

export type DapCommand =
  | typeof DAP_METHODS.initialize
  | typeof DAP_METHODS.launch
  | typeof DAP_METHODS.setBreakpoints
  | typeof DAP_METHODS.stackTrace
  | typeof DAP_METHODS.scopes
  | typeof DAP_METHODS.variables
  | typeof DAP_METHODS.next
  | typeof DAP_METHODS.stepIn
  | typeof DAP_METHODS.stepOut
  | typeof DAP_METHODS.continue
  | typeof DAP_METHODS.disconnect;

export type DapSourceBreakpoint = Readonly<{ line: number; column?: number }>;
export type DapPath = readonly number[];

export interface ComputingDapOptions {
  readonly sessionId?: string;
  readonly term: Tm;
}

export interface ComputingDapProjection {
  readonly session: () => DapDebugSession;
  readonly initialize: () => DapInitializedResult;
  readonly launch: (params: DapLaunchParams) => DapStoppedResult;
  readonly setBreakpoints: (params: DapSetBreakpointsParams) => DapSetBreakpointsResult;
  readonly stackTrace: () => DapStackTraceResult;
  readonly scopes: (params: DapScopesParams) => DapScopesResult;
  readonly variables: (params: DapVariablesParams) => DapVariablesResult;
  readonly next: () => DapStoppedResult;
  readonly stepIn: () => DapStoppedResult;
  readonly stepOut: () => DapStoppedResult;
  readonly continue: () => DapContinuedResult;
  readonly disconnect: () => DapDisconnectedResult;
  readonly handle: (request: DapRequestEnvelope) => DapResponseEnvelope;
}

export interface DapLaunchParams {
  readonly term?: Tm;
}

export interface DapSetBreakpointsParams {
  readonly source?: Readonly<{ path?: string; name?: string }>;
  readonly breakpoints?: readonly DapSourceBreakpoint[];
}

export interface DapScopesParams {
  readonly frameId: number;
}

export interface DapVariablesParams {
  readonly variablesReference: number;
}

export interface DapInitializedResult {
  readonly supportsConfigurationDoneRequest: false;
  readonly supportsStepInTargetsRequest: true;
  readonly supportsSetVariable: false;
}

export interface DapStoppedResult {
  readonly kind: "computing.dap.stopped";
  readonly session: DapDebugSession;
  readonly reason: "entry" | "step" | "stepIn" | "stepOut" | "breakpoint" | "normal";
  readonly focusPath: DapPath;
  readonly currentTerm: Tm;
  readonly reducts: readonly Tm[];
}

export interface DapContinuedResult {
  readonly kind: "computing.dap.continued";
  readonly session: DapDebugSession;
  readonly normalForm: Tm;
}

export interface DapDisconnectedResult {
  readonly kind: "computing.dap.disconnected";
  readonly sessionId: string;
}

export interface DapBreakpoint {
  readonly verified: true;
  readonly line: number;
  readonly message: string;
}

export interface DapSetBreakpointsResult {
  readonly breakpoints: readonly DapBreakpoint[];
}

export interface DapStackFrame {
  readonly id: number;
  readonly name: string;
  readonly line: number;
  readonly column: number;
  readonly source: Readonly<{ name: string; path: string }>;
  readonly term: Tm;
  readonly path: DapPath;
}

export interface DapStackTraceResult {
  readonly stackFrames: readonly DapStackFrame[];
  readonly totalFrames: number;
}

export interface DapScope {
  readonly name: "RMN evaluation context";
  readonly variablesReference: number;
  readonly expensive: false;
}

export interface DapScopesResult {
  readonly scopes: readonly DapScope[];
}

export interface DapVariable {
  readonly name: string;
  readonly value: string;
  readonly type: "term" | "path" | "number" | "binder" | "redex";
  readonly variablesReference: 0;
}

export interface DapVariablesResult {
  readonly variables: readonly DapVariable[];
}

interface ContextFrame {
  readonly term: Tm;
  readonly path: DapPath;
  readonly binderDepth: number;
}

interface BoundVariable {
  readonly name: string;
  readonly binderPath: DapPath;
}

const ROOT_PATH = Object.freeze([] as const);

function pathKey(path: DapPath): string {
  return path.length === 0 ? "/" : `/${path.join("/")}`;
}

function childSegments(term: Tm): readonly number[] {
  switch (term[0]) {
    case "var":
    case "star":
    case "mark":
    case "charge":
    case "bool":
    case "generator":
      return Object.freeze([]);
    case "lam":
    case "fst":
    case "snd":
    case "negate":
    case "conflate":
    case "negConf":
      return Object.freeze([1]);
    case "app":
    case "pair":
    case "joinK":
    case "meetK":
    case "joinT":
    case "meetT":
    case "leK":
    case "leT":
    case "settle":
    case "append":
    case "coincide":
      return Object.freeze([1, 2]);
    case "field":
      return Object.freeze([2]);
    case "cond":
    case "fold":
      return Object.freeze([1, 2, 3]);
  }
}

function childAt(term: Tm, segment: number): Tm {
  const child = term[segment] as Tm | undefined;
  if (child === undefined) throw new RangeError(`DAP term path ${segment} is not a term child of ${term[0]}`);
  return child;
}

function termAt(term: Tm, path: DapPath): Tm {
  let current = term;
  for (const segment of path) current = childAt(current, segment);
  return current;
}

function rebuild(term: Tm, segment: number, child: Tm): Tm {
  switch (term[0]) {
    case "lam": return Object.freeze(["lam", child] as const);
    case "app": return segment === 1 ? Object.freeze(["app", child, term[2]] as const) : Object.freeze(["app", term[1], child] as const);
    case "pair": return segment === 1 ? Object.freeze(["pair", child, term[2]] as const) : Object.freeze(["pair", term[1], child] as const);
    case "fst": return Object.freeze(["fst", child] as const);
    case "snd": return Object.freeze(["snd", child] as const);
    case "negate": return Object.freeze(["negate", child] as const);
    case "conflate": return Object.freeze(["conflate", child] as const);
    case "negConf": return Object.freeze(["negConf", child] as const);
    case "joinK": return segment === 1 ? Object.freeze(["joinK", child, term[2]] as const) : Object.freeze(["joinK", term[1], child] as const);
    case "meetK": return segment === 1 ? Object.freeze(["meetK", child, term[2]] as const) : Object.freeze(["meetK", term[1], child] as const);
    case "joinT": return segment === 1 ? Object.freeze(["joinT", child, term[2]] as const) : Object.freeze(["joinT", term[1], child] as const);
    case "meetT": return segment === 1 ? Object.freeze(["meetT", child, term[2]] as const) : Object.freeze(["meetT", term[1], child] as const);
    case "leK": return segment === 1 ? Object.freeze(["leK", child, term[2]] as const) : Object.freeze(["leK", term[1], child] as const);
    case "leT": return segment === 1 ? Object.freeze(["leT", child, term[2]] as const) : Object.freeze(["leT", term[1], child] as const);
    case "settle": return segment === 1 ? Object.freeze(["settle", child, term[2]] as const) : Object.freeze(["settle", term[1], child] as const);
    case "field": return Object.freeze(["field", term[1], child] as const);
    case "append": return segment === 1 ? Object.freeze(["append", child, term[2]] as const) : Object.freeze(["append", term[1], child] as const);
    case "coincide": return segment === 1 ? Object.freeze(["coincide", child, term[2]] as const) : Object.freeze(["coincide", term[1], child] as const);
    case "cond":
      return segment === 1
        ? Object.freeze(["cond", child, term[2], term[3]] as const)
        : segment === 2
          ? Object.freeze(["cond", term[1], child, term[3]] as const)
          : Object.freeze(["cond", term[1], term[2], child] as const);
    case "fold":
      return segment === 1
        ? Object.freeze(["fold", child, term[2], term[3]] as const)
        : segment === 2
          ? Object.freeze(["fold", term[1], child, term[3]] as const)
          : Object.freeze(["fold", term[1], term[2], child] as const);
    case "var":
    case "star":
    case "mark":
    case "charge":
    case "bool":
    case "generator":
      throw new RangeError(`DAP term path ${segment} is not a term child of ${term[0]}`);
  }
}

function replaceTermAt(term: Tm, path: DapPath, child: Tm): Tm {
  if (path.length === 0) return child;
  const [head, ...tail] = path;
  if (head === undefined) return child;
  return rebuild(term, head, replaceTermAt(childAt(term, head), tail, child));
}

function contextFrames(term: Tm, path: DapPath): readonly ContextFrame[] {
  const frames: ContextFrame[] = [];
  let current = term;
  let cursor: number[] = [];
  let depth = 0;
  frames.push(Object.freeze({ term: current, path: Object.freeze([...cursor]), binderDepth: depth }));
  for (const segment of path) {
    if (current[0] === "lam" && segment === 1) depth += 1;
    current = childAt(current, segment);
    cursor = [...cursor, segment];
    frames.push(Object.freeze({ term: current, path: Object.freeze([...cursor]), binderDepth: depth }));
  }
  return Object.freeze(frames);
}

function boundEnvironment(term: Tm, path: DapPath): readonly BoundVariable[] {
  const bindings: BoundVariable[] = [];
  let current = term;
  let cursor: number[] = [];
  for (const segment of path) {
    if (current[0] === "lam" && segment === 1) {
      bindings.unshift(Object.freeze({
        name: `$${bindings.length}`,
        binderPath: Object.freeze([...cursor]),
      }));
    }
    current = childAt(current, segment);
    cursor = [...cursor, segment];
  }
  return Object.freeze(bindings);
}

function findReducibleDescendant(term: Tm, path: DapPath = ROOT_PATH): DapPath | null {
  const current = termAt(term, path);
  for (const segment of childSegments(current)) {
    const found = findReducibleDescendant(term, Object.freeze([...path, segment]));
    if (found !== null) return found;
  }
  return step(current).length === 0 ? null : path;
}

function sessionCarrier(sessionId: string, stage: number, term: Tm): DapDebugSession {
  return dapDebugSessionCarrier.assert(Object.freeze({
    kind: "computing.dap.session" as const,
    sessionId,
    stage,
    term,
    normal: step(term).length === 0,
  }));
}

function breakpointFromLine(line: number): DapBreakpoint {
  return Object.freeze({
    verified: true as const,
    line,
    message: `RMN settling stage ${line}`,
  });
}

function stopped(
  sessionId: string,
  stage: number,
  term: Tm,
  focusPath: DapPath,
  reason: DapStoppedResult["reason"],
  reducts: readonly Tm[],
): DapStoppedResult {
  return Object.freeze({
    kind: "computing.dap.stopped" as const,
    session: sessionCarrier(sessionId, stage, term),
    reason,
    focusPath,
    currentTerm: termAt(term, focusPath),
    reducts: Object.freeze([...reducts]),
  });
}

export function projectDap(options: ComputingDapOptions): ComputingDapProjection {
  const sessionId = options.sessionId ?? "computing-dap";
  let currentTerm = options.term;
  let focusPath: DapPath = ROOT_PATH;
  let stage = 0;
  const breakpoints = new Set<number>();

  const currentSession = (): DapDebugSession => sessionCarrier(sessionId, stage, currentTerm);

  const initialize = (): DapInitializedResult => Object.freeze({
    supportsConfigurationDoneRequest: false as const,
    supportsStepInTargetsRequest: true as const,
    supportsSetVariable: false as const,
  });

  const launch = (params: DapLaunchParams): DapStoppedResult => {
    if (params.term !== undefined) currentTerm = tmCarrier.assert(params.term) as Tm;
    focusPath = ROOT_PATH;
    stage = 0;
    return stopped(sessionId, stage, currentTerm, focusPath, "entry", step(currentTerm));
  };

  const setBreakpoints = (params: DapSetBreakpointsParams): DapSetBreakpointsResult => {
    breakpoints.clear();
    const lines = params.breakpoints?.map((entry) => entry.line) ?? [];
    for (const line of lines) breakpoints.add(line);
    return Object.freeze({ breakpoints: Object.freeze(lines.map(breakpointFromLine)) });
  };

  const stackTrace = (): DapStackTraceResult => {
    const frames = [...contextFrames(currentTerm, focusPath)].reverse().map((frame, index): DapStackFrame => Object.freeze({
      id: index + 1,
      name: `${frame.term[0]} ${pathKey(frame.path)}`,
      line: stage + 1,
      column: frame.binderDepth + 1,
      source: Object.freeze({ name: "RMN reduction", path: `rmn://${sessionId}${pathKey(frame.path)}` }),
      term: frame.term,
      path: frame.path,
    }));
    return Object.freeze({ stackFrames: Object.freeze(frames), totalFrames: frames.length });
  };

  const scopes = (params: DapScopesParams): DapScopesResult => Object.freeze({
    scopes: Object.freeze([Object.freeze({
      name: "RMN evaluation context" as const,
      variablesReference: params.frameId,
      expensive: false as const,
    })]),
  });

  const variables = (params: DapVariablesParams): DapVariablesResult => {
    const frames = [...contextFrames(currentTerm, focusPath)].reverse();
    const frame = frames[params.variablesReference - 1] ?? frames[0];
    const path = frame?.path ?? focusPath;
    const term = frame?.term ?? termAt(currentTerm, focusPath);
    const reducts = step(term);
    const env = boundEnvironment(currentTerm, path);
    const entries: DapVariable[] = [
      Object.freeze({ name: "term", value: JSON.stringify(term), type: "term" as const, variablesReference: 0 as const }),
      Object.freeze({ name: "path", value: pathKey(path), type: "path" as const, variablesReference: 0 as const }),
      Object.freeze({ name: "oneStepReducts", value: String(reducts.length), type: "number" as const, variablesReference: 0 as const }),
      ...env.map((binding): DapVariable => Object.freeze({
        name: binding.name,
        value: `bound at ${pathKey(binding.binderPath)}`,
        type: "binder" as const,
        variablesReference: 0 as const,
      })),
      ...reducts.map((reduct, index): DapVariable => Object.freeze({
        name: `redex.${index}`,
        value: JSON.stringify(reduct),
        type: "redex" as const,
        variablesReference: 0 as const,
      })),
    ];
    return Object.freeze({ variables: Object.freeze(entries) });
  };

  const next = (): DapStoppedResult => {
    const focused = termAt(currentTerm, focusPath);
    const reducts = step(focused);
    if (reducts.length === 0) return stopped(sessionId, stage, currentTerm, focusPath, "normal", reducts);
    const first = reducts[0];
    if (first === undefined) return stopped(sessionId, stage, currentTerm, focusPath, "normal", reducts);
    currentTerm = replaceTermAt(currentTerm, focusPath, first);
    stage += 1;
    const reason = breakpoints.has(stage) ? "breakpoint" : "step";
    return stopped(sessionId, stage, currentTerm, focusPath, reason, reducts);
  };

  const stepIn = (): DapStoppedResult => {
    const found = findReducibleDescendant(currentTerm, focusPath);
    focusPath = found ?? focusPath;
    return stopped(sessionId, stage, currentTerm, focusPath, "stepIn", step(termAt(currentTerm, focusPath)));
  };

  const stepOut = (): DapStoppedResult => {
    focusPath = Object.freeze(focusPath.slice(0, Math.max(0, focusPath.length - 1)));
    return stopped(sessionId, stage, currentTerm, focusPath, "stepOut", step(termAt(currentTerm, focusPath)));
  };

  const continueReduction = (): DapContinuedResult => {
    currentTerm = evaluate(currentTerm);
    focusPath = ROOT_PATH;
    stage += 1;
    return Object.freeze({
      kind: "computing.dap.continued" as const,
      session: currentSession(),
      normalForm: currentTerm,
    });
  };

  const disconnect = (): DapDisconnectedResult => Object.freeze({
    kind: "computing.dap.disconnected" as const,
    sessionId,
  });

  const handle = (request: DapRequestEnvelope): DapResponseEnvelope => {
    const params = request.params as unknown;
    const result =
      request.method === DAP_METHODS.initialize ? initialize()
        : request.method === DAP_METHODS.launch ? launch(params as DapLaunchParams)
          : request.method === DAP_METHODS.setBreakpoints ? setBreakpoints(params as DapSetBreakpointsParams)
            : request.method === DAP_METHODS.stackTrace ? stackTrace()
              : request.method === DAP_METHODS.scopes ? scopes(params as DapScopesParams)
                : request.method === DAP_METHODS.variables ? variables(params as DapVariablesParams)
                  : request.method === DAP_METHODS.next ? next()
                    : request.method === DAP_METHODS.stepIn ? stepIn()
                      : request.method === DAP_METHODS.stepOut ? stepOut()
                        : request.method === DAP_METHODS.continue ? continueReduction()
                          : disconnect();
    return dapResponseEnvelopeCarrier.assert(Object.freeze({
      jsonrpc: DAP_JSONRPC_VERSION,
      id: request.id,
      result,
    }));
  };

  return Object.freeze({
    session: currentSession,
    initialize,
    launch,
    setBreakpoints,
    stackTrace,
    scopes,
    variables,
    next,
    stepIn,
    stepOut,
    continue: continueReduction,
    disconnect,
    handle,
  });
}

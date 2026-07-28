/**
 * lsp - computing's IN-face reflection protocol.
 *
 * This is the inverse of consuming lsp-mcp from an editor: computing projects a
 * Language Server Protocol surface over the live relating carrier/action graph.
 * Definition, hover, references, and diagnostics are readings of the same
 * carriers and morphisms already registered with relating; there is no second
 * code model hiding behind the protocol.
 */
import {
  carrierFrom,
  printType,
  realize,
  registeredCategory,
  type Action,
  type Carrier,
  type FromSchema,
  type JsonValue,
} from "@red-cup-engineering/relating";
import { coreActions as computingActions } from "./core-actions.mjs";
import { capabilityDecisionCarrier } from "./capability-decision.mjs";
import { capabilityRequestCarrier } from "./capability-request.mjs";
import { computationCarrier } from "./computation.mjs";
import { decisionRequestCarrier, decisionRunCarrier } from "./decision.mjs";
import { fourCarrier } from "./four.mjs";
import { workClosureCarrier } from "./work-closure.mjs";
import { workTypeCarrier } from "./work-type.mjs";

export const LSP_JSONRPC_VERSION = "2.0";

export const LSP_METHODS = Object.freeze({
  definition: "textDocument/definition",
  references: "textDocument/references",
  hover: "textDocument/hover",
  diagnostics: "textDocument/diagnostic",
} as const);

export const lspRequestEnvelopeSchema = {
  $id: "computing/lsp/request",
  title: "LspRequestEnvelope",
  description: "A dependency-free JSON-RPC request envelope for the computing LSP projection.",
  type: "object",
  required: ["jsonrpc", "id", "method", "params"],
  additionalProperties: false,
  properties: {
    jsonrpc: { const: LSP_JSONRPC_VERSION },
    id: { type: ["string", "number"] },
    method: { enum: Object.values(LSP_METHODS) },
    params: {},
  },
} as const;

export const lspResponseEnvelopeSchema = {
  $id: "computing/lsp/response",
  title: "LspResponseEnvelope",
  description: "A dependency-free JSON-RPC response envelope for the computing LSP projection.",
  type: "object",
  required: ["jsonrpc", "id", "result"],
  additionalProperties: false,
  properties: {
    jsonrpc: { const: LSP_JSONRPC_VERSION },
    id: { type: ["string", "number"] },
    result: {},
  },
} as const;

export type LspRequestEnvelope = FromSchema<typeof lspRequestEnvelopeSchema>;
export type LspResponseEnvelope = FromSchema<typeof lspResponseEnvelopeSchema>;

export const lspRequestEnvelopeCarrier = carrierFrom(lspRequestEnvelopeSchema);
export const lspResponseEnvelopeCarrier = carrierFrom(lspResponseEnvelopeSchema);

export type LspPosition = Readonly<{ line: number; character: number }>;
export type LspRange = Readonly<{ start: LspPosition; end: LspPosition }>;
export type LspLocation = Readonly<{ uri: string; range: LspRange }>;
export type LspDiagnostic = Readonly<{
  range: LspRange;
  severity: 1;
  source: "@red-cup-engineering/computing/lsp";
  message: string;
}>;
export type LspHover = Readonly<{
  contents: Readonly<{ kind: "markdown"; value: string }>;
  range: LspRange;
}>;

export type TextDocumentPositionParams = Readonly<{
  textDocument: Readonly<{ uri: string }>;
  position: LspPosition;
}>;

export type ReferenceParams = TextDocumentPositionParams & Readonly<{
  context?: Readonly<{ includeDeclaration?: boolean }>;
}>;

export type DiagnosticParams = Readonly<{
  carrierId?: string;
  textDocument?: Readonly<{ uri: string }>;
  value: unknown;
}>;

export interface ComputingLspProjection {
  readonly carriers: readonly Carrier[];
  readonly actions: readonly Action[];
  readonly documents: readonly LspVirtualDocument[];
  readonly definition: (params: TextDocumentPositionParams) => LspLocation | null;
  readonly hover: (params: TextDocumentPositionParams) => LspHover | null;
  readonly references: (params: ReferenceParams) => readonly LspLocation[];
  readonly diagnostics: (params: DiagnosticParams) => readonly LspDiagnostic[];
  readonly handle: (request: LspRequestEnvelope) => LspResponseEnvelope;
}

export interface LspVirtualDocument {
  readonly kind: "carrier" | "action";
  readonly id: string;
  readonly uri: string;
  readonly text: string;
}

export interface ComputingLspOptions {
  readonly carriers?: readonly Carrier[];
  readonly actions?: readonly Action[];
}

const builtinComputingCarriers = Object.freeze([
  fourCarrier,
  computationCarrier,
  capabilityRequestCarrier,
  capabilityDecisionCarrier,
  workClosureCarrier,
  workTypeCarrier,
  decisionRequestCarrier,
  decisionRunCarrier,
  lspRequestEnvelopeCarrier,
  lspResponseEnvelopeCarrier,
]);

function carrierUri(id: string): string {
  return `computing-lsp://carrier/${encodeURIComponent(id)}.schema.json`;
}

function actionUri(verb: string): string {
  return `computing-lsp://action/${encodeURIComponent(verb)}.json`;
}

function carrierDocument(carrier: Carrier): LspVirtualDocument {
  return Object.freeze({
    kind: "carrier" as const,
    id: carrier.id,
    uri: carrierUri(carrier.id),
    text: `${JSON.stringify(carrier.schema, null, 2)}\n`,
  });
}

function actionDocument(action: Action): LspVirtualDocument {
  const face = Object.freeze({
    kind: action.kind,
    verb: action.verb,
    summary: action.summary,
    description: action.description,
    domain: action.domain?.id,
    codomain: action.codomain?.id,
  });
  return Object.freeze({
    kind: "action" as const,
    id: action.verb,
    uri: actionUri(action.verb),
    text: `${JSON.stringify(face, null, 2)}\n`,
  });
}

function positionAt(text: string, offset: number): LspPosition {
  let line = 0;
  let character = 0;
  for (let i = 0; i < offset; i += 1) {
    if (text[i] === "\n") {
      line += 1;
      character = 0;
    } else {
      character += 1;
    }
  }
  return Object.freeze({ line, character });
}

function offsetAt(text: string, position: LspPosition): number {
  let line = 0;
  let character = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (line === position.line && character === position.character) return i;
    if (text[i] === "\n") {
      line += 1;
      character = 0;
    } else {
      character += 1;
    }
  }
  return text.length;
}

function rangeOfOffset(text: string, offset: number, length: number): LspRange {
  return Object.freeze({
    start: positionAt(text, offset),
    end: positionAt(text, offset + length),
  });
}

function rangeOfNeedle(text: string, needle: string): LspRange {
  const quoted = JSON.stringify(needle);
  const offset = text.indexOf(quoted);
  return rangeOfOffset(text, Math.max(0, offset), offset < 0 ? 0 : quoted.length);
}

function zeroRange(): LspRange {
  return Object.freeze({
    start: Object.freeze({ line: 0, character: 0 }),
    end: Object.freeze({ line: 0, character: 0 }),
  });
}

function quotedStringAt(text: string, position: LspPosition): string | undefined {
  const offset = offsetAt(text, position);
  const lineStart = text.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
  const lineEnd = text.indexOf("\n", offset);
  const line = text.slice(lineStart, lineEnd < 0 ? text.length : lineEnd);
  const lineOffset = offset - lineStart;
  const quoted = /"((?:\\.|[^"\\])*)"/g;
  let match: RegExpExecArray | null;
  while ((match = quoted.exec(line)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (lineOffset < start || lineOffset > end) continue;
    try {
      return JSON.parse(match[0]) as string;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function docstringOf(carrier: Carrier): string {
  const description = carrier.schema["description"];
  if (typeof description === "string") return description;
  const title = carrier.schema["title"];
  return typeof title === "string" ? title : carrier.id;
}

function titleOf(carrier: Carrier): string {
  const title = carrier.schema["title"];
  return typeof title === "string" ? title : carrier.id;
}

function typeFaceOf(carrier: Carrier): string {
  return printType(realize(carrier.schema as JsonValue));
}

function declarationLocation(carrier: Carrier, docs: Map<string, LspVirtualDocument>): LspLocation {
  const doc = docs.get(carrierUri(carrier.id));
  if (doc === undefined) return Object.freeze({ uri: carrierUri(carrier.id), range: zeroRange() });
  return Object.freeze({ uri: doc.uri, range: rangeOfNeedle(doc.text, carrier.id) });
}

function carrierIdFromUri(uri: string): string | undefined {
  const prefix = "computing-lsp://carrier/";
  if (!uri.startsWith(prefix) || !uri.endsWith(".schema.json")) return undefined;
  return decodeURIComponent(uri.slice(prefix.length, -".schema.json".length));
}

function resolveCarrier(
  params: TextDocumentPositionParams,
  carriers: Map<string, Carrier>,
  docs: Map<string, LspVirtualDocument>,
): Carrier | undefined {
  const doc = docs.get(params.textDocument.uri);
  if (doc !== undefined) {
    const token = quotedStringAt(doc.text, params.position);
    if (token !== undefined && carriers.has(token)) return carriers.get(token);
    if (doc.kind === "carrier") return carriers.get(doc.id);
  }
  const uriId = carrierIdFromUri(params.textDocument.uri);
  return uriId === undefined ? undefined : carriers.get(uriId);
}

function actionUseLocations(carrierId: string, actions: readonly Action[], docs: Map<string, LspVirtualDocument>): readonly LspLocation[] {
  const locations: LspLocation[] = [];
  for (const action of actions) {
    const uses = [action.domain?.id, action.codomain?.id];
    if (!uses.includes(carrierId)) continue;
    const doc = docs.get(actionUri(action.verb));
    if (doc === undefined) continue;
    for (const use of uses) {
      if (use !== carrierId) continue;
      locations.push(Object.freeze({ uri: doc.uri, range: rangeOfNeedle(doc.text, carrierId) }));
    }
  }
  return Object.freeze(locations);
}

function diagnosticRangeFromMessage(message: string): LspRange {
  const match = /^\/([^ ]*)/.exec(message);
  if (match === null || match[1] === "") return zeroRange();
  const path = match[1] ?? "";
  const width = path.length;
  return Object.freeze({
    start: Object.freeze({ line: 0, character: 0 }),
    end: Object.freeze({ line: 0, character: width }),
  });
}

function uniqueById<T extends { readonly id: string }>(items: readonly T[]): readonly T[] {
  const byId = new Map<string, T>();
  for (const item of items) byId.set(item.id, item);
  return Object.freeze([...byId.values()]);
}

function uniqueActionsByVerb(items: readonly Action[]): readonly Action[] {
  const byVerb = new Map<string, Action>();
  for (const item of items) byVerb.set(item.verb, item);
  return Object.freeze([...byVerb.values()]);
}

export function projectLsp(options: ComputingLspOptions = {}): ComputingLspProjection {
  const carriers = uniqueById(options.carriers ?? [...builtinComputingCarriers, ...registeredCategory.carriers()]);
  const actions = uniqueActionsByVerb(options.actions ?? [...computingActions, ...registeredCategory.actions()]);
  const documents = Object.freeze([...carriers.map(carrierDocument), ...actions.map(actionDocument)]);
  const carrierById = new Map(carriers.map((carrier) => [carrier.id, carrier] as const));
  const docByUri = new Map(documents.map((doc) => [doc.uri, doc] as const));

  const definition = (params: TextDocumentPositionParams): LspLocation | null => {
    const carrier = resolveCarrier(params, carrierById, docByUri);
    return carrier === undefined ? null : declarationLocation(carrier, docByUri);
  };

  const hover = (params: TextDocumentPositionParams): LspHover | null => {
    const carrier = resolveCarrier(params, carrierById, docByUri);
    if (carrier === undefined) return null;
    return Object.freeze({
      contents: Object.freeze({
        kind: "markdown" as const,
        value: [
          `**${carrier.id}**`,
          "",
          `Title: ${titleOf(carrier)}`,
          "",
          `FromSchema: \`${typeFaceOf(carrier)}\``,
          "",
          docstringOf(carrier),
        ].join("\n"),
      }),
      range: declarationLocation(carrier, docByUri).range,
    });
  };

  const references = (params: ReferenceParams): readonly LspLocation[] => {
    const carrier = resolveCarrier(params, carrierById, docByUri);
    if (carrier === undefined) return Object.freeze([]);
    const refs = actionUseLocations(carrier.id, actions, docByUri);
    return params.context?.includeDeclaration === true
      ? Object.freeze([declarationLocation(carrier, docByUri), ...refs])
      : refs;
  };

  const diagnostics = (params: DiagnosticParams): readonly LspDiagnostic[] => {
    const id = params.carrierId ?? (params.textDocument === undefined ? undefined : carrierIdFromUri(params.textDocument.uri));
    const carrier = id === undefined ? undefined : carrierById.get(id);
    if (carrier === undefined) return Object.freeze([]);
    return Object.freeze(carrier.errors(params.value).map((message) => Object.freeze({
      range: diagnosticRangeFromMessage(message),
      severity: 1 as const,
      source: "@red-cup-engineering/computing/lsp" as const,
      message,
    })));
  };

  const handle = (request: LspRequestEnvelope): LspResponseEnvelope => {
    const params = request.params as unknown;
    const result =
      request.method === LSP_METHODS.definition ? definition(params as TextDocumentPositionParams)
        : request.method === LSP_METHODS.references ? references(params as ReferenceParams)
          : request.method === LSP_METHODS.hover ? hover(params as TextDocumentPositionParams)
            : diagnostics(params as DiagnosticParams);
    return lspResponseEnvelopeCarrier.assert(Object.freeze({
      jsonrpc: LSP_JSONRPC_VERSION,
      id: request.id,
      result,
    }));
  };

  return Object.freeze({ carriers, actions, documents, definition, hover, references, diagnostics, handle });
}

export const computingLspProjection = projectLsp();

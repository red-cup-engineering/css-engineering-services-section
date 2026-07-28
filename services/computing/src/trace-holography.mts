/**
 * trace-holography - content-addressed trace tilings for computing surfaces.
 *
 * The finite reading here is deliberately modest:
 * - Merkle: every tile is addressed by the hash of its canonical payload.
 * - Kolmogorov: byte lengths are description-length witnesses, not true K(x).
 * - Kolmogorov-Uspensky: the trace is a mutable graph-machine neighborhood.
 * - Markov normal algorithms: the fold is a deterministic rewrite to normal form.
 */
import { carrierFrom, type Action, type FromSchema } from "@red-cup-engineering/relating";
import type { DapContinuedResult, DapStoppedResult } from "./dap.mjs";
import type { SettledBuildTerm } from "./holographic-compute.mjs";
import { contentHash, stableJson } from "./holographic-compute.mjs";
import type { LspVirtualDocument } from "./lsp.mjs";

const hashPattern = "^[A-Za-z0-9._:+/-]+$";

export const traceTileSourceSchema = {
  enum: ["labels", "build", "dap", "lsp", "action", "workspace", "manual"],
} as const;

export const traceEventInputSchema = {
  $id: "computing/trace-event-input",
  title: "TraceEventInput",
  type: "object",
  required: ["kind", "source", "subject", "payload", "boundaryHashes"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.trace-event-input" },
    source: traceTileSourceSchema,
    subject: { type: "string", minLength: 1 },
    rule: { type: "string", minLength: 1 },
    stage: { type: "integer", minimum: 0 },
    payload: {},
    boundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
  },
} as const;

export type TraceEventInput = FromSchema<typeof traceEventInputSchema>;
export const traceEventInputCarrier = carrierFrom(traceEventInputSchema);

export const traceTileSchema = {
  $id: "computing/trace-tile",
  title: "TraceTile",
  type: "object",
  required: [
    "kind",
    "$id",
    "source",
    "subject",
    "payload",
    "boundaryHashes",
    "rule",
    "stage",
    "descriptionLength",
    "boundaryDescriptionLength",
    "algorithmicDefect",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.trace-tile" },
    $id: { type: "string", minLength: 1, pattern: hashPattern },
    source: traceTileSourceSchema,
    subject: { type: "string", minLength: 1 },
    payload: {},
    boundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    rule: { type: "string", minLength: 1 },
    stage: { type: "integer", minimum: 0 },
    descriptionLength: { type: "integer", minimum: 0 },
    boundaryDescriptionLength: { type: "integer", minimum: 0 },
    algorithmicDefect: { type: "integer", minimum: 0 },
  },
} as const;

export type TraceTile = FromSchema<typeof traceTileSchema>;
export const traceTileCarrier = carrierFrom(traceTileSchema);

export const traceFoldRequestSchema = {
  $id: "computing/trace-fold-request",
  title: "TraceFoldRequest",
  type: "object",
  required: ["kind", "tiles"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.trace-fold-request" },
    tiles: { type: "array", items: traceTileSchema },
  },
} as const;

export type TraceFoldRequest = FromSchema<typeof traceFoldRequestSchema>;
export const traceFoldRequestCarrier = carrierFrom(traceFoldRequestSchema);

export const traceTilingSchema = {
  $id: "computing/trace-tiling",
  title: "TraceTiling",
  type: "object",
  required: [
    "kind",
    "$id",
    "tiles",
    "edges",
    "boundaryHashes",
    "normalFormHash",
    "causalOrder",
    "closedCover",
    "h1",
    "rewriteSteps",
    "kumGraph",
    "theory",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.trace-tiling" },
    $id: { type: "string", minLength: 1, pattern: hashPattern },
    tiles: { type: "array", items: traceTileSchema },
    edges: {
      type: "array",
      items: {
        type: "object",
        required: ["from", "to", "relation"],
        additionalProperties: false,
        properties: {
          from: { type: "string", minLength: 1, pattern: hashPattern },
          to: { type: "string", minLength: 1, pattern: hashPattern },
          relation: { const: "causes" },
        },
      },
    },
    boundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    normalFormHash: { type: "string", minLength: 1, pattern: hashPattern },
    causalOrder: { type: "boolean" },
    closedCover: { type: "boolean" },
    h1: { type: "integer", minimum: 0 },
    rewriteSteps: {
      type: "array",
      items: {
        type: "object",
        required: ["rule", "tile", "before", "after"],
        additionalProperties: false,
        properties: {
          rule: { type: "string", minLength: 1 },
          tile: { type: "string", minLength: 1, pattern: hashPattern },
          before: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
          after: { type: "string", minLength: 1, pattern: hashPattern },
        },
      },
    },
    kumGraph: {
      type: "object",
      required: ["activeNode", "nodes", "neighborhoods"],
      additionalProperties: false,
      properties: {
        activeNode: { type: "string", minLength: 1, pattern: hashPattern },
        nodes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
        neighborhoods: {
          type: "array",
          items: {
            type: "object",
            required: ["node", "neighbors"],
            additionalProperties: false,
            properties: {
              node: { type: "string", minLength: 1, pattern: hashPattern },
              neighbors: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
            },
          },
        },
      },
    },
    theory: {
      type: "object",
      required: ["merkle", "kolmogorov", "kolmogorovUspensky", "markovNormalAlgorithm"],
      additionalProperties: false,
      properties: {
        merkle: { type: "string", minLength: 1 },
        kolmogorov: { type: "string", minLength: 1 },
        kolmogorovUspensky: { type: "string", minLength: 1 },
        markovNormalAlgorithm: { type: "string", minLength: 1 },
      },
    },
  },
} as const;

export type TraceTiling = FromSchema<typeof traceTilingSchema>;
export const traceTilingCarrier = carrierFrom(traceTilingSchema);

function unique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)]);
}

function sorted(values: Iterable<string>): readonly string[] {
  return Object.freeze([...values].sort((left, right) => left.localeCompare(right)));
}

function hasDirectedCycle(edges: readonly Readonly<{ from: string; to: string }>[]):
boolean {
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    const next = outgoing.get(edge.from) ?? [];
    next.push(edge.to);
    outgoing.set(edge.from, next);
    if (!outgoing.has(edge.to)) outgoing.set(edge.to, []);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (node: string): boolean => {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const next of outgoing.get(node) ?? []) if (visit(next)) return true;
    visiting.delete(node);
    visited.add(node);
    return false;
  };
  return [...outgoing.keys()].some(visit);
}

export function traceTile(input: TraceEventInput): TraceTile {
  const event = traceEventInputCarrier.assert(input) as TraceEventInput;
  const canonical = Object.freeze({
    source: event.source,
    subject: event.subject,
    rule: event.rule ?? `${event.source}.observe`,
    stage: event.stage ?? 0,
    payload: event.payload,
    boundaryHashes: unique(event.boundaryHashes),
  });
  const descriptionLength = stableJson(canonical).length;
  const boundaryDescriptionLength = canonical.boundaryHashes.reduce((sum, hash) => sum + hash.length, 0);
  return traceTileCarrier.assert(Object.freeze({
    kind: "computing.trace-tile" as const,
    $id: contentHash(canonical),
    ...canonical,
    descriptionLength,
    boundaryDescriptionLength,
    algorithmicDefect: Math.max(0, descriptionLength - boundaryDescriptionLength),
  })) as TraceTile;
}

export function traceTileFromBuildTerm(term: SettledBuildTerm): TraceTile {
  return traceTile({
    kind: "computing.trace-event-input",
    source: "build",
    subject: term.derivation.name,
    rule: "nix.derivation.settle",
    stage: 0,
    payload: term,
    boundaryHashes: [term.$id, ...term.boundaryHashes],
  });
}

export function traceTileFromDapStop(result: DapStoppedResult | DapContinuedResult): TraceTile {
  const normal = result.kind === "computing.dap.continued";
  const session = result.session;
  return traceTile({
    kind: "computing.trace-event-input",
    source: "dap",
    subject: session.sessionId,
    rule: normal ? "rmn.evaluate.normal-form" : `rmn.step.${result.reason}`,
    stage: session.stage,
    payload: result,
    boundaryHashes: [contentHash(session.term)],
  });
}

export function traceTileFromLspDocument(document: LspVirtualDocument): TraceTile {
  return traceTile({
    kind: "computing.trace-event-input",
    source: "lsp",
    subject: document.id,
    rule: `lsp.${document.kind}.semantic-address`,
    stage: 0,
    payload: document,
    boundaryHashes: [contentHash(document.text)],
  });
}

export function traceTileFromAction(actionFace: Action): TraceTile {
  const domain = actionFace.domain?.id;
  const codomain = actionFace.codomain?.id;
  return traceTile({
    kind: "computing.trace-event-input",
    source: "action",
    subject: actionFace.verb,
    rule: "relating.action.face",
    stage: 0,
    payload: {
      verb: actionFace.verb,
      summary: actionFace.summary,
      domain,
      codomain,
    },
    boundaryHashes: [
      ...[domain].filter((value): value is string => typeof value === "string"),
      ...[codomain].filter((value): value is string => typeof value === "string"),
    ],
  });
}

function rewriteSteps(tiles: readonly TraceTile[]): readonly TraceTiling["rewriteSteps"][number][] {
  const byId = new Map(tiles.map((tile) => [tile.$id, tile] as const));
  const settled = new Set<string>();
  const remaining = new Map(byId);
  const steps: TraceTiling["rewriteSteps"][number][] = [];
  let changed = true;
  while (changed && remaining.size > 0) {
    changed = false;
    for (const [id, tile] of [...remaining]) {
      const internal = tile.boundaryHashes.filter((hash) => byId.has(hash));
      if (!internal.every((hash) => settled.has(hash))) continue;
      const before = sorted(internal);
      const after = contentHash({ tile: id, before });
      steps.push(Object.freeze({
        rule: "markov.boundary-rewrite" as const,
        tile: id,
        before,
        after,
      }));
      settled.add(id);
      remaining.delete(id);
      changed = true;
    }
  }
  return Object.freeze(steps);
}

export function foldTraceTiles(tilesInput: readonly TraceTile[]): TraceTiling {
  const tiles = Object.freeze(tilesInput.map((tile) => traceTileCarrier.assert(tile) as TraceTile));
  const tileIds = new Set(tiles.map((tile) => tile.$id));
  const edges = Object.freeze(tiles.flatMap((tile) =>
    tile.boundaryHashes
      .filter((hash) => tileIds.has(hash))
      .map((hash) => Object.freeze({ from: hash, to: tile.$id, relation: "causes" as const }))));
  const boundaryHashes = sorted(tiles.flatMap((tile) => tile.boundaryHashes.filter((hash) => !tileIds.has(hash))));
  const causalOrder = !hasDirectedCycle(edges);
  const steps = rewriteSteps(tiles);
  const closedCover = steps.length === tiles.length;
  const normalFormHash = contentHash({ tiles: sorted(tileIds), edges, boundaryHashes, steps });
  const activeNode = normalFormHash;
  const nodes = sorted([activeNode, ...tileIds, ...boundaryHashes]);
  const neighborhoods = Object.freeze(nodes.map((node) => Object.freeze({
    node,
    neighbors: sorted([
      ...edges.filter((edge) => edge.from === node).map((edge) => edge.to),
      ...edges.filter((edge) => edge.to === node).map((edge) => edge.from),
    ]),
  })));
  const h1 = (causalOrder ? 0 : 1) + (closedCover ? 0 : Math.max(1, tiles.length - steps.length));
  return traceTilingCarrier.assert(Object.freeze({
    kind: "computing.trace-tiling" as const,
    $id: contentHash({ normalFormHash, tiles: sorted(tileIds) }),
    tiles,
    edges,
    boundaryHashes,
    normalFormHash,
    causalOrder,
    closedCover,
    h1,
    rewriteSteps: steps,
    kumGraph: Object.freeze({
      activeNode,
      nodes,
      neighborhoods,
    }),
    theory: Object.freeze({
      merkle: "content-addressed directed acyclic hash graph",
      kolmogorov: "finite description-length shadow, not exact Kolmogorov complexity",
      kolmogorovUspensky: "trace as graph-machine local neighborhood",
      markovNormalAlgorithm: "deterministic boundary rewrite to normal form",
    }),
  })) as TraceTiling;
}

export function foldTraceEvents(events: readonly TraceEventInput[]): TraceTiling {
  return foldTraceTiles(events.map(traceTile));
}

/**
 * holographic-compute - Nix-as-settling for content-addressed build terms.
 *
 * A Nix derivation is read here as a settled computing term. When a Nix store
 * path is present, the store hash is the term's `$id`; otherwise the finite
 * executable shadow uses the sha256 of the canonical derivation record. The
 * dependency graph is read as a LightObservation: sub-derivations causally
 * precede the derivations that depend on them.
 */
import { createHash } from "node:crypto";
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";

const hashPattern = "^[A-Za-z0-9._:+/-]+$";

const buildInputSchema = {
  type: "object",
  required: ["hash"],
  additionalProperties: false,
  properties: {
    hash: { type: "string", minLength: 1, pattern: hashPattern },
    name: { type: "string", minLength: 1 },
    storePath: { type: "string", minLength: 1 },
  },
} as const;

export const buildDerivationSchema = {
  $id: "computing/build-derivation",
  title: "BuildDerivation",
  type: "object",
  required: ["kind", "name", "inputs"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.build-derivation" },
    name: { type: "string", minLength: 1 },
    builder: { type: "string", minLength: 1 },
    system: { type: "string", minLength: 1 },
    storePath: { type: "string", minLength: 1 },
    drvPath: { type: "string", minLength: 1 },
    outPath: { type: "string", minLength: 1 },
    args: { type: "array", items: { type: "string" } },
    env: { type: "object", additionalProperties: { type: "string" } },
    outputs: { type: "object", additionalProperties: { type: "string" } },
    inputs: { type: "array", items: buildInputSchema },
  },
} as const;

export type BuildDerivation = FromSchema<typeof buildDerivationSchema>;
export const buildDerivationCarrier = carrierFrom(buildDerivationSchema);

export const settledBuildTermSchema = {
  $id: "computing/settled-build-term",
  title: "SettledBuildTerm",
  type: "object",
  required: ["kind", "$id", "storeHash", "address", "workType", "hashAlgorithm", "derivation", "boundaryHashes"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.settled-build-term" },
    $id: { type: "string", minLength: 1, pattern: hashPattern },
    storeHash: { type: "string", minLength: 1, pattern: hashPattern },
    address: { type: "string", minLength: 1, pattern: hashPattern },
    workType: { const: "derivation" },
    hashAlgorithm: { enum: ["nix-store", "sha256"] },
    derivation: buildDerivationSchema,
    boundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
  },
} as const;

export type SettledBuildTerm = FromSchema<typeof settledBuildTermSchema>;
export const settledBuildTermCarrier = carrierFrom(settledBuildTermSchema);

export const lightObservationSchema = {
  $id: "computing/light-observation",
  title: "LightObservation",
  type: "object",
  required: ["kind", "nodes", "edges", "boundaryHashes", "causalOrder", "h1"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.light-observation" },
    nodes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    edges: {
      type: "array",
      items: {
        type: "object",
        required: ["from", "to"],
        additionalProperties: false,
        properties: {
          from: { type: "string", minLength: 1, pattern: hashPattern },
          to: { type: "string", minLength: 1, pattern: hashPattern },
        },
      },
    },
    boundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    causalOrder: { type: "boolean" },
    h1: { type: "integer", minimum: 0 },
  },
} as const;

export type LightObservation = FromSchema<typeof lightObservationSchema>;
export const lightObservationCarrier = carrierFrom(lightObservationSchema);

export const buildReconstructionRequestSchema = {
  $id: "computing/build-reconstruction-request",
  title: "BuildReconstructionRequest",
  type: "object",
  required: ["kind", "targetHash", "boundaryHashes", "tiles"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.build-reconstruction-request" },
    targetHash: { type: "string", minLength: 1, pattern: hashPattern },
    boundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    tiles: { type: "array", items: settledBuildTermSchema },
  },
} as const;

export type BuildReconstructionRequest = FromSchema<typeof buildReconstructionRequestSchema>;
export const buildReconstructionRequestCarrier = carrierFrom(buildReconstructionRequestSchema);

export const buildReconstructionSchema = {
  $id: "computing/build-reconstruction",
  title: "BuildReconstruction",
  type: "object",
  required: [
    "kind",
    "targetHash",
    "reconstructible",
    "resultHash",
    "closureHashes",
    "boundaryHashes",
    "missingSubderivations",
    "boundaryObstructions",
    "cycleObstructions",
    "cover",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.build-reconstruction" },
    targetHash: { type: "string", minLength: 1, pattern: hashPattern },
    reconstructible: { type: "boolean" },
    resultHash: { type: "string", minLength: 1, pattern: hashPattern },
    closureHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    boundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    missingSubderivations: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    boundaryObstructions: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    cycleObstructions: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    cover: {
      type: "object",
      required: ["h1", "closed", "acyclic", "boundaryExact"],
      additionalProperties: false,
      properties: {
        h1: { type: "integer", minimum: 0 },
        closed: { type: "boolean" },
        acyclic: { type: "boolean" },
        boundaryExact: { type: "boolean" },
      },
    },
  },
} as const;

export type BuildReconstruction = FromSchema<typeof buildReconstructionSchema>;
export const buildReconstructionCarrier = carrierFrom(buildReconstructionSchema);

export const buildDiffRequestSchema = {
  $id: "computing/build-diff-request",
  title: "BuildDiffRequest",
  type: "object",
  required: ["kind", "leftTargetHash", "rightTargetHash", "leftBoundaryHashes", "rightBoundaryHashes", "tiles"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.build-diff-request" },
    leftTargetHash: { type: "string", minLength: 1, pattern: hashPattern },
    rightTargetHash: { type: "string", minLength: 1, pattern: hashPattern },
    leftBoundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    rightBoundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    tiles: { type: "array", items: settledBuildTermSchema },
  },
} as const;

export type BuildDiffRequest = FromSchema<typeof buildDiffRequestSchema>;
export const buildDiffRequestCarrier = carrierFrom(buildDiffRequestSchema);

export const buildDiffSchema = {
  $id: "computing/build-diff",
  title: "BuildDiff",
  type: "object",
  required: [
    "kind",
    "leftTargetHash",
    "rightTargetHash",
    "equivalent",
    "reconstructible",
    "sharedHashes",
    "addedHashes",
    "removedHashes",
    "boundaryDeltaHashes",
    "h1",
    "left",
    "right",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.build-diff" },
    leftTargetHash: { type: "string", minLength: 1, pattern: hashPattern },
    rightTargetHash: { type: "string", minLength: 1, pattern: hashPattern },
    equivalent: { type: "boolean" },
    reconstructible: { type: "boolean" },
    sharedHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    addedHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    removedHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    boundaryDeltaHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    h1: { type: "integer", minimum: 0 },
    left: buildReconstructionSchema,
    right: buildReconstructionSchema,
  },
} as const;

export type BuildDiff = FromSchema<typeof buildDiffSchema>;
export const buildDiffCarrier = carrierFrom(buildDiffSchema);

const nixStoreHashPattern = /(?:^|[/\\])nix[/\\]store[/\\]([0-9a-df-np-sv-z]{32})-[^/\\]+$/i;

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stable(entry)]),
    );
  }
  return value;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(stable(value));
}

export function contentHash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function nixStoreHash(path: string): string | undefined {
  return nixStoreHashPattern.exec(path)?.[1];
}

function unique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)]);
}

function sorted(values: Iterable<string>): readonly string[] {
  return Object.freeze([...values].sort((left, right) => left.localeCompare(right)));
}

export function settleBuildDerivation(input: BuildDerivation): SettledBuildTerm {
  const derivation = buildDerivationCarrier.assert(input) as BuildDerivation;
  const storePath = derivation.outPath ?? derivation.storePath ?? derivation.drvPath;
  const parsedHash = storePath === undefined ? undefined : nixStoreHash(storePath);
  const storeHash = parsedHash ?? contentHash(derivation);
  return settledBuildTermCarrier.assert(Object.freeze({
    kind: "computing.settled-build-term" as const,
    $id: storeHash,
    storeHash,
    address: storeHash,
    workType: "derivation" as const,
    hashAlgorithm: parsedHash === undefined ? "sha256" as const : "nix-store" as const,
    derivation,
    boundaryHashes: unique(derivation.inputs.map((entry) => entry.hash)),
  })) as SettledBuildTerm;
}

function edgesOf(term: SettledBuildTerm): readonly Readonly<{ from: string; to: string }>[] {
  return Object.freeze(term.boundaryHashes.map((hash) => Object.freeze({ from: hash, to: term.$id })));
}

function hasDirectedCycle(edges: readonly Readonly<{ from: string; to: string }>[]): boolean {
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

export function lightObservation(terms: readonly SettledBuildTerm[]): LightObservation {
  const settled = terms.map((term) => settledBuildTermCarrier.assert(term) as SettledBuildTerm);
  const edges = Object.freeze(settled.flatMap(edgesOf));
  const nodes = new Set<string>();
  const inbound = new Map<string, number>();
  for (const term of settled) {
    nodes.add(term.$id);
    inbound.set(term.$id, inbound.get(term.$id) ?? 0);
    for (const hash of term.boundaryHashes) {
      nodes.add(hash);
      inbound.set(hash, inbound.get(hash) ?? 0);
      inbound.set(term.$id, (inbound.get(term.$id) ?? 0) + 1);
    }
  }
  const boundaryHashes = sorted([...nodes].filter((node) => (inbound.get(node) ?? 0) === 0));
  const causalOrder = !hasDirectedCycle(edges);
  return lightObservationCarrier.assert(Object.freeze({
    kind: "computing.light-observation" as const,
    nodes: sorted(nodes),
    edges,
    boundaryHashes,
    causalOrder,
    h1: causalOrder ? 0 : 1,
  })) as LightObservation;
}

function symmetricDifference(left: readonly string[], right: readonly string[]): readonly string[] {
  const l = new Set(left);
  const r = new Set(right);
  return sorted([...left.filter((value) => !r.has(value)), ...right.filter((value) => !l.has(value))]);
}

export function reconstructFromHashes(input: BuildReconstructionRequest): BuildReconstruction {
  const request = buildReconstructionRequestCarrier.assert(input) as BuildReconstructionRequest;
  const tiles = new Map(request.tiles.map((tile) => [tile.$id, tile]));
  const missing = new Set<string>();
  const closure = new Set<string>();
  const cycles = new Set<string>();
  const visiting = new Set<string>();

  const visit = (hash: string): void => {
    if (visiting.has(hash)) {
      cycles.add(hash);
      return;
    }
    if (closure.has(hash)) return;
    const tile = tiles.get(hash);
    if (tile === undefined) {
      missing.add(hash);
      return;
    }
    visiting.add(hash);
    for (const dependency of tile.boundaryHashes) visit(dependency);
    visiting.delete(hash);
    closure.add(hash);
  };

  visit(request.targetHash);
  const closureHashes = sorted(closure);
  const computedBoundary = sorted(closureHashes.filter((hash) => {
    const tile = tiles.get(hash);
    return tile !== undefined && tile.boundaryHashes.length === 0;
  }));
  const boundaryObstructions = symmetricDifference(computedBoundary, request.boundaryHashes);
  const cycleObstructions = sorted(cycles);
  const missingSubderivations = sorted(missing);
  const h1 = missingSubderivations.length + boundaryObstructions.length + cycleObstructions.length;

  return buildReconstructionCarrier.assert(Object.freeze({
    kind: "computing.build-reconstruction" as const,
    targetHash: request.targetHash,
    reconstructible: h1 === 0,
    resultHash: request.targetHash,
    closureHashes,
    boundaryHashes: computedBoundary,
    missingSubderivations,
    boundaryObstructions,
    cycleObstructions,
    cover: Object.freeze({
      h1,
      closed: missingSubderivations.length === 0,
      acyclic: cycleObstructions.length === 0,
      boundaryExact: boundaryObstructions.length === 0,
    }),
  })) as BuildReconstruction;
}

function intersection(left: readonly string[], right: readonly string[]): readonly string[] {
  const r = new Set(right);
  return sorted(left.filter((value) => r.has(value)));
}

function difference(left: readonly string[], right: readonly string[]): readonly string[] {
  const r = new Set(right);
  return sorted(left.filter((value) => !r.has(value)));
}

export function diffFromBoundaryHashes(input: BuildDiffRequest): BuildDiff {
  const request = buildDiffRequestCarrier.assert(input) as BuildDiffRequest;
  const left = reconstructFromHashes({
    kind: "computing.build-reconstruction-request",
    targetHash: request.leftTargetHash,
    boundaryHashes: request.leftBoundaryHashes,
    tiles: request.tiles,
  });
  const right = reconstructFromHashes({
    kind: "computing.build-reconstruction-request",
    targetHash: request.rightTargetHash,
    boundaryHashes: request.rightBoundaryHashes,
    tiles: request.tiles,
  });
  const sharedHashes = intersection(left.closureHashes, right.closureHashes);
  const addedHashes = difference(right.closureHashes, left.closureHashes);
  const removedHashes = difference(left.closureHashes, right.closureHashes);
  const boundaryDeltaHashes = symmetricDifference(left.boundaryHashes, right.boundaryHashes);
  const diffH1 = left.cover.h1 + right.cover.h1;
  return buildDiffCarrier.assert(Object.freeze({
    kind: "computing.build-diff" as const,
    leftTargetHash: request.leftTargetHash,
    rightTargetHash: request.rightTargetHash,
    equivalent: addedHashes.length === 0 && removedHashes.length === 0 && boundaryDeltaHashes.length === 0,
    reconstructible: left.reconstructible && right.reconstructible,
    sharedHashes,
    addedHashes,
    removedHashes,
    boundaryDeltaHashes,
    h1: diffH1,
    left,
    right,
  })) as BuildDiff;
}

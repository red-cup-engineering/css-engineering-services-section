/**
 * coordination-spectrum - one finite obstruction reading across holographic compute.
 *
 * The other modules expose local readings: a Nix build light cone, trace tiling,
 * provenance spine, observation game, and society convergence. This module folds
 * those sections into one content-addressed spectrum so a caller can ask whether
 * the whole finite cover is reconstructible without leaving the computing surface.
 */
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";
import type { EventualConsistency } from "./consensus-convergence.mjs";
import type { SpectralSociety } from "./computing.mjs";
import type { DerivationProvenanceReceipt } from "./derivation-provenance.mjs";
import type { ComputingFace } from "./face.mjs";
import type { ObservationGameProjection } from "./game-projection.mjs";
import { contentHash } from "./holographic-compute.mjs";
import type { LightObservation } from "./holographic-compute.mjs";
import type { TraceTiling } from "./trace-holography.mjs";

const hashPattern = "^[A-Za-z0-9._:+/-]+$";

export const coordinationSpectrumRequestSchema = {
  $id: "computing/coordination-spectrum-request",
  title: "CoordinationSpectrumRequest",
  type: "object",
  required: ["kind"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.coordination-spectrum-request" },
    boundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    lightObservation: { type: "object" },
    trace: { type: "object" },
    provenance: { type: "object" },
    game: { type: "object" },
    face: { type: "object" },
    spectralSociety: { type: "object" },
    eventualConsistency: { type: "object" },
  },
} as const;

export type CoordinationSpectrumRequest = FromSchema<typeof coordinationSpectrumRequestSchema> & Readonly<{
  boundaryHashes?: readonly string[];
  lightObservation?: LightObservation;
  trace?: TraceTiling;
  provenance?: DerivationProvenanceReceipt;
  game?: ObservationGameProjection;
  face?: ComputingFace;
  spectralSociety?: SpectralSociety;
  eventualConsistency?: EventualConsistency;
}>;
export const coordinationSpectrumRequestCarrier = carrierFrom(coordinationSpectrumRequestSchema);

export const coordinationSpectrumSchema = {
  $id: "computing/coordination-spectrum",
  title: "CoordinationSpectrum",
  type: "object",
  required: [
    "kind",
    "$id",
    "boundaryHashes",
    "normalFormHash",
    "obstructionRank",
    "reconstructible",
    "spectrum",
    "theory",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.coordination-spectrum" },
    $id: { type: "string", minLength: 1, pattern: hashPattern },
    boundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    normalFormHash: { type: "string", minLength: 1, pattern: hashPattern },
    obstructionRank: { type: "integer", minimum: 0 },
    reconstructible: { type: "boolean" },
    spectrum: {
      type: "object",
      required: ["causal", "trace", "provenance", "coordination", "game", "defect"],
      additionalProperties: false,
      properties: {
        causal: {
          type: "object",
          required: ["present", "causalOrder", "nodes", "edges", "h1"],
          additionalProperties: false,
          properties: {
            present: { type: "boolean" },
            causalOrder: { type: "boolean" },
            nodes: { type: "integer", minimum: 0 },
            edges: { type: "integer", minimum: 0 },
            h1: { type: "integer", minimum: 0 },
          },
        },
        trace: {
          type: "object",
          required: ["present", "closedCover", "tiles", "rewriteSteps", "h1", "algorithmicDefect"],
          additionalProperties: false,
          properties: {
            present: { type: "boolean" },
            closedCover: { type: "boolean" },
            tiles: { type: "integer", minimum: 0 },
            rewriteSteps: { type: "integer", minimum: 0 },
            h1: { type: "integer", minimum: 0 },
            algorithmicDefect: { type: "integer", minimum: 0 },
          },
        },
        provenance: {
          type: "object",
          required: ["present", "stages", "closedCover", "h1"],
          additionalProperties: false,
          properties: {
            present: { type: "boolean" },
            stages: { type: "integer", minimum: 0 },
            closedCover: { type: "boolean" },
            h1: { type: "integer", minimum: 0 },
          },
        },
        coordination: {
          type: "object",
          required: [
            "present",
            "members",
            "concerns",
            "contested",
            "consensusRequired",
            "coordinationFree",
            "flpEscaped",
            "clusters",
            "irreducible",
            "atEquilibrium",
          ],
          additionalProperties: false,
          properties: {
            present: { type: "boolean" },
            members: { type: "integer", minimum: 0 },
            concerns: { type: "integer", minimum: 0 },
            contested: { type: "integer", minimum: 0 },
            consensusRequired: { type: "boolean" },
            coordinationFree: { type: "boolean" },
            flpEscaped: { type: "boolean" },
            clusters: { type: "integer", minimum: 0 },
            irreducible: { type: "integer", minimum: 0 },
            atEquilibrium: { type: "boolean" },
          },
        },
        game: {
          type: "object",
          required: ["present", "moves", "positive", "negative", "silent", "validStrategy"],
          additionalProperties: false,
          properties: {
            present: { type: "boolean" },
            moves: { type: "integer", minimum: 0 },
            positive: { type: "integer", minimum: 0 },
            negative: { type: "integer", minimum: 0 },
            silent: { type: "integer", minimum: 0 },
            validStrategy: { type: "boolean" },
          },
        },
        defect: {
          type: "object",
          required: ["boundaryDescriptionLength", "payloadDescriptionLength", "algorithmicDefect"],
          additionalProperties: false,
          properties: {
            boundaryDescriptionLength: { type: "integer", minimum: 0 },
            payloadDescriptionLength: { type: "integer", minimum: 0 },
            algorithmicDefect: { type: "integer", minimum: 0 },
          },
        },
      },
    },
    theory: {
      type: "object",
      required: ["nix", "merkle", "soviet", "calm", "game"],
      additionalProperties: false,
      properties: {
        nix: { type: "string", minLength: 1 },
        merkle: { type: "string", minLength: 1 },
        soviet: { type: "string", minLength: 1 },
        calm: { type: "string", minLength: 1 },
        game: { type: "string", minLength: 1 },
      },
    },
  },
} as const;

export type CoordinationSpectrum = FromSchema<typeof coordinationSpectrumSchema>;
export const coordinationSpectrumCarrier = carrierFrom(coordinationSpectrumSchema);

function unique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)]);
}

function sorted(values: Iterable<string>): readonly string[] {
  return Object.freeze([...values].sort((left, right) => left.localeCompare(right)));
}

function boundaryOf(request: CoordinationSpectrumRequest): readonly string[] {
  return sorted(unique([
    ...(request.boundaryHashes ?? []),
    ...(request.lightObservation?.boundaryHashes ?? []),
    ...(request.trace?.boundaryHashes ?? []),
    ...(request.provenance?.boundaryHashes ?? []),
    ...[request.game?.observationHash].filter((value): value is string => typeof value === "string"),
  ]));
}

function boolObstruction(value: boolean): number {
  return value ? 0 : 1;
}

export function coordinateHolographicCompute(input: CoordinationSpectrumRequest): CoordinationSpectrum {
  const request = coordinationSpectrumRequestCarrier.assert(input) as CoordinationSpectrumRequest;
  const boundaryHashes = boundaryOf(request);
  const traceAlgorithmicDefect = request.trace?.tiles.reduce((sum, tile) => sum + tile.algorithmicDefect, 0) ?? 0;
  const payloadDescriptionLength = JSON.stringify(request).length;
  const boundaryDescriptionLength = boundaryHashes.reduce((sum, hash) => sum + hash.length, 0);
  const algorithmicDefect = Math.max(0, payloadDescriptionLength - boundaryDescriptionLength);
  const causalH1 = request.lightObservation?.h1 ?? 0;
  const traceH1 = request.trace?.h1 ?? 0;
  const provenanceH1 = request.provenance?.trace.h1 ?? 0;
  const contested = request.eventualConsistency?.contested ?? request.face?.contested ?? 0;
  const strategyObstruction = request.game === undefined ? 0 : boolObstruction(request.game.report.validPlays);
  const coordinationObstruction = request.eventualConsistency === undefined ? 0 : boolObstruction(!request.eventualConsistency.consensusRequired);
  const obstructionRank = causalH1 + traceH1 + provenanceH1 + contested + strategyObstruction + coordinationObstruction;
  const normalFormHash = contentHash({
    boundaryHashes,
    lightObservation: request.lightObservation?.nodes,
    trace: request.trace?.normalFormHash,
    provenance: request.provenance?.settledHash,
    game: request.game?.observationHash,
    face: request.face?.aggregate.value,
    spectralSociety: request.spectralSociety?.cohomology,
    eventualConsistency: request.eventualConsistency,
  });

  return coordinationSpectrumCarrier.assert(Object.freeze({
    kind: "computing.coordination-spectrum" as const,
    $id: contentHash({ normalFormHash, obstructionRank }),
    boundaryHashes,
    normalFormHash,
    obstructionRank,
    reconstructible: obstructionRank === 0,
    spectrum: Object.freeze({
      causal: Object.freeze({
        present: request.lightObservation !== undefined,
        causalOrder: request.lightObservation?.causalOrder ?? true,
        nodes: request.lightObservation?.nodes.length ?? 0,
        edges: request.lightObservation?.edges.length ?? 0,
        h1: causalH1,
      }),
      trace: Object.freeze({
        present: request.trace !== undefined,
        closedCover: request.trace?.closedCover ?? true,
        tiles: request.trace?.tiles.length ?? 0,
        rewriteSteps: request.trace?.rewriteSteps.length ?? 0,
        h1: traceH1,
        algorithmicDefect: traceAlgorithmicDefect,
      }),
      provenance: Object.freeze({
        present: request.provenance !== undefined,
        stages: request.provenance?.stages.length ?? 0,
        closedCover: request.provenance?.trace.closedCover ?? true,
        h1: provenanceH1,
      }),
      coordination: Object.freeze({
        present: request.face !== undefined || request.eventualConsistency !== undefined || request.spectralSociety !== undefined,
        members: request.eventualConsistency?.members ?? request.face?.members ?? request.spectralSociety?.agents ?? 0,
        concerns: request.eventualConsistency?.concerns ?? request.face?.cover ?? 0,
        contested,
        consensusRequired: request.eventualConsistency?.consensusRequired ?? contested > 0,
        coordinationFree: request.eventualConsistency?.coordinationFree ?? true,
        flpEscaped: request.eventualConsistency?.flpEscaped ?? contested === 0,
        clusters: request.spectralSociety?.clusters ?? 0,
        irreducible: request.spectralSociety?.irreducible ?? 0,
        atEquilibrium: request.spectralSociety?.atEquilibrium ?? true,
      }),
      game: Object.freeze({
        present: request.game !== undefined,
        moves: request.game?.play.moves.length ?? 0,
        positive: request.game?.polarityReading.positive.length ?? 0,
        negative: request.game?.polarityReading.negative.length ?? 0,
        silent: request.game?.polarityReading.silent.length ?? 0,
        validStrategy: request.game?.report.validPlays ?? true,
      }),
      defect: Object.freeze({
        boundaryDescriptionLength,
        payloadDescriptionLength,
        algorithmicDefect,
      }),
    }),
    theory: Object.freeze({
      nix: "derivations are settled terms; the store hash is the finite causal coordinate",
      merkle: "each section contributes a content address and boundary hashes to one finite DAG",
      soviet: "Kolmogorov-Uspensky graph neighborhoods plus Markov normal-form rewriting read computation as local graph transformation",
      calm: "monotone knowledge accumulation stays coordination-free; contested top cells are counted as the obstruction to forced consensus",
      game: "observation arenas become game-semantic plays whose strategy validity is part of the cover obstruction",
    }),
  })) as CoordinationSpectrum;
}

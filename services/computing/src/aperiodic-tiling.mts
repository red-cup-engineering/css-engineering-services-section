/**
 * aperiodic-tiling - finite Wang/Robinson-style local matching over hash tiles.
 *
 * This is not a proof of aperiodicity. It is the executable local-constraint
 * surface computing needs: every content hash induces colored boundaries,
 * semantic incidences can supply complementary local matching colors, and a
 * deterministic substitution patch exposes the next scale as a content-addressed
 * refinement.
 */
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";
import { contentHash } from "./holographic-compute.mjs";
import type { TraceTiling, TraceTile } from "./trace-holography.mjs";
import type { EcosystemInfoTiling } from "./ecosystem-infotiling.mjs";

const hashPattern = "^[A-Za-z0-9._:+/-]+$";

export const aperiodicTileSchema = {
  $id: "computing/aperiodic-tile",
  title: "AperiodicTile",
  type: "object",
  required: ["kind", "$id", "source", "subject", "edges", "boundaryHashes", "boundaryColors"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.aperiodic-tile" },
    $id: { type: "string", minLength: 1, pattern: hashPattern },
    source: { enum: ["trace", "ecosystem", "manual"] },
    subject: { type: "string", minLength: 1 },
    edges: {
      type: "object",
      required: ["north", "east", "south", "west"],
      additionalProperties: false,
      properties: {
        north: { type: "string", minLength: 1 },
        east: { type: "string", minLength: 1 },
        south: { type: "string", minLength: 1 },
        west: { type: "string", minLength: 1 },
      },
    },
    boundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    boundaryColors: {
      type: "array",
      items: {
        type: "object",
        required: ["neighborHash", "color", "role"],
        additionalProperties: false,
        properties: {
          neighborHash: { type: "string", minLength: 1, pattern: hashPattern },
          color: { type: "string", minLength: 1 },
          role: { enum: ["requires", "provides", "precedes", "follows", "touches"] },
        },
      },
    },
  },
} as const;

export type AperiodicTile = FromSchema<typeof aperiodicTileSchema>;
export const aperiodicTileCarrier = carrierFrom(aperiodicTileSchema);

export const aperiodicPatchRequestSchema = {
  $id: "computing/aperiodic-patch-request",
  title: "AperiodicPatchRequest",
  type: "object",
  required: ["kind", "tiles"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.aperiodic-patch-request" },
    tiles: { type: "array", items: aperiodicTileSchema },
    matchingLaw: { enum: ["semantic-incidence", "independent-edge"] },
  },
} as const;

export type AperiodicPatchRequest = FromSchema<typeof aperiodicPatchRequestSchema>;
export const aperiodicPatchRequestCarrier = carrierFrom(aperiodicPatchRequestSchema);

export const aperiodicPatchSchema = {
  $id: "computing/aperiodic-patch",
  title: "AperiodicPatch",
  type: "object",
  required: [
    "kind",
    "$id",
    "tiles",
    "adjacencies",
    "defects",
    "locallyConsistent",
    "matchingLaw",
    "substitution",
    "diffraction",
    "contextuality",
    "automaton",
    "theory",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.aperiodic-patch" },
    $id: { type: "string", minLength: 1, pattern: hashPattern },
    tiles: { type: "array", items: aperiodicTileSchema },
    adjacencies: {
      type: "array",
      items: {
        type: "object",
        required: ["from", "to", "direction", "matched"],
        additionalProperties: false,
        properties: {
          from: { type: "string", minLength: 1, pattern: hashPattern },
          to: { type: "string", minLength: 1, pattern: hashPattern },
          direction: { enum: ["east", "south"] },
          color: { type: "string", minLength: 1 },
          matched: { type: "boolean" },
        },
      },
    },
    defects: {
      type: "array",
      items: {
        type: "object",
        required: ["from", "to", "direction", "expected", "actual"],
        additionalProperties: false,
        properties: {
          from: { type: "string", minLength: 1, pattern: hashPattern },
          to: { type: "string", minLength: 1, pattern: hashPattern },
          direction: { enum: ["east", "south"] },
          expected: { type: "string", minLength: 1 },
          actual: { type: "string", minLength: 1 },
        },
      },
    },
    locallyConsistent: { type: "boolean" },
    matchingLaw: { enum: ["semantic-incidence", "independent-edge"] },
    substitution: {
      type: "object",
      required: ["inflation", "tiles", "patchHash"],
      additionalProperties: false,
      properties: {
        inflation: { const: 2 },
        tiles: { type: "array", items: aperiodicTileSchema },
        patchHash: { type: "string", minLength: 1, pattern: hashPattern },
      },
    },
    diffraction: {
      type: "object",
      required: ["sampleSize", "entropyBits", "frequencies", "braggPeaks"],
      additionalProperties: false,
      properties: {
        sampleSize: { type: "integer", minimum: 0 },
        entropyBits: { type: "number", minimum: 0 },
        frequencies: {
          type: "array",
          items: {
            type: "object",
            required: ["frequency", "intensity"],
            additionalProperties: false,
            properties: {
              frequency: { type: "integer", minimum: 0 },
              intensity: { type: "number", minimum: 0 },
            },
          },
        },
        braggPeaks: {
          type: "array",
          items: {
            type: "object",
            required: ["frequency", "intensity"],
            additionalProperties: false,
            properties: {
              frequency: { type: "integer", minimum: 0 },
              intensity: { type: "number", minimum: 0 },
            },
          },
        },
      },
    },
    contextuality: {
      type: "object",
      required: ["globalSection", "obstructionRank", "unmatchedEdges"],
      additionalProperties: false,
      properties: {
        globalSection: { type: "boolean" },
        obstructionRank: { type: "integer", minimum: 0 },
        unmatchedEdges: { type: "integer", minimum: 0 },
      },
    },
    automaton: {
      type: "object",
      required: ["states", "rewarded", "penalized"],
      additionalProperties: false,
      properties: {
        states: {
          type: "array",
          items: {
            type: "object",
            required: ["tileHash", "state", "response"],
            additionalProperties: false,
            properties: {
              tileHash: { type: "string", minLength: 1, pattern: hashPattern },
              state: { type: "integer" },
              response: { enum: ["reward", "penalty"] },
            },
          },
        },
        rewarded: { type: "integer", minimum: 0 },
        penalized: { type: "integer", minimum: 0 },
      },
    },
    theory: {
      type: "object",
      required: ["wang", "robinson", "diffraction", "contextuality", "soviet"],
      additionalProperties: false,
      properties: {
        wang: { type: "string", minLength: 1 },
        robinson: { type: "string", minLength: 1 },
        diffraction: { type: "string", minLength: 1 },
        contextuality: { type: "string", minLength: 1 },
        soviet: { type: "string", minLength: 1 },
      },
    },
  },
} as const;

export type AperiodicPatch = FromSchema<typeof aperiodicPatchSchema>;
export const aperiodicPatchCarrier = carrierFrom(aperiodicPatchSchema);

export const aperiodicSelfOrganizationRequestSchema = {
  $id: "computing/aperiodic-self-organization-request",
  title: "AperiodicSelfOrganizationRequest",
  type: "object",
  required: ["kind", "patch"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.aperiodic-self-organization-request" },
    patch: aperiodicPatchSchema,
    maxSteps: { type: "integer", minimum: 0 },
  },
} as const;

export type AperiodicSelfOrganizationRequest = FromSchema<typeof aperiodicSelfOrganizationRequestSchema>;
export const aperiodicSelfOrganizationRequestCarrier = carrierFrom(aperiodicSelfOrganizationRequestSchema);

export const aperiodicSelfOrganizationSchema = {
  $id: "computing/aperiodic-self-organization",
  title: "AperiodicSelfOrganization",
  type: "object",
  required: [
    "kind",
    "$id",
    "inputPatchHash",
    "outputPatch",
    "steps",
    "normalWord",
    "converged",
    "theory",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.aperiodic-self-organization" },
    $id: { type: "string", minLength: 1, pattern: hashPattern },
    inputPatchHash: { type: "string", minLength: 1, pattern: hashPattern },
    outputPatch: aperiodicPatchSchema,
    steps: {
      type: "array",
      items: {
        type: "object",
        required: ["index", "rule", "from", "to", "beforeExpected", "beforeActual", "afterColor", "afterRole", "response", "patchHash"],
        additionalProperties: false,
        properties: {
          index: { type: "integer", minimum: 0 },
          rule: { enum: ["synchronize-boundary-color", "reward-fixed-point"] },
          from: { type: "string", minLength: 1, pattern: hashPattern },
          to: { type: "string", minLength: 1, pattern: hashPattern },
          beforeExpected: { type: "string", minLength: 1 },
          beforeActual: { type: "string", minLength: 1 },
          afterColor: { type: "string", minLength: 1 },
          afterRole: { enum: ["requires", "provides", "precedes", "follows", "touches"] },
          response: { enum: ["reward", "penalty"] },
          patchHash: { type: "string", minLength: 1, pattern: hashPattern },
        },
      },
    },
    normalWord: { type: "string" },
    converged: { type: "boolean" },
    theory: {
      type: "object",
      required: ["markov", "tsetlin", "kolmogorovUspensky"],
      additionalProperties: false,
      properties: {
        markov: { type: "string", minLength: 1 },
        tsetlin: { type: "string", minLength: 1 },
        kolmogorovUspensky: { type: "string", minLength: 1 },
      },
    },
  },
} as const;

export type AperiodicSelfOrganization = FromSchema<typeof aperiodicSelfOrganizationSchema>;
export const aperiodicSelfOrganizationCarrier = carrierFrom(aperiodicSelfOrganizationSchema);

export const aperiodicTheoryAtlasRequestSchema = {
  $id: "computing/aperiodic-theory-atlas-request",
  title: "AperiodicTheoryAtlasRequest",
  type: "object",
  required: ["kind", "patch"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.aperiodic-theory-atlas-request" },
    patch: aperiodicPatchSchema,
  },
} as const;

export type AperiodicTheoryAtlasRequest = FromSchema<typeof aperiodicTheoryAtlasRequestSchema>;
export const aperiodicTheoryAtlasRequestCarrier = carrierFrom(aperiodicTheoryAtlasRequestSchema);

export const aperiodicTheoryAtlasSchema = {
  $id: "computing/aperiodic-theory-atlas",
  title: "AperiodicTheoryAtlas",
  type: "object",
  required: ["kind", "$id", "patchHash", "measurements", "lenses", "maturity"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.aperiodic-theory-atlas" },
    $id: { type: "string", minLength: 1, pattern: hashPattern },
    patchHash: { type: "string", minLength: 1, pattern: hashPattern },
    measurements: {
      type: "object",
      required: [
        "tileCount",
        "adjacencyCount",
        "defectCount",
        "colorVariety",
        "entropyBits",
        "braggPeakCount",
        "substitutionTiles",
        "disturbanceVariety",
        "regulatorVariety",
        "requisiteVarietySatisfied",
        "petriConcurrencyWidth",
      ],
      additionalProperties: false,
      properties: {
        tileCount: { type: "integer", minimum: 0 },
        adjacencyCount: { type: "integer", minimum: 0 },
        defectCount: { type: "integer", minimum: 0 },
        colorVariety: { type: "integer", minimum: 0 },
        entropyBits: { type: "number", minimum: 0 },
        braggPeakCount: { type: "integer", minimum: 0 },
        substitutionTiles: { type: "integer", minimum: 0 },
        disturbanceVariety: { type: "integer", minimum: 0 },
        regulatorVariety: { type: "integer", minimum: 0 },
        requisiteVarietySatisfied: { type: "boolean" },
        petriConcurrencyWidth: { type: "integer", minimum: 0 },
      },
    },
    lenses: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "tradition", "region", "period", "source", "reading", "active", "maturity", "evidence"],
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1 },
          tradition: { type: "string", minLength: 1 },
          region: { type: "string", minLength: 1 },
          period: { type: "string", minLength: 1 },
          source: { type: "string", minLength: 1 },
          reading: { type: "string", minLength: 1 },
          active: { type: "boolean" },
          maturity: { enum: ["Built+green", "Research-grade", "Roadmap"] },
          evidence: { type: "array", items: { type: "string", minLength: 1 } },
        },
      },
    },
    maturity: { enum: ["Built+green", "Research-grade", "Roadmap"] },
  },
} as const;

export type AperiodicTheoryAtlas = FromSchema<typeof aperiodicTheoryAtlasSchema>;
export const aperiodicTheoryAtlasCarrier = carrierFrom(aperiodicTheoryAtlasSchema);

export const aperiodicBridgePlanRequestSchema = {
  $id: "computing/aperiodic-bridge-plan-request",
  title: "AperiodicBridgePlanRequest",
  type: "object",
  required: ["kind", "atlas"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.aperiodic-bridge-plan-request" },
    atlas: aperiodicTheoryAtlasSchema,
  },
} as const;

export type AperiodicBridgePlanRequest = FromSchema<typeof aperiodicBridgePlanRequestSchema>;
export const aperiodicBridgePlanRequestCarrier = carrierFrom(aperiodicBridgePlanRequestSchema);

export const aperiodicBridgePlanSchema = {
  $id: "computing/aperiodic-bridge-plan",
  title: "AperiodicBridgePlan",
  type: "object",
  required: ["kind", "$id", "atlasHash", "bridges", "coverage", "maturity"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.aperiodic-bridge-plan" },
    $id: { type: "string", minLength: 1, pattern: hashPattern },
    atlasHash: { type: "string", minLength: 1, pattern: hashPattern },
    bridges: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "fromLens", "toVerb", "operator", "priority", "preconditions", "expectedEffect", "maturity"],
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1 },
          fromLens: { type: "string", minLength: 1 },
          toVerb: { type: "string", minLength: 1 },
          operator: { type: "string", minLength: 1 },
          priority: { enum: ["now", "next", "later"] },
          preconditions: { type: "array", items: { type: "string", minLength: 1 } },
          expectedEffect: { type: "string", minLength: 1 },
          maturity: { enum: ["Built+green", "Research-grade", "Roadmap"] },
        },
      },
    },
    coverage: {
      type: "object",
      required: ["activeLensCount", "bridgedLensCount", "unbridgedLenses"],
      additionalProperties: false,
      properties: {
        activeLensCount: { type: "integer", minimum: 0 },
        bridgedLensCount: { type: "integer", minimum: 0 },
        unbridgedLenses: { type: "array", items: { type: "string", minLength: 1 } },
      },
    },
    maturity: { enum: ["Built+green", "Research-grade", "Roadmap"] },
  },
} as const;

export type AperiodicBridgePlan = FromSchema<typeof aperiodicBridgePlanSchema>;
export const aperiodicBridgePlanCarrier = carrierFrom(aperiodicBridgePlanSchema);

function sorted(values: Iterable<string>): readonly string[] {
  return Object.freeze([...values].sort((left, right) => left.localeCompare(right)));
}

function color(seed: string, side: "north" | "east" | "south" | "west"): string {
  return contentHash({ seed, side }).slice(0, 12);
}

function incidenceColor(seed: unknown): string {
  return contentHash({ kind: "computing.aperiodic-incidence-color", seed }).slice(0, 12);
}

function tileFromHash(
  source: AperiodicTile["source"],
  subject: string,
  hash: string,
  boundaryHashes: readonly string[],
  boundaryColors: readonly AperiodicTile["boundaryColors"][number][] = [],
): AperiodicTile {
  const colorByNeighbor = new Map(boundaryColors.map((entry) => [entry.neighborHash, entry] as const));
  return aperiodicTileCarrier.assert(Object.freeze({
    kind: "computing.aperiodic-tile" as const,
    $id: hash,
    source,
    subject,
    edges: Object.freeze({
      north: color(hash, "north"),
      east: color(hash, "east"),
      south: color(hash, "south"),
      west: color(hash, "west"),
    }),
    boundaryHashes: sorted(boundaryHashes),
    boundaryColors: Object.freeze(sorted(boundaryHashes).map((neighborHash) => {
      const supplied = colorByNeighbor.get(neighborHash);
      return Object.freeze({
        neighborHash,
        color: supplied?.color ?? incidenceColor({ source, subject, hash, neighborHash, role: "touches" }),
        role: supplied?.role ?? "touches",
      });
    })),
  })) as AperiodicTile;
}

export function aperiodicTilesFromTrace(tiling: TraceTiling): readonly AperiodicTile[] {
  const deps = new Map<string, string[]>();
  for (const tile of tiling.tiles as readonly TraceTile[]) deps.set(tile.$id, [...tile.boundaryHashes]);
  return Object.freeze(tiling.tiles.map((tile) => tileFromHash("trace", tile.subject, tile.$id, deps.get(tile.$id) ?? [])));
}

export function aperiodicTilesFromEcosystem(tiling: EcosystemInfoTiling): readonly AperiodicTile[] {
  const deps = new Map<string, string[]>();
  const colors = new Map<string, AperiodicTile["boundaryColors"][number][]>();
  for (const edge of tiling.edges) {
    const shared = incidenceColor({
      relation: "workspace-dependency",
      provider: edge.from,
      providerHash: edge.fromHash,
      consumer: edge.to,
      consumerHash: edge.toHash,
    });
    const consumerDeps = deps.get(edge.toHash) ?? [];
    consumerDeps.push(edge.fromHash);
    deps.set(edge.toHash, consumerDeps);
    const providerDeps = deps.get(edge.fromHash) ?? [];
    providerDeps.push(edge.toHash);
    deps.set(edge.fromHash, providerDeps);

    const consumerColors = colors.get(edge.toHash) ?? [];
    consumerColors.push(Object.freeze({ neighborHash: edge.fromHash, color: shared, role: "requires" as const }));
    colors.set(edge.toHash, consumerColors);
    const providerColors = colors.get(edge.fromHash) ?? [];
    providerColors.push(Object.freeze({ neighborHash: edge.toHash, color: shared, role: "provides" as const }));
    colors.set(edge.fromHash, providerColors);
  }
  return Object.freeze(tiling.packageHashes.map((entry) => tileFromHash("ecosystem", entry.name, entry.hash, deps.get(entry.hash) ?? [], colors.get(entry.hash) ?? [])));
}

function substitutionTiles(tile: AperiodicTile): readonly AperiodicTile[] {
  return Object.freeze(["nw", "ne", "sw", "se"].map((quadrant) => {
    const hash = contentHash({ parent: tile.$id, quadrant, rule: "robinson-cross-inflation" });
    return tileFromHash(tile.source, `${tile.subject}/${quadrant}`, hash, [tile.$id]);
  }));
}

function complement(left: AperiodicTile["boundaryColors"][number]["role"], right: AperiodicTile["boundaryColors"][number]["role"]): boolean {
  return (left === "requires" && right === "provides")
    || (left === "provides" && right === "requires")
    || (left === "precedes" && right === "follows")
    || (left === "follows" && right === "precedes")
    || (left === "touches" && right === "touches");
}

function complementRole(role: AperiodicTile["boundaryColors"][number]["role"]): AperiodicTile["boundaryColors"][number]["role"] {
  if (role === "requires") return "provides";
  if (role === "provides") return "requires";
  if (role === "precedes") return "follows";
  if (role === "follows") return "precedes";
  return "touches";
}

function boundaryColor(tile: AperiodicTile, neighborHash: string): AperiodicTile["boundaryColors"][number] | undefined {
  return tile.boundaryColors.find((entry) => entry.neighborHash === neighborHash);
}

function withBoundaryColor(
  tile: AperiodicTile,
  neighborHash: string,
  entry: Readonly<{ color: string; role: AperiodicTile["boundaryColors"][number]["role"] }>,
): AperiodicTile {
  const nextBoundaryHashes = new Set(tile.boundaryHashes);
  nextBoundaryHashes.add(neighborHash);
  const replaced = new Map(tile.boundaryColors.map((colorEntry) => [colorEntry.neighborHash, colorEntry] as const));
  replaced.set(neighborHash, Object.freeze({ neighborHash, color: entry.color, role: entry.role }));
  return tileFromHash(tile.source, tile.subject, tile.$id, sorted(nextBoundaryHashes), [...replaced.values()]);
}

function normalWordOf(patch: AperiodicPatch): string {
  return patch.adjacencies.map((adjacency) => adjacency.matched ? "M" : "D").join("");
}

function finiteDiffraction(tiles: readonly AperiodicTile[]): AperiodicPatch["diffraction"] {
  const values = tiles.map((tile) => Number.parseInt(contentHash({
    tile: tile.$id,
    colors: tile.boundaryColors.map((entry) => entry.color),
  }).slice(0, 8), 16) / 0xffffffff);
  const n = values.length;
  const histogram = new Map<string, number>();
  for (const tile of tiles) {
    for (const entry of tile.boundaryColors) histogram.set(entry.color, (histogram.get(entry.color) ?? 0) + 1);
  }
  const total = [...histogram.values()].reduce((sum, count) => sum + count, 0);
  const entropyBits = total === 0 ? 0 : [...histogram.values()].reduce((sum, count) => {
    const p = count / total;
    return sum - p * Math.log2(p);
  }, 0);
  const limit = Math.min(8, Math.max(0, n - 1));
  const frequencies = Object.freeze(Array.from({ length: limit + 1 }, (_, frequency) => {
    let real = 0;
    let imag = 0;
    for (let index = 0; index < n; index += 1) {
      const value = values[index] ?? 0;
      const angle = (2 * Math.PI * frequency * index) / Math.max(1, n);
      real += value * Math.cos(angle);
      imag += value * Math.sin(angle);
    }
    return Object.freeze({
      frequency,
      intensity: n === 0 ? 0 : (real * real + imag * imag) / (n * n),
    });
  }));
  const mean = frequencies.length === 0 ? 0 : frequencies.reduce((sum, item) => sum + item.intensity, 0) / frequencies.length;
  return Object.freeze({
    sampleSize: n,
    entropyBits,
    frequencies,
    braggPeaks: Object.freeze(frequencies.filter((item) => item.intensity >= mean && item.intensity > 0)),
  });
}

function automatonStates(tiles: readonly AperiodicTile[], defects: readonly AperiodicPatch["defects"][number][]): AperiodicPatch["automaton"] {
  const penalties = new Map<string, number>();
  for (const defect of defects) {
    penalties.set(defect.from, (penalties.get(defect.from) ?? 0) + 1);
    penalties.set(defect.to, (penalties.get(defect.to) ?? 0) + 1);
  }
  const states = Object.freeze(tiles.map((tile) => {
    const penalty = penalties.get(tile.$id) ?? 0;
    return Object.freeze({
      tileHash: tile.$id,
      state: Math.max(-3, Math.min(3, tile.boundaryColors.length - penalty * 2)),
      response: penalty === 0 ? "reward" as const : "penalty" as const,
    });
  }));
  return Object.freeze({
    states,
    rewarded: states.filter((state) => state.response === "reward").length,
    penalized: states.filter((state) => state.response === "penalty").length,
  });
}

export function readAperiodicPatch(input: AperiodicPatchRequest): AperiodicPatch {
  const request = aperiodicPatchRequestCarrier.assert(input) as AperiodicPatchRequest;
  const matchingLaw = request.matchingLaw ?? "semantic-incidence";
  const tiles = Object.freeze(request.tiles.map((tile) => aperiodicTileCarrier.assert(tile) as AperiodicTile));
  const byId = new Map(tiles.map((tile) => [tile.$id, tile] as const));
  const adjacencies: AperiodicPatch["adjacencies"][number][] = [];
  const defects: AperiodicPatch["defects"][number][] = [];
  const seen = new Set<string>();
  for (const tile of tiles) {
    for (const neighborHash of tile.boundaryHashes) {
      const neighbor = byId.get(neighborHash);
      if (neighbor === undefined) continue;
      const key = [tile.$id, neighbor.$id].sort((left, right) => left.localeCompare(right)).join("::");
      if (seen.has(key)) continue;
      seen.add(key);
      const direction = tile.$id.localeCompare(neighbor.$id) <= 0 ? "east" as const : "south" as const;
      const local = boundaryColor(tile, neighbor.$id);
      const remote = boundaryColor(neighbor, tile.$id);
      const expected = matchingLaw === "semantic-incidence"
        ? local?.color ?? incidenceColor({ from: tile.$id, to: neighbor.$id, missing: "local" })
        : direction === "east" ? tile.edges.east : tile.edges.south;
      const actual = matchingLaw === "semantic-incidence"
        ? remote?.color ?? incidenceColor({ from: neighbor.$id, to: tile.$id, missing: "remote" })
        : direction === "east" ? neighbor.edges.west : neighbor.edges.north;
      const matched = matchingLaw === "semantic-incidence"
        ? local !== undefined && remote !== undefined && expected === actual && complement(local.role, remote.role)
        : expected === actual;
      adjacencies.push(Object.freeze({ from: tile.$id, to: neighbor.$id, direction, color: expected, matched }));
      if (!matched) defects.push(Object.freeze({ from: tile.$id, to: neighbor.$id, direction, expected, actual }));
    }
  }
  const substitution = Object.freeze(tiles.flatMap((tile) => substitutionTiles(tile)));
  const patchHash = contentHash({ tiles: sorted(tiles.map((tile) => tile.$id)), substitution: sorted(substitution.map((tile) => tile.$id)) });
  const diffraction = finiteDiffraction(tiles);
  const contextuality = Object.freeze({
    globalSection: defects.length === 0,
    obstructionRank: defects.length === 0 ? 0 : new Set(defects.flatMap((defect) => [defect.from, defect.to])).size,
    unmatchedEdges: defects.length,
  });
  return aperiodicPatchCarrier.assert(Object.freeze({
    kind: "computing.aperiodic-patch" as const,
    $id: contentHash({ patchHash, defects: defects.length }),
    tiles,
    adjacencies: Object.freeze(adjacencies),
    defects: Object.freeze(defects),
    locallyConsistent: defects.length === 0,
    matchingLaw,
    substitution: Object.freeze({
      inflation: 2 as const,
      tiles: substitution,
      patchHash,
    }),
    diffraction,
    contextuality,
    automaton: automatonStates(tiles, defects),
    theory: Object.freeze({
      wang: "finite colored-edge local matching constraints over content-addressed tiles",
      robinson: "deterministic 2x substitution patch as a finite Robinson-style inflation shadow",
      diffraction: "finite autocorrelation and Fourier intensity shadow for aperiodic-order diffraction",
      contextuality: "global matching is read as a finite sheaf-section obstruction over the patch cover",
      soviet: "local neighborhoods are Kolmogorov-Uspensky graph-machine states; Tsetlin-style reward/penalty states and Markov normal rewrites read the next scale",
    }),
  })) as AperiodicPatch;
}

export function selfOrganizeAperiodicPatch(input: AperiodicSelfOrganizationRequest): AperiodicSelfOrganization {
  const request = aperiodicSelfOrganizationRequestCarrier.assert(input) as AperiodicSelfOrganizationRequest;
  const inputPatch = aperiodicPatchCarrier.assert(request.patch) as AperiodicPatch;
  const maxSteps = request.maxSteps ?? Math.max(1, inputPatch.defects.length + inputPatch.adjacencies.length);
  let tiles = Object.freeze(inputPatch.tiles.map((tile) => aperiodicTileCarrier.assert(tile) as AperiodicTile));
  let current = readAperiodicPatch({
    kind: "computing.aperiodic-patch-request",
    tiles,
    matchingLaw: inputPatch.matchingLaw,
  });
  const steps: AperiodicSelfOrganization["steps"][number][] = [];

  for (let index = 0; index < maxSteps; index += 1) {
    const defect = [...current.defects].sort((left, right) =>
      `${left.from}:${left.to}:${left.direction}`.localeCompare(`${right.from}:${right.to}:${right.direction}`),
    )[0];
    if (defect === undefined) {
      steps.push(Object.freeze({
        index,
        rule: "reward-fixed-point" as const,
        from: current.$id,
        to: current.$id,
        beforeExpected: current.$id,
        beforeActual: current.$id,
        afterColor: current.$id,
        afterRole: "touches" as const,
        response: "reward" as const,
        patchHash: current.$id,
      }));
      break;
    }

    const fromTile = tiles.find((tile) => tile.$id === defect.from);
    const toTile = tiles.find((tile) => tile.$id === defect.to);
    if (fromTile === undefined || toTile === undefined) break;
    const fromEntry = boundaryColor(fromTile, toTile.$id);
    const fromRole = fromEntry?.role ?? "requires";
    const toRole = complementRole(fromRole);
    const repairedFrom = withBoundaryColor(fromTile, toTile.$id, { color: defect.expected, role: fromRole });
    const repairedTo = withBoundaryColor(toTile, fromTile.$id, { color: defect.expected, role: toRole });
    tiles = Object.freeze(tiles.map((tile) => {
      if (tile.$id === repairedFrom.$id) return repairedFrom;
      if (tile.$id === repairedTo.$id) return repairedTo;
      return tile;
    }));
    current = readAperiodicPatch({
      kind: "computing.aperiodic-patch-request",
      tiles,
      matchingLaw: inputPatch.matchingLaw,
    });
    steps.push(Object.freeze({
      index,
      rule: "synchronize-boundary-color" as const,
      from: defect.from,
      to: defect.to,
      beforeExpected: defect.expected,
      beforeActual: defect.actual,
      afterColor: defect.expected,
      afterRole: toRole,
      response: "penalty" as const,
      patchHash: current.$id,
    }));
  }

  const outputPatch = current;
  return aperiodicSelfOrganizationCarrier.assert(Object.freeze({
    kind: "computing.aperiodic-self-organization" as const,
    $id: contentHash({
      kind: "computing.aperiodic-self-organization",
      inputPatch: inputPatch.$id,
      outputPatch: outputPatch.$id,
      steps: steps.map((step) => step.patchHash),
    }),
    inputPatchHash: inputPatch.$id,
    outputPatch,
    steps: Object.freeze(steps),
    normalWord: normalWordOf(outputPatch),
    converged: outputPatch.defects.length === 0,
    theory: Object.freeze({
      markov: "ordered defect rewrites are a finite Markov normal-algorithm shadow over boundary-color words",
      tsetlin: "Tsetlin-style learning automata: defects penalize local tile states; fixed matching sections reward the active neighborhood",
      kolmogorovUspensky: "each rewrite edits a bounded graph-machine neighborhood while preserving content-addressed tile identity",
    }),
  })) as AperiodicSelfOrganization;
}

function patchColorVariety(patch: AperiodicPatch): number {
  return new Set(patch.tiles.flatMap((tile) => tile.boundaryColors.map((entry) => entry.color))).size;
}

function patchConcurrencyWidth(patch: AperiodicPatch): number {
  const degrees = new Map<string, number>();
  for (const adjacency of patch.adjacencies) {
    degrees.set(adjacency.from, (degrees.get(adjacency.from) ?? 0) + 1);
    degrees.set(adjacency.to, (degrees.get(adjacency.to) ?? 0) + 1);
  }
  return Math.max(0, ...degrees.values());
}

function patchRegulatorVariety(patch: AperiodicPatch): number {
  return new Set(patch.automaton.states.map((state) => `${state.state}:${state.response}`)).size;
}

type AtlasMeasurements = AperiodicTheoryAtlas["measurements"];
type AtlasLens = AperiodicTheoryAtlas["lenses"][number];

function atlasLens(input: AtlasLens): AtlasLens {
  return Object.freeze(input) as AtlasLens;
}

export function readAperiodicTheoryAtlas(input: AperiodicTheoryAtlasRequest): AperiodicTheoryAtlas {
  const request = aperiodicTheoryAtlasRequestCarrier.assert(input) as AperiodicTheoryAtlasRequest;
  const patch = aperiodicPatchCarrier.assert(request.patch) as AperiodicPatch;
  const disturbanceVariety = Math.max(patch.defects.length, patch.contextuality.unmatchedEdges);
  const regulatorVariety = patchRegulatorVariety(patch);
  const measurements: AtlasMeasurements = Object.freeze({
    tileCount: patch.tiles.length,
    adjacencyCount: patch.adjacencies.length,
    defectCount: patch.defects.length,
    colorVariety: patchColorVariety(patch),
    entropyBits: patch.diffraction.entropyBits,
    braggPeakCount: patch.diffraction.braggPeaks.length,
    substitutionTiles: patch.substitution.tiles.length,
    disturbanceVariety,
    regulatorVariety,
    requisiteVarietySatisfied: disturbanceVariety === 0 || regulatorVariety >= disturbanceVariety,
    petriConcurrencyWidth: patchConcurrencyWidth(patch),
  });
  const lenses = Object.freeze([
    atlasLens({
      id: "wang-local-matching",
      tradition: "finite colored-edge tiling",
      region: "China/United States",
      period: "1961",
      source: "Hao Wang, Proving theorems by pattern recognition II",
      reading: "Adjacency is a local edge-color constraint; a global section is exactly a patch whose local colors glue.",
      active: measurements.adjacencyCount > 0,
      maturity: "Built+green",
      evidence: [`adjacencies=${measurements.adjacencyCount}`, `defects=${measurements.defectCount}`],
    }),
    atlasLens({
      id: "robinson-substitution",
      tradition: "nonperiodic substitution tiling",
      region: "United States",
      period: "1971",
      source: "Raphael Robinson, Undecidability and nonperiodicity for tilings of the plane",
      reading: "The deterministic 2x inflation is a finite substitution shadow, not a proof of nonperiodicity.",
      active: measurements.substitutionTiles > measurements.tileCount,
      maturity: "Research-grade",
      evidence: [`tiles=${measurements.tileCount}`, `substitutionTiles=${measurements.substitutionTiles}`],
    }),
    atlasLens({
      id: "debruijn-multigrid",
      tradition: "projection and multigrid aperiodic order",
      region: "Netherlands",
      period: "1981",
      source: "N. G. de Bruijn, Algebraic theory of Penrose's non-periodic tilings of the plane",
      reading: "Boundary colors are read as finite grid-line coordinates whose incidences project a higher-dimensional ordering into the patch.",
      active: measurements.colorVariety > 0 && measurements.braggPeakCount > 0,
      maturity: "Research-grade",
      evidence: [`colorVariety=${measurements.colorVariety}`, `braggPeaks=${measurements.braggPeakCount}`],
    }),
    atlasLens({
      id: "quasicrystal-diffraction",
      tradition: "aperiodic order and diffraction",
      region: "global mathematical crystallography",
      period: "1980s-present",
      source: "Meyer-set and mathematical diffraction literature",
      reading: "The finite Fourier intensities are a small-window diffraction shadow of the content-addressed patch.",
      active: measurements.entropyBits > 0,
      maturity: "Research-grade",
      evidence: [`entropyBits=${measurements.entropyBits.toFixed(6)}`, `braggPeaks=${measurements.braggPeakCount}`],
    }),
    atlasLens({
      id: "abramsky-brandenburger-contextuality",
      tradition: "sheaf-theoretic contextuality",
      region: "United Kingdom/Israel",
      period: "2011",
      source: "Abramsky and Brandenburger, The sheaf-theoretic structure of non-locality and contextuality",
      reading: "A locally consistent patch has a global section; defects are finite obstruction witnesses.",
      active: measurements.adjacencyCount > 0,
      maturity: "Research-grade",
      evidence: [`globalSection=${patch.contextuality.globalSection}`, `obstructionRank=${patch.contextuality.obstructionRank}`],
    }),
    atlasLens({
      id: "ashby-requisite-variety",
      tradition: "cybernetics",
      region: "United Kingdom",
      period: "1956",
      source: "W. Ross Ashby, An Introduction to Cybernetics",
      reading: "The automaton can regulate the patch when its response variety covers the observed disturbance variety.",
      active: measurements.regulatorVariety > 0,
      maturity: "Built+green",
      evidence: [`regulatorVariety=${measurements.regulatorVariety}`, `disturbanceVariety=${measurements.disturbanceVariety}`, `satisfied=${measurements.requisiteVarietySatisfied}`],
    }),
    atlasLens({
      id: "petri-non-sequential-process",
      tradition: "causal nets and concurrency",
      region: "Germany",
      period: "1962",
      source: "Carl Adam Petri, Kommunikation mit Automaten",
      reading: "Tiles are conditions and matched adjacencies are transitions in a finite non-sequential process view.",
      active: measurements.petriConcurrencyWidth > 0,
      maturity: "Research-grade",
      evidence: [`concurrencyWidth=${measurements.petriConcurrencyWidth}`, `adjacencies=${measurements.adjacencyCount}`],
    }),
    atlasLens({
      id: "markov-normal-algorithm",
      tradition: "normal algorithms",
      region: "Soviet Union",
      period: "1950s",
      source: "A. A. Markov, normal algorithm theory",
      reading: "Self-organization scans a defect word and applies the first matching rewrite until a normal word is reached.",
      active: measurements.defectCount > 0 || patch.locallyConsistent,
      maturity: "Built+green",
      evidence: [`normalWord=${patch.adjacencies.map((adjacency) => adjacency.matched ? "M" : "D").join("")}`],
    }),
    atlasLens({
      id: "kolmogorov-uspensky-graph-machine",
      tradition: "graph-machine computation",
      region: "Soviet Union",
      period: "1958",
      source: "Kolmogorov and Uspensky, algorithms and machines",
      reading: "Each local rewrite is bounded to a graph neighborhood while content addresses keep causal coordinates stable.",
      active: measurements.tileCount > 0,
      maturity: "Research-grade",
      evidence: [`tiles=${measurements.tileCount}`, `adjacencies=${measurements.adjacencyCount}`],
    }),
    atlasLens({
      id: "tsetlin-learning-automata",
      tradition: "learning automata",
      region: "Soviet Union",
      period: "1961",
      source: "M. L. Tsetlin, finite automata in random media",
      reading: "Rewarded and penalized tile states expose a tiny adaptive regulator over local boundary fit.",
      active: patch.automaton.states.length > 0,
      maturity: "Built+green",
      evidence: [`rewarded=${patch.automaton.rewarded}`, `penalized=${patch.automaton.penalized}`],
    }),
  ]);
  return aperiodicTheoryAtlasCarrier.assert(Object.freeze({
    kind: "computing.aperiodic-theory-atlas" as const,
    $id: contentHash({
      kind: "computing.aperiodic-theory-atlas",
      patch: patch.$id,
      lenses: lenses.map((lens) => [lens.id, lens.active, lens.maturity]),
      measurements,
    }),
    patchHash: patch.$id,
    measurements,
    lenses,
    maturity: "Research-grade" as const,
  })) as AperiodicTheoryAtlas;
}

type Bridge = AperiodicBridgePlan["bridges"][number];

function bridge(input: Bridge): Bridge {
  return Object.freeze(input) as Bridge;
}

function activeLens(atlas: AperiodicTheoryAtlas, id: string): boolean {
  return atlas.lenses.some((lens) => lens.id === id && lens.active);
}

export function planAperiodicBridges(input: AperiodicBridgePlanRequest): AperiodicBridgePlan {
  const request = aperiodicBridgePlanRequestCarrier.assert(input) as AperiodicBridgePlanRequest;
  const atlas = aperiodicTheoryAtlasCarrier.assert(request.atlas) as AperiodicTheoryAtlas;
  const bridges: Bridge[] = [];

  if (activeLens(atlas, "wang-local-matching")) {
    bridges.push(bridge({
      id: "wang-to-self-organization",
      fromLens: "wang-local-matching",
      toVerb: "aperiodic-self-organize",
      operator: "repair every unmatched colored-edge incidence by local boundary synchronization",
      priority: atlas.measurements.defectCount > 0 ? "now" : "next",
      preconditions: [`defectCount=${atlas.measurements.defectCount}`, `adjacencyCount=${atlas.measurements.adjacencyCount}`],
      expectedEffect: "turn local matching defects into a reward fixed point without changing tile identity",
      maturity: "Built+green",
    }));
  }

  if (activeLens(atlas, "robinson-substitution")) {
    bridges.push(bridge({
      id: "robinson-to-trace-fold",
      fromLens: "robinson-substitution",
      toVerb: "fold-trace",
      operator: "emit substitution children as trace tiles and compare the parent patch hash with the inflated normal form",
      priority: "next",
      preconditions: [`substitutionTiles=${atlas.measurements.substitutionTiles}`, `tileCount=${atlas.measurements.tileCount}`],
      expectedEffect: "make scale refinement reconstructible as the same holographic trace machinery as builds and DAP/LSP observations",
      maturity: "Research-grade",
    }));
  }

  if (activeLens(atlas, "debruijn-multigrid")) {
    bridges.push(bridge({
      id: "debruijn-to-boundary-coordinates",
      fromLens: "debruijn-multigrid",
      toVerb: "reconstruct-ecosystem-cone",
      operator: "read high-variety boundary colors as projected grid coordinates for selecting cone boundary hashes",
      priority: "later",
      preconditions: [`colorVariety=${atlas.measurements.colorVariety}`, `braggPeakCount=${atlas.measurements.braggPeakCount}`],
      expectedEffect: "turn aperiodic boundary colors into causal cone coordinates rather than decorative colors",
      maturity: "Research-grade",
    }));
  }

  if (activeLens(atlas, "quasicrystal-diffraction")) {
    bridges.push(bridge({
      id: "diffraction-to-coordination-spectrum",
      fromLens: "quasicrystal-diffraction",
      toVerb: "coordinate-holographic-compute",
      operator: "feed diffraction entropy and Bragg peak count into the coordination obstruction spectrum",
      priority: atlas.measurements.braggPeakCount > 0 ? "next" : "later",
      preconditions: [`entropyBits=${atlas.measurements.entropyBits.toFixed(6)}`, `braggPeakCount=${atlas.measurements.braggPeakCount}`],
      expectedEffect: "make spectral regularity part of the same obstruction rank as causal cover, provenance, game, and society readings",
      maturity: "Research-grade",
    }));
  }

  if (activeLens(atlas, "abramsky-brandenburger-contextuality")) {
    bridges.push(bridge({
      id: "contextuality-to-diff",
      fromLens: "abramsky-brandenburger-contextuality",
      toVerb: "diff-ecosystem-cones",
      operator: "diff two cones only after both local covers admit global sections",
      priority: atlas.measurements.defectCount === 0 ? "next" : "now",
      preconditions: [`defectCount=${atlas.measurements.defectCount}`, `requisiteVarietySatisfied=${atlas.measurements.requisiteVarietySatisfied}`],
      expectedEffect: "separate boundary mismatch from genuine cone difference",
      maturity: "Built+green",
    }));
  }

  if (activeLens(atlas, "ashby-requisite-variety")) {
    bridges.push(bridge({
      id: "ashby-to-adaptive-regulation",
      fromLens: "ashby-requisite-variety",
      toVerb: "aperiodic-self-organize",
      operator: "compare regulator variety to disturbance variety before attempting local repair",
      priority: atlas.measurements.requisiteVarietySatisfied ? "next" : "now",
      preconditions: [`regulatorVariety=${atlas.measurements.regulatorVariety}`, `disturbanceVariety=${atlas.measurements.disturbanceVariety}`],
      expectedEffect: "avoid pretending a local automaton can regulate more disturbance classes than it can express",
      maturity: "Built+green",
    }));
  }

  if (activeLens(atlas, "petri-non-sequential-process")) {
    bridges.push(bridge({
      id: "petri-to-causal-width",
      fromLens: "petri-non-sequential-process",
      toVerb: "ecosystem-infotiling",
      operator: "read maximum adjacency degree as a finite concurrency width over package dependency places",
      priority: atlas.measurements.petriConcurrencyWidth > 32 ? "now" : "next",
      preconditions: [`petriConcurrencyWidth=${atlas.measurements.petriConcurrencyWidth}`, `adjacencyCount=${atlas.measurements.adjacencyCount}`],
      expectedEffect: "surface high fan-in/fan-out as a concurrency pressure before it becomes a hidden cycle obstruction",
      maturity: "Research-grade",
    }));
  }

  if (activeLens(atlas, "markov-normal-algorithm")) {
    bridges.push(bridge({
      id: "markov-to-normal-word",
      fromLens: "markov-normal-algorithm",
      toVerb: "aperiodic-self-organize",
      operator: "normalize the D/M defect word by first-match rewrite order",
      priority: atlas.measurements.defectCount > 0 ? "now" : "later",
      preconditions: [`defectCount=${atlas.measurements.defectCount}`],
      expectedEffect: "make local repair replayable from a finite rewrite word",
      maturity: "Built+green",
    }));
  }

  if (activeLens(atlas, "kolmogorov-uspensky-graph-machine")) {
    bridges.push(bridge({
      id: "kum-to-local-neighborhood",
      fromLens: "kolmogorov-uspensky-graph-machine",
      toVerb: "fold-trace",
      operator: "record every bounded neighborhood edit as a content-addressed graph-machine trace tile",
      priority: "next",
      preconditions: [`tileCount=${atlas.measurements.tileCount}`, `adjacencyCount=${atlas.measurements.adjacencyCount}`],
      expectedEffect: "make graph-machine locality auditable as trace holography rather than an implicit mutation",
      maturity: "Research-grade",
    }));
  }

  if (activeLens(atlas, "tsetlin-learning-automata")) {
    bridges.push(bridge({
      id: "tsetlin-to-reward-policy",
      fromLens: "tsetlin-learning-automata",
      toVerb: "aperiodic-self-organize",
      operator: "reward matched tile states and penalize defect incident states before the next rewrite",
      priority: atlas.measurements.defectCount > 0 ? "now" : "next",
      preconditions: [`regulatorVariety=${atlas.measurements.regulatorVariety}`, `defectCount=${atlas.measurements.defectCount}`],
      expectedEffect: "turn local matching into an adaptive policy surface instead of a passive diagnostic",
      maturity: "Built+green",
    }));
  }

  const activeLenses = atlas.lenses.filter((lens) => lens.active).map((lens) => lens.id);
  const bridged = new Set(bridges.map((item) => item.fromLens));
  const unbridgedLenses = activeLenses.filter((id) => !bridged.has(id));
  return aperiodicBridgePlanCarrier.assert(Object.freeze({
    kind: "computing.aperiodic-bridge-plan" as const,
    $id: contentHash({
      kind: "computing.aperiodic-bridge-plan",
      atlas: atlas.$id,
      bridges: bridges.map((item) => [item.id, item.toVerb, item.priority, item.maturity]),
    }),
    atlasHash: atlas.$id,
    bridges: Object.freeze(bridges),
    coverage: Object.freeze({
      activeLensCount: activeLenses.length,
      bridgedLensCount: bridged.size,
      unbridgedLenses: Object.freeze(unbridgedLenses),
    }),
    maturity: "Research-grade" as const,
  })) as AperiodicBridgePlan;
}

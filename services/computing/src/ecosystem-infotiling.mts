/**
 * ecosystem-infotiling - workspace/package graphs as one content-addressed tiling.
 *
 * JSNode ICK already discovers package manifests and dependency graphs. Computing's
 * part is the generic finite carrier: packages become hashed tiles, dependency
 * edges become causal order, and the whole ecosystem folds into the same trace
 * holography surface as builds, DAP, LSP, and actions.
 */
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";
import { contentHash, lightObservationCarrier, type LightObservation } from "./holographic-compute.mjs";
import { foldTraceTiles, traceTile, traceTilingSchema, type TraceTile, type TraceTiling } from "./trace-holography.mjs";

const hashPattern = "^[A-Za-z0-9._:+/-]+$";

export const ecosystemPackageSchema = {
  $id: "computing/ecosystem-package",
  title: "EcosystemPackage",
  type: "object",
  required: ["name", "layer", "lifecycle", "maturity", "dependencies"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    version: { type: "string" },
    description: { type: "string" },
    layer: { type: "string", minLength: 1 },
    lifecycle: { type: "string", minLength: 1 },
    maturity: { type: "string", minLength: 1 },
    dependencies: { type: "array", items: { type: "string", minLength: 1 } },
    exports: { type: "array", items: { type: "string" } },
    bins: { type: "array", items: { type: "string" } },
    scripts: { type: "array", items: { type: "string" } },
  },
} as const;

export type EcosystemPackage = FromSchema<typeof ecosystemPackageSchema>;
export const ecosystemPackageCarrier = carrierFrom(ecosystemPackageSchema);

export const ecosystemDependencySchema = {
  type: "object",
  required: ["from", "to"],
  additionalProperties: false,
  properties: {
    from: { type: "string", minLength: 1 },
    to: { type: "string", minLength: 1 },
  },
} as const;

export type EcosystemDependency = FromSchema<typeof ecosystemDependencySchema>;

export const ecosystemGraphSchema = {
  $id: "computing/ecosystem-graph",
  title: "EcosystemGraph",
  type: "object",
  required: ["kind", "nodes", "edges"],
  additionalProperties: false,
  properties: {
    kind: { enum: ["computing.ecosystem-graph", "jsnode-ick.workspace-dependency-graph"] },
    nodes: { type: "array", items: ecosystemPackageSchema },
    edges: { type: "array", items: ecosystemDependencySchema },
  },
} as const;

export type EcosystemGraph = FromSchema<typeof ecosystemGraphSchema>;
export const ecosystemGraphCarrier = carrierFrom(ecosystemGraphSchema);

export const ecosystemInfoTilingSchema = {
  $id: "computing/ecosystem-infotiling",
  title: "EcosystemInfoTiling",
  type: "object",
  required: [
    "kind",
    "$id",
    "packages",
    "packageHashes",
    "edges",
    "boundaryHashes",
    "light",
    "trace",
    "normalFormHash",
    "causalOrder",
    "buildTiers",
    "residualHashes",
    "cycleObstructions",
    "petri",
    "condensedTiles",
    "condensedEdges",
    "condensedLight",
    "condensedReconstructible",
    "h1",
    "reconstructible",
    "theory",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.ecosystem-infotiling" },
    $id: { type: "string", minLength: 1, pattern: hashPattern },
    packages: { type: "array", items: ecosystemPackageSchema },
    packageHashes: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "hash"],
        additionalProperties: false,
        properties: {
          name: { type: "string", minLength: 1 },
          hash: { type: "string", minLength: 1, pattern: hashPattern },
        },
      },
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        required: ["from", "to", "fromHash", "toHash"],
        additionalProperties: false,
        properties: {
          from: { type: "string", minLength: 1 },
          to: { type: "string", minLength: 1 },
          fromHash: { type: "string", minLength: 1, pattern: hashPattern },
          toHash: { type: "string", minLength: 1, pattern: hashPattern },
        },
      },
    },
    boundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    light: lightObservationCarrier.schema,
    trace: traceTilingSchema,
    normalFormHash: { type: "string", minLength: 1, pattern: hashPattern },
    causalOrder: { type: "boolean" },
    buildTiers: {
      type: "array",
      items: {
        type: "object",
        required: ["tier", "packages", "hashes"],
        additionalProperties: false,
        properties: {
          tier: { type: "integer", minimum: 0 },
          packages: { type: "array", items: { type: "string", minLength: 1 } },
          hashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
        },
      },
    },
    residualHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    cycleObstructions: {
      type: "array",
      items: {
        type: "object",
        required: ["packages", "hashes"],
        additionalProperties: false,
        properties: {
          packages: { type: "array", items: { type: "string", minLength: 1 } },
          hashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
        },
      },
    },
    petri: {
      type: "object",
      required: ["places", "transitions", "frontiers", "concurrencyWidth", "maxBuildTierWidth", "bottlenecks", "pressure", "theory"],
      additionalProperties: false,
      properties: {
        places: {
          type: "array",
          items: {
            type: "object",
            required: ["package", "hash", "incoming", "outgoing", "degree"],
            additionalProperties: false,
            properties: {
              package: { type: "string", minLength: 1 },
              hash: { type: "string", minLength: 1, pattern: hashPattern },
              incoming: { type: "integer", minimum: 0 },
              outgoing: { type: "integer", minimum: 0 },
              degree: { type: "integer", minimum: 0 },
            },
          },
        },
        transitions: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "from", "to", "fromHash", "toHash"],
            additionalProperties: false,
            properties: {
              id: { type: "string", minLength: 1, pattern: hashPattern },
              from: { type: "string", minLength: 1 },
              to: { type: "string", minLength: 1 },
              fromHash: { type: "string", minLength: 1, pattern: hashPattern },
              toHash: { type: "string", minLength: 1, pattern: hashPattern },
            },
          },
        },
        frontiers: {
          type: "array",
          items: {
            type: "object",
            required: ["tier", "width", "packages", "hashes"],
            additionalProperties: false,
            properties: {
              tier: { type: "integer", minimum: 0 },
              width: { type: "integer", minimum: 0 },
              packages: { type: "array", items: { type: "string", minLength: 1 } },
              hashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
            },
          },
        },
        concurrencyWidth: { type: "integer", minimum: 0 },
        maxBuildTierWidth: { type: "integer", minimum: 0 },
        bottlenecks: {
          type: "array",
          items: {
            type: "object",
            required: ["package", "hash", "incoming", "outgoing", "degree"],
            additionalProperties: false,
            properties: {
              package: { type: "string", minLength: 1 },
              hash: { type: "string", minLength: 1, pattern: hashPattern },
              incoming: { type: "integer", minimum: 0 },
              outgoing: { type: "integer", minimum: 0 },
              degree: { type: "integer", minimum: 0 },
            },
          },
        },
        pressure: { enum: ["low", "moderate", "high"] },
        theory: { type: "string", minLength: 1 },
      },
    },
    condensedTiles: {
      type: "array",
      items: {
        type: "object",
        required: ["hash", "packages", "hashes", "cyclic", "boundaryHashes"],
        additionalProperties: false,
        properties: {
          hash: { type: "string", minLength: 1, pattern: hashPattern },
          packages: { type: "array", items: { type: "string", minLength: 1 } },
          hashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
          cyclic: { type: "boolean" },
          boundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
        },
      },
    },
    condensedEdges: {
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
    condensedLight: lightObservationCarrier.schema,
    condensedReconstructible: { type: "boolean" },
    h1: { type: "integer", minimum: 0 },
    reconstructible: { type: "boolean" },
    theory: {
      type: "object",
      required: ["infotiling", "nix", "soviet", "jsnode", "petri"],
      additionalProperties: false,
      properties: {
        infotiling: { type: "string", minLength: 1 },
        nix: { type: "string", minLength: 1 },
        soviet: { type: "string", minLength: 1 },
        jsnode: { type: "string", minLength: 1 },
        petri: { type: "string", minLength: 1 },
      },
    },
  },
} as const;

export type EcosystemInfoTiling = FromSchema<typeof ecosystemInfoTilingSchema>;
export const ecosystemInfoTilingCarrier = carrierFrom(ecosystemInfoTilingSchema);

export const ecosystemCausalRegulationRequestSchema = {
  $id: "computing/ecosystem-causal-regulation-request",
  title: "EcosystemCausalRegulationRequest",
  type: "object",
  required: ["kind", "tiling"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.ecosystem-causal-regulation-request" },
    tiling: ecosystemInfoTilingSchema,
    targetWidth: { type: "integer", minimum: 1 },
  },
} as const;

export type EcosystemCausalRegulationRequest = FromSchema<typeof ecosystemCausalRegulationRequestSchema>;
export const ecosystemCausalRegulationRequestCarrier = carrierFrom(ecosystemCausalRegulationRequestSchema);

export const ecosystemCausalRegulationSchema = {
  $id: "computing/ecosystem-causal-regulation",
  title: "EcosystemCausalRegulation",
  type: "object",
  required: [
    "kind",
    "$id",
    "tilingHash",
    "currentWidth",
    "targetWidth",
    "pressure",
    "disturbanceVariety",
    "regulatorVariety",
    "requisiteVarietySatisfied",
    "residualWidth",
    "actions",
    "theory",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.ecosystem-causal-regulation" },
    $id: { type: "string", minLength: 1, pattern: hashPattern },
    tilingHash: { type: "string", minLength: 1, pattern: hashPattern },
    currentWidth: { type: "integer", minimum: 0 },
    targetWidth: { type: "integer", minimum: 1 },
    pressure: { enum: ["low", "moderate", "high"] },
    disturbanceVariety: { type: "integer", minimum: 0 },
    regulatorVariety: { type: "integer", minimum: 0 },
    requisiteVarietySatisfied: { type: "boolean" },
    residualWidth: { type: "integer", minimum: 0 },
    actions: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "kind", "targetVerb", "priority", "bottleneckPackage", "bottleneckHash", "estimatedWidthDelta", "preconditions", "expectedEffect", "rationale"],
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1, pattern: hashPattern },
          kind: { enum: ["accept-substrate", "audit-cone", "extract-boundary", "split-frontier", "condense-cycle", "publish-contract"] },
          targetVerb: { type: "string", minLength: 1 },
          priority: { enum: ["now", "next", "later"] },
          bottleneckPackage: { type: "string", minLength: 1 },
          bottleneckHash: { type: "string", minLength: 1, pattern: hashPattern },
          estimatedWidthDelta: { type: "integer" },
          preconditions: { type: "array", items: { type: "string", minLength: 1 } },
          expectedEffect: { type: "string", minLength: 1 },
          rationale: { type: "string", minLength: 1 },
        },
      },
    },
    theory: {
      type: "object",
      required: ["petri", "ashby", "conantAshby", "beer"],
      additionalProperties: false,
      properties: {
        petri: { type: "string", minLength: 1 },
        ashby: { type: "string", minLength: 1 },
        conantAshby: { type: "string", minLength: 1 },
        beer: { type: "string", minLength: 1 },
      },
    },
  },
} as const;

export type EcosystemCausalRegulation = FromSchema<typeof ecosystemCausalRegulationSchema>;
export const ecosystemCausalRegulationCarrier = carrierFrom(ecosystemCausalRegulationSchema);

export const ecosystemCausalStabilizationRequestSchema = {
  $id: "computing/ecosystem-causal-stabilization-request",
  title: "EcosystemCausalStabilizationRequest",
  type: "object",
  required: ["kind", "tiling", "regulation"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.ecosystem-causal-stabilization-request" },
    tiling: ecosystemInfoTilingSchema,
    regulation: ecosystemCausalRegulationSchema,
  },
} as const;

export type EcosystemCausalStabilizationRequest = FromSchema<typeof ecosystemCausalStabilizationRequestSchema>;
export const ecosystemCausalStabilizationRequestCarrier = carrierFrom(ecosystemCausalStabilizationRequestSchema);

export const ecosystemCausalStabilizationSchema = {
  $id: "computing/ecosystem-causal-stabilization",
  title: "EcosystemCausalStabilization",
  type: "object",
  required: [
    "kind",
    "$id",
    "tilingHash",
    "regulationHash",
    "acceptedSubstrates",
    "condensedCycles",
    "quotientPlaces",
    "quotientTransitions",
    "residualControllableWidth",
    "residualPressure",
    "controlH1",
    "appliedActions",
    "theory",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.ecosystem-causal-stabilization" },
    $id: { type: "string", minLength: 1, pattern: hashPattern },
    tilingHash: { type: "string", minLength: 1, pattern: hashPattern },
    regulationHash: { type: "string", minLength: 1, pattern: hashPattern },
    acceptedSubstrates: {
      type: "array",
      items: {
        type: "object",
        required: ["package", "hash", "degree"],
        additionalProperties: false,
        properties: {
          package: { type: "string", minLength: 1 },
          hash: { type: "string", minLength: 1, pattern: hashPattern },
          degree: { type: "integer", minimum: 0 },
        },
      },
    },
    condensedCycles: {
      type: "array",
      items: {
        type: "object",
        required: ["hash", "packages", "hashes"],
        additionalProperties: false,
        properties: {
          hash: { type: "string", minLength: 1, pattern: hashPattern },
          packages: { type: "array", items: { type: "string", minLength: 1 } },
          hashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
        },
      },
    },
    quotientPlaces: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "packages", "incoming", "outgoing", "degree", "role"],
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1, pattern: hashPattern },
          packages: { type: "array", items: { type: "string", minLength: 1 } },
          incoming: { type: "integer", minimum: 0 },
          outgoing: { type: "integer", minimum: 0 },
          degree: { type: "integer", minimum: 0 },
          role: { enum: ["controlled", "cycle-supertile"] },
        },
      },
    },
    quotientTransitions: {
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
    residualControllableWidth: { type: "integer", minimum: 0 },
    residualPressure: { enum: ["low", "moderate", "high"] },
    controlH1: { type: "integer", minimum: 0 },
    appliedActions: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    theory: {
      type: "object",
      required: ["petri", "ashby", "beer"],
      additionalProperties: false,
      properties: {
        petri: { type: "string", minLength: 1 },
        ashby: { type: "string", minLength: 1 },
        beer: { type: "string", minLength: 1 },
      },
    },
  },
} as const;

export type EcosystemCausalStabilization = FromSchema<typeof ecosystemCausalStabilizationSchema>;
export const ecosystemCausalStabilizationCarrier = carrierFrom(ecosystemCausalStabilizationSchema);

export const ecosystemRecursiveControlRequestSchema = {
  $id: "computing/ecosystem-recursive-control-request",
  title: "EcosystemRecursiveControlRequest",
  type: "object",
  required: ["kind", "stabilization"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.ecosystem-recursive-control-request" },
    stabilization: ecosystemCausalStabilizationSchema,
    targetWidth: { type: "integer", minimum: 1 },
  },
} as const;

export type EcosystemRecursiveControlRequest = FromSchema<typeof ecosystemRecursiveControlRequestSchema>;
export const ecosystemRecursiveControlRequestCarrier = carrierFrom(ecosystemRecursiveControlRequestSchema);

export const ecosystemRecursiveControlSchema = {
  $id: "computing/ecosystem-recursive-control",
  title: "EcosystemRecursiveControl",
  type: "object",
  required: ["kind", "$id", "stabilizationHash", "targetWidth", "units", "nextPressure", "theory"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.ecosystem-recursive-control" },
    $id: { type: "string", minLength: 1, pattern: hashPattern },
    stabilizationHash: { type: "string", minLength: 1, pattern: hashPattern },
    targetWidth: { type: "integer", minimum: 1 },
    units: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "packages", "role", "degree", "boundaryPorts", "viable", "nextVerb", "operator", "rationale"],
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1, pattern: hashPattern },
          packages: { type: "array", items: { type: "string", minLength: 1 } },
          role: { enum: ["controlled", "cycle-supertile"] },
          degree: { type: "integer", minimum: 0 },
          boundaryPorts: {
            type: "array",
            items: {
              type: "object",
              required: ["direction", "neighbor", "portHash"],
              additionalProperties: false,
              properties: {
                direction: { enum: ["in", "out"] },
                neighbor: { type: "string", minLength: 1, pattern: hashPattern },
                portHash: { type: "string", minLength: 1, pattern: hashPattern },
              },
            },
          },
          viable: { type: "boolean" },
          nextVerb: { type: "string", minLength: 1 },
          operator: { type: "string", minLength: 1 },
          rationale: { type: "string", minLength: 1 },
        },
      },
    },
    nextPressure: {
      type: "object",
      required: ["width", "pressure", "unitCount"],
      additionalProperties: false,
      properties: {
        width: { type: "integer", minimum: 0 },
        pressure: { enum: ["low", "moderate", "high"] },
        unitCount: { type: "integer", minimum: 0 },
      },
    },
    theory: {
      type: "object",
      required: ["beer", "ashby", "ibnKhaldun", "kautilya"],
      additionalProperties: false,
      properties: {
        beer: { type: "string", minLength: 1 },
        ashby: { type: "string", minLength: 1 },
        ibnKhaldun: { type: "string", minLength: 1 },
        kautilya: { type: "string", minLength: 1 },
      },
    },
  },
} as const;

export type EcosystemRecursiveControl = FromSchema<typeof ecosystemRecursiveControlSchema>;
export const ecosystemRecursiveControlCarrier = carrierFrom(ecosystemRecursiveControlSchema);

export const ecosystemConeRequestSchema = {
  $id: "computing/ecosystem-cone-request",
  title: "EcosystemConeRequest",
  type: "object",
  required: ["kind", "targetHash", "boundaryHashes", "tiling"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.ecosystem-cone-request" },
    targetHash: { type: "string", minLength: 1, pattern: hashPattern },
    boundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    mode: { enum: ["raw", "condensed"] },
    tiling: ecosystemInfoTilingSchema,
  },
} as const;

export type EcosystemConeRequest = FromSchema<typeof ecosystemConeRequestSchema>;
export const ecosystemConeRequestCarrier = carrierFrom(ecosystemConeRequestSchema);

export const ecosystemConeReconstructionSchema = {
  $id: "computing/ecosystem-cone-reconstruction",
  title: "EcosystemConeReconstruction",
  type: "object",
  required: [
    "kind",
    "targetHash",
    "mode",
    "reconstructible",
    "closureHashes",
    "closurePackages",
    "boundaryHashes",
    "missingHashes",
    "boundaryObstructions",
    "cycleObstructions",
    "cover",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.ecosystem-cone-reconstruction" },
    targetHash: { type: "string", minLength: 1, pattern: hashPattern },
    mode: { enum: ["raw", "condensed"] },
    reconstructible: { type: "boolean" },
    closureHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    closurePackages: { type: "array", items: { type: "string", minLength: 1 } },
    boundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    missingHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
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

export type EcosystemConeReconstruction = FromSchema<typeof ecosystemConeReconstructionSchema>;
export const ecosystemConeReconstructionCarrier = carrierFrom(ecosystemConeReconstructionSchema);

export const ecosystemRecursiveUnitRequestSchema = {
  $id: "computing/ecosystem-recursive-unit-request",
  title: "EcosystemRecursiveUnitRequest",
  type: "object",
  required: ["kind", "tiling", "recursive", "unitId"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.ecosystem-recursive-unit-request" },
    tiling: ecosystemInfoTilingSchema,
    recursive: ecosystemRecursiveControlSchema,
    unitId: { type: "string", minLength: 1, pattern: hashPattern },
  },
} as const;

export type EcosystemRecursiveUnitRequest = FromSchema<typeof ecosystemRecursiveUnitRequestSchema>;
export const ecosystemRecursiveUnitRequestCarrier = carrierFrom(ecosystemRecursiveUnitRequestSchema);

export const ecosystemRecursiveUnitSchema = {
  $id: "computing/ecosystem-recursive-unit",
  title: "EcosystemRecursiveUnit",
  type: "object",
  required: [
    "kind",
    "$id",
    "unitId",
    "recursiveHash",
    "tilingHash",
    "role",
    "packages",
    "packageHashes",
    "internalEdges",
    "boundaryEdges",
    "quotientBoundaryPorts",
    "internalPetri",
    "reconstruction",
    "nextActions",
    "theory",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.ecosystem-recursive-unit" },
    $id: { type: "string", minLength: 1, pattern: hashPattern },
    unitId: { type: "string", minLength: 1, pattern: hashPattern },
    recursiveHash: { type: "string", minLength: 1, pattern: hashPattern },
    tilingHash: { type: "string", minLength: 1, pattern: hashPattern },
    role: { enum: ["controlled", "cycle-supertile"] },
    packages: { type: "array", items: { type: "string", minLength: 1 } },
    packageHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    internalEdges: {
      type: "array",
      items: {
        type: "object",
        required: ["from", "to", "fromHash", "toHash"],
        additionalProperties: false,
        properties: {
          from: { type: "string", minLength: 1 },
          to: { type: "string", minLength: 1 },
          fromHash: { type: "string", minLength: 1, pattern: hashPattern },
          toHash: { type: "string", minLength: 1, pattern: hashPattern },
        },
      },
    },
    boundaryEdges: {
      type: "array",
      items: {
        type: "object",
        required: ["direction", "package", "hash", "neighborPackage", "neighborHash", "portHash"],
        additionalProperties: false,
        properties: {
          direction: { enum: ["in", "out"] },
          package: { type: "string", minLength: 1 },
          hash: { type: "string", minLength: 1, pattern: hashPattern },
          neighborPackage: { type: "string", minLength: 1 },
          neighborHash: { type: "string", minLength: 1, pattern: hashPattern },
          portHash: { type: "string", minLength: 1, pattern: hashPattern },
        },
      },
    },
    quotientBoundaryPorts: ecosystemRecursiveControlSchema.properties.units.items.properties.boundaryPorts,
    internalPetri: {
      type: "object",
      required: ["places", "transitions", "concurrencyWidth", "h1", "pressure"],
      additionalProperties: false,
      properties: {
        places: { type: "integer", minimum: 0 },
        transitions: { type: "integer", minimum: 0 },
        concurrencyWidth: { type: "integer", minimum: 0 },
        h1: { type: "integer", minimum: 0 },
        pressure: { enum: ["low", "moderate", "high"] },
      },
    },
    reconstruction: ecosystemConeReconstructionSchema,
    nextActions: {
      type: "array",
      items: {
        type: "object",
        required: ["verb", "reason"],
        additionalProperties: false,
        properties: {
          verb: { type: "string", minLength: 1 },
          reason: { type: "string", minLength: 1 },
        },
      },
    },
    theory: {
      type: "object",
      required: ["beer", "petri", "kolmogorovUspensky", "markov", "tsetlin"],
      additionalProperties: false,
      properties: {
        beer: { type: "string", minLength: 1 },
        petri: { type: "string", minLength: 1 },
        kolmogorovUspensky: { type: "string", minLength: 1 },
        markov: { type: "string", minLength: 1 },
        tsetlin: { type: "string", minLength: 1 },
      },
    },
  },
} as const;

export type EcosystemRecursiveUnit = FromSchema<typeof ecosystemRecursiveUnitSchema>;
export const ecosystemRecursiveUnitCarrier = carrierFrom(ecosystemRecursiveUnitSchema);

export const ecosystemConeDiffRequestSchema = {
  $id: "computing/ecosystem-cone-diff-request",
  title: "EcosystemConeDiffRequest",
  type: "object",
  required: ["kind", "leftTargetHash", "rightTargetHash", "leftBoundaryHashes", "rightBoundaryHashes", "tiling"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.ecosystem-cone-diff-request" },
    leftTargetHash: { type: "string", minLength: 1, pattern: hashPattern },
    rightTargetHash: { type: "string", minLength: 1, pattern: hashPattern },
    leftBoundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    rightBoundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    mode: { enum: ["raw", "condensed"] },
    tiling: ecosystemInfoTilingSchema,
  },
} as const;

export type EcosystemConeDiffRequest = FromSchema<typeof ecosystemConeDiffRequestSchema>;
export const ecosystemConeDiffRequestCarrier = carrierFrom(ecosystemConeDiffRequestSchema);

export const ecosystemConeDiffSchema = {
  $id: "computing/ecosystem-cone-diff",
  title: "EcosystemConeDiff",
  type: "object",
  required: [
    "kind",
    "mode",
    "leftTargetHash",
    "rightTargetHash",
    "equivalent",
    "reconstructible",
    "sharedHashes",
    "addedHashes",
    "removedHashes",
    "sharedPackages",
    "addedPackages",
    "removedPackages",
    "boundaryDeltaHashes",
    "h1",
    "left",
    "right",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.ecosystem-cone-diff" },
    mode: { enum: ["raw", "condensed"] },
    leftTargetHash: { type: "string", minLength: 1, pattern: hashPattern },
    rightTargetHash: { type: "string", minLength: 1, pattern: hashPattern },
    equivalent: { type: "boolean" },
    reconstructible: { type: "boolean" },
    sharedHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    addedHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    removedHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    sharedPackages: { type: "array", items: { type: "string", minLength: 1 } },
    addedPackages: { type: "array", items: { type: "string", minLength: 1 } },
    removedPackages: { type: "array", items: { type: "string", minLength: 1 } },
    boundaryDeltaHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    h1: { type: "integer", minimum: 0 },
    left: ecosystemConeReconstructionSchema,
    right: ecosystemConeReconstructionSchema,
  },
} as const;

export type EcosystemConeDiff = FromSchema<typeof ecosystemConeDiffSchema>;
export const ecosystemConeDiffCarrier = carrierFrom(ecosystemConeDiffSchema);

function unique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)]);
}

function sorted(values: Iterable<string>): readonly string[] {
  return Object.freeze([...values].sort((left, right) => left.localeCompare(right)));
}

function symmetricDifference(left: readonly string[], right: readonly string[]): readonly string[] {
  const l = new Set(left);
  const r = new Set(right);
  return sorted([...left.filter((value) => !r.has(value)), ...right.filter((value) => !l.has(value))]);
}

function intersection(left: readonly string[], right: readonly string[]): readonly string[] {
  const r = new Set(right);
  return sorted(left.filter((value) => r.has(value)));
}

function difference(left: readonly string[], right: readonly string[]): readonly string[] {
  const r = new Set(right);
  return sorted(left.filter((value) => !r.has(value)));
}

function sameMembers(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const r = new Set(right);
  return left.every((value) => r.has(value));
}

function packageHash(pkg: EcosystemPackage): string {
  return contentHash({
    name: pkg.name,
    version: pkg.version ?? "",
    layer: pkg.layer,
    lifecycle: pkg.lifecycle,
    maturity: pkg.maturity,
    dependencies: sorted(pkg.dependencies),
    exports: sorted(pkg.exports ?? []),
    bins: sorted(pkg.bins ?? []),
    scripts: sorted(pkg.scripts ?? []),
  });
}

function buildLayers(
  packages: readonly EcosystemPackage[],
  packageHashes: readonly Readonly<{ name: string; hash: string }>[],
  edges: readonly Readonly<{ from: string; to: string; fromHash: string; toHash: string }>[],
): Readonly<{
  tiers: readonly Readonly<{ tier: number; packages: readonly string[]; hashes: readonly string[] }>[];
  residualHashes: readonly string[];
}> {
  const hashByName = new Map(packageHashes.map((entry) => [entry.name, entry.hash] as const));
  const nameByHash = new Map(packageHashes.map((entry) => [entry.hash, entry.name] as const));
  const incoming = new Map(packageHashes.map((entry) => [entry.hash, 0]));
  const dependents = new Map(packageHashes.map((entry) => [entry.hash, [] as string[]]));
  for (const edge of edges) {
    incoming.set(edge.toHash, (incoming.get(edge.toHash) ?? 0) + 1);
    dependents.get(edge.fromHash)?.push(edge.toHash);
  }
  const placed = new Set<string>();
  const tiers: Readonly<{ tier: number; packages: readonly string[]; hashes: readonly string[] }>[] = [];
  let frontier = sorted(packages
    .map((pkg) => hashByName.get(pkg.name))
    .filter((hash): hash is string => hash !== undefined && (incoming.get(hash) ?? 0) === 0));
  let tier = 0;
  while (frontier.length > 0) {
    const hashes = frontier.filter((hash) => !placed.has(hash));
    if (hashes.length === 0) break;
    for (const hash of hashes) placed.add(hash);
    tiers.push(Object.freeze({
      tier,
      hashes,
      packages: sorted(hashes.map((hash) => nameByHash.get(hash)).filter((name): name is string => name !== undefined)),
    }));
    const next: string[] = [];
    for (const hash of hashes) {
      for (const dependent of dependents.get(hash) ?? []) {
        const remaining = (incoming.get(dependent) ?? 0) - 1;
        incoming.set(dependent, remaining);
        if (remaining === 0) next.push(dependent);
      }
    }
    frontier = sorted(next);
    tier += 1;
  }
  const residualHashes = sorted(packageHashes.map((entry) => entry.hash).filter((hash) => !placed.has(hash)));
  return Object.freeze({ tiers: Object.freeze(tiers), residualHashes });
}

function stronglyConnectedComponents(
  packageHashes: readonly Readonly<{ name: string; hash: string }>[],
  edges: readonly Readonly<{ from: string; to: string; fromHash: string; toHash: string }>[],
): readonly (readonly string[])[] {
  const outgoing = new Map(packageHashes.map((entry) => [entry.hash, new Set<string>()] as const));
  for (const edge of edges) outgoing.get(edge.fromHash)?.add(edge.toHash);
  const index = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];
  let nextIndex = 0;

  const visit = (hash: string): void => {
    index.set(hash, nextIndex);
    lowlink.set(hash, nextIndex);
    nextIndex += 1;
    stack.push(hash);
    onStack.add(hash);
    for (const next of outgoing.get(hash) ?? []) {
      if (!index.has(next)) {
        visit(next);
        lowlink.set(hash, Math.min(lowlink.get(hash)!, lowlink.get(next)!));
      } else if (onStack.has(next)) {
        lowlink.set(hash, Math.min(lowlink.get(hash)!, index.get(next)!));
      }
    }
    if (lowlink.get(hash) !== index.get(hash)) return;
    const component: string[] = [];
    let current: string;
    do {
      current = stack.pop()!;
      onStack.delete(current);
      component.push(current);
    } while (current !== hash);
    components.push(component);
  };

  for (const entry of packageHashes) if (!index.has(entry.hash)) visit(entry.hash);
  return Object.freeze(components.map((component) => sorted(component)));
}

function selfLoopSet(edges: readonly Readonly<{ fromHash: string; toHash: string }>[]): ReadonlySet<string> {
  return new Set(edges.filter((edge) => edge.fromHash === edge.toHash).map((edge) => edge.fromHash));
}

function cycleObstructions(
  packageHashes: readonly Readonly<{ name: string; hash: string }>[],
  edges: readonly Readonly<{ from: string; to: string; fromHash: string; toHash: string }>[],
  components: readonly (readonly string[])[],
): readonly Readonly<{ packages: readonly string[]; hashes: readonly string[] }>[] {
  const nameByHash = new Map(packageHashes.map((entry) => [entry.hash, entry.name] as const));
  const selfLoops = selfLoopSet(edges);
  return Object.freeze(components
    .filter((component) => component.length > 1 || selfLoops.has(component[0]!))
    .map((component) => {
      const hashes = sorted(component);
      return Object.freeze({
        hashes,
        packages: sorted(hashes.map((hash) => nameByHash.get(hash)).filter((name): name is string => name !== undefined)),
      });
    })
    .sort((left, right) => right.hashes.length - left.hashes.length || (left.packages[0] ?? "").localeCompare(right.packages[0] ?? "")));
}

function condensedReading(
  packageHashes: readonly Readonly<{ name: string; hash: string }>[],
  edges: readonly Readonly<{ from: string; to: string; fromHash: string; toHash: string }>[],
  components: readonly (readonly string[])[],
): Readonly<{
  tiles: readonly Readonly<{ hash: string; packages: readonly string[]; hashes: readonly string[]; cyclic: boolean; boundaryHashes: readonly string[] }>[];
  edges: readonly Readonly<{ from: string; to: string }>[];
  light: LightObservation;
}> {
  const nameByHash = new Map(packageHashes.map((entry) => [entry.hash, entry.name] as const));
  const selfLoops = selfLoopSet(edges);
  const componentByHash = new Map<string, string>();
  const tileByHash = new Map<string, { packages: readonly string[]; hashes: readonly string[]; cyclic: boolean; boundaryHashes: string[] }>();
  for (const component of components) {
    const hashes = sorted(component);
    const hash = contentHash({ kind: "computing.ecosystem-condensed-tile", hashes });
    for (const member of hashes) componentByHash.set(member, hash);
    tileByHash.set(hash, {
      hashes,
      packages: sorted(hashes.map((member) => nameByHash.get(member)).filter((name): name is string => name !== undefined)),
      cyclic: hashes.length > 1 || selfLoops.has(hashes[0]!),
      boundaryHashes: [],
    });
  }
  const edgeKeys = new Set<string>();
  const condensedEdges: Readonly<{ from: string; to: string }>[] = [];
  for (const edge of edges) {
    const from = componentByHash.get(edge.fromHash);
    const to = componentByHash.get(edge.toHash);
    if (from === undefined || to === undefined || from === to) continue;
    const key = `${from}\0${to}`;
    if (edgeKeys.has(key)) continue;
    edgeKeys.add(key);
    condensedEdges.push(Object.freeze({ from, to }));
    const target = tileByHash.get(to);
    if (target !== undefined) target.boundaryHashes.push(from);
  }
  const condensedTiles = Object.freeze([...tileByHash.entries()]
    .map(([hash, tile]) => Object.freeze({
      hash,
      packages: tile.packages,
      hashes: tile.hashes,
      cyclic: tile.cyclic,
      boundaryHashes: sorted(tile.boundaryHashes),
    }))
    .sort((left, right) => left.hash.localeCompare(right.hash)));
  const incoming = new Map(condensedTiles.map((tile) => [tile.hash, 0]));
  for (const edge of condensedEdges) incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
  const boundaryHashes = sorted(condensedTiles.map((tile) => tile.hash).filter((hash) => (incoming.get(hash) ?? 0) === 0));
  const light = lightObservationCarrier.assert(Object.freeze({
    kind: "computing.light-observation" as const,
    nodes: sorted(condensedTiles.map((tile) => tile.hash)),
    edges: Object.freeze(condensedEdges.map((edge) => Object.freeze({ from: edge.from, to: edge.to }))),
    boundaryHashes,
    causalOrder: true,
    h1: 0,
  })) as LightObservation;
  return Object.freeze({
    tiles: condensedTiles,
    edges: Object.freeze(condensedEdges.sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to))),
    light,
  });
}

function packageTile(pkg: EcosystemPackage, boundaryHashes: readonly string[]): TraceTile {
  return traceTile({
    kind: "computing.trace-event-input",
    source: "workspace",
    subject: pkg.name,
    rule: "ecosystem.package.settle",
    stage: 0,
    payload: pkg,
    boundaryHashes,
  });
}

function petriCausalReading(
  packageHashes: readonly Readonly<{ name: string; hash: string }>[],
  edges: readonly Readonly<{ from: string; to: string; fromHash: string; toHash: string }>[],
  tiers: readonly Readonly<{ tier: number; packages: readonly string[]; hashes: readonly string[] }>[],
): EcosystemInfoTiling["petri"] {
  const incoming = new Map<string, number>(packageHashes.map((entry) => [entry.hash, 0] as const));
  const outgoing = new Map<string, number>(packageHashes.map((entry) => [entry.hash, 0] as const));
  for (const edge of edges) {
    outgoing.set(edge.fromHash, (outgoing.get(edge.fromHash) ?? 0) + 1);
    incoming.set(edge.toHash, (incoming.get(edge.toHash) ?? 0) + 1);
  }
  const places = Object.freeze(packageHashes.map((entry) => {
    const inCount = incoming.get(entry.hash) ?? 0;
    const outCount = outgoing.get(entry.hash) ?? 0;
    return Object.freeze({
      package: entry.name,
      hash: entry.hash,
      incoming: inCount,
      outgoing: outCount,
      degree: inCount + outCount,
    });
  }).sort((left, right) => right.degree - left.degree || left.package.localeCompare(right.package)));
  const concurrencyWidth = Math.max(0, ...places.map((place) => place.degree));
  const maxBuildTierWidth = Math.max(0, ...tiers.map((tier) => tier.packages.length));
  const bottleneckThreshold = Math.max(2, Math.ceil(concurrencyWidth / 2));
  const bottlenecks = Object.freeze(places
    .filter((place) => place.degree >= bottleneckThreshold)
    .slice(0, 16));
  const pressure = concurrencyWidth >= Math.max(8, Math.ceil(Math.sqrt(Math.max(1, packageHashes.length)) * 2))
    ? "high"
    : concurrencyWidth >= 3 ? "moderate" : "low";
  return Object.freeze({
    places,
    transitions: Object.freeze(edges.map((edge) => Object.freeze({
      id: contentHash({ kind: "computing.petri-transition", from: edge.fromHash, to: edge.toHash }),
      from: edge.from,
      to: edge.to,
      fromHash: edge.fromHash,
      toHash: edge.toHash,
    })).sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to))),
    frontiers: Object.freeze(tiers.map((tier) => Object.freeze({
      tier: tier.tier,
      width: tier.packages.length,
      packages: tier.packages,
      hashes: tier.hashes,
    }))),
    concurrencyWidth,
    maxBuildTierWidth,
    bottlenecks,
    pressure,
    theory: "Petri-style reading: packages are places, dependency edges are transitions, build tiers are concurrent frontiers, and high-degree places witness causal pressure.",
  });
}

type RegulationAction = EcosystemCausalRegulation["actions"][number];

function regulationAction(input: Omit<RegulationAction, "id">): RegulationAction {
  return Object.freeze({
    ...input,
    id: contentHash({ kind: "computing.ecosystem-causal-regulation.action", input }),
  }) as RegulationAction;
}

function defaultTargetWidth(tiling: EcosystemInfoTiling): number {
  return Math.max(3, Math.ceil(Math.sqrt(Math.max(1, tiling.packages.length)) * 2));
}

function packageByHash(tiling: EcosystemInfoTiling): ReadonlyMap<string, EcosystemPackage> {
  const hashByName = new Map(tiling.packageHashes.map((entry) => [entry.name, entry.hash] as const));
  return new Map(tiling.packages.map((pkg) => [hashByName.get(pkg.name) ?? "", pkg] as const).filter(([hash]) => hash.length > 0));
}

export function regulateEcosystemCausalWidth(input: EcosystemCausalRegulationRequest): EcosystemCausalRegulation {
  const request = ecosystemCausalRegulationRequestCarrier.assert(input) as EcosystemCausalRegulationRequest;
  const tiling = ecosystemInfoTilingCarrier.assert(request.tiling) as EcosystemInfoTiling;
  const targetWidth = request.targetWidth ?? defaultTargetWidth(tiling);
  const packages = packageByHash(tiling);
  const actions: RegulationAction[] = [];

  for (const place of tiling.petri.bottlenecks) {
    if (place.degree <= targetWidth && tiling.petri.pressure !== "high") continue;
    const pkg = packages.get(place.hash);
    const layer = pkg?.layer ?? "unknown";
    const substrate = place.incoming === 0 && place.outgoing > targetWidth;
    const delta = Math.max(1, place.degree - targetWidth);
    actions.push(regulationAction({
      kind: substrate ? "accept-substrate" as const : "audit-cone" as const,
      targetVerb: substrate ? "ecosystem-infotiling" : "reconstruct-ecosystem-cone",
      priority: tiling.petri.pressure === "high" ? "now" as const : "next" as const,
      bottleneckPackage: place.package,
      bottleneckHash: place.hash,
      estimatedWidthDelta: substrate ? 0 : -Math.min(delta, Math.max(1, Math.floor(place.degree / 3))),
      preconditions: Object.freeze([
        `degree=${place.degree}`,
        `incoming=${place.incoming}`,
        `outgoing=${place.outgoing}`,
        `layer=${layer}`,
      ]),
      expectedEffect: substrate
        ? "record this place as an intentional substrate fan-out before proposing extraction"
        : "audit the package cone to separate essential causal demand from accidental imports",
      rationale: substrate
        ? "Petri pressure is high but the place has no prerequisites; Ashby regulation first distinguishes substrate variety from accidental coupling."
        : "A high-degree non-root place is a regulator candidate; cone reconstruction exposes which dependencies form the controllable boundary.",
    }));
    actions.push(regulationAction({
      kind: "publish-contract" as const,
      targetVerb: "ecosystem-infotiling",
      priority: "next" as const,
      bottleneckPackage: place.package,
      bottleneckHash: place.hash,
      estimatedWidthDelta: -Math.max(1, Math.ceil(delta / 4)),
      preconditions: Object.freeze([
        `exports=${pkg?.exports?.length ?? 0}`,
        `bins=${pkg?.bins?.length ?? 0}`,
        `scripts=${pkg?.scripts?.length ?? 0}`,
      ]),
      expectedEffect: "make the depended-on surface explicit so consumers can bind to narrower boundary hashes",
      rationale: "Conant-Ashby says a good regulator needs a model of the system; publishing the contract makes the high-degree place modelable.",
    }));
    if (place.outgoing > targetWidth) {
      actions.push(regulationAction({
        kind: "extract-boundary" as const,
        targetVerb: "aperiodic-bridge-plan",
        priority: substrate ? "later" as const : "next" as const,
        bottleneckPackage: place.package,
        bottleneckHash: place.hash,
        estimatedWidthDelta: -Math.max(1, Math.ceil(delta / 2)),
        preconditions: Object.freeze([
          `consumers=${place.outgoing}`,
          `targetWidth=${targetWidth}`,
        ]),
        expectedEffect: "split consumer demand into role-specific boundary tiles while preserving the settled substrate tile",
        rationale: "Beer-style recursion relieves a central place by introducing smaller viable boundary units rather than flattening every dependency onto one point.",
      }));
    }
  }

  for (const obstruction of tiling.cycleObstructions) {
    const hash = obstruction.hashes[0] ?? tiling.$id;
    actions.push(regulationAction({
      kind: "condense-cycle" as const,
      targetVerb: "reconstruct-ecosystem-cone",
      priority: "now" as const,
      bottleneckPackage: obstruction.packages.join(" + "),
      bottleneckHash: hash,
      estimatedWidthDelta: 0,
      preconditions: Object.freeze([
        `cyclePackages=${obstruction.packages.length}`,
        `cycleHashes=${obstruction.hashes.length}`,
      ]),
      expectedEffect: "regulate a cyclic cluster as one SCC supertile before attempting raw causal ordering",
      rationale: "Petri and event-structure readings require a causal quotient when raw transitions form a cycle.",
    }));
  }

  const nowDelta = actions
    .filter((action) => action.priority === "now")
    .reduce((sum, action) => sum + Math.min(0, action.estimatedWidthDelta), 0);
  const residualWidth = Math.max(0, tiling.petri.concurrencyWidth + nowDelta);
  const disturbanceVariety = tiling.petri.bottlenecks.length + tiling.cycleObstructions.length + (tiling.petri.pressure === "high" ? 1 : 0);
  const regulatorVariety = new Set(actions.map((action) => action.kind)).size;

  return ecosystemCausalRegulationCarrier.assert(Object.freeze({
    kind: "computing.ecosystem-causal-regulation" as const,
    $id: contentHash({
      kind: "computing.ecosystem-causal-regulation",
      tiling: tiling.$id,
      targetWidth,
      actions: actions.map((action) => action.id),
    }),
    tilingHash: tiling.$id,
    currentWidth: tiling.petri.concurrencyWidth,
    targetWidth,
    pressure: tiling.petri.pressure,
    disturbanceVariety,
    regulatorVariety,
    requisiteVarietySatisfied: regulatorVariety >= disturbanceVariety,
    residualWidth,
    actions: Object.freeze(actions),
    theory: Object.freeze({
      petri: "places/transitions expose the non-sequential pressure that must be regulated",
      ashby: "regulator variety must match disturbance variety before width reduction is credible",
      conantAshby: "every good regulator carries a model: contract publication and cone audit make the bottleneck model explicit",
      beer: "viable-system recursion relieves central pressure by introducing boundary units at the right scale",
    }),
  })) as EcosystemCausalRegulation;
}

function pressureOf(width: number, placeCount: number): "low" | "moderate" | "high" {
  return width >= Math.max(8, Math.ceil(Math.sqrt(Math.max(1, placeCount)) * 2))
    ? "high"
    : width >= 3 ? "moderate" : "low";
}

export function stabilizeEcosystemCausalWidth(input: EcosystemCausalStabilizationRequest): EcosystemCausalStabilization {
  const request = ecosystemCausalStabilizationRequestCarrier.assert(input) as EcosystemCausalStabilizationRequest;
  const tiling = ecosystemInfoTilingCarrier.assert(request.tiling) as EcosystemInfoTiling;
  const regulation = ecosystemCausalRegulationCarrier.assert(request.regulation) as EcosystemCausalRegulation;
  const nowActions = regulation.actions.filter((action) => action.priority === "now");
  const acceptedHashes = new Set(nowActions
    .filter((action) => action.kind === "accept-substrate")
    .map((action) => action.bottleneckHash));
  const condensedActionPackages = new Set(nowActions
    .filter((action) => action.kind === "condense-cycle")
    .flatMap((action) => action.bottleneckPackage.split(" + ")));
  const acceptedSubstrates = Object.freeze(tiling.petri.places
    .filter((place) => acceptedHashes.has(place.hash))
    .map((place) => Object.freeze({ package: place.package, hash: place.hash, degree: place.degree })));
  const cycleTiles = Object.freeze(tiling.condensedTiles
    .filter((tile) => tile.cyclic && tile.packages.some((pkg) => condensedActionPackages.has(pkg)))
    .map((tile) => Object.freeze({ hash: tile.hash, packages: tile.packages, hashes: tile.hashes })));
  const memberToSupertile = new Map<string, string>();
  const supertilePackages = new Map<string, readonly string[]>();
  for (const tile of cycleTiles) {
    supertilePackages.set(tile.hash, tile.packages);
    for (const hash of tile.hashes) memberToSupertile.set(hash, tile.hash);
  }
  const hashToPackage = new Map(tiling.packageHashes.map((entry) => [entry.hash, entry.name] as const));
  const nodeId = (hash: string): string | undefined => {
    if (acceptedHashes.has(hash)) return undefined;
    return memberToSupertile.get(hash) ?? hash;
  };
  const transitionKeys = new Set<string>();
  const transitions: { from: string; to: string }[] = [];
  for (const edge of tiling.edges) {
    const from = nodeId(edge.fromHash);
    const to = nodeId(edge.toHash);
    if (from === undefined || to === undefined || from === to) continue;
    const key = `${from}\0${to}`;
    if (transitionKeys.has(key)) continue;
    transitionKeys.add(key);
    transitions.push({ from, to });
  }
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  const packages = new Map<string, readonly string[]>();
  for (const entry of tiling.packageHashes) {
    const id = nodeId(entry.hash);
    if (id === undefined) continue;
    incoming.set(id, incoming.get(id) ?? 0);
    outgoing.set(id, outgoing.get(id) ?? 0);
    packages.set(id, supertilePackages.get(id) ?? Object.freeze([hashToPackage.get(entry.hash) ?? entry.name]));
  }
  for (const transition of transitions) {
    outgoing.set(transition.from, (outgoing.get(transition.from) ?? 0) + 1);
    incoming.set(transition.to, (incoming.get(transition.to) ?? 0) + 1);
  }
  const quotientPlaces = Object.freeze([...packages.entries()].map(([id, names]) => {
    const inCount = incoming.get(id) ?? 0;
    const outCount = outgoing.get(id) ?? 0;
    return Object.freeze({
      id,
      packages: names,
      incoming: inCount,
      outgoing: outCount,
      degree: inCount + outCount,
      role: supertilePackages.has(id) ? "cycle-supertile" as const : "controlled" as const,
    });
  }).sort((left, right) => right.degree - left.degree || (left.packages[0] ?? "").localeCompare(right.packages[0] ?? "")));
  const residualControllableWidth = Math.max(0, ...quotientPlaces.map((place) => place.degree));
  const uncondensedCycles = tiling.cycleObstructions.filter((obstruction) =>
    !obstruction.packages.every((pkg) => condensedActionPackages.has(pkg)),
  );
  const appliedActions = sorted(nowActions
    .filter((action) => action.kind === "accept-substrate" || action.kind === "condense-cycle")
    .map((action) => action.id));
  return ecosystemCausalStabilizationCarrier.assert(Object.freeze({
    kind: "computing.ecosystem-causal-stabilization" as const,
    $id: contentHash({
      kind: "computing.ecosystem-causal-stabilization",
      tiling: tiling.$id,
      regulation: regulation.$id,
      appliedActions,
      residualControllableWidth,
    }),
    tilingHash: tiling.$id,
    regulationHash: regulation.$id,
    acceptedSubstrates,
    condensedCycles: cycleTiles,
    quotientPlaces,
    quotientTransitions: Object.freeze(transitions
      .map((transition) => Object.freeze(transition))
      .sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to))),
    residualControllableWidth,
    residualPressure: pressureOf(residualControllableWidth, quotientPlaces.length),
    controlH1: uncondensedCycles.length,
    appliedActions,
    theory: Object.freeze({
      petri: "accepted substrate places are removed from the controllable Petri graph and cyclic SCCs become quotient places",
      ashby: "stabilization distinguishes regulated disturbance from residual controllable width",
      beer: "recursive control keeps substrate identity intact while moving controllable pressure to smaller quotient units",
    }),
  })) as EcosystemCausalStabilization;
}

export function readEcosystemRecursiveControl(input: EcosystemRecursiveControlRequest): EcosystemRecursiveControl {
  const request = ecosystemRecursiveControlRequestCarrier.assert(input) as EcosystemRecursiveControlRequest;
  const stabilization = ecosystemCausalStabilizationCarrier.assert(request.stabilization) as EcosystemCausalStabilization;
  const targetWidth = request.targetWidth ?? Math.max(3, Math.ceil(stabilization.residualControllableWidth / 2));
  const transitionsByUnit = new Map<string, { in: string[]; out: string[] }>();
  for (const place of stabilization.quotientPlaces) transitionsByUnit.set(place.id, { in: [], out: [] });
  for (const transition of stabilization.quotientTransitions) {
    transitionsByUnit.get(transition.from)?.out.push(transition.to);
    transitionsByUnit.get(transition.to)?.in.push(transition.from);
  }
  const pressured = stabilization.quotientPlaces
    .filter((place) => place.degree > targetWidth || place.role === "cycle-supertile")
    .sort((left, right) => right.degree - left.degree || (left.packages[0] ?? "").localeCompare(right.packages[0] ?? ""));
  const units = Object.freeze(pressured.map((place) => {
    const boundary = transitionsByUnit.get(place.id) ?? { in: [], out: [] };
    const boundaryPorts = Object.freeze([
      ...sorted(boundary.in).map((neighbor) => Object.freeze({
        direction: "in" as const,
        neighbor,
        portHash: contentHash({ kind: "computing.recursive-control.port", unit: place.id, neighbor, direction: "in" }),
      })),
      ...sorted(boundary.out).map((neighbor) => Object.freeze({
        direction: "out" as const,
        neighbor,
        portHash: contentHash({ kind: "computing.recursive-control.port", unit: place.id, neighbor, direction: "out" }),
      })),
    ]);
    const viable = boundaryPorts.length <= targetWidth && place.role !== "cycle-supertile";
    return Object.freeze({
      id: contentHash({ kind: "computing.recursive-control.unit", place: place.id, targetWidth, boundaryPorts: boundaryPorts.map((port) => port.portHash) }),
      packages: place.packages,
      role: place.role,
      degree: place.degree,
      boundaryPorts,
      viable,
      nextVerb: place.role === "cycle-supertile" ? "reconstruct-ecosystem-cone" : "regulate-ecosystem-causal-width",
      operator: place.role === "cycle-supertile"
        ? "open the SCC supertile as the next recursive control system and regulate its internal ports"
        : "treat this high-degree place as a viable subsystem and split its boundary ports by role",
      rationale: place.role === "cycle-supertile"
        ? "Beer recursion says a stabilized whole becomes a new system-in-focus; the SCC needs its own controller before further width claims."
        : "Ashby variety is local: this subsystem needs boundary-port variety before global width can fall.",
    });
  }));
  const nextWidth = Math.max(0, ...units.map((unit) => unit.degree));
  return ecosystemRecursiveControlCarrier.assert(Object.freeze({
    kind: "computing.ecosystem-recursive-control" as const,
    $id: contentHash({
      kind: "computing.ecosystem-recursive-control",
      stabilization: stabilization.$id,
      targetWidth,
      units: units.map((unit) => unit.id),
    }),
    stabilizationHash: stabilization.$id,
    targetWidth,
    units,
    nextPressure: Object.freeze({
      width: nextWidth,
      pressure: pressureOf(nextWidth, Math.max(1, units.length)),
      unitCount: units.length,
    }),
    theory: Object.freeze({
      beer: "viable-system recursion: every stabilized pressure point can become a system-in-focus with its own controller",
      ashby: "requisite variety is checked per subsystem boundary, not only at the whole-graph level",
      ibnKhaldun: "asabiyyah-style cohesion is read as the supertile whose internal bond must be governed before outward expansion",
      kautilya: "mandala-style statecraft reads boundary ports as neighboring relations that must be classified before action",
    }),
  })) as EcosystemRecursiveControl;
}

export function openEcosystemRecursiveUnit(input: EcosystemRecursiveUnitRequest): EcosystemRecursiveUnit {
  const request = ecosystemRecursiveUnitRequestCarrier.assert(input) as EcosystemRecursiveUnitRequest;
  const tiling = ecosystemInfoTilingCarrier.assert(request.tiling) as EcosystemInfoTiling;
  const recursive = ecosystemRecursiveControlCarrier.assert(request.recursive) as EcosystemRecursiveControl;
  const unit = recursive.units.find((candidate) => candidate.id === request.unitId);
  if (unit === undefined) {
    throw new Error(`recursive unit not found: ${request.unitId}`);
  }

  const hashByName = new Map(tiling.packageHashes.map((entry) => [entry.name, entry.hash] as const));
  const nameByHash = new Map(tiling.packageHashes.map((entry) => [entry.hash, entry.name] as const));
  const packageHashes = sorted(unit.packages
    .map((name) => hashByName.get(name))
    .filter((hash): hash is string => hash !== undefined));
  const internal = new Set(packageHashes);
  const internalEdges = Object.freeze(tiling.edges
    .filter((edge) => internal.has(edge.fromHash) && internal.has(edge.toHash))
    .map((edge) => Object.freeze({
      from: edge.from,
      to: edge.to,
      fromHash: edge.fromHash,
      toHash: edge.toHash,
    }))
    .sort((left, right) => left.fromHash.localeCompare(right.fromHash) || left.toHash.localeCompare(right.toHash)));

  const boundaryEdges = Object.freeze(tiling.edges
    .filter((edge) => internal.has(edge.fromHash) !== internal.has(edge.toHash))
    .map((edge) => {
      const outward = internal.has(edge.fromHash);
      const hash = outward ? edge.fromHash : edge.toHash;
      const neighborHash = outward ? edge.toHash : edge.fromHash;
      return Object.freeze({
        direction: outward ? "out" as const : "in" as const,
        package: nameByHash.get(hash) ?? (outward ? edge.from : edge.to),
        hash,
        neighborPackage: nameByHash.get(neighborHash) ?? (outward ? edge.to : edge.from),
        neighborHash,
        portHash: contentHash({
          kind: "computing.ecosystem-recursive-unit.port",
          unit: unit.id,
          direction: outward ? "out" : "in",
          hash,
          neighborHash,
        }),
      });
    })
    .sort((left, right) => left.direction.localeCompare(right.direction) || left.hash.localeCompare(right.hash) || left.neighborHash.localeCompare(right.neighborHash)));

  const degree = new Map(packageHashes.map((hash) => [hash, 0]));
  for (const edge of internalEdges) {
    degree.set(edge.fromHash, (degree.get(edge.fromHash) ?? 0) + 1);
    degree.set(edge.toHash, (degree.get(edge.toHash) ?? 0) + 1);
  }
  const selfLoops = internalEdges.filter((edge) => edge.fromHash === edge.toHash).map((edge) => edge.fromHash);
  const internalH1 = unit.role === "cycle-supertile"
    ? Math.max(1, tiling.cycleObstructions.filter((obstruction) => sameMembers(obstruction.hashes, packageHashes)).length)
    : selfLoops.length;
  const concurrencyWidth = Math.max(0, ...degree.values(), boundaryEdges.length);
  const internalPetri = Object.freeze({
    places: packageHashes.length,
    transitions: internalEdges.length,
    concurrencyWidth,
    h1: internalH1,
    pressure: pressureOf(concurrencyWidth, Math.max(1, packageHashes.length)),
  });

  const condensedTile = tiling.condensedTiles.find((tile) => sameMembers(tile.packages, unit.packages));
  const targetHash = unit.role === "cycle-supertile" && condensedTile !== undefined
    ? condensedTile.hash
    : packageHashes[0] ?? unit.id;
  const mode = unit.role === "cycle-supertile" ? "condensed" as const : "raw" as const;
  const boundaryProbe = reconstructEcosystemCone({
    kind: "computing.ecosystem-cone-request",
    targetHash,
    boundaryHashes: [],
    mode,
    tiling,
  });
  const reconstruction = reconstructEcosystemCone({
    kind: "computing.ecosystem-cone-request",
    targetHash,
    boundaryHashes: boundaryProbe.boundaryHashes,
    mode,
    tiling,
  });
  const nextActions = Object.freeze([
    Object.freeze({
      verb: unit.nextVerb,
      reason: unit.role === "cycle-supertile"
        ? "the quotient supertile is reconstructible; regulate the opened internal cycle before claiming global causal width falls"
        : "the high-degree unit has explicit raw boundary ports; regulate it as the next local subsystem",
    }),
    Object.freeze({
      verb: "aperiodic-bridge-plan",
      reason: "opened boundary colors can now feed aperiodic repair, diffraction, and reward-policy bridges",
    }),
  ]);

  return ecosystemRecursiveUnitCarrier.assert(Object.freeze({
    kind: "computing.ecosystem-recursive-unit" as const,
    $id: contentHash({
      kind: "computing.ecosystem-recursive-unit",
      tiling: tiling.$id,
      recursive: recursive.$id,
      unit: unit.id,
      packageHashes,
      internalEdges: internalEdges.map((edge) => [edge.fromHash, edge.toHash]),
      boundaryEdges: boundaryEdges.map((edge) => edge.portHash),
    }),
    unitId: unit.id,
    recursiveHash: recursive.$id,
    tilingHash: tiling.$id,
    role: unit.role,
    packages: unit.packages,
    packageHashes,
    internalEdges,
    boundaryEdges,
    quotientBoundaryPorts: unit.boundaryPorts,
    internalPetri,
    reconstruction,
    nextActions,
    theory: Object.freeze({
      beer: "recursive viable-system control: the quotient place is opened as a new system-in-focus with its own environment and controller",
      petri: "internal dependencies are non-sequential transitions; boundary edges are interface places where concurrency pressure enters or leaves",
      kolmogorovUspensky: "the unit is reconstructed as a local graph-machine neighborhood rather than a linear trace, matching content hashes to adjacency",
      markov: "opening is a finite normal-algorithm rewrite from one quotient symbol to a raw dependency word with an inspectable normal form",
      tsetlin: "each boundary port is a reward/penalty actuator for the next local adaptation policy",
    }),
  })) as EcosystemRecursiveUnit;
}

export function ecosystemInfoTiling(input: EcosystemGraph): EcosystemInfoTiling {
  const graph = ecosystemGraphCarrier.assert(input) as EcosystemGraph;
  const packages = Object.freeze(graph.nodes.map((node) => ecosystemPackageCarrier.assert(node) as EcosystemPackage));
  const hashByName = new Map(packages.map((pkg) => [pkg.name, packageHash(pkg)] as const));
  const packageHashes = Object.freeze(packages.map((pkg) => Object.freeze({ name: pkg.name, hash: hashByName.get(pkg.name)! })));
  const dependencyEdges = Object.freeze(graph.edges
    .filter((edge) => hashByName.has(edge.from) && hashByName.has(edge.to))
    .map((edge) => Object.freeze({
      from: edge.to,
      to: edge.from,
      fromHash: hashByName.get(edge.to)!,
      toHash: hashByName.get(edge.from)!,
    })));
  const layers = buildLayers(packages, packageHashes, dependencyEdges);
  const boundaryHashes = layers.tiers[0]?.hashes ?? Object.freeze([]);
  const components = stronglyConnectedComponents(packageHashes, dependencyEdges);
  const cycles = cycleObstructions(packageHashes, dependencyEdges, components);
  const condensed = condensedReading(packageHashes, dependencyEdges, components);
  const petri = petriCausalReading(packageHashes, dependencyEdges, layers.tiers);
  const causalOrder = cycles.length === 0;
  const light: LightObservation = lightObservationCarrier.assert(Object.freeze({
    kind: "computing.light-observation" as const,
    nodes: sorted(packageHashes.map((entry) => entry.hash)),
    edges: dependencyEdges.map((edge) => Object.freeze({ from: edge.fromHash, to: edge.toHash })),
    boundaryHashes,
    causalOrder,
    h1: cycles.length,
  })) as LightObservation;
  const tiles = packages.map((pkg) => {
    const deps = unique(graph.edges.filter((edge) => edge.from === pkg.name).map((edge) => hashByName.get(edge.to)).filter((hash): hash is string => hash !== undefined));
    return packageTile(pkg, deps.length === 0 ? [hashByName.get(pkg.name)!] : deps);
  });
  const trace: TraceTiling = foldTraceTiles(tiles);
  const h1 = light.h1 + trace.h1;
  const normalFormHash = contentHash({ light: light.nodes, trace: trace.normalFormHash, condensed: condensed.light.nodes, boundaryHashes });
  return ecosystemInfoTilingCarrier.assert(Object.freeze({
    kind: "computing.ecosystem-infotiling" as const,
    $id: contentHash({ normalFormHash, h1 }),
    packages,
    packageHashes,
    edges: dependencyEdges,
    boundaryHashes,
    light,
    trace,
    normalFormHash,
    causalOrder,
    buildTiers: layers.tiers,
    residualHashes: layers.residualHashes,
    cycleObstructions: cycles,
    petri,
    condensedTiles: condensed.tiles,
    condensedEdges: condensed.edges,
    condensedLight: condensed.light,
    condensedReconstructible: condensed.light.h1 === 0,
    h1,
    reconstructible: h1 === 0,
    theory: Object.freeze({
      infotiling: "the workspace package graph is one content-addressed cover; package hashes are causal coordinates",
      nix: "build order is read as provider-before-consumer settling, the JSNode analogue of derivation dependencies",
      soviet: "Kolmogorov-Uspensky local graph neighborhoods and Markov normal rewrites turn workspace topology into executable tiling",
      jsnode: "accepts the package/dependency graph exported by @red-cup-engineering/jsnode-ick without importing the app into computing",
      petri: "Carl Adam Petri's non-sequential process lens reads package dependency topology as places, transitions, concurrent frontiers, and bottleneck pressure",
    }),
  })) as EcosystemInfoTiling;
}

function coneGraph(tiling: EcosystemInfoTiling, mode: "raw" | "condensed"): Readonly<{
  nodes: readonly string[];
  incoming: ReadonlyMap<string, readonly string[]>;
  packages: ReadonlyMap<string, readonly string[]>;
}> {
  if (mode === "condensed") {
    const incoming = new Map<string, string[]>();
    const packages = new Map<string, readonly string[]>();
    for (const tile of tiling.condensedTiles) {
      incoming.set(tile.hash, []);
      packages.set(tile.hash, tile.packages);
    }
    for (const edge of tiling.condensedEdges) incoming.get(edge.to)?.push(edge.from);
    return Object.freeze({
      nodes: Object.freeze(tiling.condensedTiles.map((tile) => tile.hash)),
      incoming: new Map([...incoming.entries()].map(([hash, deps]) => [hash, sorted(deps)] as const)),
      packages,
    });
  }
  const incoming = new Map<string, string[]>();
  const packages = new Map<string, readonly string[]>();
  for (const entry of tiling.packageHashes) {
    incoming.set(entry.hash, []);
    packages.set(entry.hash, Object.freeze([entry.name]));
  }
  for (const edge of tiling.edges) incoming.get(edge.toHash)?.push(edge.fromHash);
  return Object.freeze({
    nodes: Object.freeze(tiling.packageHashes.map((entry) => entry.hash)),
    incoming: new Map([...incoming.entries()].map(([hash, deps]) => [hash, sorted(deps)] as const)),
    packages,
  });
}

export function reconstructEcosystemCone(input: EcosystemConeRequest): EcosystemConeReconstruction {
  const request = ecosystemConeRequestCarrier.assert(input) as EcosystemConeRequest;
  const tiling = ecosystemInfoTilingCarrier.assert(request.tiling) as EcosystemInfoTiling;
  const mode = request.mode ?? "raw";
  const graph = coneGraph(tiling, mode);
  const nodeSet = new Set(graph.nodes);
  const closure = new Set<string>();
  const missing = new Set<string>();
  const cycles = new Set<string>();
  const visiting = new Set<string>();

  const visit = (hash: string): void => {
    if (visiting.has(hash)) {
      cycles.add(hash);
      return;
    }
    if (closure.has(hash)) return;
    if (!nodeSet.has(hash)) {
      missing.add(hash);
      return;
    }
    visiting.add(hash);
    for (const dependency of graph.incoming.get(hash) ?? []) visit(dependency);
    visiting.delete(hash);
    closure.add(hash);
  };

  visit(request.targetHash);
  const closureHashes = sorted(closure);
  const computedBoundary = sorted(closureHashes.filter((hash) => (graph.incoming.get(hash) ?? []).every((dependency) => !closure.has(dependency))));
  const boundaryObstructions = symmetricDifference(computedBoundary, request.boundaryHashes);
  const cycleObstructions = sorted(cycles);
  const missingHashes = sorted(missing);
  const h1 = missingHashes.length + boundaryObstructions.length + cycleObstructions.length;
  const closurePackages = sorted(closureHashes.flatMap((hash) => [...(graph.packages.get(hash) ?? [])]));

  return ecosystemConeReconstructionCarrier.assert(Object.freeze({
    kind: "computing.ecosystem-cone-reconstruction" as const,
    targetHash: request.targetHash,
    mode,
    reconstructible: h1 === 0,
    closureHashes,
    closurePackages,
    boundaryHashes: computedBoundary,
    missingHashes,
    boundaryObstructions,
    cycleObstructions,
    cover: Object.freeze({
      h1,
      closed: missingHashes.length === 0,
      acyclic: cycleObstructions.length === 0,
      boundaryExact: boundaryObstructions.length === 0,
    }),
  })) as EcosystemConeReconstruction;
}

export function diffEcosystemCones(input: EcosystemConeDiffRequest): EcosystemConeDiff {
  const request = ecosystemConeDiffRequestCarrier.assert(input) as EcosystemConeDiffRequest;
  const mode = request.mode ?? "raw";
  const left = reconstructEcosystemCone({
    kind: "computing.ecosystem-cone-request",
    targetHash: request.leftTargetHash,
    boundaryHashes: request.leftBoundaryHashes,
    mode,
    tiling: request.tiling,
  });
  const right = reconstructEcosystemCone({
    kind: "computing.ecosystem-cone-request",
    targetHash: request.rightTargetHash,
    boundaryHashes: request.rightBoundaryHashes,
    mode,
    tiling: request.tiling,
  });
  const sharedHashes = intersection(left.closureHashes, right.closureHashes);
  const addedHashes = difference(right.closureHashes, left.closureHashes);
  const removedHashes = difference(left.closureHashes, right.closureHashes);
  const sharedPackages = intersection(left.closurePackages, right.closurePackages);
  const addedPackages = difference(right.closurePackages, left.closurePackages);
  const removedPackages = difference(left.closurePackages, right.closurePackages);
  const boundaryDeltaHashes = symmetricDifference(left.boundaryHashes, right.boundaryHashes);
  const h1 = left.cover.h1 + right.cover.h1;
  return ecosystemConeDiffCarrier.assert(Object.freeze({
    kind: "computing.ecosystem-cone-diff" as const,
    mode,
    leftTargetHash: request.leftTargetHash,
    rightTargetHash: request.rightTargetHash,
    equivalent: addedHashes.length === 0 && removedHashes.length === 0 && boundaryDeltaHashes.length === 0,
    reconstructible: left.reconstructible && right.reconstructible,
    sharedHashes,
    addedHashes,
    removedHashes,
    sharedPackages,
    addedPackages,
    removedPackages,
    boundaryDeltaHashes,
    h1,
    left,
    right,
  })) as EcosystemConeDiff;
}

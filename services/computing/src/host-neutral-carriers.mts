/**
 * host-neutral-carriers - package/code graph carriers with no host adapter imports.
 *
 * These are the target shapes for Node/npm/pnpm/Git readers. A host reader may
 * discover the facts any way it likes; the carrier itself is one JSON Schema
 * literal so Rust, Guile, and Node can emit the same canonical data.
 */
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";

const idSchema = { type: "string", minLength: 1 } as const;
const stringArraySchema = { type: "array", items: idSchema } as const;

const dependencyRefSchema = {
  type: "object",
  required: ["name", "relationship"],
  additionalProperties: false,
  properties: {
    name: idSchema,
    range: { type: "string" },
    relationship: { enum: ["runtime", "development", "peer", "optional", "bundled", "workspace"] },
    protocol: { enum: ["npm", "workspace", "file", "git", "link", "catalog", "unknown"] },
  },
} as const;

export const ManifestCarrierSchema = {
  $id: "computing/manifest-carrier",
  title: "ManifestCarrier",
  description: "A host-neutral package manifest reading: identity, dependency intent, and declared surfaces.",
  type: "object",
  required: ["kind", "name", "dependencies", "exports", "bins"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.manifest-carrier" },
    name: idSchema,
    version: { type: "string" },
    description: { type: "string" },
    private: { type: "boolean" },
    packageManager: { type: "string" },
    moduleKind: { enum: ["module", "commonjs", "dual", "unknown"] },
    dependencies: { type: "array", items: dependencyRefSchema },
    exports: stringArraySchema,
    bins: stringArraySchema,
    mediaType: { type: "string" },
  },
} as const;

export type ManifestCarrier = FromSchema<typeof ManifestCarrierSchema>;
export const manifestCarrier = carrierFrom(ManifestCarrierSchema);

const binCommandSchema = {
  type: "object",
  required: ["name", "target"],
  additionalProperties: false,
  properties: {
    name: idSchema,
    target: idSchema,
    conditions: stringArraySchema,
  },
} as const;

export const BinSurfaceSchema = {
  $id: "computing/bin-surface",
  title: "BinSurface",
  description: "The executable command surface declared by a manifest, independent of the host launcher.",
  type: "object",
  required: ["kind", "packageName", "commands"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.bin-surface" },
    packageName: idSchema,
    commands: { type: "array", items: binCommandSchema },
    mediaType: { type: "string" },
  },
} as const;

export type BinSurface = FromSchema<typeof BinSurfaceSchema>;
export const binSurfaceCarrier = carrierFrom(BinSurfaceSchema);

const exportEntrySchema = {
  type: "object",
  required: ["specifier", "target"],
  additionalProperties: false,
  properties: {
    specifier: idSchema,
    target: idSchema,
    conditions: stringArraySchema,
    types: { type: "string" },
  },
} as const;

export const ExportSurfaceSchema = {
  $id: "computing/export-surface",
  title: "ExportSurface",
  description: "The importable module surface declared by a manifest, before any host resolver runs.",
  type: "object",
  required: ["kind", "packageName", "entries"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.export-surface" },
    packageName: idSchema,
    entries: { type: "array", items: exportEntrySchema },
    mediaType: { type: "string" },
  },
} as const;

export type ExportSurface = FromSchema<typeof ExportSurfaceSchema>;
export const exportSurfaceCarrier = carrierFrom(ExportSurfaceSchema);

const moduleImportSchema = {
  type: "object",
  required: ["specifier", "phase"],
  additionalProperties: false,
  properties: {
    specifier: idSchema,
    phase: { enum: ["static", "dynamic", "type"] },
    target: { type: "string" },
    optional: { type: "boolean" },
  },
} as const;

const moduleExportSchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: idSchema,
    source: { type: "string" },
    typeOnly: { type: "boolean" },
  },
} as const;

const moduleNodeSchema = {
  type: "object",
  required: ["id", "imports", "exports"],
  additionalProperties: false,
  properties: {
    id: idSchema,
    mediaType: { type: "string" },
    imports: { type: "array", items: moduleImportSchema },
    exports: { type: "array", items: moduleExportSchema },
  },
} as const;

const moduleEdgeSchema = {
  type: "object",
  required: ["from", "to", "kind"],
  additionalProperties: false,
  properties: {
    from: idSchema,
    to: idSchema,
    kind: { enum: ["import", "dynamic-import", "type-import", "reexport"] },
    specifier: { type: "string" },
  },
} as const;

export const ModuleGraphSchema = {
  $id: "computing/module-graph",
  title: "ModuleGraph",
  description: "A finite module graph as declarations and edges, with no filesystem or process dependency.",
  type: "object",
  required: ["kind", "modules", "edges", "roots"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.module-graph" },
    modules: { type: "array", items: moduleNodeSchema },
    edges: { type: "array", items: moduleEdgeSchema },
    roots: stringArraySchema,
  },
} as const;

export type ModuleGraph = FromSchema<typeof ModuleGraphSchema>;
export const moduleGraphCarrier = carrierFrom(ModuleGraphSchema);

const typeNodeSchema = {
  type: "object",
  required: ["id", "name", "kind"],
  additionalProperties: false,
  properties: {
    id: idSchema,
    name: idSchema,
    kind: { enum: ["primitive", "object", "array", "union", "intersection", "function", "reference", "unknown"] },
    carrier: { type: "string" },
    source: { type: "string" },
  },
} as const;

const typeEdgeSchema = {
  type: "object",
  required: ["from", "to", "relation"],
  additionalProperties: false,
  properties: {
    from: idSchema,
    to: idSchema,
    relation: { enum: ["extends", "implements", "uses", "returns", "accepts", "exports", "refines"] },
  },
} as const;

export const TypeGraphSchema = {
  $id: "computing/type-graph",
  title: "TypeGraph",
  description: "A finite type graph suitable for host-independent schema and declaration projection.",
  type: "object",
  required: ["kind", "types", "edges"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.type-graph" },
    types: { type: "array", items: typeNodeSchema },
    edges: { type: "array", items: typeEdgeSchema },
  },
} as const;

export type TypeGraph = FromSchema<typeof TypeGraphSchema>;
export const typeGraphCarrier = carrierFrom(TypeGraphSchema);

const tsConfigCompilerOptionsSchema = {
  type: "object",
  additionalProperties: true,
} as const;

export const TsConfigSchema = {
  $id: "computing/tsconfig",
  title: "TsConfig",
  description: "A host-neutral TypeScript project configuration reading, before invoking a compiler host.",
  type: "object",
  required: ["kind", "compilerOptions", "files", "include", "exclude", "references"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.tsconfig" },
    extends: { type: "string" },
    compilerOptions: tsConfigCompilerOptionsSchema,
    files: stringArraySchema,
    include: stringArraySchema,
    exclude: stringArraySchema,
    references: {
      type: "array",
      items: {
        type: "object",
        required: ["path"],
        additionalProperties: false,
        properties: { path: idSchema },
      },
    },
    mediaType: { type: "string" },
  },
} as const;

export type TsConfig = FromSchema<typeof TsConfigSchema>;
export const tsConfigCarrier = carrierFrom(TsConfigSchema);

import {
  binSurfaceCarrier,
  exportSurfaceCarrier,
  manifestCarrier,
  moduleGraphCarrier,
  tsConfigCarrier,
  type BinSurface,
  type ExportSurface,
  type ManifestCarrier,
  type ModuleGraph,
  type TsConfig,
  type TypeGraph,
} from "./host-neutral-carriers.mjs";

type JsonRecord = Readonly<Record<string, unknown>>;

const DEPENDENCY_FIELDS = Object.freeze([
  ["dependencies", "runtime"],
  ["devDependencies", "development"],
  ["peerDependencies", "peer"],
  ["optionalDependencies", "optional"],
  ["bundledDependencies", "bundled"],
] as const);

function recordValue(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function stringArray(value: unknown): readonly string[] {
  return Object.freeze(Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
}

function parseJsonObject(text: string, label: string): JsonRecord {
  const parsed = JSON.parse(text.replace(/^\uFEFF/u, "")) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError(`${label}: expected a JSON object`);
  }
  return parsed as JsonRecord;
}

type DependencyProtocol = NonNullable<ManifestCarrier["dependencies"][number]["protocol"]>;

function protocolOf(range: string | undefined): DependencyProtocol {
  if (range === undefined) return "unknown";
  if (range.startsWith("workspace:")) return "workspace";
  if (range.startsWith("file:")) return "file";
  if (range.startsWith("git+") || range.endsWith(".git")) return "git";
  if (range.startsWith("link:")) return "link";
  if (range.startsWith("catalog:")) return "catalog";
  return "npm";
}

export function decodePackageJsonManifest(text: string): ManifestCarrier {
  const manifest = parseJsonObject(text, "package.json");
  const name = stringValue(manifest.name).trim();
  if (name === "") throw new TypeError("package.json: name must be a non-empty string");
  const dependencies = DEPENDENCY_FIELDS.flatMap(([field, relationship]) =>
    Object.entries(recordValue(manifest[field]))
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([depName, range]) => ({
        name: depName,
        range,
        relationship,
        protocol: protocolOf(range),
      }))).sort((a, b) => a.name.localeCompare(b.name) || a.relationship.localeCompare(b.relationship));
  const carrier: ManifestCarrier = {
    kind: "computing.manifest-carrier",
    name,
    ...(typeof manifest.version === "string" ? { version: manifest.version } : {}),
    ...(typeof manifest.description === "string" ? { description: manifest.description } : {}),
    ...(typeof manifest.private === "boolean" ? { private: manifest.private } : {}),
    ...(typeof manifest.packageManager === "string" ? { packageManager: manifest.packageManager } : {}),
    moduleKind: manifest.type === "module" || manifest.type === "commonjs" ? manifest.type : "unknown",
    dependencies: Object.freeze(dependencies),
    exports: manifestExportSpecifiers(manifest.exports),
    bins: manifestBinNames(manifest.bin, name),
    mediaType: "application/vnd.npm.package+json",
  };
  return manifestCarrier.assert(carrier, "package.json manifest");
}

export function encodePackageJsonManifest(carrier: ManifestCarrier): string {
  const manifest: Record<string, unknown> = {
    name: carrier.name,
    ...(carrier.version === undefined ? {} : { version: carrier.version }),
    ...(carrier.description === undefined ? {} : { description: carrier.description }),
    ...(carrier.private === undefined ? {} : { private: carrier.private }),
    ...(carrier.packageManager === undefined ? {} : { packageManager: carrier.packageManager }),
    ...(carrier.moduleKind === undefined || carrier.moduleKind === "unknown" || carrier.moduleKind === "dual" ? {} : { type: carrier.moduleKind }),
    ...(carrier.exports.length === 0 ? {} : { exports: Object.fromEntries(carrier.exports.map((specifier) => [specifier, specifier])) }),
    ...(carrier.bins.length === 0 ? {} : { bin: Object.fromEntries(carrier.bins.map((name) => [name, name])) }),
  };
  for (const [field, relationship] of DEPENDENCY_FIELDS) {
    const entries = carrier.dependencies.filter((dep) => dep.relationship === relationship && dep.range !== undefined);
    if (entries.length > 0) {
      manifest[field] = Object.fromEntries(entries.map((dep) => [dep.name, dep.range]));
    }
  }
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function manifestBinSurface(manifest: ManifestCarrier, rawBin?: unknown): BinSurface {
  const commands = rawBin !== undefined && typeof rawBin === "object" && rawBin !== null && !Array.isArray(rawBin)
    ? Object.entries(rawBin as JsonRecord)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([name, target]) => ({ name, target, conditions: Object.freeze([] as string[]) }))
    : manifest.bins.map((name) => ({ name, target: typeof rawBin === "string" ? rawBin : name, conditions: Object.freeze([] as string[]) }));
  return binSurfaceCarrier.assert({
    kind: "computing.bin-surface",
    packageName: manifest.name,
    commands: Object.freeze([...commands].sort((a, b) => a.name.localeCompare(b.name))),
    mediaType: "application/vnd.npm.package-bin+json",
  }, "package.json bin surface");
}

export function manifestExportSurface(manifest: ManifestCarrier, rawExports?: unknown): ExportSurface {
  const entries = exportEntries(rawExports);
  return exportSurfaceCarrier.assert({
    kind: "computing.export-surface",
    packageName: manifest.name,
    entries: Object.freeze([...entries].sort((a, b) => a.specifier.localeCompare(b.specifier))),
    mediaType: "application/vnd.node.exports+json",
  }, "package.json export surface");
}

export function decodeTsConfigJson(text: string): TsConfig {
  const config = parseJsonObject(text, "tsconfig.json");
  const references = Array.isArray(config.references)
    ? config.references.flatMap((item) => {
      const path = recordValue(item).path;
      return typeof path === "string" ? [{ path }] : [];
    })
    : [];
  return tsConfigCarrier.assert({
    kind: "computing.tsconfig",
    ...(typeof config.extends === "string" ? { extends: config.extends } : {}),
    compilerOptions: recordValue(config.compilerOptions),
    files: stringArray(config.files),
    include: stringArray(config.include),
    exclude: stringArray(config.exclude),
    references: Object.freeze(references),
    mediaType: "application/vnd.typescript.tsconfig+json",
  }, "tsconfig.json");
}

export function encodeTsConfigJson(config: TsConfig): string {
  return `${JSON.stringify({
    ...(config.extends === undefined ? {} : { extends: config.extends }),
    compilerOptions: config.compilerOptions,
    ...(config.files.length === 0 ? {} : { files: config.files }),
    ...(config.include.length === 0 ? {} : { include: config.include }),
    ...(config.exclude.length === 0 ? {} : { exclude: config.exclude }),
    ...(config.references.length === 0 ? {} : { references: config.references }),
  }, null, 2)}\n`;
}

export function reflectModuleGraph(files: readonly { readonly id: string; readonly text: string }[], roots: readonly string[] = []): ModuleGraph {
  const modules = files.map((file) => {
    const imports = [...moduleImports(file.text)];
    const exports = [...moduleExports(file.text)];
    return Object.freeze({
      id: file.id,
      mediaType: mediaTypeOf(file.id),
      imports: Object.freeze(imports),
      exports: Object.freeze(exports),
    });
  });
  const edges = modules.flatMap((module) => module.imports.map((item) => Object.freeze({
    from: module.id,
    to: item.specifier,
    kind: item.phase === "dynamic" ? "dynamic-import" as const : item.phase === "type" ? "type-import" as const : "import" as const,
    specifier: item.specifier,
  })));
  return moduleGraphCarrier.assert({
    kind: "computing.module-graph",
    modules: Object.freeze(modules),
    edges: Object.freeze(edges),
    roots: Object.freeze([...roots]),
  }, "module graph");
}

export type BinStrategy = Readonly<{
  kind: "computing.bin-strategy";
  packageName: string;
  command: string;
  target: string;
  strategy: string;
  conditions: readonly string[];
}>;

export function binsAsStrategies(surface: BinSurface): readonly BinStrategy[] {
  return Object.freeze(surface.commands.map((command): BinStrategy => {
    const conditions = Object.freeze([...(command.conditions ?? [])]);
    return Object.freeze({
      kind: "computing.bin-strategy" as const,
      packageName: surface.packageName,
      command: command.name,
      target: command.target,
      strategy: `${surface.packageName}#${command.name}`,
      conditions,
    });
  }).sort((a, b) => a.command.localeCompare(b.command)));
}

export type TypeFlowReflection = Readonly<{
  kind: "computing.type-flow";
  nodes: readonly { readonly id: string; readonly name: string; readonly carrier?: string }[];
  edges: readonly { readonly from: string; readonly to: string; readonly relation: string }[];
  sources: readonly string[];
  sinks: readonly string[];
}>;

export function typeFlowReflection(graph: TypeGraph): TypeFlowReflection {
  const incoming = new Map(graph.types.map((type) => [type.id, 0]));
  const outgoing = new Map(graph.types.map((type) => [type.id, 0]));
  for (const edge of graph.edges) {
    outgoing.set(edge.from, (outgoing.get(edge.from) ?? 0) + 1);
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
  }
  return Object.freeze({
    kind: "computing.type-flow" as const,
    nodes: Object.freeze(graph.types.map((type) => Object.freeze({
      id: type.id,
      name: type.name,
      ...(type.carrier === undefined ? {} : { carrier: type.carrier }),
    }))),
    edges: Object.freeze(graph.edges.map((edge) => Object.freeze({ from: edge.from, to: edge.to, relation: edge.relation }))),
    sources: Object.freeze(graph.types.filter((type) => (incoming.get(type.id) ?? 0) === 0).map((type) => type.id)),
    sinks: Object.freeze(graph.types.filter((type) => (outgoing.get(type.id) ?? 0) === 0).map((type) => type.id)),
  });
}

export function manifestExportSpecifiers(raw: unknown): readonly string[] {
  if (typeof raw === "string") return Object.freeze(["."]);
  if (Array.isArray(raw)) return Object.freeze(raw.filter((item): item is string => typeof item === "string").sort());
  if (raw !== null && typeof raw === "object") return Object.freeze(Object.keys(raw).sort());
  return Object.freeze([]);
}

export function manifestBinNames(raw: unknown, packageName: string): readonly string[] {
  if (typeof raw === "string" && raw.trim() !== "") return Object.freeze([packageName]);
  if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) return Object.freeze(Object.keys(raw).sort());
  return Object.freeze([]);
}

function exportEntries(raw: unknown): readonly { readonly specifier: string; readonly target: string; readonly conditions: readonly string[]; readonly types?: string }[] {
  if (typeof raw === "string") return Object.freeze([{ specifier: ".", target: raw, conditions: Object.freeze([]) }]);
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return Object.freeze([]);
  return Object.freeze(Object.entries(raw as JsonRecord).flatMap(([specifier, value]) => {
    if (typeof value === "string") return [{ specifier, target: value, conditions: Object.freeze([]) }];
    if (value === null || typeof value !== "object" || Array.isArray(value)) return [];
    const record = value as JsonRecord;
    const target = typeof record.import === "string" ? record.import : typeof record.default === "string" ? record.default : typeof record.require === "string" ? record.require : undefined;
    if (target === undefined) return [];
    const types = typeof record.types === "string" ? record.types : undefined;
    const conditions = Object.keys(record).filter((key) => key !== "types").sort();
    return [{ specifier, target, conditions: Object.freeze(conditions), ...(types === undefined ? {} : { types }) }];
  }));
}

function* moduleImports(text: string): Iterable<{ readonly specifier: string; readonly phase: "static" | "dynamic" | "type"; readonly optional: boolean }> {
  const importRe = /import\s+(type\s+)?(?:[^"']+?\s+from\s*)?["']([^"']+)["']/gu;
  const exportRe = /export\s+(type\s+)?(?:\*|\{[^}]*\})\s+from\s*["']([^"']+)["']/gu;
  const dynamicRe = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu;
  for (const match of text.matchAll(importRe)) {
    const specifier = match[2];
    if (specifier !== undefined) yield { specifier, phase: match[1] === undefined ? "static" : "type", optional: false };
  }
  for (const match of text.matchAll(exportRe)) {
    const specifier = match[2];
    if (specifier !== undefined) yield { specifier, phase: match[1] === undefined ? "static" : "type", optional: false };
  }
  for (const match of text.matchAll(dynamicRe)) {
    const specifier = match[1];
    if (specifier !== undefined) yield { specifier, phase: "dynamic", optional: false };
  }
}

function* moduleExports(text: string): Iterable<{ readonly name: string; readonly typeOnly: boolean }> {
  const declarationRe = /export\s+(type\s+)?(?:declare\s+)?(?:async\s+)?(?:function|class|interface|type|const|let|var|enum)\s+([A-Za-z_$][\w$]*)/gu;
  const namedRe = /export\s+(type\s+)?\{([^}]+)\}/gu;
  for (const match of text.matchAll(declarationRe)) {
    const name = match[2];
    if (name !== undefined) yield { name, typeOnly: match[1] !== undefined };
  }
  for (const match of text.matchAll(namedRe)) {
    const typeOnly = match[1] !== undefined;
    for (const part of (match[2] ?? "").split(",")) {
      const name = part.trim().replace(/^type\s+/u, "").split(/\s+as\s+/u)[0]?.trim();
      if (name !== undefined && name !== "") yield { name, typeOnly };
    }
  }
}

function mediaTypeOf(file: string): string {
  if (file.endsWith(".d.mts") || file.endsWith(".d.ts")) return "text/vnd.typescript.declaration";
  if (file.endsWith(".mts") || file.endsWith(".ts") || file.endsWith(".tsx")) return "text/vnd.typescript";
  if (file.endsWith(".mjs") || file.endsWith(".js")) return "text/javascript";
  return "text/plain";
}

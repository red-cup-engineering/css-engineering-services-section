// source-roll - configured newscable intake plus local wire-store evidence.
//
// A publication may classify its sources editorially, but the roll itself is
// cable substrate: read the newscable config, resolve each wire's local store,
// and report what configured sources and stored evidence exist.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { requireJsonValue } from "@red-cup-engineering/relating/codecs";
import { DEFAULT_WIRE_STORE, NEWSCABLE_CONFIG_BLOCK, assertNewscableBlock } from "./discovery.mjs";

export const SourceRollSourceSchema = { $id: "producing-content/cable/source-roll/source", title: "SourceRollSource", additionalProperties: false, type: "object", required: ["kind", "wire", "beat", "adapter", "sourceKind", "sourceClass", "editorialRole", "wireItemCount"], properties: { kind: { const: "producing-content.source-roll.source" }, wire: { minLength: 1, type: "string" }, beat: { minLength: 1, type: "string" }, adapter: { minLength: 1, type: "string" }, url: { type: "string" }, query: { type: "string" }, domain: { type: "string" }, max: { type: "number" }, sourceKind: { minLength: 1, type: "string" }, sourceClass: { minLength: 1, type: "string" }, editorialRole: { minLength: 1, type: "string" }, wireItemCount: { type: "number" }, latestWireItemAt: { type: "string" } } } as const;

export const SourceRollWireSchema = { $id: "producing-content/cable/source-roll/wire", title: "SourceRollWire", additionalProperties: false, type: "object", required: ["kind", "name", "title", "sourceCount", "wireItemCount", "sources"], properties: { kind: { const: "producing-content.source-roll.wire" }, name: { minLength: 1, type: "string" }, title: { minLength: 1, type: "string" }, description: { type: "string" }, sourceCount: { type: "number" }, wireItemCount: { type: "number" }, latestWireItemAt: { type: "string" }, sources: { type: "array", items: SourceRollSourceSchema } } } as const;

export const SourceRollSchema = { $id: "producing-content/cable/source-roll", title: "CableSourceRoll", additionalProperties: false, type: "object", required: ["kind", "configPath", "generatedAt", "wireCount", "sourceCount", "wireItemCount", "wires", "byClass", "bySourceKind", "constraints"], properties: { kind: { const: "producing-content.source-roll" }, configPath: { minLength: 1, type: "string" }, generatedAt: { minLength: 1, type: "string" }, wireCount: { type: "number" }, sourceCount: { type: "number" }, wireItemCount: { type: "number" }, wires: { type: "array", items: SourceRollWireSchema }, byClass: { type: "object", additionalProperties: { type: "number" } }, bySourceKind: { type: "object", additionalProperties: { type: "number" } }, constraints: { type: "array", items: { type: "string" } } } } as const;

export type SourceRollSource = FromSchema<typeof SourceRollSourceSchema>;
export type SourceRollWire = FromSchema<typeof SourceRollWireSchema>;
export type SourceRollReading = Readonly<{
  kind: "producing-content.source-roll";
  configPath: string;
  generatedAt: string;
  wireCount: number;
  sourceCount: number;
  wireItemCount: number;
  wires: readonly SourceRollWire[];
  byClass: Readonly<Record<string, number>>;
  bySourceKind: Readonly<Record<string, number>>;
  constraints: readonly string[];
}>;

export const sourceRollCarrier = carrierFrom(SourceRollSchema);

export const sourceRollSourceCarrier = carrierFrom(SourceRollSourceSchema);

export const sourceRollWireCarrier = carrierFrom(SourceRollWireSchema);

export type SourceRollClassification = Readonly<{
  sourceKind: string;
  sourceClass: string;
  editorialRole: string;
}>;

export type SourceRollClassifier = (input: Readonly<{
  wire: string;
  source: Readonly<Record<string, unknown>>;
  domain?: string;
}>) => SourceRollClassification;

export type SourceRollOptions = Readonly<{
  configPath: string;
  now?: () => string;
  classify?: SourceRollClassifier;
  constraints?: readonly string[];
}>;

type JsonRecord = Record<string, unknown>;

const DEFAULT_CLASSIFICATION: SourceRollClassification = Object.freeze({
  sourceKind: "unknown",
  sourceClass: "unknown",
  editorialRole: "Configured intake source; classification has not been curated yet.",
});

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
}

function optionalText(value: unknown): string | undefined {
  const string = text(value);
  return string === "" ? undefined : string;
}

function optionalInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

function domainOf(url: string | undefined): string | undefined {
  if (url === undefined) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }
}

function readConfig(configPath: string): JsonRecord {
  const parsed = JSON.parse(readFileSync(configPath, "utf8")) as unknown;
  if (!isRecord(parsed)) throw new TypeError("source roll config must be a JSON object");
  const block = parsed[NEWSCABLE_CONFIG_BLOCK];
  if (block !== undefined) assertNewscableBlock(block);
  return parsed;
}

function wireStoreStats(storeDir: string): Readonly<{ count: number; latestAt?: string }> {
  if (!existsSync(storeDir)) return Object.freeze({ count: 0 });
  let count = 0;
  let latest = 0;
  for (const entry of readdirSync(storeDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    count += 1;
    const mtime = statSync(join(storeDir, entry.name)).mtimeMs;
    if (mtime > latest) latest = mtime;
  }
  return Object.freeze({
    count,
    ...(latest === 0 ? {} : { latestAt: new Date(latest).toISOString() }),
  });
}

function increment(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

export function sourceRollSource(input: SourceRollSource): SourceRollSource {
  return sourceRollSourceCarrier.assert(input, "source roll source");
}

export function sourceRollWire(input: Omit<SourceRollWire, "sources"> & Readonly<{
  sources: readonly SourceRollSource[];
}>): SourceRollWire {
  return sourceRollWireCarrier.assert({
    ...input,
    sources: input.sources.map((source) => sourceRollSource(source)),
  }, "source roll wire");
}

export function sourceRollReading(options: SourceRollOptions): SourceRollReading {
  const configPath = options.configPath;
  const config = readConfig(configPath);
  const cable = isRecord(config[NEWSCABLE_CONFIG_BLOCK]) ? config[NEWSCABLE_CONFIG_BLOCK] : {};
  const cableDir = dirname(resolve(configPath));
  const rawWires = Array.isArray(cable["wires"]) ? cable["wires"] : [];
  const byClass: Record<string, number> = {};
  const bySourceKind: Record<string, number> = {};
  const classify = options.classify ?? (() => DEFAULT_CLASSIFICATION);
  const wires = rawWires.flatMap((rawWire): SourceRollWire[] => {
    if (!isRecord(rawWire)) return [];
    const name = text(rawWire["name"], "unnamed-wire");
    const storeDir = resolve(cableDir, text(rawWire["store"], join(DEFAULT_WIRE_STORE, name)));
    const store = wireStoreStats(storeDir);
    const rawSources = Array.isArray(rawWire["sources"]) ? rawWire["sources"] : [];
    const sources = rawSources.flatMap((rawSource): SourceRollSource[] => {
      if (!isRecord(rawSource)) return [];
      const url = optionalText(rawSource["url"]);
      const query = optionalText(rawSource["query"]);
      const domain = domainOf(url);
      const classification = classify({ wire: name, source: rawSource, ...(domain === undefined ? {} : { domain }) });
      increment(byClass, classification.sourceClass);
      increment(bySourceKind, classification.sourceKind);
      return [sourceRollSource({
        kind: "producing-content.source-roll.source" as const,
        wire: name,
        beat: name,
        adapter: text(rawSource["adapter"], "unknown"),
        ...(url === undefined ? {} : { url }),
        ...(query === undefined ? {} : { query }),
        ...(domain === undefined ? {} : { domain }),
        ...(optionalInteger(rawSource["max"]) === undefined ? {} : { max: optionalInteger(rawSource["max"])! }),
        sourceKind: classification.sourceKind,
        sourceClass: classification.sourceClass,
        editorialRole: classification.editorialRole,
        wireItemCount: store.count,
        ...(store.latestAt === undefined ? {} : { latestWireItemAt: store.latestAt }),
      })];
    });
    return [sourceRollWire({
      kind: "producing-content.source-roll.wire" as const,
      name,
      title: text(rawWire["title"], name),
      ...(optionalText(rawWire["description"]) === undefined ? {} : { description: optionalText(rawWire["description"])! }),
      sourceCount: sources.length,
      wireItemCount: store.count,
      ...(store.latestAt === undefined ? {} : { latestWireItemAt: store.latestAt }),
      sources: [...sources],
    })];
  });
  const reading: SourceRollReading = Object.freeze({
    kind: "producing-content.source-roll" as const,
    configPath,
    generatedAt: (options.now ?? (() => new Date().toISOString()))(),
    wireCount: wires.length,
    sourceCount: wires.reduce((sum, wire) => sum + wire.sourceCount, 0),
    wireItemCount: wires.reduce((sum, wire) => sum + wire.wireItemCount, 0),
    wires: [...wires],
    byClass: Object.freeze(byClass),
    bySourceKind: Object.freeze(bySourceKind),
    constraints: [...(options.constraints ?? [
      "This is configured intake, not an endorsement of every item a source publishes.",
      "The wire store is append-only and idempotent; present counts describe locally owned evidence bundles.",
    ])],
  });
  sourceRollCarrier.assert(reading, "producing-content source roll");
  return reading;
}

export function sourceRollSourceTerm(input: SourceRollSource): Tm {
  return carrierToTerm(requireJsonValue(sourceRollSourceCarrier.assert(input), "producing-content source roll source"));
}

export function sourceRollWireTerm(input: SourceRollWire): Tm {
  return carrierToTerm(requireJsonValue(sourceRollWireCarrier.assert(input), "producing-content source roll wire"));
}

export function sourceRollTerm(input: SourceRollReading): Tm {
  return carrierToTerm(requireJsonValue(sourceRollCarrier.assert(input), "producing-content source roll"));
}

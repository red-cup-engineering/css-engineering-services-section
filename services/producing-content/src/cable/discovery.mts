// A newscable instance AGGREGATES its newswire instances: the cable config's
// `newscable` block carries the wires as config, and the cable reads them from
// there. No sibling-package scan, no per-wire package â€” the wire list IS part
// of the cable's own config.
//
// Each entry of the block's `wires` array is one newswire: its `name` (a
// lowercase atom, validated against news-topology's wire-name law via
// wireBaseUrl), its masthead (`title`, `description`, optional `author`,
// `keyword`), its `sources` (for ingested wires), and its store directory â€”
// `store` (default "store/<name>"), resolved against the cable package. The
// wire's baseUrl is the cable's routing projection of its name. Wires are
// sorted by name, so /cable.json is stable. The cable's name is the domain's
// first label (filum.561.group â†’ "filum"). TypeError is the only throw, for
// malformed shapes only.

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/writing";
import { wireBaseUrl, type CableRouting } from "../topology/news/index.mjs";

import { createNewswire, type Newswire, type NewswireAuthor, type RenderDocument } from "./wire.mjs";

/** The first-class config key the cable block lives under outside manifests. */
export const NEWSCABLE_CONFIG_BLOCK = "newscable";

/** A wire's store directory, relative to the cable package, by default base. */
export const DEFAULT_WIRE_STORE = "store";

export const NewswireAuthorSchema = { $id: "producing-content/cable/newswire/author", title: "NewswireAuthor", anyOf: [{ minLength: 1, type: "string" }, { title: "NewswireAuthorObject", additionalProperties: false, type: "object", required: ["name"], properties: { name: { minLength: 1, type: "string" }, url: { minLength: 1, type: "string" } } }] } as const;

export const NewswireConfigSchema = { $id: "producing-content/cable/newswire/config", title: "NewswireConfig", additionalProperties: false, type: "object", required: ["name", "title", "description"], properties: { name: { minLength: 1, pattern: "^[a-z0-9]+(-[a-z0-9]+)*$", type: "string" }, title: { minLength: 1, type: "string" }, description: { minLength: 1, type: "string" }, author: NewswireAuthorSchema, keyword: { minLength: 1, type: "string" }, store: { minLength: 1, type: "string" }, sources: { type: "array", items: { type: "object", additionalProperties: {} } } } } as const;

export const CableRoutingSchema = { $id: "producing-content/cable/routing", title: "CableRouting", anyOf: [{ const: "subdomain" }, { const: "subfolder" }] } as const;

export const NewscableSiteConfigSchema = { $id: "producing-content/cable/newscable/config", title: "NewscableSiteConfig", additionalProperties: false, type: "object", required: ["kind", "name", "title", "description", "port", "domain", "routing", "wires"], properties: { kind: { const: "producing-content.newscable.config" }, name: { minLength: 1, type: "string" }, title: { minLength: 1, type: "string" }, description: { minLength: 1, type: "string" }, port: { minimum: 0, maximum: 65535, type: "integer" }, domain: { minLength: 1, pattern: "^[a-z0-9]+([.-][a-z0-9]+)*$", type: "string" }, routing: CableRoutingSchema, routingPrefix: { minLength: 1, pattern: "^[a-z0-9]+(-[a-z0-9]+)*$", type: "string" }, wires: { type: "array", items: NewswireConfigSchema } } } as const;

export type NewswireAuthorCarrier = FromSchema<typeof NewswireAuthorSchema>;
export type NewswireConfigCarrier = FromSchema<typeof NewswireConfigSchema>;
export type NewscableSiteConfigCarrier = FromSchema<typeof NewscableSiteConfigSchema>;

/** A wire's masthead + sources + store, minus its name. */
export type NewswireBlock = Readonly<{
  title: string;
  description: string;
  author?: NewswireAuthor;
  keyword?: string;
  /** Store directory relative to the cable package (default "store/<name>"). */
  store?: string;
  /** Syndication sources to ingest into this wire's store. */
  sources?: readonly Record<string, unknown>[];
}>;

/**
 * One newswire instance, as configured inside the cable's newscable.wires.
 * `name` is the wire's lowercase atom; the rest is its masthead, sources, and
 * store. The store defaults to "store/<name>" under the cable package.
 */
export type NewswireConfig = NewswireBlock & Readonly<{ name: string }>;

export type NewscableSiteConfig = Readonly<{
  kind: "producing-content.newscable.config";
  /** The cable's name: the domain's first label. */
  name: string;
  title: string;
  description: string;
  /** The port the one listener binds (0 means ephemeral). */
  port: number;
  domain: string;
  routing: CableRouting;
  /** For subfolder routing only: a single path segment inserted before the wire name. */
  routingPrefix?: string;
  /** The wires this cable aggregates, in config. */
  wires: readonly NewswireConfig[];
}>;

export const newswireConfigCarrier = carrierFrom(NewswireConfigSchema);

export const newscableSiteConfigCarrier = carrierFrom(NewscableSiteConfigSchema);

export function newswireConfig(input: NewswireConfig): NewswireConfig {
  return newswireConfigCarrier.assert({
    ...input,
    ...(input.sources === undefined ? {} : { sources: input.sources.map((source) => ({ ...source })) }),
  }, "newswire config") as NewswireConfig;
}

export function newscableSiteConfig(input: Omit<NewscableSiteConfig, "kind" | "wires"> & Readonly<{
  wires: readonly NewswireConfig[];
}>): NewscableSiteConfig {
  return newscableSiteConfigCarrier.assert({
    kind: "producing-content.newscable.config" as const,
    ...input,
    wires: input.wires.map((wire) => newswireConfig(wire)),
  }, "newscable site config") as NewscableSiteConfig;
}

export function newswireConfigTerm(input: NewswireConfig): Tm {
  return carrierToTerm(jsonResource(newswireConfig(input), "newswire config"));
}

export function newscableSiteConfigTerm(input: NewscableSiteConfig): Tm {
  return carrierToTerm(jsonResource(newscableSiteConfigCarrier.assert(input), "newscable site config"));
}

const DOMAIN_PATTERN = /^[a-z0-9]+([.-][a-z0-9]+)*$/;

const ROUTING_PREFIX_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** A wire name: lowercase atoms joined by hyphens (collapse-climate, rete-agentium). */
const WIRE_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Validate a newscable block: title, description, port, domain, routing, routingPrefix?. */
export function assertNewscableBlock(
  value: unknown,
): asserts value is Omit<NewscableSiteConfig, "kind" | "name"> {
  if (value === null || typeof value !== "object") {
    throw new TypeError("cable block must be an object");
  }
  const block = value as Record<string, unknown>;
  for (const key of ["title", "description"]) {
    if (typeof block[key] !== "string" || (block[key] as string).length === 0) {
      throw new TypeError(`cable.${key} must be a non-empty string`);
    }
  }
  if (
    typeof block.port !== "number" ||
    !Number.isSafeInteger(block.port) ||
    block.port < 0 ||
    block.port > 65535
  ) {
    throw new TypeError("cable.port must be an integer in [0, 65535]");
  }
  if (typeof block.domain !== "string" || !DOMAIN_PATTERN.test(block.domain)) {
    throw new TypeError(`cable.domain must be a bare domain (got ${String(block.domain)})`);
  }
  if (block.routing !== "subdomain" && block.routing !== "subfolder") {
    throw new TypeError('cable.routing must be "subdomain" or "subfolder"');
  }
  if (block.routingPrefix !== undefined) {
    if (block.routing !== "subfolder") {
      throw new TypeError("cable.routingPrefix is only valid with subfolder routing");
    }
    if (typeof block.routingPrefix !== "string" || !ROUTING_PREFIX_PATTERN.test(block.routingPrefix)) {
      throw new TypeError(`cable.routingPrefix must be a lowercase atom (got ${String(block.routingPrefix)})`);
    }
  }
  if (!Array.isArray(block.wires)) {
    throw new TypeError("cable.wires must be an array");
  }
  const seen = new Set<string>();
  for (const wire of block.wires) {
    if (wire === null || typeof wire !== "object") {
      throw new TypeError("cable.wires entries must be objects");
    }
    const name = (wire as Record<string, unknown>).name;
    if (typeof name !== "string" || !WIRE_NAME_PATTERN.test(name)) {
      throw new TypeError(`wire.name must be a lowercase atom (got ${String(name)})`);
    }
    if (seen.has(name)) {
      throw new TypeError(`duplicate wire name on the cable: ${name}`);
    }
    seen.add(name);
    assertNewswireBlock(wire);
  }
}

/** Validate a newswire block: title, description, author?, keyword?, store?. */
export function assertNewswireBlock(value: unknown): asserts value is NewswireBlock {
  if (value === null || typeof value !== "object") {
    throw new TypeError("newswire block must be an object");
  }
  const block = value as Record<string, unknown>;
  for (const key of ["title", "description"]) {
    if (typeof block[key] !== "string" || (block[key] as string).length === 0) {
      throw new TypeError(`newswire.${key} must be a non-empty string`);
    }
  }
  for (const key of ["keyword", "store"]) {
    if (block[key] !== undefined && (typeof block[key] !== "string" || (block[key] as string).length === 0)) {
      throw new TypeError(`newswire.${key} must be a non-empty string when present`);
    }
  }
  if (block.author !== undefined && typeof block.author !== "string") {
    const author = block.author as Record<string, unknown> | null;
    if (author === null || typeof author !== "object" || typeof author.name !== "string") {
      throw new TypeError("newswire.author must be a string or { name, url? }");
    }
  }
  if (block.sources !== undefined && !Array.isArray(block.sources)) {
    throw new TypeError("newswire.sources must be an array when present");
  }
}

async function readManifest(path: string): Promise<Record<string, unknown>> {
  let manifest: unknown;
  try {
    manifest = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new TypeError(
      `manifest is not readable JSON: ${path} (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  if (manifest === null || typeof manifest !== "object") {
    throw new TypeError(`manifest must be a JSON object: ${path}`);
  }
  return manifest as Record<string, unknown>;
}

/**
 * Read a cable config document and project out its newscable block, with the
 * cable's name derived as the domain's first label.
 */
export async function readNewscableSiteConfig(configPath: string): Promise<NewscableSiteConfig> {
  const absolute = resolve(configPath);
  const document = await readManifest(absolute);
  const block = document[NEWSCABLE_CONFIG_BLOCK];
  if (block === undefined) {
    throw new TypeError(`config has no "${NEWSCABLE_CONFIG_BLOCK}" block: ${absolute}`);
  }
  assertNewscableBlock(block);
  const name = block.domain.split(".")[0] as string;
  return newscableSiteConfig({
    name,
    ...block,
    ...(block.routingPrefix === undefined ? {} : { routingPrefix: block.routingPrefix }),
  });
}

/**
 * Aggregate the cable's wires from its own config: each entry of the
 * newscable.wires array becomes a Newswire, with its baseUrl from the
 * cable's routing projection and its store resolved under the cable package
 * (`store/<name>` by default). Sorted by name, so /cable.json is stable.
 */
export function aggregateWires(
  configPath: string,
  cable: Pick<NewscableSiteConfig, "domain" | "routing" | "routingPrefix" | "wires">,
  onSkip: (message: string) => void = () => {},
  render?: RenderDocument,
): readonly Newswire[] {
  const cableDir = dirname(resolve(configPath));
  const wires = cable.wires.map((wire) =>
    createNewswire({
      name: wire.name,
      baseUrl: wireBaseUrl(cable, wire.name), // enforces the wire-name law: TypeError otherwise
      definition: Object.freeze({
        title: wire.title,
        description: wire.description,
        ...(wire.author === undefined ? {} : { author: wire.author }),
        ...(wire.keyword === undefined ? {} : { keyword: wire.keyword }),
      }),
      storeDir: resolve(cableDir, wire.store ?? join(DEFAULT_WIRE_STORE, wire.name)),
      onSkip,
      ...(render === undefined ? {} : { render }),
    }),
  );
  return Object.freeze([...wires].sort((a, b) => a.name.localeCompare(b.name)));
}

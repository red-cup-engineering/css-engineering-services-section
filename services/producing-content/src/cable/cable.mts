// The newscable: a NEW thing whose data IS newswires.
//
// Vocabulary, in the literal electrical sense: a cable is a bundle of
// individually insulated wires sharing a common sheath. The cable's data is
// the wire objects themselves â€” it holds no stores and no wire state; each
// wire keeps its identity, its insulation being its namespace in URL space.
// The cable does exactly two things: it inverts the routing projection
// (news-topology's routeRequest â€” one of the two projections of the product
// (cable Ã— wire) into URL space) and delegates each wire request to the
// owning wire's handle; and it publishes the sheath surfaces â€” the HTML
// index, /cable.json (the agent-readable directory, built by asking each
// wire to describe itself), /robots.txt, and /sitemap.xml (built by asking
// each wire for its items). It never reaches into a wire's store.
//
// Web-free: the sheath surfaces use @emsenn's pure feed codecs, and the index
// document shell is the injected `render` (the same one the wires use).
//
// Laws, inherited from the carrier: wire names are lowercase atoms, names
// are unique on the cable, and every wire's baseUrl is exactly the cable's
// projection of it (wireBaseUrl) â€” a wire bundled under a different base is
// a malformed cable, TypeError. TypeError is the only throw.

import {
  assertNewsCable,
  cableBaseUrl,
  routeRequest,
  wireBaseUrl,
  type CableRouting,
  type NewsCable,
} from "../topology/news/index.mjs";
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/writing";
import { escapeHtml, robots, sitemap, type SitemapUrl } from "../codecs/feed.mjs";

import { CableRoutingSchema } from "./discovery.mjs";
import {
  htmlPage,
  newswireDescription,
  NewswireDescriptionSchema,
  type Newswire,
  type NewswireDescription,
  type RenderDocument,
  type WireSurface,
} from "./wire.mjs";

export type NewscableOptions = Readonly<{
  /** The cable's name. */
  name: string;
  /** The sheath's masthead title. */
  title: string;
  /** The sheath's masthead description. */
  description: string;
  /** The apex domain the routing projects under (no scheme, no slash). */
  domain: string;
  routing: CableRouting;
  /** For subfolder routing only: a single path segment inserted before the wire name. */
  routingPrefix?: string;
  /** The cable's data: the wires themselves. */
  wires: readonly Newswire[];
  /** When set, the sheath index renders through this injected document shell. */
  render?: RenderDocument;
}>;

/** /cable.json â€” the agent-readable directory of the whole cable. */
export const CableDirectorySchema = { $id: "producing-content/cable/newscable/directory", title: "CableDirectory", additionalProperties: false, type: "object", required: ["kind", "name", "title", "description", "domain", "routing", "wires"], properties: { kind: { const: "producing-content.newscable.directory" }, name: { minLength: 1, type: "string" }, title: { minLength: 1, type: "string" }, description: { minLength: 1, type: "string" }, domain: { minLength: 1, type: "string" }, routing: CableRoutingSchema, wires: { type: "array", items: NewswireDescriptionSchema } } } as const;

export type CableDirectory = FromSchema<typeof CableDirectorySchema>;

export const cableDirectoryCarrier = carrierFrom(CableDirectorySchema);

export function cableDirectory(input: Omit<CableDirectory, "kind" | "wires"> & Readonly<{
  wires: readonly NewswireDescription[];
}>): CableDirectory {
  return cableDirectoryCarrier.assert({
    kind: "producing-content.newscable.directory" as const,
    ...input,
    wires: input.wires.map((wire) => newswireDescription(wire)),
  }, "cable directory");
}

export function cableDirectoryTerm(input: CableDirectory): Tm {
  return carrierToTerm(jsonResource(cableDirectoryCarrier.assert(input), "cable directory"));
}

export type Newscable = Readonly<{
  name: string;
  title: string;
  description: string;
  domain: string;
  routing: CableRouting;
  wires: readonly Newswire[];
  /** The cable's own base URL: the index and /cable.json live here. */
  baseUrl: string;
  /** The /cable.json document: every wire's description, in wire order. */
  directory(): Promise<CableDirectory>;
  /**
   * Serve one request: invert the routing projection over (host, path),
   * delegate wire requests to the owning wire, answer sheath surfaces
   * (`/`, `/cable.json`, `/robots.txt`, `/sitemap.xml`) directly, and 404
   * everything else as plain text.
   */
  handle(host: string, path: string): Promise<WireSurface>;
}>;

function notFound(path: string): WireSurface {
  return Object.freeze({
    status: 404,
    headers: Object.freeze({ "content-type": "text/plain; charset=utf-8" }),
    body: `not found: ${path}\n`,
  });
}

function jsonSurface(value: unknown): WireSurface {
  return Object.freeze({
    status: 200,
    headers: Object.freeze({ "content-type": "application/json; charset=utf-8" }),
    body: `${JSON.stringify(value, null, 2)}\n`,
  });
}

/** The sheath index: the cable's wires, with links into each. */
function sheathIndexHtml(options: NewscableOptions, directoryUrl: string): string {
  const wires = options.wires
    .map(
      (wire) =>
        `  <li><a href="${escapeHtml(wire.baseUrl)}">${escapeHtml(wire.definition.title)}</a> â€” ${escapeHtml(wire.definition.description)}</li>`,
    )
    .join("\n");
  const content = `<h1>${escapeHtml(options.title)}</h1>
<p>${escapeHtml(options.description)}</p>
<ul class="feed">
${wires}
</ul>
<p><a href="${escapeHtml(directoryUrl)}">cable.json</a> â€” the agent-readable directory.</p>`;
  return htmlPage(options.title, content, {
    description: options.description,
    siteName: options.title,
    ...(options.render === undefined ? {} : { render: options.render }),
  });
}

/**
 * Bundle wires into a cable. The wires are the cable's data: the cable adds
 * only the sheath (routing inversion, index, directory, robots, sitemap).
 */
export function createNewscable(options: NewscableOptions): Newscable {
  for (const key of ["title", "description"] as const) {
    if (typeof options[key] !== "string" || options[key].length === 0) {
      throw new TypeError(`cable.${key} must be a non-empty string`);
    }
  }
  // The carrier: the cable as news-topology states it. assertNewsCable
  // enforces the name, domain, routing, and wire-name laws (including
  // uniqueness) in one place.
  const carrier: NewsCable = Object.freeze({
    name: options.name,
    domain: options.domain,
    routing: options.routing,
    ...(options.routingPrefix === undefined ? {} : { routingPrefix: options.routingPrefix }),
    wires: Object.freeze(
      options.wires.map((wire) =>
        Object.freeze({
          name: wire.name,
          title: wire.definition.title,
          description: wire.definition.description,
          ...(wire.definition.author === undefined ? {} : { author: wire.definition.author }),
          store: wire.storeDir,
          ...(wire.definition.keyword === undefined ? {} : { keyword: wire.definition.keyword }),
        }),
      ),
    ),
  });
  assertNewsCable(carrier);
  for (const wire of options.wires) {
    const projected = wireBaseUrl(carrier, wire.name);
    if (wire.baseUrl !== projected) {
      throw new TypeError(
        `wire ${wire.name}: baseUrl ${wire.baseUrl} is not the cable's projection ${projected}`,
      );
    }
  }
  const wires = Object.freeze([...options.wires]);
  const baseUrl = cableBaseUrl(carrier);
  const byName = new Map(wires.map((wire) => [wire.name, wire]));

  async function directory(): Promise<CableDirectory> {
    const descriptions: NewswireDescription[] = [];
    for (const wire of wires) descriptions.push(await wire.describe());
    return cableDirectory({
      name: options.name,
      title: options.title,
      description: options.description,
      domain: options.domain,
      routing: options.routing,
      wires: descriptions,
    });
  }

  async function sheath(subPath: string): Promise<WireSurface> {
    if (subPath === "/") {
      return Object.freeze({
        status: 200,
        headers: Object.freeze({ "content-type": "text/html; charset=utf-8" }),
        body: sheathIndexHtml({ ...options, wires }, `${baseUrl}cable.json`),
      });
    }
    if (subPath === "/cable.json") return jsonSurface(await directory());
    if (subPath === "/robots.txt") {
      return Object.freeze({
        status: 200,
        headers: Object.freeze({ "content-type": "text/plain; charset=utf-8" }),
        body: robots(`${baseUrl}sitemap.xml`),
      });
    }
    if (subPath === "/sitemap.xml") {
      const urls: SitemapUrl[] = [];
      for (const wire of wires) {
        for (const item of await wire.items()) {
          urls.push({
            loc: `${wire.baseUrl}items/${item.subject}`,
            ...(item.updated === undefined ? {} : { lastmod: item.updated }),
          });
        }
      }
      return Object.freeze({
        status: 200,
        headers: Object.freeze({ "content-type": "application/xml; charset=utf-8" }),
        body: sitemap(urls),
      });
    }
    return notFound(subPath);
  }

  return Object.freeze({
    name: options.name,
    title: options.title,
    description: options.description,
    domain: options.domain,
    routing: options.routing,
    wires,
    baseUrl,
    directory,
    async handle(host: string, path: string): Promise<WireSurface> {
      const route = routeRequest(carrier, host, path);
      if (route.kind === "sheath") return sheath(route.subPath);
      const wire = byName.get(route.name);
      if (wire === undefined) return notFound(path); // unreachable: routeRequest only names the carrier's wires
      return (await wire.handle(route.subPath)) ?? notFound(route.subPath);
    },
  });
}

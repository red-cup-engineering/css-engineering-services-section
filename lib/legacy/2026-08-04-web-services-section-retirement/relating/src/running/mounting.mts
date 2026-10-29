/**
 * acting/mounting — the carrier-node mounting layer: a four-faced apex at every
 * carrier `$id`-node of a served subtree.
 *
 * `routeManifold`/`tileManifold` tile mounts by *module tail* — a consumer mounts
 * under whatever produces its domain carrier, so the URL spells the data-flow
 * composition. This layer generalizes that: it addresses each mount by the carrier
 * node its domain acts ON, mounting at the carrier's bare `$id` descent path (the
 * `$id` IS the path; refactor decision #1). Every carrier node then gets the four
 * faces — `GET /`, `GET /:verb`, `POST /:verb`, `GET /openapi.json`, `POST /mcp`,
 * `GET /health`, `GET /discovery` — for free, because routing delegates to the
 * existing `routeRequest` at the node's base path with NO per-node hand-wiring.
 *
 * The "carrier $id a mount acts on" is read from its actions' domain carrier ids
 * (the same `$id` match `tileManifold` already uses). A mount with no resolvable
 * domain carrier (a pure source) falls back to the existing module-tail placement
 * via `tileManifold`, so there is no regression: carrier-node match → mount at the
 * `$id` path; else → module-tail path. Both kinds coexist in one map.
 *
 * Everything here is additive and pure. The live HTTP binding lives in
 * `services/http/server`.
 */
import { induceBins, type InducedBins } from "./induce.mjs";
import { escapeHtml } from "@red-cup-engineering/html-file-codec-service/string-rendering";
import type { SchemaRegistry } from "../carriers/kernel/registry.mjs";
import {
  consumedIds,
  feeds,
  html,
  producedIds,
  routeRequest,
  routeRequestAsync,
  text,
  tileManifold,
  type ManifoldMount,
  type ServedRequest,
  type ServedResponse,
  type ServeOptions,
} from "./serving.mjs";

/** A carrier-node mount: a guest apex plus the carrier `$id` its domain acts on. */
export interface CarrierMount {
  /** Package or module name, used in the index and module-tail fallback map. */
  readonly name: string;
  /** The action apex projected at this carrier node. */
  readonly induced: InducedBins;
  /**
   * The carrier `$id`-path this mount mounts at, usually its domain carrier.
   * When omitted, it is derived from the mount's action domain slots.
   */
  readonly nodeId?: string;
}

/** One node of the namespace tree: a carrier `$id`-path and the mounts at it. */
export interface CarrierNode {
  /** Bare descent path, for example `relating/articulating/utterance`. */
  readonly id: string;
  /** URL base for this node, equal to `/${id}`. */
  readonly path: string;
  /** Guest apices mounted at this carrier node. */
  readonly mounts: readonly CarrierMount[];
  /** True when at least one mounted apex is a self-loop at this carrier. */
  readonly endo: boolean;
}

/** The mount's domain carrier `$id` — the node it mounts at. Deterministic
 *  (first by sort) when several domain carriers are referenced. Undefined for a
 *  pure source (no domain `$ref`). */
export function domainNodeOf(induced: InducedBins): string | undefined {
  for (const act of induced.actions) {
    const id = act.domain?.id;
    if (id !== undefined) return id;
  }
  return undefined;
}

/** True iff the mount both consumes and produces `nodeId` — the self-loop case
 *  (communicating is endomorphic on the meme carrier: meme in, meme out). */
export function isEndoMount(induced: InducedBins, nodeId: string): boolean {
  return consumedIds(induced).has(nodeId) && producedIds(induced).has(nodeId);
}

/** The carrier `$id`s a mount's actions reference on either slot. */
function referencedIds(induced: InducedBins): readonly string[] {
  const ids = new Set<string>();
  for (const act of induced.actions) {
    if (act.domain !== undefined) ids.add(act.domain.id);
    if (act.codomain !== undefined) ids.add(act.codomain.id);
  }
  return [...ids];
}

/** Build the namespace tree from carrier `$id`s. The node-id universe is every
 *  registered `$id` (when a registry is passed) plus every domain/codomain `$id`
 *  any mount references, so even a carrier the host did not pre-register gets a
 *  node. Mounts are bucketed by their `nodeId`; a registry node with no mounts is
 *  still materialized (an empty, navigable carrier node) so the tree is whole.
 *  Returned sorted by path length descending — longest-base-first for routing. */
export function carrierNodeTree(
  mounts: readonly CarrierMount[],
  registry?: SchemaRegistry,
): readonly CarrierNode[] {
  const universe = new Set<string>();
  if (registry !== undefined) for (const id of registry.ids()) universe.add(id);
  for (const m of mounts) for (const id of referencedIds(m.induced)) universe.add(id);

  const byNode = new Map<string, CarrierMount[]>();
  for (const m of mounts) {
    const id = m.nodeId ?? domainNodeOf(m.induced);
    if (id === undefined) continue;
    universe.add(id);
    const bucket = byNode.get(id);
    if (bucket === undefined) byNode.set(id, [m]);
    else bucket.push(m);
  }

  const nodes: CarrierNode[] = [];
  for (const id of universe) {
    const at = byNode.get(id) ?? [];
    nodes.push({
      id,
      path: `/${id}`,
      mounts: at,
      endo: at.some((m) => isEndoMount(m.induced, id)),
    });
  }
  nodes.sort((a, b) => b.path.length - a.path.length);
  return nodes;
}

/** The base path of each mount, keyed by name — the generalization of
 *  `tileManifold`. A mount whose domain resolves to a carrier node mounts at that
 *  carrier's `$id` path (`/<id>`); a mount with no resolvable domain carrier (a
 *  pure source) falls back to the existing module-tail placement via
 *  `tileManifold` for exactly those unplaceable mounts. Both kinds coexist. */
export function tileCarrierNodes(
  mounts: readonly CarrierMount[],
  registry?: SchemaRegistry,
): ReadonlyMap<string, string> {
  const nodeIds = new Set(carrierNodeTree(mounts, registry).map((n) => n.id));
  const paths = new Map<string, string>();
  const unplaceable: ManifoldMount[] = [];
  for (const m of mounts) {
    const id = m.nodeId ?? domainNodeOf(m.induced);
    if (id !== undefined && nodeIds.has(id)) paths.set(m.name, `/${id}`);
    else unplaceable.push({ name: m.name, induced: m.induced });
  }
  if (unplaceable.length > 0) {
    const fallback = tileManifold(unplaceable);
    for (const [name, base] of fallback) if (!paths.has(name)) paths.set(name, base);
  }
  return paths;
}

/** The HTML index of the whole namespace: every node at its `$id` path, with the
 *  mount package names and `↻` for self-loops — the space navigable as one. */
export function carrierManifoldIndexHtml(nodes: readonly CarrierNode[]): string {
  const items = nodes.map((node) => {
    const guests = node.mounts.map((m) => escapeHtml(m.induced.discovery.package)).join(", ");
    const endo = node.endo ? " ↻" : "";
    const tail = guests === "" ? "" : ` — ${guests}`;
    return `<li><a href="${escapeHtml(node.path)}"><code>${escapeHtml(node.id)}</code></a>${endo}${tail}</li>`;
  }).join("\n");
  return [
    "<!doctype html><meta charset=utf-8>",
    "<title>carrier manifold</title>",
    "<h1>carrier manifold</h1>",
    "<p>A namespace of carrier nodes; each mounts a four-faced apex at its <code>$id</code> descent path. <code>↻</code> marks a self-loop.</p>",
    `<ol>${items}</ol>`,
  ].join("\n");
}

/** One four-faced apex over several guests co-mounted at one route point: the coproduct
 *  of their actions through the existing `induceBins`. The node-level `GET /`,
 *  `GET /openapi.json`, and `POST /mcp` are projected from this pooled apex; each
 *  individual POST still dispatches through the OWNING mount so witnessing lands
 *  in the right per-package ledger. */
export function aggregateNodeApex(mounts: readonly CarrierMount[], nodeId: string): InducedBins {
  const actions = mounts.flatMap((m) => [...m.induced.actions]);
  return induceBins(actions, { packageName: nodeId });
}

/** Route one request against a carrier manifold — the pure projection that
 *  generalizes `routeManifold` to carrier-node base paths. Selects the longest
 *  carrier-node base that prefixes the path and delegates to that node's apex via
 *  the unchanged `routeRequest`, which supplies the four faces. Co-mounted guests
 *  at one node are disambiguated by verb for POST/`:verb`; `GET /`, OpenAPI, and
 *  MCP at the node go through the pooled apex (`aggregateNodeApex`). */
export function routeCarrierManifold(
  mounts: readonly CarrierMount[],
  request: ServedRequest,
  options: ServeOptions = {},
  registry?: SchemaRegistry,
): ServedResponse {
  const root = (options.basePath ?? "").replace(/\/+$/, "");
  const path = request.path.startsWith(root) ? request.path.slice(root.length) : request.path;

  if (request.method === "GET" && (path === "" || path === "/")) {
    return html(carrierManifoldIndexHtml(carrierNodeTree(mounts, registry)));
  }

  const paths = tileCarrierNodes(mounts, registry);
  // Group mounts by their resolved base so a node with several guests is one apex.
  const byBase = new Map<string, CarrierMount[]>();
  for (const m of mounts) {
    const base = paths.get(m.name);
    if (base === undefined) continue;
    const bucket = byBase.get(base);
    if (bucket === undefined) byBase.set(base, [m]);
    else bucket.push(m);
  }

  // Longest carrier-node base match wins, so `/a/b/verb` routes to the node at
  // `/a/b`, not the one at `/a`.
  const ranked = [...byBase.entries()].sort((x, y) => y[0].length - x[0].length);
  for (const [base, at] of ranked) {
    if (path !== base && !path.startsWith(`${base}/`)) continue;
    const opts = { ...options, basePath: `${root}${base}` };
    // Single guest: route straight through its apex (own ledger preserved).
    if (at.length === 1) return routeRequest(at[0]!.induced, request, opts);

    // Co-mounted guests: a verb-bearing POST/GET dispatches through the owning
    // mount (own ledger); the node-level `GET /`, OpenAPI, and MCP go through the
    // pooled apex so the node presents one four-faced surface.
    const tail = path === base ? "" : path.slice(base.length + 1);
    const verb = decodeURIComponent(tail);
    const owner = at.find((m) => m.induced.discovery.bins.some((bin) => bin.name === verb));
    if (owner !== undefined && verb !== "" && verb !== "mcp" && verb !== "openapi.json" && verb !== "health" && verb !== "discovery") {
      return routeRequest(owner.induced, request, opts);
    }
    const pooled = aggregateNodeApex(at, base.replace(/^\//, ""));
    return routeRequest(pooled, request, opts);
  }
  return text(`no carrier node for path: ${path}\n`, 404);
}

/** Route one request against a carrier manifold, awaiting async action bodies. */
export async function routeCarrierManifoldAsync(
  mounts: readonly CarrierMount[],
  request: ServedRequest,
  options: ServeOptions = {},
  registry?: SchemaRegistry,
): Promise<ServedResponse> {
  const root = (options.basePath ?? "").replace(/\/+$/, "");
  const path = request.path.startsWith(root) ? request.path.slice(root.length) : request.path;

  if (request.method === "GET" && (path === "" || path === "/")) {
    return html(carrierManifoldIndexHtml(carrierNodeTree(mounts, registry)));
  }

  const paths = tileCarrierNodes(mounts, registry);
  const byBase = new Map<string, CarrierMount[]>();
  for (const m of mounts) {
    const base = paths.get(m.name);
    if (base === undefined) continue;
    const bucket = byBase.get(base);
    if (bucket === undefined) byBase.set(base, [m]);
    else bucket.push(m);
  }

  const ranked = [...byBase.entries()].sort((x, y) => y[0].length - x[0].length);
  for (const [base, at] of ranked) {
    if (path !== base && !path.startsWith(`${base}/`)) continue;
    const opts = { ...options, basePath: `${root}${base}` };
    if (at.length === 1) return routeRequestAsync(at[0]!.induced, request, opts);

    const tail = path === base ? "" : path.slice(base.length + 1);
    const verb = decodeURIComponent(tail);
    const owner = at.find((m) => m.induced.discovery.bins.some((bin) => bin.name === verb));
    if (owner !== undefined && verb !== "" && verb !== "mcp" && verb !== "openapi.json" && verb !== "health" && verb !== "discovery") {
      return routeRequestAsync(owner.induced, request, opts);
    }
    const pooled = aggregateNodeApex(at, base.replace(/^\//, ""));
    return routeRequestAsync(pooled, request, opts);
  }
  return text(`no carrier node for path: ${path}\n`, 404);
}

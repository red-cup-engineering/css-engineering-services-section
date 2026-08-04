/**
 * acting/manifold — the operations manifold projected from an induced package.
 *
 * An operations manifold is not owned by an operations site. It is the runtime
 * shape every induced package already has: one action apex and its carrier-slot
 * extrema. Composition is a judgment purchased from its autonomous Actor; this
 * projection does not manufacture bonds from ambient string equality.
 */
import type { UtteranceCarrier } from "@lenticule-science/articulating/index";
import { fact } from "./action.mjs";
import type { ActionDiscovery, ActionEndpoint } from "./induce.mjs";
import { resource, type ResourceCarrier } from "./resource.mjs";
import { slotRef } from "./serving.mjs";

/** A carrier slot where package actions meet the outside category. */
export interface OperationManifoldExtremum {
  /** Carrier `$id` consumed or produced at this extremum. */
  readonly carrier: string;
  /** Action verbs touching this extremum. */
  readonly actions: readonly string[];
}

/** A local edge whose producer codomain is another action's domain. */
export interface OperationManifoldEdge {
  /** The producing action verb. */
  readonly from: string;
  /** The consuming action verb. */
  readonly to: string;
  /** The carrier `$id` that makes the codomain/domain composition lawful. */
  readonly carrier: string;
  /** Runtime relation witnessed by this edge. */
  readonly relation: "codomain-domain";
}

/**
 * The apex summary whose projections define this package's operation surface.
 *
 * This is the compact, serializable read of an induced action family: which
 * package was induced, which verbs it exposes, and which resource/prompt legs
 * travel with it. It intentionally stores names and URIs rather than executable
 * closures, so the manifold can be logged, served as an MCP resource, or folded
 * into a cross-package graph.
 */
export interface OperationManifoldApex {
  /** Discovery-carrier tag copied from the induced apex. */
  readonly kind: ActionDiscovery["kind"];
  /** Package or module namespace whose apex was induced. */
  readonly package: string;
  /** Process protocol described by the discovery carrier. */
  readonly protocol: ActionDiscovery["protocol"];
  /** Action verbs available at this apex. */
  readonly bins: readonly string[];
  /** Resource URIs published with this apex. */
  readonly resources: readonly string[];
  /** Prompt names published with this apex. */
  readonly prompts: readonly string[];
}

/**
 * Package-level operations manifold induced from one action discovery.
 *
 * The manifold is the action apex read as carrier incidence data. Domain
 * extrema are the carrier `$id`s this package consumes; codomain extrema are the
 * carrier `$id`s it produces. All extrema remain unresolved until the
 * operations-manifold forest Actor purchases composition judgments for them.
 */
export interface PackageOperationsManifold {
  /** Runtime tag for a package operations manifold. */
  readonly kind: "relating.operations-manifold";
  /** Package or module namespace whose discovery carrier was read. */
  readonly package: string;
  /** Process protocol described by the discovery carrier. */
  readonly protocol: ActionDiscovery["protocol"];
  /** Compact apex summary: actions, resources, and prompts by public handle. */
  readonly apex: OperationManifoldApex;
  /** Carrier-incidence reads around the apex. */
  readonly extrema: {
    /** Domain carrier extrema: carriers the package consumes. */
    readonly domains: readonly OperationManifoldExtremum[];
    /** Codomain carrier extrema: carriers the package produces. */
    readonly codomains: readonly OperationManifoldExtremum[];
    /** Unresolved domain extrema submitted to the forest Actor. */
    readonly incoming: readonly OperationManifoldExtremum[];
    /** Unresolved codomain extrema submitted to the forest Actor. */
    readonly outgoing: readonly OperationManifoldExtremum[];
    /** Retired ambient edge projection; composition edges are bought, not inferred here. */
    readonly edges: readonly OperationManifoldEdge[];
  };
  /** RMN utterances that make the manifold inspectable as relational data. */
  readonly utterances: readonly UtteranceCarrier[];
}

/** One package node in a cross-package operations-manifold graph. */
export interface OperationsManifoldGraphNode {
  /** Package or module namespace. */
  readonly package: string;
  /** Process protocol described by the package discovery carrier. */
  readonly protocol: ActionDiscovery["protocol"];
  /** Action verbs exposed by the package apex. */
  readonly bins: readonly string[];
  /** Carrier `$id`s consumed by the package apex. */
  readonly domains: readonly string[];
  /** Carrier `$id`s produced by the package apex. */
  readonly codomains: readonly string[];
}

/** A cross-package composition candidate by shared carrier identity. */
export interface OperationsManifoldGraphEdge {
  /** Producing package namespace. */
  readonly fromPackage: string;
  /** Producing action verb. */
  readonly from: string;
  /** Consuming package namespace. */
  readonly toPackage: string;
  /** Consuming action verb. */
  readonly to: string;
  /** Carrier `$id` that makes the codomain-domain match. */
  readonly carrier: string;
  /** Runtime relation witnessed by this edge. */
  readonly relation: "codomain-domain";
}

/** A carrier frontier where the graph has only one visible side. */
export interface OperationsManifoldGraphFrontier {
  /** Package or module namespace at the frontier. */
  readonly package: string;
  /** Carrier `$id` that lacks a visible opposite side in the graph. */
  readonly carrier: string;
  /** Action verbs touching the frontier carrier. */
  readonly actions: readonly string[];
}

/**
 * Cross-package operations graph derived from package manifolds.
 *
 * The graph relates package apices by carrier identity alone: if one package
 * produces a carrier that another package consumes, the edge exists. Incoming
 * and outgoing frontiers remain visible so agent tooling can see where the
 * current package mesh has an unserved input or an unconsumed output.
 */
export interface OperationsManifoldGraph {
  /** Runtime tag for the cross-package graph read. */
  readonly kind: "relating.operations-manifold.graph";
  /** Package nodes participating in the read. */
  readonly packages: readonly OperationsManifoldGraphNode[];
  /** Cross-package edges induced by matching carrier `$id`s. */
  readonly edges: readonly OperationsManifoldGraphEdge[];
  /** Visible unresolved carrier fronts in the supplied package set. */
  readonly frontier: {
    /** Consumed carriers that no supplied package produces. */
    readonly incoming: readonly OperationsManifoldGraphFrontier[];
    /** Produced carriers that no supplied package consumes. */
    readonly outgoing: readonly OperationsManifoldGraphFrontier[];
  };
  /** Relational facts describing graph package membership and edges. */
  readonly utterances: readonly UtteranceCarrier[];
}

function endpointsBySlot(
  endpoints: readonly ActionEndpoint[],
  side: "domain" | "codomain",
): ReadonlyMap<string, readonly string[]> {
  const byCarrier = new Map<string, string[]>();
  for (const endpoint of endpoints) {
    const carrier = slotRef(side === "domain" ? endpoint.domainSchema : endpoint.codomainSchema);
    if (carrier === undefined) continue;
    const verbs = byCarrier.get(carrier);
    if (verbs === undefined) byCarrier.set(carrier, [endpoint.name]);
    else verbs.push(endpoint.name);
  }
  return new Map([...byCarrier.entries()].map(([carrier, verbs]) => [carrier, Object.freeze([...verbs].sort())]));
}

function extremaFrom(byCarrier: ReadonlyMap<string, readonly string[]>): readonly OperationManifoldExtremum[] {
  return Object.freeze([...byCarrier.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([carrier, verbs]) => Object.freeze({ carrier, actions: verbs })));
}

function manifoldUtterances(
  discovery: ActionDiscovery,
  domains: readonly OperationManifoldExtremum[],
  codomains: readonly OperationManifoldExtremum[],
  edges: readonly OperationManifoldEdge[],
): readonly UtteranceCarrier[] {
  const term = `relating.operations-manifold.${discovery.package}`;
  const utterances: UtteranceCarrier[] = [
    fact(term, "relating.operations-manifold.of-package", discovery.package),
    fact(term, "relating.operations-manifold.has-apex", `relating://${encodeURIComponent(discovery.package)}/discovery`),
  ];
  for (const extremum of domains) {
    utterances.push(fact(term, "relating.operations-manifold.has-domain-extremum", extremum.carrier));
  }
  for (const extremum of codomains) {
    utterances.push(fact(term, "relating.operations-manifold.has-codomain-extremum", extremum.carrier));
  }
  for (const edge of edges) {
    const edgeTerm = `${term}.${edge.from}.${edge.to}`;
    utterances.push(fact(edgeTerm, "relating.operations-manifold.composes-through", edge.carrier));
  }
  return Object.freeze(utterances);
}

/** Project an action discovery carrier into its package operations manifold. */
export function operationsManifoldOf(discovery: ActionDiscovery): PackageOperationsManifold {
  const domainMap = endpointsBySlot(discovery.bins, "domain");
  const codomainMap = endpointsBySlot(discovery.bins, "codomain");
  const domains = extremaFrom(domainMap);
  const codomains = extremaFrom(codomainMap);
  const edges: readonly OperationManifoldEdge[] = Object.freeze([]);

  return Object.freeze({
    kind: "relating.operations-manifold" as const,
    package: discovery.package,
    protocol: discovery.protocol,
    apex: Object.freeze({
      kind: discovery.kind,
      package: discovery.package,
      protocol: discovery.protocol,
      bins: Object.freeze(discovery.bins.map((bin) => bin.name).sort()),
      resources: Object.freeze(discovery.resources.map((res) => res.uri).sort()),
      prompts: Object.freeze(discovery.prompts.map((prompt) => prompt.name).sort()),
    }),
    extrema: Object.freeze({
      domains,
      codomains,
      incoming: domains,
      outgoing: codomains,
      edges,
    }),
    utterances: manifoldUtterances(discovery, domains, codomains, edges),
  });
}

/**
 * The ambient graph constructor is deliberately retired.
 *
 * A caller must purchase `derive-operations-manifold-forest` from
 * `urn:ame:operations-manifold-forest-service`; that Actor purchases every
 * atomic carrier-composition judgment and retains its receipts and
 * obstructions. Keeping a synchronous fallback here would recreate the exact
 * unpriced semantic bypass the Actor boundary removes.
 */
export function operationsManifoldGraphOf(
  _manifolds: readonly PackageOperationsManifold[],
): never {
  throw new Error(
    "ambient carrier composition is retired; purchase derive-operations-manifold-forest from urn:ame:operations-manifold-forest-service",
  );
}

/**
 * Stable MCP resource URI for a package's operations manifold.
 *
 * `induceBins` publishes this beside the discovery resource so MCP clients can
 * read not only what tools/resources/prompts exist, but how the action family is
 * wired through carrier extrema.
 */
export function operationsManifoldUri(packageName: string): string {
  return `relating://${encodeURIComponent(packageName)}/operations-manifold`;
}

/**
 * Publish the package operations manifold as an MCP resource.
 *
 * The resource body is computed at read time from the live discovery carrier,
 * so it follows the same apex as `tools/list`, `resources/list`, and
 * `prompts/list` without maintaining a second registry.
 */
export function operationsManifoldResource(
  packageName: string,
  discovery: () => ActionDiscovery,
): ResourceCarrier {
  return resource({
    uri: operationsManifoldUri(packageName),
    name: `${packageName} operations manifold`,
    description: "The package's runtime operations manifold: apex, carrier extrema, and codomain-domain edges.",
    read: () => `${JSON.stringify(operationsManifoldOf(discovery()), null, 2)}\n`,
  });
}

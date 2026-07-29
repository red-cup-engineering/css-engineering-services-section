/**
 * acting/induce — module → carrier: the coproduct apex of a module's actions,
 * resources, and prompts.
 *
 * This is the inverse of the manifest→carrier arrow elsewhere in the workspace
 * (which reads `package.json#bin`). `induceBins` reads a module's registered
 * actions, resources, and prompts and yields the discovery carrier — the
 * coproduct apex into which each leg injects — plus a bound dispatch. CLI,
 * OpenAPI, MCP (tools + resources + prompts), and web UX are projected from this
 * one carrier as functorial images; none invents a second ontology.
 *
 * Resources and prompts are derived from what the package already declares: each
 * action's input/output JSON Schema and the discovery carrier itself project as
 * MCP resources, and each action projects as a guided MCP prompt — so the three
 * standard knowledge-vault primitives come for free, with packages free to
 * register richer resources/prompts via `resource()`/`prompt()`.
 */
import type { UtteranceCarrier } from "@lenticule-science/articulating/index";
import { registeredCategory } from "./category.mjs";
import { actionUtterances, fact, isAction, type Action } from "./action.mjs";
import { wireCodec } from "../codecs/boundary/wire/index.mjs";
import { dispatch, dispatchAsync, type DispatchOptions, type DispatchResult } from "./dispatch.mjs";
import {
  isResource,
  resource,
  resourceDescriptor,
  resourceUtterances,
  type ResourceCarrier,
  type ResourceDescriptor,
} from "./resource.mjs";
import {
  actionPrompt,
  isPrompt,
  promptDescriptor,
  promptUtterances,
  type PromptCarrier,
  type PromptDescriptor,
} from "./prompt.mjs";
import { operationsManifoldResource } from "./manifold.mjs";
import { actionSettlementSignature, type ActionSettlementSignature } from "./settlement-signature.mjs";

/** One action projected as a POST endpoint over the stdio process boundary. */
export interface ActionEndpoint {
  /** The action verb; this is the stable endpoint/tool/form name. */
  readonly name: string;
  /** Relative URL path for the HTTP/form projection. */
  readonly href: string;
  /** Current executable projection method. Actions are invoked as POSTs. */
  readonly method: "POST";
  /** Media type decoded from boundary input. */
  readonly input: string;
  /** Media type encoded to boundary output. */
  readonly output: string;
  /** Short action summary projected from the action declaration. */
  readonly summary?: string;
  /** Longer action description projected from the action declaration. */
  readonly description?: string;
  /** JSON Schema ref for the consumed carrier, when the action declares one. */
  readonly domainSchema?: Record<string, unknown>;
  /** JSON Schema ref for the produced carrier, when the action declares one. */
  readonly codomainSchema?: Record<string, unknown>;
  /** RMN body projected into discovery when the action carries behavior as data. */
  readonly runTerm?: import("../../lib/notating/index.mjs").Tm;
  /** Derived termination/transport signature, read from the codomain's settlement classification. */
  readonly settlement: ActionSettlementSignature;
}

/** The discovery carrier: the coproduct apex of a package's legs. */
export interface ActionDiscovery {
  /** Runtime tag for an induced action discovery carrier. */
  readonly kind: "relating.acting.discovery";
  /** Package or module name whose legs were induced. */
  readonly package: string;
  /** The base process protocol this discovery carrier currently describes. */
  readonly protocol: "stdio";
  /** Action endpoints projected from registered actions. */
  readonly bins: readonly ActionEndpoint[];
  /** MCP/resource descriptors projected from registered and derived resources. */
  readonly resources: readonly ResourceDescriptor[];
  /** MCP prompt descriptors projected from registered and derived prompts. */
  readonly prompts: readonly PromptDescriptor[];
  /** Relational facts describing the package, actions, resources, and prompts. */
  readonly utterances: readonly UtteranceCarrier[];
}

/** What `induceBins` returns: the carrier, a bound dispatch, the legs. */
export interface InducedBins {
  /** The discovery carrier, suitable for docs, MCP resources, and inspection. */
  readonly discovery: ActionDiscovery;
  /** The action legs that were accepted from the source namespace. */
  readonly actions: readonly Action[];
  /** Resource legs that were registered or derived. */
  readonly resources: readonly ResourceCarrier[];
  /** Prompt legs that were registered or derived. */
  readonly prompts: readonly PromptCarrier[];
  /** Dispatch bound to this action family and package namespace. */
  readonly dispatch: (argv: readonly string[], stdin: string, options?: DispatchOptions) => DispatchResult;
  /** Async dispatch bound to this action family and package namespace. */
  readonly dispatchAsync: (argv: readonly string[], stdin: string, options?: DispatchOptions) => Promise<DispatchResult>;
}

/** Options for inducing bins. */
export interface InduceOptions {
  /** Package or module name recorded in discovery and witnessing. */
  readonly packageName?: string;
  /** Base HTTP/form path used when projecting action hrefs. */
  readonly basePath?: string;
  /** Extra resources to publish beyond the auto-derived schema/discovery ones. */
  readonly resources?: readonly ResourceCarrier[];
  /** Extra prompts to publish beyond the auto-derived per-action ones. */
  readonly prompts?: readonly PromptCarrier[];
  /** Auto-derive one resource per action input/output JSON Schema. Default true. */
  readonly deriveSchemaResources?: boolean;
  /** Auto-derive one guided prompt per action. Default true. */
  readonly derivePrompts?: boolean;
}

function joinPath(basePath: string, leaf: string): string {
  const base = basePath.replace(/\/+$/, "");
  return `${base}/${encodeURIComponent(leaf)}`;
}

/** Keep only the actions out of a module namespace (or accept a list directly). */
export function collectActions(source: Iterable<unknown> | Readonly<Record<string, unknown>>): readonly Action[] {
  return Object.freeze(collectValues(source).filter(isAction));
}

/** Keep only the resources out of a module namespace (or accept a list directly). */
export function collectResources(source: Iterable<unknown> | Readonly<Record<string, unknown>>): readonly ResourceCarrier[] {
  return Object.freeze(collectValues(source).filter(isResource));
}

/** Keep only the prompts out of a module namespace (or accept a list directly). */
export function collectPrompts(source: Iterable<unknown> | Readonly<Record<string, unknown>>): readonly PromptCarrier[] {
  return Object.freeze(collectValues(source).filter(isPrompt));
}

function collectValues(source: Iterable<unknown> | Readonly<Record<string, unknown>>): readonly unknown[] {
  return Symbol.iterator in Object(source)
    ? [...(source as Iterable<unknown>)]
    : Object.values(source as Record<string, unknown>);
}

/** Project an action into its endpoint. */
function endpointOf(act: Action, basePath: string): ActionEndpoint {
  return Object.freeze({
    name: act.verb,
    href: joinPath(basePath, act.verb),
    method: "POST" as const,
    input: wireCodec(act.inputFormat).mediaType,
    output: wireCodec(act.outputFormat).mediaType,
    ...(act.summary === undefined ? {} : { summary: act.summary }),
    ...(act.description === undefined ? {} : { description: act.description }),
    ...(act.domain === undefined ? {} : { domainSchema: { $ref: act.domain.id } }),
    ...(act.codomain === undefined ? {} : { codomainSchema: { $ref: act.codomain.id } }),
    ...(act.runTerm === undefined ? {} : { runTerm: act.runTerm }),
    settlement: actionSettlementSignature(act),
  });
}

/** The URI of an action's input/output schema resource. */
function schemaUri(packageName: string, verb: string, side: "input" | "output"): string {
  return `relating://${encodeURIComponent(packageName)}/schema/${encodeURIComponent(verb)}/${side}`;
}

/** Auto-derive the schema resources a package already carries on its actions. */
function schemaResourcesOf(actions: readonly Action[], packageName: string): readonly ResourceCarrier[] {
  const resources: ResourceCarrier[] = [];
  for (const carrier of registeredCategory.carriers()) {
    const schema = carrier.schema;
    resources.push(resource({
      uri: `${carrier.id}.json`,
      name: `${carrier.id} schema`,
      description: `JSON Schema for carrier ${carrier.id}.`,
      read: () => `${JSON.stringify(schema, null, 2)}\n`,
    }));
  }
  for (const act of actions) {
    if (act.domain !== undefined) {
      const schema = act.domain.schema;
      resources.push(resource({
        uri: schemaUri(packageName, act.verb, "input"),
        name: `${act.verb} input schema`,
        description: `JSON Schema of the ${act.inputFormat} input carrier for ${act.verb}.`,
        read: () => `${JSON.stringify(schema, null, 2)}\n`,
      }));
    }
    if (act.codomain !== undefined) {
      const schema = act.codomain.schema;
      resources.push(resource({
        uri: schemaUri(packageName, act.verb, "output"),
        name: `${act.verb} output schema`,
        description: `JSON Schema of the ${act.outputFormat} output carrier for ${act.verb}.`,
        read: () => `${JSON.stringify(schema, null, 2)}\n`,
      }));
    }
  }
  return Object.freeze(resources);
}

/** De-duplicate resources by URI, keeping the first occurrence. */
function dedupeResources(resources: readonly ResourceCarrier[]): readonly ResourceCarrier[] {
  const seen = new Set<string>();
  const kept: ResourceCarrier[] = [];
  for (const res of resources) {
    if (seen.has(res.uri)) continue;
    seen.add(res.uri);
    kept.push(res);
  }
  return Object.freeze(kept);
}

/** De-duplicate prompts by name, keeping the first occurrence. */
function dedupePrompts(prompts: readonly PromptCarrier[]): readonly PromptCarrier[] {
  const seen = new Set<string>();
  const kept: PromptCarrier[] = [];
  for (const pr of prompts) {
    if (seen.has(pr.name)) continue;
    seen.add(pr.name);
    kept.push(pr);
  }
  return Object.freeze(kept);
}

/**
 * Induce the bin surface for a module's legs.
 *
 * The input can be a module namespace object or a list. Actions, resources, and
 * prompts are collected, schema resources and action prompts are derived, and the
 * result is one discovery carrier plus a bound dispatcher. HTTP, OpenAPI, MCP,
 * forms, and CLI code consume this induced apex rather than re-declaring the
 * operation surface.
 */
export function induceBins(
  source: Iterable<unknown> | Readonly<Record<string, unknown>>,
  options: InduceOptions = {},
): InducedBins {
  const actions = collectActions(source);
  const packageName = options.packageName ?? "@red-cup-engineering/relating";
  const basePath = options.basePath ?? "";
  const term = `relating.package.${packageName}`;
  const bins = actions.map((act) => endpointOf(act, basePath));

  // Registered prompts come first so they win de-duplication over derived ones.
  const registeredPrompts = [...collectPrompts(source), ...(options.prompts ?? [])];
  const derivedPrompts = options.derivePrompts === false ? [] : actions.map(actionPrompt);
  const prompts = dedupePrompts([...registeredPrompts, ...derivedPrompts]);

  // Registered resources come first; auto-derived schema + discovery resources follow.
  const registeredResources = [...collectResources(source), ...(options.resources ?? [])];
  const schemaResources = options.deriveSchemaResources === false ? [] : schemaResourcesOf(actions, packageName);

  const utterances: UtteranceCarrier[] = [
    fact(term, "relating.package.has-name", packageName),
    fact(term, "relating.package.speaks-protocol", "stdio"),
  ];
  for (const act of actions) {
    utterances.push(fact(term, "relating.package.has-action", act.verb));
    for (const u of actionUtterances(act)) utterances.push(u);
  }

  // The discovery carrier is itself a resource; its read thunk closes over the
  // assembled descriptors so the artifact is always the live apex.
  let discoveryRef: ActionDiscovery;
  const discoveryResource = resource({
    uri: `relating://${encodeURIComponent(packageName)}/discovery`,
    name: `${packageName} discovery`,
    description: "The package's coproduct apex: its actions, resources, and prompts.",
    read: () => `${JSON.stringify(discoveryRef, null, 2)}\n`,
  });
  const manifoldResource = operationsManifoldResource(packageName, () => discoveryRef);

  const resources = dedupeResources([...registeredResources, ...schemaResources, discoveryResource, manifoldResource]);
  for (const res of resources) {
    utterances.push(fact(term, "relating.package.has-resource", res.uri));
    for (const u of resourceUtterances(res)) utterances.push(u);
  }
  for (const pr of prompts) {
    utterances.push(fact(term, "relating.package.has-prompt", pr.name));
    for (const u of promptUtterances(pr)) utterances.push(u);
  }

  discoveryRef = Object.freeze({
    kind: "relating.acting.discovery" as const,
    package: packageName,
    protocol: "stdio" as const,
    bins: Object.freeze(bins),
    resources: Object.freeze(resources.map(resourceDescriptor)),
    prompts: Object.freeze(prompts.map(promptDescriptor)),
    utterances: Object.freeze(utterances),
  });

  return Object.freeze({
    discovery: discoveryRef,
    actions,
    resources,
    prompts,
    dispatch: (argv: readonly string[], stdin: string, dispatchOptions: DispatchOptions = {}) =>
      dispatch(actions, argv, stdin, dispatchOptions),
    dispatchAsync: (argv: readonly string[], stdin: string, dispatchOptions: DispatchOptions = {}) =>
      dispatchAsync(actions, argv, stdin, dispatchOptions),
  });
}

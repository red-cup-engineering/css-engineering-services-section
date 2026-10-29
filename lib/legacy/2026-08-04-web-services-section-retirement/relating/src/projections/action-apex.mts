/**
 * action-apex projections - generated descriptor faces of an induced action apex.
 *
 * These functions do not open sockets, read `process.env`, or execute action
 * bodies. They turn the same induced apex into transport-facing discovery
 * documents. Runtime routing and dispatch remain in `src/running`.
 */
import type { Action } from "../running/action.mjs";
import type { ActionEndpoint, InducedBins } from "../running/induce.mjs";
import { promptDescriptor, type PromptCarrier } from "../running/prompt.mjs";
import { registeredCategory } from "../running/category.mjs";
import { resourceDescriptor, type ResourceCarrier } from "../running/resource.mjs";

export interface ActionApexProjectionOptions {
  /** URL prefix this induced apex is mounted under. */
  readonly basePath?: string;
  /** OpenAPI title; defaults to the induced package name. */
  readonly title?: string;
  /** OpenAPI/MCP server version string; defaults to `0.0.0`. */
  readonly version?: string;
}

/**
 * Project an induced action apex to an OpenAPI 3.1.1 document.
 *
 * The paths are not authored independently: each POST operation is an action
 * endpoint, and request/response schemas are the carrier refs already present on
 * that endpoint. The component schema table is the live carrier registry, so the
 * generated document is a transport face of the category rather than a second
 * source of API truth.
 */
export function actionOpenApi(induced: InducedBins, options: ActionApexProjectionOptions = {}): Record<string, unknown> {
  const base = (options.basePath ?? "").replace(/\/+$/, "");
  const paths: Record<string, unknown> = {};
  for (const endpoint of induced.discovery.bins) {
    paths[`${base}/${endpoint.name}`] = {
      post: {
        operationId: endpoint.name,
        "x-settlement-regime": endpoint.settlement.regime,
        "x-settlement-transport": endpoint.settlement.transport,
        "x-settlement-finality": endpoint.settlement.finality,
        ...(endpoint.summary === undefined ? {} : { summary: endpoint.summary }),
        ...(endpoint.description === undefined ? {} : { description: endpoint.description }),
        requestBody: {
          required: true,
          content: { [endpoint.input]: { schema: endpoint.domainSchema ?? {} } },
        },
        responses: {
          "200": { description: "OK", content: { [endpoint.output]: { schema: endpoint.codomainSchema ?? {} } } },
          "400": { description: "Bad Request" },
        },
      },
    };
  }
  return {
    openapi: "3.1.1",
    info: { title: options.title ?? induced.discovery.package, version: options.version ?? "0.0.0" },
    paths,
    components: {
      schemas: Object.fromEntries(registeredCategory.carriers().map((carrier) => [carrier.id, carrier.schema])),
    },
  };
}

/**
 * Project actions to MCP tool descriptors.
 *
 * Each action becomes one tool named by its verb. The tool input is a single
 * `input` property whose schema is the action domain ref when one exists; the
 * output schema mirrors the codomain ref when present. Calls still execute
 * through dispatch, so this list is discovery metadata, not an executor.
 */
export function actionMcpTools(actions: readonly Action[]): readonly Record<string, unknown>[] {
  return actionMcpToolsWithEndpoints(actions, []);
}

export function actionMcpToolsWithEndpoints(
  actions: readonly Action[],
  endpoints: readonly ActionEndpoint[],
): readonly Record<string, unknown>[] {
  const byName = new Map(endpoints.map((endpoint) => [endpoint.name, endpoint] as const));
  return actions.map((act) => {
    const endpoint = byName.get(act.verb);
    const domainSchema = endpoint?.domainSchema ?? (act.domain === undefined ? undefined : { $ref: act.domain.id });
    const codomainSchema = endpoint?.codomainSchema ?? (act.codomain === undefined ? undefined : { $ref: act.codomain.id });
    return {
      name: act.verb,
      ...(act.summary === undefined ? {} : { description: act.summary }),
      inputSchema: {
        type: "object",
        properties: { input: domainSchema ?? { description: `The ${act.inputFormat} input carrier for ${act.verb}.` } },
        required: ["input"],
      },
      ...(codomainSchema === undefined ? {} : { outputSchema: codomainSchema }),
      ...(endpoint === undefined ? {} : {
        "x-settlement-regime": endpoint.settlement.regime,
        "x-settlement-transport": endpoint.settlement.transport,
        "x-settlement-finality": endpoint.settlement.finality,
      }),
    };
  });
}

/**
 * Project an induced apex to MCP resource descriptors.
 *
 * Resources include registered package artifacts plus resources derived by
 * `induceBins`, such as carrier schemas, action input/output schemas, discovery,
 * and the operations-manifold read.
 */
export function actionMcpResources(induced: InducedBins): readonly Record<string, unknown>[] {
  return induced.resources.map((res: ResourceCarrier) => ({ ...resourceDescriptor(res) }));
}

/**
 * Project an induced apex to MCP prompt descriptors.
 *
 * Registered prompts are preserved and per-action prompts are derived from the
 * same action metadata, keeping agent guidance coupled to the operation
 * declaration.
 */
export function actionMcpPrompts(induced: InducedBins): readonly Record<string, unknown>[] {
  return induced.prompts.map((pr: PromptCarrier) => ({ ...promptDescriptor(pr) }));
}

/**
 * @packageDocumentation
 *
 * running/category — the morphism half of the single-source category kernel.
 *
 * A carrier (the object half) lives in `src/carriers`. This module adds the
 * MORPHISM half: actions typed by carrier domain/codomain objects, the live action
 * registry, and composition as the carrier identity equation
 * (`producer.codomain.id === consumer.domain.id`). The categorical role split is
 * objects→writing, morphisms→running; the morphism half imports the object half
 * (running already depends on writing), and the dependency is acyclic — writing
 * never imports running.
 *
 * `registeredCategory` composes the carrier registry (writing) with this module's
 * action registry into one `CategoryRegistry` so downstream faculties populate a
 * single live category by declaring carriers and actions.
 */
import type { JsonValue } from "@red-cup-engineering/json-file-codec-service";
import {
  registerCarrier,
  carrierById,
  carriers as registeredCarriers,
  type Carrier,
  type CarrierId,
  type FromSchema,
} from "../carriers/kernel/carrier.mjs";
import { MorphismSchema } from "../carriers/running/index.mjs";
import type { Tm } from "../../lib/notating/index.mjs";

/** Carrier object accepted by the morphism half. */
export type CategoryCarrier = Carrier<unknown>;

export { MorphismSchema, morphismSchemaCarrier } from "../carriers/running/index.mjs";

/** Serializable action face produced from `MorphismSchema`, with carrier ids
 *  and optional `runTerm` present but the executable closure absent. */
type MorphismCarrierSchema = FromSchema<typeof MorphismSchema>;
export type MorphismCarrier = Omit<MorphismCarrierSchema, "runTerm"> & { readonly runTerm?: JsonValue };

/** Boundary helper for action bodies that may run synchronously or await host IO. */
export type MaybePromise<T> = T | Promise<T>;

/** Review row classifying one registered action as a carrier morphism or a
 *  boundary, and recording whether a true morphism is carried by RMN. */
export interface ActionIrAuditEntry {
  /** Runtime tag for an action IR audit row. */
  readonly kind: "relating.action.ir-audit";
  /** Action verb being audited. */
  readonly verb: string;
  /**
   * True carrier-to-carrier arrows are morphisms; admissions, transports, and
   * untyped host reads are boundaries.
   */
  readonly relation: "morphism" | "boundary";
  /**
   * Whether this action carries its executable behavior as RMN instead of only
   * as a host-language closure.
   */
  readonly hasRunTerm: boolean;
  /** Domain carrier id when one is admitted. */
  readonly domain?: string;
  /** Codomain carrier id when one is admitted. */
  readonly codomain?: string;
  /** Computable reason a boundary action is not required to carry RMN. */
  readonly reason?: string;
}

/** The live category registry populated by carrier and action declarations. */
export interface CategoryRegistry {
  /** Register a carrier declaration in the live category. */
  readonly registerCarrier: <T>(carrier: Carrier<T>) => Carrier<T>;
  /** Resolve a carrier by bare `$id`. */
  readonly carrier: (id: CarrierId) => Carrier | undefined;
  /** List the carriers visible in this process. */
  readonly carriers: () => readonly Carrier[];
  /** Register a morphism or boundary action in the live category. */
  readonly registerAction: <Act extends Action>(action: Act) => Act;
  /** List the actions visible in this process. */
  readonly actions: () => readonly Action[];
}

/** A registered operation at the relating boundary. */
export interface Action {
  /** Runtime tag for action declarations. */
  readonly kind: "relating.action";
  /** Stable verb used by dispatch, CLI, HTTP, MCP, OpenAPI, and web forms. */
  readonly verb: string;
  /** Default wire codec used to decode boundary input. */
  readonly inputFormat: string;
  /** Default wire codec used to encode boundary output. */
  readonly outputFormat: string;
  /** Named valued CLI/dispatch options this action accepts. */
  readonly options: readonly string[];
  /** Short human-facing action summary. */
  readonly summary?: string;
  /** Longer human-facing action description. */
  readonly description?: string;
  /** Carrier consumed by a true morphism. Undefined for raw admission boundaries. */
  readonly domain?: CategoryCarrier;
  /** Carrier produced by a true morphism. Undefined for transport or untyped boundaries. */
  readonly codomain?: CategoryCarrier;
  /** Optional RMN body. Carrier-to-carrier morphisms should carry this when possible. */
  readonly runTerm?: Tm;
  /** Executable boundary body. For RMN actions this is the evaluator applied to `runTerm`. */
  readonly run: (input: unknown, args: Record<string, unknown>) => MaybePromise<unknown>;
}

/** Input to `action(...)`: the authored form before defaults are projected. */
export interface ActionSpec {
  /** Stable verb used by every projected boundary face. */
  readonly verb: string;
  /** Default input wire codec; defaults to `json`. */
  readonly inputFormat?: string;
  /** Default output wire codec; defaults to `json`. */
  readonly outputFormat?: string;
  /** Named valued CLI/dispatch options this action accepts. */
  readonly options?: readonly string[];
  /** Short human-facing action summary. */
  readonly summary?: string;
  /** Longer human-facing action description. */
  readonly description?: string;
  /** Carrier consumed by this operation when it is a true morphism. */
  readonly domain?: CategoryCarrier;
  /** Carrier produced by this operation when it is a true morphism. */
  readonly codomain?: CategoryCarrier;
  /** RMN body for behavior-as-data. The acting wrapper can derive `run` from this. */
  readonly runTerm?: Tm;
  /** Host-language executable body. Required at the kernel layer. */
  readonly run?: (input: unknown, args: Record<string, unknown>) => MaybePromise<unknown>;
}

const actionsByVerb = new Map<string, Action>();

/** The live relating category registry. Downstream faculties populate this by declaring carriers and actions. */
export const registeredCategory: CategoryRegistry = Object.freeze({
  registerCarrier: <T,>(value: Carrier<T>): Carrier<T> => registerCarrier(value),
  carrier: (id: CarrierId): Carrier | undefined => carrierById(id),
  carriers: (): readonly Carrier[] => registeredCarriers(),
  registerAction: <Act extends Action>(value: Act): Act => {
    actionsByVerb.set(value.verb, value);
    return value;
  },
  actions: (): readonly Action[] => Object.freeze([...actionsByVerb.values()]),
});

/**
 * Register a morphism or boundary action.
 *
 * Carrier objects are the only internal source of domain/codomain identity. This
 * function is the kernel-level constructor, so it requires an executable `run`.
 * The public acting wrapper can supply that `run` by evaluating a `runTerm`.
 */
export function action(spec: ActionSpec): Action {
  if (!spec.verb || spec.verb.trim() === "") throw new TypeError("action: verb is required");
  const record = spec as unknown as Record<string, unknown>;
  if ("domainSchema" in record || "codomainSchema" in record) {
    throw new TypeError("action: schema refs are projected from domain/codomain carriers; pass carrier objects");
  }
  if (spec.run === undefined) throw new TypeError(`action ${spec.verb}: run is required at the kernel boundary`);
  const inName = spec.inputFormat ?? "json";
  const outName = spec.outputFormat ?? "json";
  const value = Object.freeze({
    kind: "relating.action" as const,
    verb: spec.verb,
    inputFormat: inName,
    outputFormat: outName,
    options: Object.freeze([...(spec.options ?? [])]),
    ...(spec.summary === undefined ? {} : { summary: spec.summary }),
    ...(spec.description === undefined ? {} : { description: spec.description }),
    ...(spec.domain === undefined ? {} : { domain: spec.domain }),
    ...(spec.codomain === undefined ? {} : { codomain: spec.codomain }),
    ...(spec.runTerm === undefined ? {} : { runTerm: spec.runTerm }),
    run: spec.run,
  }) satisfies Action;
  return registeredCategory.registerAction(value);
}

/** Two morphisms compose exactly when the producer's codomain carrier id equals the consumer's domain carrier id. */
export function composes(producer: Action, consumer: Action): boolean {
  const produced = producer.codomain?.id;
  const consumed = consumer.domain?.id;
  return produced !== undefined && consumed !== undefined && produced === consumed;
}

/**
 * Classify actions for the IR migration.
 *
 * Carrier-to-carrier morphisms should be carried as `runTerm`; boundary actions
 * are admissions, codecs, or transports. This is intentionally computed from the
 * declared domain/codomain rather than maintained as a curated list.
 *
 * This is the small review surface for the package's "behavior as data" rule:
 * if both sides have carrier identities, the action is a morphism and should be
 * inspectable as RMN. If either side is missing, the action is a boundary and
 * the `reason` explains why the RMN gate does not apply.
 */
export function actionIrAudit(actions: readonly Action[]): readonly ActionIrAuditEntry[] {
  return Object.freeze(actions.map((action): ActionIrAuditEntry => {
    const domain = action.domain?.id;
    const codomain = action.codomain?.id;
    const relation = domain !== undefined && codomain !== undefined ? "morphism" : "boundary";
    const reason = relation === "morphism"
      ? undefined
      : domain === undefined && codomain === undefined
        ? "untyped boundary"
        : domain === undefined
          ? "admission boundary"
          : "transport boundary";
    return Object.freeze({
      kind: "relating.action.ir-audit" as const,
      verb: action.verb,
      relation,
      hasRunTerm: action.runTerm !== undefined,
      ...(domain === undefined ? {} : { domain }),
      ...(codomain === undefined ? {} : { codomain }),
      ...(reason === undefined ? {} : { reason }),
    });
  }));
}

/**
 * The remaining carrier morphisms whose executable body is still free TS.
 *
 * A non-empty result is useful CI/doc evidence: the package has at least one
 * true carrier-to-carrier action whose body is not yet carried as serializable
 * RMN data.
 */
export function freeTsActions(actions: readonly Action[]): readonly ActionIrAuditEntry[] {
  return Object.freeze(actionIrAudit(actions).filter((entry) =>
    entry.relation === "morphism" && !entry.hasRunTerm));
}

/**
 * The serializable schema-backed morphism carrier for an action.
 *
 * This is the shape that durable logs can store: the executable closure is
 * excluded, while the typed domain/codomain ids and optional IR `runTerm` remain
 * as data. Dispatch can still execute the original action, but this carrier is
 * the reviewable face: docs, ledgers, MCP resources, and the `inspect` action can
 * read it without closing over host process state.
 *
 * @example
 * ```ts
 * import { morphismCarrier } from "@red-cup-engineering/relating";
 *
 * const serializable = morphismCarrier(someAction);
 * Object.hasOwn(serializable, "run"); // false
 * ```
 */
export function morphismCarrier(action: Action): MorphismCarrier {
  const domain = action.domain?.id;
  const codomain = action.codomain?.id;
  return Object.freeze({
    kind: "relating.action" as const,
    verb: action.verb,
    inputFormat: action.inputFormat,
    outputFormat: action.outputFormat,
    options: [...action.options],
    ...(action.summary === undefined ? {} : { summary: action.summary }),
    ...(action.description === undefined ? {} : { description: action.description }),
    ...(domain === undefined ? {} : { domain }),
    ...(codomain === undefined ? {} : { codomain }),
    ...(action.runTerm === undefined ? {} : { runTerm: action.runTerm }),
  });
}

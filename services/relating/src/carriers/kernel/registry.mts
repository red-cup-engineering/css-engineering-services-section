/**
 * carriers/kernel/registry - the schema registry keyed by `$id` (carrier identity).
 *
 * A carrier's identity is its schema `$id` (the bare descent path, e.g.
 * `relating/articulating/utterance`; see the refactor decision note). An action
 * names its domain/codomain carriers by `$ref`-ing that `$id` in
 * `domainSchema`/`codomainSchema`. Cross-package, those `$ref`s point at carriers
 * defined in *other* packages — so something must resolve a `$id` string to the
 * schema document it names. This registry is that resolver: register schemas by
 * their `$id`, then `resolve` a `$ref` to the document it denotes.
 *
 * A `$ref` is a URI-reference. Two shapes occur here:
 *   - intra-document JSON pointer — `#/$defs/Token` — resolved against a base doc;
 *   - a carrier `$id`, optionally with a pointer — `relating/articulating/utterance`
 *     or `relating/articulating/utterance#/$defs/Token` — resolved through the map.
 * The registry is pure (no I/O): a loader populates it from disk elsewhere, so a
 * standalone clone needs only `node` to use it.
 *
 * @packageDocumentation
 */
import { isJsonRecord, type JsonValue } from "../../codecs/text/json/core.mjs";
import { resolveJsonPointer } from "../../writing/schema.mjs";
import type { Carrier } from "./carrier.mjs";

/** A schema registry: resolve a carrier `$ref` to the schema document it names. */
export interface SchemaRegistry {
  /** Register a schema by its `$id`; returns the id. Throws if it has no string `$id`. */
  readonly register: (schema: JsonValue | Carrier) => string;
  /** The schema registered under an `$id`, or undefined. */
  readonly get: (id: string) => JsonValue | undefined;
  /** Resolve a `$ref` (a `$id`, an `$id#/pointer`, or a bare `#/pointer`) to its
   *  document. A bare pointer resolves against `base`; an id form resolves through
   *  the map (and then the pointer, if any). Undefined if unresolvable. */
  readonly resolve: (ref: string, base?: JsonValue) => JsonValue | undefined;
  /** Every registered `$id`. */
  readonly ids: () => readonly string[];
}

/** The `$id` of a schema document, or undefined if it declares none. */
export function schemaId(schema: JsonValue | Carrier): string | undefined {
  if (typeof schema === "object" && schema !== null && (schema as { kind?: unknown }).kind === "relating.carrier") {
    return (schema as Carrier).id;
  }
  if (!isJsonRecord(schema)) return undefined;
  const id = schema["$id"];
  return typeof id === "string" && id !== "" ? id : undefined;
}

function schemaDocument(schema: JsonValue | Carrier): JsonValue {
  return typeof schema === "object" && schema !== null && (schema as { kind?: unknown }).kind === "relating.carrier"
    ? (schema as Carrier).schema as JsonValue
    : schema as JsonValue;
}

/**
 * Build a schema registry keyed by `$id`, optionally seeded with schemas.
 *
 * @example
 * ```ts
 * import { schemaRegistry } from "@red-cup-engineering/relating";
 *
 * const registry = schemaRegistry([{ $id: "example/doc", type: "string" }]);
 * registry.resolve("example/doc")?.["$id"]; // "example/doc"
 * ```
 */
export function schemaRegistry(initial: Iterable<JsonValue | Carrier> = []): SchemaRegistry {
  const byId = new Map<string, JsonValue>();

  const register = (schema: JsonValue | Carrier): string => {
    const id = schemaId(schema);
    if (id === undefined) throw new TypeError("schemaRegistry.register: schema has no string $id");
    byId.set(id, schemaDocument(schema));
    return id;
  };

  for (const schema of initial) register(schema);

  const get = (id: string): JsonValue | undefined => byId.get(id);

  const resolve = (ref: string, base?: JsonValue): JsonValue | undefined => {
    if (ref.startsWith("#")) return base === undefined ? undefined : resolveJsonPointer(base, ref);
    const hash = ref.indexOf("#");
    const id = hash < 0 ? ref : ref.slice(0, hash);
    const pointer = hash < 0 ? "" : ref.slice(hash);
    const doc = byId.get(id);
    if (doc === undefined) return undefined;
    return pointer === "" ? doc : resolveJsonPointer(doc, pointer);
  };

  return Object.freeze({ register, get, resolve, ids: () => Object.freeze([...byId.keys()]) });
}

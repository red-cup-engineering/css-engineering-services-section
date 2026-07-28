/**
 * @packageDocumentation
 *
 * writing/carrier — the schema-first object of the category and its representation.
 *
 * A carrier declaration is one plain JSON-Schema literal authored `as const`.
 * From it, `FromSchema<S>` reads the static type, transports read the JSON Schema
 * with its `$id`, and boundaries read the relating-owned validator. A carrier is
 * an OBJECT of the relating category; its identity is its bare `$id`, the address
 * morphism composition reads. The morphism half of the category (actions, the
 * action registry, composition) lives in `src/running/category` — the categorical
 * role split objects→writing, morphisms→running.
 *
 * The live carrier registry lives here because carrier `$ref` resolution is an
 * object-side concern: a cross-carrier `$ref` validates by delegating to the
 * referenced carrier's own validator. `running/category` composes this carrier
 * registry with its action registry into the full `CategoryRegistry`.
 */
import type { JsonRecord } from "../../codecs/text/json/core.mjs";

export type CarrierId = string;

/** A schema-first object of the category. */
export interface Carrier<T = unknown> {
  /** Runtime tag for carrier declarations. */
  readonly kind: "relating.carrier";
  /** Bare, package-rooted carrier identity. This is the composition address. */
  readonly id: CarrierId;
  /** The authored JSON-Schema literal, carrying the same `$id` as `id`. */
  readonly schema: JsonRecord & { readonly $id: CarrierId };
  /** Runtime validator projected from the schema. */
  readonly validate: (value: unknown) => value is T;
  /** Runtime assertion projected from the schema, with useful error context. */
  readonly assert: (value: unknown, context?: string) => T;
  /** Validation errors projected without throwing. */
  readonly errors: (value: unknown) => readonly string[];
}

/** The schema of a carrier declaration itself. */
export const CarrierSchema = {
  $id: "relating/carriers/kernel/carrier",
  type: "object",
  required: ["kind", "id", "schema"],
  properties: {
    kind: { const: "relating.carrier" },
    id: { type: "string", minLength: 1 },
    schema: {},
  },
  title: "Carrier",
  description: "The schema-of-a-carrier: a category object declared by one JSON-Schema literal.",
  additionalProperties: false,
} as const;

export type CarrierCarrier = FromSchema<typeof CarrierSchema>;

/** The live carrier registry: carriers declared in this process, keyed by `$id`. The
 *  morphism category (`running/category`) composes this with its action registry. */
export const carriersById = new Map<CarrierId, Carrier>();

/** Register a carrier object in the live category and return it. */
export function registerCarrier<T>(value: Carrier<T>): Carrier<T> {
  carriersById.set(value.id, value as Carrier);
  return value;
}

/** Resolve a carrier by bare `$id`. */
export function carrierById(id: CarrierId): Carrier | undefined {
  return carriersById.get(id);
}

/** The carriers visible in this process. */
export function carriers(): readonly Carrier[] {
  return Object.freeze([...carriersById.values()]);
}

// ── schema-literal carriers: no TypeBox, no Ajv, no codegen ───────────────────────────
//
// TypeBox earned its keep here on one thing: coupling a runtime JSON Schema to its compile-time
// type. A plain JSON-Schema literal authored `as const` is now the single source:
// `FromSchema<S>` interprets it at compile time, and `validateAgainst` interprets the same value at
// runtime. This is the corpus-native form: a carrier is its proof-tree `.schema.json` shape.

/** Collapse an intersection of property maps into one object type (display ergonomics only). */
type Simplify<T> = { readonly [K in keyof T]: T[K] } & {};

type FromTypeName<T> =
  T extends "string" ? string : T extends "integer" | "number" ? number :
  T extends "boolean" ? boolean : T extends "null" ? null : T extends "array" ? readonly unknown[] : unknown;

type RequiredKey<P, R> = R extends readonly (infer K extends keyof P)[] ? K : never;

type FromObject<S, Root> =
  S extends { readonly properties: infer P }
    ? S extends { readonly required: infer R }
      ? Simplify<
          { readonly [K in RequiredKey<P, R>]: FromSchema<P[K], Root> }
          & { readonly [K in Exclude<keyof P, RequiredKey<P, R>>]?: FromSchema<P[K], Root> }
        >
      : { readonly [K in keyof P]?: FromSchema<P[K], Root> }
    : Record<string, unknown>;

/** Resolve a `$ref` at the type level: a LOCAL `#/$defs/X` looks `X` up in the root schema's `$defs`
 *  and recurses (threading the root); a cross-carrier `$ref` (any other string) stays `unknown` — the
 *  loose-slot convention, since the referenced carrier's schema is not in scope here. */
type ResolveRef<Ref, Root> =
  Ref extends "#"
    ? unknown :
  Ref extends `#/$defs/${infer Name}`
    ? Root extends { readonly $defs: infer D }
      ? Name extends keyof D ? FromSchema<D[Name], Root> : unknown
      : unknown
    : unknown;

/**
 * Derive the TypeScript type of a plain JSON-Schema literal (authored `as const`) — the
 * dependency-free, codegen-free replacement for TypeBox's static interpreter. The schema literal is the single
 * source. Covers the corpus's schema vocabulary: const/enum → literals, string|integer|number|
 * boolean|null → primitives, `type: [..]` → a primitive union (nullable), array → readonly[], object →
 * required/optional properties, anyOf/oneOf → unions, local `#/$defs/X` → the resolved def. A
 * cross-carrier `$ref` resolves to `unknown` (the loose-slot convention TypeBox also used here). The
 * second `Root` parameter threads the top schema for local `$defs` resolution; callers pass one type.
 */
export type FromSchema<S, Root = S> =
  S extends { readonly $ref: infer R } ? ResolveRef<R, Root> :
  S extends { readonly const: infer C } ? C :
  S extends { readonly enum: readonly (infer E)[] } ? E :
  S extends { readonly anyOf: readonly (infer U)[] } ? FromSchema<U, Root> :
  S extends { readonly oneOf: readonly (infer U)[] } ? FromSchema<U, Root> :
  S extends { readonly type: "object" } ? FromObject<S, Root> :
  S extends { readonly type: "array"; readonly items: infer I } ? readonly FromSchema<I, Root>[] :
  S extends { readonly type: readonly (infer T)[] } ? FromTypeName<T> :
  S extends { readonly type: infer T } ? FromTypeName<T> :
  unknown;

/** Compatibility name for carriers declared from plain JSON-Schema literals. */
export type DataCarrier<T> = Carrier<T>;

type PlainSchema = Record<string, unknown>;

/** Whether a value matches one JSON-Schema primitive/compound `type` name. */
function matchesType(name: string, value: unknown): boolean {
  switch (name) {
    case "object": return typeof value === "object" && value !== null && !Array.isArray(value);
    case "array": return Array.isArray(value);
    case "string": return typeof value === "string";
    case "integer": return typeof value === "number" && Number.isInteger(value);
    case "number": return typeof value === "number";
    case "boolean": return typeof value === "boolean";
    case "null": return value === null;
    default: return true;
  }
}

function validateObject(schema: PlainSchema, value: Record<string, unknown>, path: string, errs: string[], root: PlainSchema): boolean {
  let ok = true;
  const props = (schema["properties"] ?? {}) as Record<string, PlainSchema>;
  const required = Array.isArray(schema["required"]) ? (schema["required"] as string[]) : [];
  for (const key of required) if (!(key in value)) { errs.push(`${path}/${key} is required`); ok = false; }
  for (const [key, sub] of Object.entries(props)) {
    if (key in value && value[key] !== undefined && !validateAgainst(sub, value[key], `${path}/${key}`, errs, root)) ok = false;
  }
  if (schema["additionalProperties"] === false) {
    for (const key of Object.keys(value)) if (!(key in props)) { errs.push(`${path}/${key} is not allowed`); ok = false; }
  }
  return ok;
}

function validateArray(schema: PlainSchema, value: readonly unknown[], path: string, errs: string[], root: PlainSchema): boolean {
  let ok = true;
  const minItems = schema["minItems"];
  if (typeof minItems === "number" && value.length < minItems) {
    errs.push(`${path === "" ? "/" : path} must have at least ${minItems} item${minItems === 1 ? "" : "s"}`);
    ok = false;
  }
  const maxItems = schema["maxItems"];
  if (typeof maxItems === "number" && value.length > maxItems) {
    errs.push(`${path === "" ? "/" : path} must have at most ${maxItems} item${maxItems === 1 ? "" : "s"}`);
    ok = false;
  }
  const items = schema["items"];
  if (Array.isArray(items)) {
    for (const [i, sub] of items.entries()) {
      if (i < value.length && !validateAgainst(sub as PlainSchema, value[i], `${path}/${i}`, errs, root)) ok = false;
    }
    if (schema["additionalItems"] === false && value.length > items.length) {
      for (let i = items.length; i < value.length; i += 1) errs.push(`${path}/${i} is not allowed`);
      ok = false;
    }
    return ok;
  }
  if (items !== undefined) {
    for (const [i, item] of value.entries()) {
      if (!validateAgainst(items as PlainSchema, item, `${path}/${i}`, errs, root)) ok = false;
    }
  }
  return ok;
}

/** Resolve a `$ref` at runtime: LOCAL `#/$defs/X` → the `$defs.X` node of `root`; a cross-carrier
 *  `$ref` → the registered carrier's own validator (delegation); unknown foreign ref → loose slot. */
function resolveRefRuntime(ref: string, value: unknown, root: PlainSchema): { readonly local: PlainSchema } | { readonly ok: boolean } {
  if (ref === "#") return { local: root };
  if (ref.startsWith("#/$defs/")) {
    const name = ref.slice("#/$defs/".length);
    const defs = (root["$defs"] ?? {}) as Record<string, PlainSchema>;
    return name in defs ? { local: defs[name]! } : { ok: true };
  }
  const carrier = carriersById.get(ref);
  return { ok: carrier === undefined || carrier.validate(value) };
}

/**
 * The relating-owned structural validator — the dependency-free replacement for Ajv. It walks the
 * SAME plain JSON-Schema literal that `FromSchema` interprets at the type level, so the runtime check
 * and the compile-time type agree BY CONSTRUCTION (one schema, two interpreters; no drift). Covers the
 * corpus's closed schema vocabulary (object/array/primitives/const/enum/anyOf/oneOf/nullable, local
 * `#/$defs/X`). A cross-carrier `$ref` validates by DELEGATING to that carrier's own validator in the
 * registry — category-native ref resolution; an unregistered foreign ref is a loose slot (accepted).
 */
function validateAgainst(schema: PlainSchema, value: unknown, path: string, errs: string[], root: PlainSchema): boolean {
  const at = path === "" ? "/" : path;
  if (typeof schema["$ref"] === "string") {
    const resolved = resolveRefRuntime(schema["$ref"], value, root);
    if ("local" in resolved) return validateAgainst(resolved.local, value, path, errs, root);
    if (!resolved.ok) { errs.push(`${at} is not a ${String(schema["$ref"])}`); return false; }
    return true;
  }
  if ("const" in schema) {
    if (value !== schema["const"]) { errs.push(`${at} must be ${JSON.stringify(schema["const"])}`); return false; }
    return true;
  }
  if (Array.isArray(schema["enum"])) {
    if (!(schema["enum"] as unknown[]).includes(value)) { errs.push(`${at} must be one of ${(schema["enum"] as unknown[]).map((e) => JSON.stringify(e)).join(", ")}`); return false; }
    return true;
  }
  const alts = (schema["anyOf"] ?? schema["oneOf"]) as PlainSchema[] | undefined;
  if (Array.isArray(alts)) {
    if (alts.some((alt) => validateAgainst(alt, value, path, [], root))) return true;
    errs.push(`${at} matches no alternative`); return false;
  }
  const types = Array.isArray(schema["type"]) ? (schema["type"] as string[]) : schema["type"] === undefined ? [] : [schema["type"] as string];
  if (types.length > 0 && !types.some((t) => matchesType(t, value))) { errs.push(`${at} must be ${types.join(" | ")}`); return false; }
  if (types.includes("string") && typeof value === "string") {
    const minLength = schema["minLength"];
    if (typeof minLength === "number" && value.length < minLength) { errs.push(`${at} must have length at least ${minLength}`); return false; }
    const pattern = schema["pattern"];
    if (typeof pattern === "string" && !(new RegExp(pattern).test(value))) { errs.push(`${at} must match ${pattern}`); return false; }
  }
  if ((types.includes("integer") || types.includes("number")) && typeof value === "number") {
    const minimum = schema["minimum"];
    if (typeof minimum === "number" && value < minimum) { errs.push(`${at} must be >= ${minimum}`); return false; }
  }
  if (types.includes("object") && matchesType("object", value)) return validateObject(schema, value as Record<string, unknown>, path, errs, root);
  if (types.includes("array") && Array.isArray(value)) return validateArray(schema, value, path, errs, root);
  return true;
}

/**
 * Declare a carrier from a plain JSON-Schema literal — NO TypeBox, NO codegen, NO Ajv. The `as const`
 * schema is the single source; the type is `FromSchema<typeof schema>`, the validator is the
 * relating-owned `validateAgainst` over the same literal, and the `$id` registers in the one category.
 * This is now the normative carrier constructor.
 *
 * @example
 * ```ts
 * const fourSchema = { $id: "computing/four", type: "object", required: ["value"],
 *   properties: { value: { enum: ["t", "f"] } } } as const;
 * export type Four = FromSchema<typeof fourSchema>;     // inferred, never generated
 * export const four = carrierFrom(fourSchema);          // validate/assert, registered $id
 * ```
 */
export function carrierFrom<const S extends { readonly $id: string }>(schema: S): Carrier<FromSchema<S>> {
  const id = schema.$id;
  const root = schema as unknown as PlainSchema;
  const value: Carrier<FromSchema<S>> = Object.freeze({
    kind: "relating.carrier" as const,
    id,
    schema: schema as unknown as JsonRecord & { readonly $id: CarrierId },
    validate: (candidate: unknown): candidate is FromSchema<S> => validateAgainst(root, candidate, "", [], root),
    assert: (candidate: unknown, context: string = id): FromSchema<S> => {
      const errs: string[] = [];
      if (validateAgainst(root, candidate, "", errs, root)) return candidate as FromSchema<S>;
      throw new TypeError(`${context}: ${errs.join("; ")}`);
    },
    errors: (candidate: unknown): readonly string[] => {
      const errs: string[] = [];
      validateAgainst(root, candidate, "", errs, root);
      return Object.freeze(errs);
    },
  });
  carriersById.set(id, value as unknown as Carrier);
  return value;
}

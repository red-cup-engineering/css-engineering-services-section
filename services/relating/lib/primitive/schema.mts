/**
 * primitive/schema - pure type-level reading of schema carrier shapes.
 *
 * A schema literal in `lib/` is mathematical carrier shape, not runtime
 * validation machinery. `FromSchema<S>` interprets the shape at compile time
 * without importing the package carrier registry.
 */

/** Collapse an intersection of property maps into one object type. */
type Simplify<T> = { readonly [K in keyof T]: T[K] } & {};

type FromTypeName<T> =
  T extends "string" ? string :
  T extends "integer" | "number" ? number :
  T extends "boolean" ? boolean :
  T extends "null" ? null :
  T extends "array" ? readonly unknown[] :
  unknown;

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

type ResolveRef<Ref, Root> =
  Ref extends "#"
    ? unknown :
  Ref extends `#/$defs/${infer Name}`
    ? Root extends { readonly $defs: infer D }
      ? Name extends keyof D ? FromSchema<D[Name], Root> : unknown
      : unknown
    : unknown;

/**
 * Derive the TypeScript type of a plain JSON-Schema literal authored `as const`.
 *
 * This is pure carrier-shape reading. Runtime validation and registry-backed
 * carrier objects belong in `src/carriers`.
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

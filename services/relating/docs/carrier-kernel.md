# Carrier Kernel

The carrier kernel is the smallest useful product surface in `@emsenn/relating`: declare an object once and get its TypeBox schema, Ajv validator, JSON Schema `$id`, registry entry, and composition address.

This is the package's answer to a very ordinary Node problem.
Most projects write the same object as a TypeScript type, runtime validator, OpenAPI schema, route assumption, and log shape.
Relating starts by collapsing those copies into one carrier declaration.

## Public Surface

For ordinary package code, import `carrier` and `schemaCarrier` from the root:

```ts
import { carrier, schemaCarrier } from "@emsenn/relating";
```

For registry inspection and schema resolution, use the typing subpath:

```ts
import {
  carrier,
  schemaCarrier,
  registeredCategory,
  schemaRegistry,
  schemaId,
  morphismCarrier,
} from "@emsenn/relating";
```

Use:

- `carrier(id, shape)` for object-shaped TypeBox carriers.
- `schemaCarrier(id, schema)` when you already have a TypeBox schema.
- `registeredCategory` to inspect the process-local live category.
- `schemaRegistry([...])
  ` to resolve carrier `$id` strings and JSON pointers.
- `morphismCarrier(action)` to serialize the non-closure face of an action.

## API Reference

Generated TypeDoc for `@emsenn/relating` is the closest reference for the carrier kernel.
It includes the carrier/action declarations from `typing/kernel`, the schema registry, and the structural realization helpers.
This page is the product reading: why the one authored carrier value matters and where it sits in the larger relating descent.

## What It Guarantees

A carrier declaration gives you:

- `id`, the bare path-form identity used for composition.
- `schema`, the JSON Schema document with the same `$id`.
- `validate(value)`, an Ajv-backed type guard.
- `assert(value, context?)
  `, validation with a typed return or a useful error.
- `errors(value)`, validation errors without throwing.

The kernel does not make a whole application from that one object.
The broader operation substrate adds actions, RMN, dispatch, OpenAPI, MCP, HTTP, witnesses, and docs.
The kernel is the object floor those projections stand on.

When you need the schema's structural TypeScript-shaped projection, use the schema-realization helpers described in [Schema realization](schema-realization.md).
That projection forgets runtime refinements; the carrier schema remains the law.

## Example

`examples/carrier-kernel.mjs` shows:

- a `note` object carrier and a string summary carrier
- validation success and validation error projection
- schema registry resolution by carrier `$id`
- pointer resolution into a registered schema document
- morphism serialization with the executable closure excluded
- composition by codomain/domain `$id` equality

Run it after a build:

```sh
pnpm run build
node examples/carrier-kernel.mjs
```

The output is intentionally plain JSON so it can be read as a small contract fixture.

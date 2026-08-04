# Schema Realization

`@emsenn/relating` includes a small schema-realization pipeline:

```text
JSON Schema -> StructuralType -> TypeScript declaration text
```

The first step, `realize`, is intentionally a forgetful functor.
A JSON Schema is a predicate over JSON values; a TypeScript structural type is a shape.
The realization keeps shape and forgets refinements that have no structural image: `minLength`, `pattern`, numeric ranges, formats, conditionals, and similar runtime predicates.
Those predicates are not lost from the system.
They remain the carrier schema's validation law.

This is not a general code generator.
It is the package's honest boundary between "schema as runtime law" and "type-shaped projection for readers, editors, and declarations."

## Public Handles

Import from the typing subpath:

```ts
import {
  realize,
  realizeDefs,
  printType,
  generateDeclaration,
} from "@emsenn/relating";
```

Use:

- `realize(schema)` to read a JSON Schema as a `StructuralType`.
- `realizeDefs(schema)` to read `$defs` / `definitions` as named structural types.
- `printType(type)` to print a `StructuralType` as a readonly TypeScript type expression.
- `generateDeclaration(schema, rootName)` to print a `.d.mts`-style declaration for the root schema and its local definitions.

## API Reference

Generated TypeDoc for `@emsenn/relating` splits this pipeline into `carriers/kernel/structural`, `carriers/kernel/realize`, `writing/print`, and `carriers/kernel/registry`.
Those references name the callable functions and data constructors.
This page explains the boundary: schemas remain runtime law, while structural types and printed declarations are projections.

The structural carrier supports:

- primitives: `string`, `number`, `boolean`, `null`
- literals from `const` and `enum`
- arrays and tuples
- object products from `properties` and `required`
- unions from `anyOf`, `oneOf`, and type arrays
- intersections from `allOf`
- local `$ref` names as fixpoints

Cross-document `$ref` values are realized as `unknown` by this pipeline.
The reference still matters to the schema registry and carrier graph, but this printer does not invent import paths.
A registry-aware cross-file declaration printer would be a later surface.

## Example Shape

`examples/schema-realization.mjs` declares a carrier whose schema includes both structural facts and refinements:

```ts
const noteCarrier = carrier("example/schema-realization/note", {
  kind: Type.Literal("example.schemaRealization.note"),
  title: Type.String({ minLength: 1, pattern: "^[A-Z].*" }),
  tags: Type.Array(Type.String({ minLength: 1 })),
  status: Type.Union([Type.Literal("draft"), Type.Literal("ready")]),
});
```

The carrier validator rejects an empty title.
The realized structural type still prints `title` as `string`, because `minLength` and `pattern` are runtime predicates, not structural TypeScript facts.

Run it after building:

```sh
npm run build
node examples/schema-realization.mjs
```

The example also shows local `$defs` becoming named declarations while an external carrier `$ref` becomes `unknown` in the standalone printed type.

## Mathematical Boundary

The surrounding architecture notes describe the package's larger discipline: define data once, keep JSON Schema / TypeBox as the canonical runtime contract, and project outward to TypeScript, transports, OpenAPI, MCP, docs, and future polyglot runtimes.
`realize` is the computable direction of that story:

```text
schema predicate -> structural type
```

The reverse direction is not canonical.
Many different schemas can have the same structural TypeScript shape because refinements are extra predicates.
That is why the package keeps the carrier schema as source of truth and treats printed declarations as projections, not authority.

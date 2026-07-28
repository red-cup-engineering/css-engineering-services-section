---
title: "LSP as computing: the IN reflection face over carriers and actions"
description: "Language Server Protocol is the computing/IN face projected over relating's carrier + action + proof graph: definition jumps to a carrier $id declaration, references read the action registry's uses of that carrier, hover exposes the FromSchema structural type plus docstring, and diagnostics are validateAgainst failures. This is the inversion of consuming lsp-mcp: the corpus now projects an LSP surface."
date: 2026-06-26
status: built
---

# LSP as computing

Language Server Protocol is the **computing/IN reflection face**: a request asks the corpus what it already knows about one carrier, action, or validation obligation.
This is the inversion of how agents currently consume `lsp-mcp`.
Instead of asking an external TypeScript server about code, `@emsenn/computing` projects an LSP-shaped surface over the relating kernel's carrier and action graph.

The important point is negative: this is not a second ontology of files, symbols, AST nodes, or editor facts.
The LSP surface is a thin protocol reading of existing things:

| LSP method | corpus reading | implementation source |
|---|---|---|
| `textDocument/definition` | jump to the carrier's `$id` declaration | `Carrier.id` and the carrier schema literal |
| `textDocument/references` | list action-registry uses of that carrier | action `domain` / `codomain` carrier ids and `$ref`s |
| `textDocument/hover` | show the carrier's `FromSchema` type and docstring | `realize` + `printType` over the same schema literal |
| `textDocument/diagnostic` | report carrier admission failures | `carrier.errors`, the public face of relating's `validateAgainst` |

So an LSP request is **reflection-on-corpus**: knowing-that-you-know.
The caller does not ask for a separate language model or editor database to infer meaning.
It asks the carrier/action graph to reflect its own declarations, uses, types, and admissibility failures through a standard request envelope.

## Named-system registry entry

- **Name:** LSP/COMPUTING - Language Server Protocol as computing reflection.
- **One-line pitch:** editor-grade semantic navigation as a computing/IN face over relating carriers and actions: definition, references, hover, and diagnostics are all projections of the live carrier/action graph.
- **Realizing files:** `lib/computing/src/lsp.mts`, `lib/computing/test/lsp.test.mjs`, `lib/computing/package.json`, `lib/computing/src/index.mts`.
- **Spec note:** this note.

## Built shape

The implementation is intentionally small:

- carriers are still ordinary `as const` JSON-Schema literals realized through `carrierFrom` and `FromSchema`;
- the JSON-RPC version and method names are inline constants, not a dependency;
- virtual LSP documents are generated from the carrier schemas and action faces;
- handler functions (`definition`, `references`, `hover`, `diagnostics`) are pure projections over supplied carriers/actions, with the package default using computing's carriers/actions plus the live relating registry;
- `handle` accepts the dependency-free JSON-RPC envelope and dispatches to those handlers.

The law test builds a small carrier graph and one action, then checks that:

- definition returns the target carrier's `$id` declaration location;
- hover contains the target carrier id, structural `FromSchema` type, and docstring;
- references return the action use of the target carrier;
- diagnostics return exactly the target carrier validator's error messages;
- the JSON-RPC envelope routes a hover request without importing an LSP library.

## Placement

This belongs in `computing`, not in `organizing-with-vscode-agents` or a site.
Editor integration can consume it later, but the standard surface is earned by the IN-face math: a stateful semantic server answers questions about the meaning of a corpus.
The runtime may be mounted through MCP, VS Code, HTTP, stdio, or a cockpit, but those mounts are projections of this computing reflection face.

This also clarifies the standards map: LSP/DAP was previously a candidate under `knowing` scale-1.
The built surface here is the scale-2 / shared-corpus version: `computing` projects an LSP face over carrier/action declarations, while single-agent memory/reflection remains a neighboring `knowing` reading.

## Cross-links

- [`2026-06-25-relating-family-of-named-systems.md`](2026-06-25-relating-family-of-named-systems.md)
  - add LSP/COMPUTING to the product-plane registry.
- [`2026-06-25-protocols-as-faculty-projections.md`](2026-06-25-protocols-as-faculty-projections.md)
  - promote LSP from candidate reflection-on-corpus to built computing/IN.
- [`2026-06-25-codecs-on-faces-activitypub-across-scales.md`](2026-06-25-codecs-on-faces-activitypub-across-scales.md)
  - supplies the rule that standards live on the face whose math makes them
    possible.

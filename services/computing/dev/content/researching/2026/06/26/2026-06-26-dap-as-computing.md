---
title: "DAP as computing: the IN stepping face over RMN reduction"
description: "Debug Adapter Protocol is the computing/IN temporal sibling of LSP: a debug session drives relating's RMN evaluator. Breakpoints name settling stages, next exposes one-step reducts, stepIn/stepOut move through redex context, stackTrace reads the evaluation context, variables read the bound environment, and continue reaches normal form."
date: 2026-06-26
status: built
---

# DAP as computing

Debug Adapter Protocol is the **computing/IN stepping face** over RMN reduction.
LSP asks the corpus what a carrier/action declaration means at a position; DAP asks the evaluator where a term is in its settling.

This is not a second interpreter.
A DAP debug session is a stateful cursor over the existing relating kernel:

| DAP method | corpus reading | implementation source |
|---|---|---|
| `setBreakpoints` | a breakpoint is a named settling stage | session stage counter over RMN reduction |
| `next` | one-step reducts of the focused term | `step(term)` |
| `stepIn` | move the cursor into the next reducible redex | RMN term context traversal, with reducts read by `step` |
| `stepOut` | move the cursor to the enclosing term | the stored RMN focus path |
| `stackTrace` | the evaluation context from focused redex to whole term | root-to-focus term path, projected as DAP frames |
| `variables` | the term's bound environment and current reducts | de-Bruijn lambda binders plus `step(focusedTerm)` |
| `continue` | evaluate-to-normal-form | `evaluate(term)` |

So a DAP request is **walking the RMN reduction**.
The debug adapter does not own semantics; it gives a standard temporal protocol face to the CHL evaluator already exported by `@emsenn/relating`.

## Named-system registry entry

- **Name:** DAP/COMPUTING - Debug Adapter Protocol as RMN reduction walking.
- **One-line pitch:** debugger-grade stepping as a computing/IN face over relating terms: breakpoints are settling stages, stack frames are evaluation contexts, variables are bound environments, and continue is normal-form evaluation.
- **Realizing files:** `lib/computing/src/dap.mts`, `lib/computing/test/dap.test.mjs`, `lib/computing/package.json`, `lib/computing/src/index.mts`.
- **Spec note:** this note.

## Built shape

The implementation follows the LSP sibling's discipline:

- carriers are authored as `as const` schema literals and realized through `carrierFrom` / `FromSchema`;
- JSON-RPC version and DAP method names are inline constants, with no protocol dependency;
- the session carrier references relating's existing `relating/term/tm` schema instead of duplicating the recursive RMN grammar;
- `projectDap({ term })` creates a stateful DAP projection with methods for initialize, launch, setBreakpoints, stackTrace, scopes, variables, next, stepIn, stepOut, continue, disconnect, and handle;
- the only reduction semantics come from `@emsenn/relating`'s `step` and `evaluate`.

The behavioral tests prove:

- `next` returns exactly the same reduct list as `step(term)` and advances to the first reduct;
- `continue` reaches exactly `evaluate(term)`;
- `stepIn` focuses a real reducible subterm, `stepOut` returns to its enclosing term, and `stackTrace` exposes that real RMN context;
- `variables` exposes the de-Bruijn binder environment at the focused term plus the same one-step reducts the evaluator admits;
- JSON-RPC request handling routes DAP commands without importing a DAP library.

## Why DAP is computing

Computing here is shared settling.
RMN terms are the behavior-as-data substrate for pure carrier morphisms, and relating's evaluator is the proof kernel for their reduction.
A debugger is therefore not an outside operational metaphor: it is the IN face of computation made walkable.

The standard DAP nouns land directly:

- a **breakpoint** is a settling stage the session can stop at;
- **step/next** is the one-step reduct relation;
- **stepIn** enters a redex under the current evaluation context;
- **stepOut** returns to the enclosing term;
- the **stack** is the evaluation context from focused redex back to the whole term;
- **variables** are the term's de-Bruijn bound environment at that focus;
- **continue** is evaluate-to-normal-form.

That is why the package belongs in `computing` beside LSP.
The outer transport could later be VS Code DAP, MCP, stdio, HTTP, or a cockpit actuator, but the lawful face is already this computing projection over RMN reduction.

## Cross-links

- [`2026-06-26-lsp-as-computing.md`](2026-06-26-lsp-as-computing.md) - the semantic sibling: LSP reflection over carriers and actions.
- [`2026-06-25-protocols-as-faculty-projections.md`](2026-06-25-protocols-as-faculty-projections.md)
  - promotes the LSP/DAP row to built computing/IN coverage.
- `lib/relating/src/evaluating/index.mts` - RMN `step`, `dev`, and `evaluate` are the evaluator being driven.

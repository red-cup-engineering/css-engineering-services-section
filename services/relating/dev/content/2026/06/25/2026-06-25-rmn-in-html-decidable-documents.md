# RMN-in-HTML: decidable executable documents

**Date:** 2026-06-25 **Subpaths:** `@emsenn/relating/writing` (`rmn`, the projector gradings) **Sources:** [src/writing/rmn.mts](../../../src/writing/rmn.mts), [src/writing/projector.mts](../../../src/writing/projector.mts), [lib/notating/index.mts](../../../lib/notating/index.mts), [src/evaluating/index.mts](../../../src/evaluating/index.mts)

---

## The result

Every representation carries two gradings (see the projector kernel): a content **corner** ⟨addressability, assertivity⟩ — the Belnap bilattice **4** — and a completion **rung** (`identity ⊂ scott ⊂ non-monotone ⊂ turing`).
The decidability invariant says a codec that *reads/completes* a resource must do so at a decidable rung (`identity` or `scott`), never `non-monotone` or `turing`.

General **HTML is `⊤ @ turing`**: its scripts run to a final DOM and "does it terminate" is undecidable.
That is why `htmlProjector` reads only static markup.

**RMN changes this.** RMN is the JSON s-expression IR for `RelMath.
CHL.
Tm` — the de-Bruijn STLC with products and unit whose Church–Rosser/confluence property is Lean-certified.
The current Node package admits only closed, well-typed RMN terms at this boundary and settles them with the package evaluator.
So the implemented claim is the **`scott`**-rung admission/settlement gate, not Turing execution and not a package-shipped Lean proof of strong normalization for every evaluator extension.

> **HTML + arbitrary JS = `⊤ @ turing`** — inadmissible to read/settle. **HTML + RMN-only = `⊤ @ scott`** — total, decidable, admissible.

The RMN restriction is the *gauge* that keeps an executable document inside the package-admitted rungs.
It is different from a sandbox: WASM/JS sandboxes *contain* Turing-complete code and you trust the sandbox to bound it; RMN scripts are first parsed as package terms and rejected unless they are closed and well-typed.
Admission-carrying, not trust-carrying.

## What landed

- `rmnProjector` — `restrict(jsonProjector)` to closed well-typed RMN terms; corner `assertion`, rung `scott`.
  The first codec carrying a non-`identity` decidable rung; `readIsDecidable(rmnProjector)` holds because `scott` is decidable.
- `isRelationalTerm` / `parseRmn` / `settleRmn` — recognize, parse+type-check, and evaluate (terminating) an RMN body, via `@emsenn/relating/evaluating`.
- `htmlIsRelational(html)` — the gate: a document is admitted iff every `<script>` is `type="application/rmn+json"` and the body is a closed well-typed term.
  One JS script fails it.
  `extractRelationalScripts` / `settleRelationalHtml` read and settle the bodies.
- media type `application/rmn+json` → corner `assertion` in negotiation.

## What it means for the format family

- **JavaScript** is the Turing execution *target*, never a source: we may *emit* JS (a `turing` write) but never *read/settle* it.
  RMN is the canonical source.
- **JSON** is RMN's own syntax: a JSON value reads either as inert `data` or, when it is a well-typed `Tm`, as a total executable morphism (`scott`).
  No new syntax.
- **JSON-LD / TTL** gain a *total* rules layer: RMN over EAVT/triples with `fold`/`settle` is a Datalog-class monotone closure (`scott`) whose results merge coordination-free (CALM) — the terminating, certified replacement for SWRL/N3.
- **HTML** becomes a relational program document: markup (`assertion`) + data (EAVT) + morphism (RMN) + transport projections.
  It carries everything but the interpreter — relating `src/` is the RMN evaluator that "everyone has," the total analogue of a JS engine.

## vs 2026 best practice

WASM is portable + deterministic but Turing-complete and opaque; RMN wins on decidability, transparency (homoiconic JSON), and morphism composition, and can be compiled *to* WASM for speed while staying the canonical semantic form.
Against HTMX/HATEOAS, RMN-in-HTML is the principled version: the next-state morphism travels with the document, decidably.

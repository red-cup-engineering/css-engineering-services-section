---
title: "Package composition: a package's apex mounts at its domain carrier's node in the host namespace"
description: "The composition mechanism behind the manifold: a package whose domain is carrier X mounts its apex at X's $id-node inside the host package's namespace, so its morphisms appear *at that node*. communicating (endomorphic on the meme carrier, meme → meme) mounts at relating's `meme` node as a self-loop. This generalizes today's module-tail `tileManifold` to carrier-node mounting, enabled by the bare-descent-path $id (decision #1)."
date: 2026-06-21
status: design
---

# Package composition by carrier-node mounting

## The idea (user's framing, made precise)

> "Mount packages in the namespace of other packages such that the apex of `communicating` mounts naturally as the morphism at the domain of the node of which it is the domain in `relating-experimental`."

Restated: a package's **namespace is a tree of carrier nodes** — one node per carrier, located at the carrier's `$id`, which (by [decision #1](2026-06-21-decision-schema-id-scheme.md)) **is the bare descent path**.
A second package whose **domain carrier is node X** mounts its **apex** (`induceBins` discovery carrier) **at X's node-path inside the host's namespace**.
So the guest package's morphisms appear *at the node they act on* — you navigate the host namespace to a carrier, and the operations available there are exactly the packages whose domain is that carrier.

For `communicating` (endomorphic on the meme carrier, meme → meme) ([note](2026-06-21-communicating-as-end-meme-semiotics.md)): its domain (and codomain) is the `meme` carrier, whose `$id` is `relating/articulating/predicating/positing/meme`.
So communicating mounts at relating's **meme node** — e.g. `…/positing/meme` — and, being an *endomorphism*, it mounts as a **self-loop** there: at the meme node, communicating's morphisms both consume and produce a meme.
That self-loop is exactly where **iteration enters** (the loop/spiral of unlimited semiosis): you can keep applying meme→meme at the node.

## Why this is the right shape

- **The `$id` is already the path.** Decision #1 made every carrier's identity its bare descent path.
  That same string is therefore a *namespace location*.
  Mounting "at the carrier node" needs no new addressing scheme — the `$id` is the URL path.
- **Carrier identity is the composition glue.** A guest's `domainSchema.$ref` names a host carrier `$id`; the schema registry (`typing/registry`) resolves it.
  So "does guest G compose onto host H at carrier X" is a pure `$id` match — the same equality `tileManifold` already uses (`consumer.domainSchema.$ref === producer.codomainSchema.$ref`).
- **Cut composes across the boundary.** Two morphisms compose (the pipe / linear-logic cut) iff the codomain carrier of one equals the domain carrier of the next — an `$id` equality.
  Carrier-node mounting *places* morphisms so that this composition is spelled by the URL: a value sitting at node X can be fed to any morphism mounted at X.

## Relationship to today's `tileManifold` (a generalization, not a replacement)

`tileManifold` (`acting/serving.mts`) today tiles **module-to-module**: module M mounts at `/<producer-module>/<M>` where some producer action's `codomainSchema.$ref` equals some M action's `domainSchema.$ref`; the path spells *module names*.
That is the **degenerate, module-grained case** of carrier-node mounting:

| today (module tail) | general (carrier node) |
|---|---|
| mount at `/<producerModule>/<module>` | mount at the **domain carrier's `$id` path** |
| path = chain of module names | path = the carrier's **descent path** (its `$id`) |
| edge = any action's codomain `$id` ∈ any action's domain `$id` | same `$id` match, but the *mount point is the carrier node itself* |
| a source mounts at root | a package over a host carrier mounts inside the **host's** namespace |

The generalization: instead of tiling guests under *producer modules*, materialize the **host's carrier-node tree** (from its schemas' `$id`s) as the namespace, and mount each guest at its **domain carrier's node**.
An endomorphism mounts as a self-loop at its node; a non-endo morphism `X → Y` mounts at X and *links to* Y's node (the URL hop spells the cut).

## Implementation sketch (for later — not this session)

1. **Materialize the host namespace tree** from the host package's carrier schemas: each schema `$id` (a descent path) is a node; the tree is the prefix order on those paths.
  (relating's nodes: `…/utterance`, `…/predicating/…`, `…/positing/meme`, …)
2. **Mount a guest at its domain-carrier node.** For a guest mount whose actions' `domainSchema.$ref` = carrier `$id` C, place its apex at C's node-path.
  For an endomorphism (domain `$id` = codomain `$id`), it is a self-loop at that node.
3. **Generalize `tileManifold`** so the mount path of a guest is the `$id`-node of its domain carrier within the host's namespace, falling back to the current module-tail behavior when no host carrier node matches (so nothing regresses).
4. **Route** as today (`routeManifold`: longest-base-path match → the mount's `routeRequest`), now over carrier-node base paths; each call still witnesses into its own package's EAVT ledger.

## The load-bearing property: four faces at every node (self-similarity)

The point of mounting at every carrier node is **self-similarity / scale-invariance**: every node — whether it is a package, a module, a mounted package, or a submodule of one — exposes the **same four-faced interface** (CLI / MCP / OpenAPI / WebUX, the functorial images of its apex via `routeRequest`).
A caller can use the API at *any* path of the system without knowing what *kind* of thing lives there.
The part looks like the whole.

The precise categorical statement: the four-faced interface is a **sheaf on the namespace site**.
The namespace (the carrier-node tree, ordered by `$id` prefix) is the site; the four faces are the sections; they are defined locally at every open (every node/path) and glue, so a uniform section is available *everywhere*.
That uniformity is what makes the namespace navigable as **one space** rather than a directory of differently-shaped endpoints.

State today: the projection (`routeRequest`) is already apex-granularity-agnostic —
it gives the four faces to *any* `induceBins` apex, package- or module-grained (the
Phase-2 demo mounted at module granularity). What is missing is the systematic layer
that induces a four-faced apex at **every** node automatically; that is this note's
work. **Acceptance for that layer:** `GET <anyNodePath>/openapi.json`, `POST
<anyNodePath>/mcp`, `GET <anyNodePath>/` (WebUX), and the CLI/dispatch face all
resolve at every carrier node of a served subtree — package, module, mount, and
submodule alike — with no per-node hand-wiring.

## Categorical reading

A package over an object presents (via its generating morphisms) a **sub-monoid of the endomorphism monoid** / a slice of the **over-category** at that object — not the full monoid.
Carrier-node mounting *places* that sub-monoid at the object's location in the host's namespace.
Cross-package composition is then literal: the host provides the object (its carrier node), the guest provides the arrows at that node, and the cut (codomain `$id` = next domain `$id`) composes them — across the package boundary, with no shared code, only shared carrier identity.

## Open questions

- How the host's carrier-node tree is enumerated at serve time (from loaded schemas vs. a built manifest) — ties to how the registry is populated from disk.
- Endo self-loop URL semantics: GET at the node lists the loop's morphisms; POST runs one; iterating is repeated POSTs (the step-wise loop).
- Multiple guests over one carrier node (e.g. several meme-endomorphism packages): co-mount at the node; disambiguate by verb.
- Interaction with the existing module-tail tiling during the migration (keep both; carrier-node wins when a host node matches).

## Provenance

Grounded in: the live `tileManifold`/`routeManifold`/`serveManifold` (`acting/serving.mts`), the schema registry (`typing/registry.mts`), the bare-descent-path `$id` ([decision #1](2026-06-21-decision-schema-id-scheme.md)), and `communicating` (endomorphic on the meme carrier, meme → meme) ([note](2026-06-21-communicating-as-end-meme-semiotics.md)).
The carrier-node generalization and categorical reading are my synthesis of those settled pieces (the distilled record of the prior sessions in dev/docs/notes), offered for review.

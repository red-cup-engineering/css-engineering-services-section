# Morphism Inspection

`@emsenn/relating` can serialize an action declaration as a morphism carrier and then inspect that carrier through the package's own action apex.

This is a small surface, but it matters: once a carrier morphism can carry its body as RMN data, a package can ask useful questions about that body without opening a source file or reverse-engineering a route handler.

## Public Handles

- `morphismCarrier(action)` serializes an action declaration into JSON data.
- `actions` is the package's registered action list.
- `induceBins(actions)` builds the dispatchable action apex.
- the registered `inspect` action reads a `MorphismCarrier` JSON value and returns an `ActionInspection` report.
- `actionIrAudit(actions)` and `freeTsActions(actions)` classify the larger action family as morphisms or boundaries.

## What Inspection Reports

For a morphism carrier, `inspect` reports:

- the action verb
- whether a `runTerm` is present
- declared domain and codomain `$id`s, when present
- whether the term is closed
- term size
- the RMN constructors used by the term

The report is intentionally small.
It does not prove semantic equivalence, and it does not type-check arbitrary domain primitives.
It is a boundary-level introspection read over the serialized morphism carrier.

The action-family audit is the stronger structural check.
A true carrier-to-carrier morphism is any action with both a domain and codomain carrier id.
Such an action should carry `runTerm`; `freeTsActions(actions)` returns the remaining true morphisms whose behavior is still hidden in a TypeScript closure.
Boundary actions are not failures: admissions, transports, and host-level inspection can be named as boundaries and left outside the RMN gate.

## Why It Is A Product Surface

Most Node libraries hide behavior behind functions, handlers, or generated routes.
`@emsenn/relating` can expose a carrier morphism as data:

```text
action declaration -> morphism carrier -> inspection report
```

That makes API review, generated docs, CI gates, agent tooling, and examples read from the same substrate.
A package can fail a gate because a true carrier-to-carrier morphism still has a free TypeScript body, or it can list the RMN vocabulary used by its public operations.

This is not a separate reflection framework.
It is a consequence of the existing carrier/action/RMN discipline.

## Smallest Probe

Run:

```sh
pnpm run build
node examples/morphism-inspection.mjs
```

The example serializes the package's `conflate-charge` and `inspect` actions as morphism carriers, dispatches those carriers through `inspect`, and prints the action-family audit summary.
It also asserts the current product invariant:

- every true carrier morphism in the package action family carries `runTerm`
- `conflate-charge` is a closed RMN body over the FOUR charge-value carrier
- `inspect` remains an untyped boundary read rather than pretending to be a pure RMN morphism

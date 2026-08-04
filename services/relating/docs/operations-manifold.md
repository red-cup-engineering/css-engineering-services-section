# Operations Manifold Topology

The operations-manifold surface reads an induced action family as topology: which carriers the package consumes, which carriers it produces, which local actions compose by carrier identity, and where the visible frontier still lacks a local producer or consumer.

This is not a route table and not an operations-site registry.
It is derived from the same discovery carrier that powers dispatch, OpenAPI, MCP, prompts, resources, forms, and carrier-node mounting.

## Public Handles

Import from `@emsenn/relating/running`:

- `operationsManifoldOf`
- `operationsManifoldGraphOf`
- `operationsManifoldUri`
- `operationsManifoldResource`

The main inputs are ordinary `induceBins(...)
` discovery carriers.
No package imports another package to make a graph; the graph edge law is only:

```text
producer.codomain.$id === consumer.domain.$id
```

## What It Reads

`operationsManifoldOf(discovery)` returns:

- an apex summary: package name, protocol, action bins, resource URIs, prompt names
- domain extrema: carrier `$id`s consumed by package actions
- codomain extrema: carrier `$id`s produced by package actions
- incoming frontier: consumed carriers with no local producer
- outgoing frontier: produced carriers with no local consumer
- local edges: action pairs whose codomain/domain carrier ids match
- utterance facts describing the manifold as relational data

`operationsManifoldGraphOf(manifolds)` lifts that read across several package manifolds.
If one supplied package produces a carrier another supplied package consumes, the graph contains a cross-package edge.
Unmatched carriers stay visible as incoming or outgoing frontier.

## Product Reading

This is the package-mesh read that turns "a bunch of Node packages with actions" into a typed operation graph.
It makes package composition inspectable without asking an agent to infer it from README prose, HTTP paths, or import graphs.

The useful move is that action topology is carrier topology.
The package does not need separate workflow metadata to know that one operation can feed another: the carrier identity equation already says so.

## MCP Resource

`induceBins(...)
` automatically publishes an operations-manifold resource beside the discovery resource.
An MCP client can list resources, read `operationsManifoldUri(packageName)`, and get the current apex/extrema/edge projection as JSON.

## Boundary

The operations manifold does not execute actions, schedule work, or prove that a multi-package pipeline is semantically correct.
It only exposes the carrier incidence graph already implied by action declarations.
Runtime dispatch, validation, witnessing, and transport behavior stay in their own surfaces.

## Verification

The runnable example is `examples/operations-manifold.mjs`.
It builds two tiny induced package apices, derives each package manifold, relates them by a shared carrier, and reads the MCP operations-manifold resource for one package.

The MCP resource path is also covered by `test/acting.test.mjs`.

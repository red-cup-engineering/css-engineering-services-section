# Action Apex

The action apex is the package's "declare once, project many ways" surface.

The public import is `@emsenn/relating/running`.
The source lives under `src/running/`: the formal reading is that an induced action family is one apex whose CLI, HTTP, OpenAPI, MCP, form, dispatch, carrier-node, and witness faces are projections.

An action declaration carries:

- a verb
- boundary codecs selected from the finite graded wire vocabulary
- optional carrier domain and codomain
- optional RMN `runTerm`
- summaries and descriptions
- the executable body the dispatcher calls

`induceBins` reads a package's actions, resources, and prompts and produces one discovery carrier.
That carrier is the apex: every projected face reads from it or from the same action list.

## Faces

The current running surface projects the apex to:

- CLI dispatch through `relate`
- HTTP action routes through `routeRequest` and `serve`
- OpenAPI paths
- MCP tools, resources, and prompts
- browser forms
- invocation witnesses
- carrier-node mounts

These are not separate operation definitions.
They are boundary faces of the one action family.

The package treats face counts as a useful sanity check.
If the action family has 25 actions, the induced discovery carrier has 25 bins, the OpenAPI document has 25 POST paths, and the MCP projection has 25 tools.
A mismatch means one face has stopped reading the apex and has started becoming its own registry.

## What The Discovery Carrier Contains

`ActionDiscovery` contains:

- `bins`: one endpoint record per action
- `resources`: registered resources plus derived carrier/action schema resources
- `prompts`: registered prompts plus derived action prompts
- `utterances`: relational facts about the package and its legs

When an action carries `runTerm`, the endpoint projection includes that term.
This makes the behavior visible to discovery rather than hidden behind a callback.

## Smallest Probe

Run:

```sh
pnpm run build
node examples/action-apex.mjs
```

That example induces the package's registered actions and prints:

- total action count
- discovery / OpenAPI / MCP / HTML face checks
- first verbs
- the live wire vocabulary with media type, corner, and rung
- morphism / boundary / free-TypeScript audit counts
- how many carrier morphisms still lack RMN bodies
- boundary examples and why they are boundaries
- one dispatch result through the induced apex

The audit count matters because not every action is supposed to be an RMN morphism.
Admissions and transports are boundary actions.
Carrier-to-carrier actions should carry `runTerm`; see [`morphism-inspection.md`](morphism-inspection.md) for the smaller inspection surface over serialized morphism carriers.

The wire vocabulary is itself a product surface.
See [`wire-codecs.md`](wire-codecs.md) for `wireCodec`, `wireOf`, `WIRE_CODEC_NAMES`, and the corner-aware output negotiation rule.

Run:

```sh
node examples/operation-substrate.mjs
```

for a minimal package-shaped action family with one carrier-to-carrier morphism.

For the MCP knowledge-vault face specifically, including registered resources and custom prompts, see [Action knowledge vault](action-knowledge-vault.md).

For the carrier-topology read over an induced apex, including cross-package edges and frontiers, see [Operations manifold topology](operations-manifold.md).

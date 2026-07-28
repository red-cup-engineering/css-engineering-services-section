# Action Knowledge Vault

The action apex is not only a tool list.
`induceBins` also induces MCP resources and prompts from the same package surface.

This gives a package a small knowledge-vault shape:

- tools: actions that can be called
- resources: addressable artifacts the package declares or derives
- prompts: composed message templates the package declares or derives

All three are projected from one induced apex.
There is no separate MCP registry to keep in sync.

## Public Handles

Use `@emsenn/relating/running` for the resource and prompt layer:

```ts
import {
  actionMcpHandle,
  literalResource,
  prompt,
  userMessage,
} from "@emsenn/relating/running";
import { action, induceBins } from "@emsenn/relating";
```

`induceBins(source)` collects:

- action legs from `action(...)
  `
- resource legs from `resource(...)
  ` or `literalResource(...)
  `
- prompt legs from `prompt(...)
  `

It also derives:

- JSON Schema resources for registered carriers and action inputs/outputs
- a discovery resource for the apex itself
- an operations-manifold resource for the induced operation graph
- one guided prompt per action

## What This Is For

This is the package-level version of "do not make agents guess the API from a README."
The same action declaration that dispatches an operation can also project:

- the callable MCP tool
- the input/output schema resources
- the discovery carrier
- a prompt that tells an agent how to prepare the input carrier
- custom package resources and prompts

That is useful for humans too, but the primary audience is an agent or tool surface that can list/read resources and get prompts before calling a tool.

## Example

The runnable example:

```sh
node examples/action-knowledge-vault.mjs
```

declares one carrier-to-carrier action, one registered resource, and one custom prompt, then checks the MCP projection:

- `tools/list` exposes the action
- `tools/call` runs the action through the induced dispatcher
- `resources/list` includes the custom resource and derived resources
- `resources/read` returns the custom resource text
- `prompts/list` includes both the custom prompt and the derived action prompt
- `prompts/get` renders both prompt messages

For the derived operations-manifold resource specifically, see [Operations manifold topology](operations-manifold.md).

## Boundary

This is not an agent runtime.
It does not plan, schedule, remember, or decide.
It projects what the package has declared so an MCP-capable client can inspect and call it.

It is also not a replacement for carrier validation.
Tools still run through the action dispatcher and its codecs.
Resources and prompts make the action family legible; they do not weaken the boundary.

# CLI And Server

The package ships two binaries:

- `relate`: dispatch one action over stdio.
- `relate-serve`: serve the induced action apex over HTTP with discovery, OpenAPI, MCP, and forms.

## CLI

The CLI reads stdin once, decodes it with the selected input codec, runs the named action, and encodes stdout with the selected output codec.

```sh
printf "token\nclaim" | relate utter
```

Interior morphisms consume the JSON carrier produced by the previous stage:

```sh
printf "token\nclaim" \
  | relate utter \
  | relate articulate \
  | relate predicate \
  | relate posit \
  | relate settle
```

`induce-relation` performs the same descent from an admitted utterance in one action.

## HTTP And MCP

`relate-serve` binds the same induced apex to HTTP routes.
The server projections are generated from action declarations, not separately hand-authored routes.

Typical generated faces include:

- action discovery
- health
- OpenAPI JSON
- MCP tools/resources/prompts
- browser forms for action invocation

The same verb, carrier ids, schema refs, summaries, and descriptions appear across every face.

For lower-level HTTP resources that are not induced action routes, use the service-side `services/http/app` module.
That surface provides representation objects, `.well-known` resources, body readers, and projected SSE events while leaving listener lifecycle and deployment policy to the caller.
See [Running HTTP app](running-http-app.md).

## Carrier-Node Mounts

Carrier-node serving mounts action apices at carrier `$id` paths.
A morphism that consumes `relating/articulating/utterance` can be mounted at:

```text
/relating/articulating/utterance
```

This keeps route shape aligned with carrier identity and lets co-mounted packages share one node-level projection.

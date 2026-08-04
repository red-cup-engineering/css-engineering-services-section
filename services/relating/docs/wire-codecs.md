# Graded Wire Codecs

The wire codec vocabulary is the package's argv/stdin/stdout boundary for actions.
It is also the point where the representation projector lattice becomes operational: each wire inherits a content corner and completion rung from the `@emsenn/relating/writing` projector it adapts.

Public handles:

- subpath: `@emsenn/relating/codecs`
- `WIRE_CODEC_NAMES`
- `wireCodec(name)`
- `wireByMediaType(mediaType)`
- `wireOf(projector)`
- built-in codecs: `stringCodec`, `jsonCodec`, `eavtCodec`, `formCodec`, `rmnCodec`

The current finite vocabulary is:

- `string`: `text/plain`, corner `bottom`, rung `identity`
- `json`: `application/json`, corner `data`, rung `identity`
- `eavt`: `application/eavt+jsonl`, corner `assertion`, rung `identity`
- `form`: `application/x-www-form-urlencoded`, corner `data`, rung `identity`
- `rmn`: `application/rmn+json`, corner `assertion`, rung `scott`

## Product Reading

Most Node command surfaces treat formats as a bag of parser flags.
Here, a wire is a small projection theorem:

```text
boundary document -> writing projector -> carried JSON value -> action morphism
```

`wireOf(projector)` enforces the important invariant.
If the projector reads at an undecidable rung, it cannot become an action wire.
A wire may decode stdin and encode stdout only when the underlying read is at `identity` or `scott`.

That is why RMN can be a wire without letting JavaScript become one.
The RMN wire inherits the `rmnProjector` gate: a closed, well-typed RMN term can travel as `application/rmn+json`; arbitrary host code cannot.

## Serving Negotiation

The HTTP serving path uses the same vocabulary.
An explicit `output-format` query parameter selects a wire by name.
Without that explicit selection, the `Accept` header is negotiated against the offered wire media types, but only along the content-corner order.

The practical rule:

- a `data` value may be served as JSON or text
- a `data` value is not silently upgraded to Turtle, EAVT, or RMN assertion
- an `assertion` value may be settled down to JSON when requested
- an explicit `output-format` is treated as a caller-selected wire name

This is the boring, brutal Node-engineering part that makes the wild part usable: the same carrier morphism can cross CLI, HTTP, forms, MCP, and tests without each transport inventing a slightly different parser story.

## Example

```js
import { wireCodec, WIRE_CODEC_NAMES } from "@emsenn/relating/codecs/boundary/wire";

for (const name of WIRE_CODEC_NAMES) {
  const codec = wireCodec(name);
  console.log(name, codec.mediaType, codec.corner, codec.rung);
}
```

See [`examples/action-apex.mjs`](../examples/action-apex.mjs) for the runnable probe that prints the live wire vocabulary beside the action-face counts.

# Running HTTP App

`services/http/app` is the package's small HTTP app object language.
It sits between the pure representation codecs in `@emsenn/relating/writing/http` and whatever `node:http` listener or downstream site actually serves requests.

It gives callers:

- `Repr` response objects through `jsonRepr`, `textRepr`, `htmlRepr`, and `emptyRepr`
- `App` and `Resource` descriptors for route-shaped resources
- `.well-known` resource construction through `wellKnown`
- bounded request-body readers for JSON, text, forms, multipart, and compressed bodies
- SSE writers and a topic-filtered projected event hub

## Product Reading

This is not a web framework.
It does not own listener lifecycle, deployment, sessions, routing policy, or durable event storage.
It is the carrier-shaped HTTP boundary language a web framework can use: handlers return representation data, request decoding is explicit, and event streams are projected messages.

The action apex uses its own router for induced carrier morphisms.
The running HTTP app surface is lower-level.
Use it when a downstream package wants to assemble ordinary HTTP resources while still using the same representation, body, and stream vocabulary as the rest of `relating`.

## Smallest Probe

Run:

```sh
node examples/running-http-app.mjs
```

The example builds a `.well-known` app, reads a JSON request body from a stream-shaped request object, publishes filtered SSE events through an in-memory event hub, and asserts the output.
No server is started.

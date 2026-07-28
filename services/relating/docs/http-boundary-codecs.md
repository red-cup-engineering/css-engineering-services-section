# HTTP Boundary Codecs

The HTTP boundary codecs are the standards-facing part of the writing surface.
They parse, normalize, and serialize HTTP representation values without owning a server, socket, request object, or framework adapter.

Use them when a downstream package already has an HTTP boundary but wants the field grammar and representation choices to stay pure:

- `Content-Type` values and parameters
- `Accept`, `Accept-Encoding`, and `Accept-Language` negotiation
- `Cache-Control`, entity tags, preconditions, byte ranges, and links
- bearer authorization field values
- request cookies, `Set-Cookie`, and signed cookie values
- multipart/form-data and multipart/byteranges representation pieces
- SSE and WebSocket frame representations
- MCP JSON-RPC envelopes for streamable HTTP surfaces

The package's boundary rule is simple: these functions receive header strings, body bytes, frame text, and semantic records.
They do not receive `Request`, `Response`, `IncomingMessage`, Express objects, or router state.
Binding a live transport to those values belongs in a server adapter.

## Imports

```js
import {
  cacheControl,
  negotiateType,
  parseContentType,
  serializeSetCookie,
  sseEventFrame,
} from "@emsenn/relating/writing/http";

import { parseCookieHeader } from "@emsenn/relating/writing/http/cookie";
import { negotiateEncoding } from "@emsenn/relating/writing/http/negotiation";
import { mcpOk } from "@emsenn/relating/writing/http/mcp";
```

## API Reference

The generated TypeDoc reference follows the same boundary split:

- `@emsenn/relating/writing/http` collects the whole HTTP representation vocabulary.
- `@emsenn/relating/writing/http/cookie`, `/negotiation`, `/compression`, `/multipart`, `/sse`, `/ws`, and `/mcp` expose focused codec families.

Those references document callable symbols and types.
This page explains the product boundary: representation codecs in, transport adapters out.

## Example

```js
import {
  negotiateType,
  parseContentType,
  serializeContentType,
} from "@emsenn/relating/writing/http";

const contentType = parseContentType("Application/JSON; Charset=\"utf-8\"");

serializeContentType(contentType);
// "application/json; charset=utf-8"

negotiateType("text/html;q=0.2, application/json;q=1", [
  "text/html",
  "application/json",
]);
// "application/json"
```

For the runnable version across content type, negotiation, cache/range, conditional requests, cookies, SSE, bearer auth, links, and MCP envelopes, see [`examples/http-boundary-codecs.mjs`](../examples/http-boundary-codecs.mjs).

## Product Reading

This is boring in the best possible Node way.
Most web stacks spread HTTP grammar across controllers, middleware, framework utilities, and whatever tiny helper somebody wrote during a deploy incident.
Here the grammar is pulled back into pure morphism-shaped functions.

That matters because the action apex, carrier manifold, and downstream web servers can all share the same representation reads without depending on the same router.
The codec tells you what the field value means.
The adapter decides where that value came from and where it goes next.

## Verification Reading

The authority here is the relevant HTTP representation contract and the package tests/examples, not a Lean theorem.
These codecs are deliberately standards-facing:

- parse/serialize pairs behave as retractions where the grammar supports it
- negotiation uses the caller's offered representation list as authority
- cache, conditional, and range helpers evaluate field values, not live requests
- stream helpers encode/decode frames, not connection lifecycle
- MCP helpers construct JSON-RPC envelopes, not a complete MCP server

# Computer web server

One plain Node application compiles web resources into a Fetch `Request` → `Response` handler. HTTP listeners, streaming, request bodies, and representation semantics come from Computer Networking; data encodings and evidence operations come from Computer Data.

```js
import { createWebServer } from "@red-cup-engineering/computer-web-server";
import { startWebServer } from "@red-cup-engineering/computer-web-server/node";

const app = createWebServer({
  resources: [{ match: "/", handler: () => new Response("Hello") }],
});
const listener = await startWebServer(app, { host: "127.0.0.1", port: 8080 });
// await listener.close();
```

Use `computer-web-platform` when handlers need managed providers, or its `application` export for parsed input, validation, composed resources, and OpenAPI. TUFTE builds graphical interfaces on that application capability. The native application export supports handlers whose observable effect needs Node request/response objects. Both bindings use one dispatcher and one networking transport.

The package executes `src/*.mjs` directly. There is no TypeScript compilation or generated runtime copy.

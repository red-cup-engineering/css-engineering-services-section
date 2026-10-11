# Computer web platform

Compose the computer platform with the computer web server. Provider startup is shared across requests; provider release waits for response streams to finish, cancel, or abort. The web server itself has no platform dependency.

```js
import { createWebPlatform } from "@red-cup-engineering/computer-web-platform";

const app = createWebPlatform({
  platform: { providers: [{ name: "storage", start: () => new Map() }] },
  resources: [{ match: "/", handler: ({ capabilities }) =>
    Response.json({ size: capabilities.storage.size }) }],
});
const response = await app.fetch(new Request("http://localhost/"));
await response.text();
await app.close();
```

`application` adds resource composition, bounded body intake, validation and OpenAPI; `emulation` holds web platform storage and scheduling capabilities; `surface` and the Cloudflare binding exports describe and realize deployments. All execute directly as JavaScript.

# Semantic site

A plain Node application composes Markdown content, semantic claims, HTML, linked data, feeds, and query/sync resources with the computer web server. It owns site composition; HTTP transport, serialization, evidence settlement, and HTML projection come from their underlying capabilities.

```js
import { startMarkdownSite } from "@red-cup-engineering/semantic-site/semantic-site-server";

const site = await startMarkdownSite({
  root: "./content",
  baseUrl: "http://localhost:8080",
  title: "My notes",
}, { host: "127.0.0.1", port: 8080 });
// await site.close();
```

The `theme` export supplies the 561 Group theme used by the deployed site. Site content and operational configuration remain outside this application package.

Deployments can consist of content plus a `site.mjs` default configuration export (or plain JSON). Run the shared `semantic-site --config /path/to/site.mjs` command; `HOST` and `PORT` select the listener. Content paths resolve relative to the configuration, and the shared application handles watching and graceful shutdown.

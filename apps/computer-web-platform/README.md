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


## Release-driven Worker sites

`bin/deploy-worker-sites.mjs` builds the sites declared by an existing deployment.
A build receipt covers the declared output and Wrangler configuration plus the
actual multipart upload produced by the site's own pinned Wrangler with
`deploy --dry-run --outdir ... --outfile ...`. Worker code and imported
dependencies outside the static-asset folder therefore change the deployment
identity when their uploaded bytes change. Every upload part's name, filename,
media type and body is addressed; random multipart boundaries and part order are
not. Missing, malformed or entry-less uploads fail closed.

Wrangler's diagnostic README and default unuploaded source maps are absent from
this authoritative upload. A real uploaded module named README.md is retained.
When source-map upload is enabled, the map's mappings, sources, embedded source
contents, names and extension fields remain addressed. Only a version-3 map's
sourceRoot equal to this exact local output directory is normalized to `.` for
the digest, so relocating an identical build does not redeploy it. Original
provider artifacts are left untouched; other source roots are unchanged.

`--dry-run` performs this local compilation and records the build; it does not
publish, probe public health, roll back, or write a live deployment receipt.
Failed or empty compilation cannot reuse an older bundle. A pending deployment
is compiled again and compared with its build receipt before publication.
Earlier asset-only build receipts are requalified once rather than being treated
as complete Worker receipts. Existing health checks and rollback remain required.

A declaration may keep an existing `directory`, or bind a `package` by its
published name. Package-backed sites resolve from `.metadata/sources.json` and
the release's `packages/<name with / replaced by __>` layout. Exactly one
admitted source and a matching package name/version are required. Release and
state roots are resolved before dependency linking, including relative CLI paths. Its repository,
commit and source path are retained in the build receipt. An unavailable source
returns a failed site receipt so the same run can continue other declared sites.
There is no fallback to an old checkout path or a similarly named repository.

The declared site source must already exist in the admitted release with its
build dependencies. This does not enroll a site, carry sibling source or Git
objects, install a missing Wrangler, or change a site's deployment authority.

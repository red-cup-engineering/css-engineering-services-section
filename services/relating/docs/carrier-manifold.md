# Carrier Manifold

The carrier manifold is the action apex read as a namespace of typed objects.
Instead of choosing route prefixes from controller names first, it mounts an apex at the carrier `$id` its actions consume.

That makes the URL a small categorical statement:

```text
/<carrier-id>/<verb>
```

The carrier names the object.
The verb names a morphism available at that object.
An endomorphism, where domain `$id` and codomain `$id` match, becomes a self-loop at the node.

## Public Surface

Import from the running subpath:

```ts
import {
  carrierNodeTree,
  tileCarrierNodes,
  routeCarrierManifold,
} from "@emsenn/relating/running";
import { serveCarrierManifold } from "../services/http/server.mjs";
```

Use:

- `carrierNodeTree` to inspect the carrier nodes and mounted apices.
- `tileCarrierNodes` to see where mounts land.
- `routeCarrierManifold` to route a pure request object through the manifold.
- `services/http/server` to bind the same projection to `node:http`.

## What It Gives You

Every carrier node can expose the same faces already produced by the action system: index HTML, OpenAPI, MCP, health, discovery, and verb dispatch.

Source actions with no domain carrier fall back to the module-tail placement.
Carrier-consuming actions mount at the carrier `$id` path.
Several packages can co-mount at the same carrier node; node-level discovery sees the pooled surface, while verb dispatch still routes to the owning apex.

## Example

`examples/carrier-manifold.mjs` creates two small apices:

- `maker` produces `example/carrier-manifold/widget` from boundary text, so it falls back to `/maker`.
- `user` consumes and produces the same widget carrier, so it mounts at `/example/carrier-manifold/widget` as a self-loop.

Run it after a build:

```sh
pnpm run build
node examples/carrier-manifold.mjs
```

The output shows the mount paths, the carrier node, OpenAPI path projection, MCP tool projection, and a POST through the carrier-node route.

---
title: "WASI as playing: sandboxed capability execution on the OUT face"
description: "Adds WASI to the relating family as the playing/OUT-face sandboxed capability-execution projection. A WASI preopen is a capability handle naming a locus the holder may play; an invocation is the playing cut; attenuation is dualize as monotone authority narrowing with provenance. Records the implementation in lib/playing and the law tests."
date: 2026-06-26
status: implemented
---

# WASI as playing: sandboxed capability execution on the OUT face

WASI is the WebAssembly System Interface.
In ordinary platform language it is the capability-secured host interface for sandboxed WebAssembly modules: the host does not give a module ambient filesystem or network authority; it gives explicit handles, commonly preopened descriptors, and the module can exercise only those.

In the relating family this is not a new authority model.
It is the single-agent OUT face made literal:

| WASI | playing / OCap theorem |
|---|---|
| sandbox boundary | the membrane between a design and the world/opponent |
| preopened handle | a capability view naming a locus the holder may play |
| syscall / host call | the cut, an invocation against the holder's affordances |
| rights/path narrowing | attenuation, the dualize/restriction move |
| no ambient authority | `canInvoke`: authority by move, not identity |

So the WASI sandbox **is** the membrane.
A WASI capability handle is not a hidden permission table; it is a locus you may play.
Invoking it is cutting that move against the holder's actual affordance design.
Attenuating it is the *-autonomous restriction/dualize story, with provenance recording the parent capability.

## What landed

The implementation lives in `lib/playing`, because WASI is the scale-1 OUT-face standard, parallel to WMAP's across-face ActivityPub projection:

- `lib/playing/src/carriers/index.mts`
  - `playing/capability-view`: structural `{ id, grants, holder, parent? }` view of
    existing OCap carriers.
  - `playing/wasi/preopen`: handle, path, rights, and carried capability.
  - `playing/wasi/invocation`: one operation attempted through one handle.
  - `playing/wasi/cut`: convergence witness for that invocation.
- `lib/playing/src/wasi.mts`
  - `grant`, `preopen`, `attenuate`, `invoke`, `canInvoke`, `interact`/`cut`.
  - `WASI_RIGHTS`, `wasiLocus`, `scopeNarrows`, and `WasiHandle` aliases for the
    package root surface.
- `lib/playing/test/wasi.test.mjs`
  - canInvoke soundness: exercisable iff the grant is in the holder's affordances.
  - monotone attenuation: child scope and rights cannot widen the parent, and
    provenance points back to the parent capability.

No WebAssembly runtime is pulled in.
The interface is modeled as carriers and pure operations over the existing relating kernel: `as const` JSON-schema literals, `carrierFrom`, and `FromSchema`.

## Why this is the same theorem as the OCap bricks

WMAP's ActivityPub capability layer already established the object-capability reading:

- capability = locus/design one may play;
- invocation = cut/interaction;
- delegation = name-passing;
- attenuation = dualize/restriction;
- `canInvoke` = authority by move.

CapTP then showed the OUT-face transport version: a sturdy reference is a view of the same capability, and delivery is admitted iff that reference names a held move.

WASI is the local sandbox version of the same theorem.
The preopen is to the WASI module what a sturdy reference is to a remote vat: an unforgeable-enough handle whose authority is exactly the grant it names.
The host call is not allowed because a principal is trusted; it converges because the move is in the holder's affordance set.

## Handoff

```json
{
  "system": "WASI",
  "package": "@emsenn/playing",
  "mapping": {
    "sandbox": "playing membrane",
    "preopen": "CapabilityView as WasiHandle",
    "handle": "locus you may play",
    "invoke": "cut against holder affordances",
    "attenuate": "dualize/restrict with parent provenance",
    "canInvoke": "grant in affordances"
  },
  "implemented_files": [
    "lib/playing/src/carriers/index.mts",
    "lib/playing/src/wasi.mts",
    "lib/playing/src/index.mts",
    "lib/playing/test/wasi.test.mjs",
    "dev/docs/notes/2026-06-25-relating-family-of-named-systems.md",
    "dev/docs/notes/2026-06-26-wasi-as-playing.md"
  ],
  "proofs": [
    "WASI preopen is a faithful capability view",
    "canInvoke is true iff grants is among affordances",
    "attenuation narrows scope and rights monotonically and records parent"
  ],
  "verification_gate": [
    "pnpm --filter @emsenn/playing run check",
    "pnpm --filter @emsenn/playing run test"
  ],
  "open_seams": [
    "This models WASI interface law only; no Wasm runtime binding is included.",
    "Capability grants use string scope narrowing today; a future path/descriptor algebra could refine scopeNarrows without changing the carrier theorem.",
    "Downstream animating OCap carriers project structurally into CapabilityView; playing intentionally does not import animating."
  ]
}
```

## Cross-links

- [`2026-06-25-relating-family-of-named-systems.md`](2026-06-25-relating-family-of-named-systems.md)
- [`2026-06-25-wmap-web-modeled-agency-protocol.md`](2026-06-25-wmap-web-modeled-agency-protocol.md)
- [`2026-06-25-codecs-on-faces-activitypub-across-scales.md`](2026-06-25-codecs-on-faces-activitypub-across-scales.md)
- [`2026-06-25-captp-as-playing.md`](2026-06-25-captp-as-playing.md)

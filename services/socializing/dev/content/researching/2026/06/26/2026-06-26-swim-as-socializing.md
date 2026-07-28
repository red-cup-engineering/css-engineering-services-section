---
title: "SWIM as socializing mesh-liveness"
description: "Places SWIM plus HyParView/Plumtree as the mesh-liveness layer beneath federation: membership and failure detection are charged peer observations, dissemination is socializing.broadcast, and membership views merge by the existing CRDT <=_k join."
date: 2026-06-26
status: implemented
tiles: [socializing]
---

# SWIM as socializing mesh-liveness

SWIM, HyParView, and Plumtree are now modeled in `lib/socializing` as the liveness layer beneath ActivityPub/AT-style federation.
This is not a network implementation.
There are no sockets, timers, encryption sessions, or real peer processes.
The implementation is the protocol law surface: charged membership observations, deterministic SWIM rounds, a HyParView partial view, a Plumtree eager/lazy plan, and a projection of dissemination onto the existing `broadcast` action.

The reading is direct:

```text
membership + failure detection + epidemic dissemination
  = the inter-observer mesh's liveness reading
```

Each member's liveness is a `<=_k`-accumulated witness.
An observation says that a member is `alive`, `suspect`, or `dead`; that status is carried as a relating charge.
A peer's membership view is a state-CRDT whose member cells join by the existing `mergeCrdtStates` surface.
Gossip dissemination is not a new transport; `membershipViewMeme` packages the view as a meme, and `broadcastMembershipView` sends it through `socializing.broadcast` over the observer mesh.

## The derivation

The CRDT note established socializing merge as pointwise knowledge-order join:

```text
merge(a, b)[key] = a[key] v_k b[key]
```

SWIM membership is exactly that pattern over peer observations.
Each member gets a CRDT cell key.
Peer observations become MV-register writes with a protocol, observer, round, incarnation, status, and witness.
Merging two peers' membership views delegates to `mergeCrdtStates`, so the view is conflict-free by construction.
No last-writer clock is introduced.

The liveness projection is SWIM-shaped: incarnation numbers select the current reading from the accumulated witness set.
A suspect member can be refuted by a later alive observation with a higher incarnation.
The old suspicion remains in the accumulated charge, so the CRDT state grows monotonically in `<=_k`; only the readout changes from suspect to alive.

Failure detection is modeled over rounds.
`swimRound` observes which expected members responded.
A non-responsive alive member becomes suspect.
If it remains suspect beyond the configured suspicion window, the next round marks it dead.
That proves eventual completeness for the finite round model the package actually implements.

HyParView and Plumtree sit below that as the mesh dissemination shape:

- `hyParViewOverlay` splits peers into active and passive partial views.
- `plumtreeGossipPlan` reads active peers as eager push links and passive peers as lazy repair links.
- `broadcastMembershipView` projects the membership update into the existing social field broadcast, preserving the package's off-diagonal surface.

## Implemented surface

Realizing file:

- [`lib/socializing/src/writing/mesh-liveness/index.mts`](../../../lib/socializing/src/writing/mesh-liveness/index.mts)

Public API:

- carriers: `meshLivenessObservationCarrier`, `membershipViewCarrier`, `hyParViewOverlayCarrier`, `plumtreeGossipPlanCarrier`
- builders/readers: `meshLivenessObservation`, `membershipView`, `livenessOf`, `membershipTable`, `livenessCharge`
- merge/rounds: `mergeMembershipViews`, `swimRound`, `failureComplete`, `sameMembershipView`
- gossip projection: `hyParViewOverlay`, `plumtreeGossipPlan`, `membershipViewMeme`, `broadcastMembershipView`

The tests in [`lib/socializing/test/mesh-liveness.test.mjs`](../../../lib/socializing/test/mesh-liveness.test.mjs) prove:

- a suspected-then-refuted member converges to alive while the membership witness still grows in `<=_k`
- failure detection is eventually complete in the finite round model
- two peers' membership views merge conflict-free, and HyParView/Plumtree gossip projects through `broadcast`

## Registry placement

This brick upgrades the protocols map row:

```text
SWIM / HyParView / Plumtree -> socializing across, scale 2, built
```

It belongs in `socializing` because it is the liveness reading of the inter-observer mesh.
Federation protocols such as ActivityPub and AT Protocol can ride above it; they should not own membership, suspicion, or epidemic dissemination as bespoke application logic.

## Verification

- `pnpm --filter @emsenn/socializing run check`
- `pnpm --filter @emsenn/socializing run build`
- `pnpm --filter @emsenn/socializing run test`

## Sources

- [`2026-06-25-protocols-as-faculty-projections.md`](2026-06-25-protocols-as-faculty-projections.md)
- [`2026-06-25-crdt-as-socializing-merge.md`](2026-06-25-crdt-as-socializing-merge.md)
- [`2026-06-26-atproto-as-socializing.md`](2026-06-26-atproto-as-socializing.md)

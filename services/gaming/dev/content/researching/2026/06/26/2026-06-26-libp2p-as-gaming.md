---
title: "libp2p as gaming: FSym swarm transport beneath CapTP"
description: "Promotes libp2p from candidate to built in the protocols map by realizing its structural algebra in @emsenn/gaming: peer ids are locus names, peerstore/DHT are the arena roster, dialing and multiplexing are FSym name-passing into stream sub-arenas, and pubsub is order-independent concurrent broadcast."
date: 2026-06-26
status: implemented
---

# libp2p as gaming

This note names the gaming/OUT scale-2 transport under CapTP:

```text
peer roster -> multiplexed streams -> pubsub broadcast
```

The implementation lives in `@emsenn/gaming` and deliberately does **not** pull a real libp2p runtime.
It models the protocol algebra over gaming's existing arena and FSym name-passing surface.

Realizing files:

- [`lib/gaming/src/structuring/concurrent-game/with-symmetry/libp2p.mts`](../../../lib/gaming/src/structuring/concurrent-game/with-symmetry/libp2p.mts)
- [`lib/gaming/src/multi-agent.mts`](../../../lib/gaming/src/multi-agent.mts)
- [`lib/gaming/src/carriers/index.mts`](../../../lib/gaming/src/carriers/index.mts)
- [`lib/gaming/test/gaming.test.mjs`](../../../lib/gaming/test/gaming.test.mjs)

## Thesis

libp2p is **FSym name-mobility over a swarm**.

That is the whole placement:

- a **peer id** is a locus/name in gaming's nominal arena;
- **dialing and multiplexing** pass those names into a stream sub-arena;
- the **peerstore and DHT** are the swarm arena's roster views;
- **pubsub** is concurrent broadcast over the roster, invariant under peer-name permutation.

This is why libp2p belongs to `gaming`, not `playing`.
CapTP is the scale-1 object-capability cut: a capability is a locus you may play, invocation is the cut, and promise-pipelining is `*-autonomous` composition. libp2p is the many-agent arena beneath that: the swarm of named peers and its concurrent transport surfaces.

## Carrier surface

The carrier kernel remains the current relating kernel: `as const` JSON Schema literals, `carrierFrom`, and `FromSchema`.
No TypeBox, Ajv, codegen, runtime daemon, socket transport, or new dependency is introduced.

- `gaming/libp2p-swarm` — peer ids, peerstore, DHT, and encoded `gaming/arena`.
- `gaming/libp2p-stream` — a multiplexed source/target stream with an FSym name-passing witness and encoded stream sub-arena.
- `gaming/libp2p-pubsub` — order-independent topic delivery over the peer roster.

## API

Pure algebra:

- `libp2pSwarm(id, peerIds)`
- `libp2pJoin(swarm, peerId)`
- `libp2pLeave(swarm, peerId)`
- `libp2pDialStream(swarm, { streamId, protocol, source, target })`
- `libp2pPublish(swarm, { topic, messageId, from })`

Action verbs:

- `libp2p-swarm`
- `libp2p-stream`
- `libp2p-pubsub`

## Green laws

The package law tests prove:

- a peer joins/leaves the arena roster coherently: peerstore, DHT, and arena event set are all derived from the same roster;
- a multiplexed stream is name-passing into a sub-arena: the stream carries the source/target transposition as FSym witness;
- pubsub delivery is order-independent under arena symmetry: permuting join order yields the same delivery set.

Verification for this note:

```text
pnpm --filter @emsenn/gaming run check
pnpm --filter @emsenn/gaming run build
pnpm --filter @emsenn/gaming run test
```

`@emsenn/gaming` test count after landing: 29/29.

## Family placement

The protocols map row is now built:

```text
libp2p | gaming out | scale 2 | peer transport for many-agent arenas
```

Grounding notes:

- [`2026-06-25-protocols-as-faculty-projections.md`](2026-06-25-protocols-as-faculty-projections.md)
- [`2026-06-21-gaming-as-multi-agent-playing.md`](2026-06-21-gaming-as-multi-agent-playing.md)
- [`2026-06-21-playing-as-star-autonomous-interaction.md`](2026-06-21-playing-as-star-autonomous-interaction.md)
- [`2026-06-25-captp-as-playing.md`](2026-06-25-captp-as-playing.md)

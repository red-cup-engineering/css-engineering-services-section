---
title: "Matchmaking as gaming — pool -> ticket -> match on the OUT face"
description: "Spec note for gaming's still-open match-coordination standard: an OpenMatch-class lobby protocol realized as pool -> ticket -> match, where a match is an arena instantiated from a pool of players. Matchmaking is admission into the concurrent game system: players are loci/names, the match is a *-autonomous arena over those names, and fair brackets are name-passing under the arena's FSym(A) symmetry. Implemented in @emsenn/gaming without a second ontology: ticket, pool, and match are functorial views over existing arena/match carriers, with once-only ticket consumption."
date: 2026-06-26
status: implemented
---

# Matchmaking as gaming

This note names gaming's OUT-face match-coordination standard: an OpenMatch-class lobby protocol,

```text
pool -> ticket -> match
```

The implementation lives in `@emsenn/gaming`; the standard does not require a new package or product folder.
Its realizing files are:

- [`lib/gaming/src/running/lobby.mts`](../../../lib/gaming/src/running/lobby.mts)
- [`lib/gaming/src/multi-agent.mts`](../../../lib/gaming/src/multi-agent.mts)
- [`lib/gaming/src/carriers/index.mts`](../../../lib/gaming/src/carriers/index.mts)
- [`lib/gaming/test/gaming.test.mjs`](../../../lib/gaming/test/gaming.test.mjs)

## Thesis

A match is an **ARENA instantiated from a pool of players**.

That is the crucial placement.
Matchmaking is not a scheduling helper beside the game.
It is the admission morphism into the concurrent game system:

- a **pool** is an existing `gaming/arena` plus a once-only ticket ledger;
- a **ticket** names one player admitted to that pool, optionally carrying the player's existing `Design`;
- a **match** is the existing `gaming/match` carrier extended with the arena instantiated over the admitted player names.

So players are the loci/names being admitted; the formed match is a `*-autonomous` arena over those names; and the match verdict reuses gaming's existing N-player `matchAll` fold when ticket designs are present.
No second ontology is introduced.

## Why fairness is FSym name-passing

Gaming is full CGS: concurrent games with symmetry.
Its symmetry groupoid is the finite-name-permutation layer, `FSym(A)`, read as agent/name mobility.
In a lobby, fair pairing and brackets must therefore be invariant under queue-order artifacts.

The matcher sorts queued tickets by player name before chunking them into brackets, and each formed match arena installs the transpositions of the admitted player events:

```text
player:alice <-> player:bob
```

That makes order-independent bracketing an instance of name-passing under the arena's FSym symmetry.
Commuting the pool's input order yields the same formed matches up to the player-name permutation.

## Once-only admission

The pool keeps `matchedTicketIds`, the same shape as once-only delivery fan-out: a ticket consumed into a match cannot be consumed again.
Re-queueing a queued player returns the existing ticket with `already-queued`; re-queueing a matched player returns the existing ticket with `already-matched`.
Running matchmaking again on the returned pool forms no duplicate matches.

## Carrier surface

The carrier kernel remains the current relating kernel: `as const` JSON Schema literals, `carrierFrom`, and `FromSchema`; no TypeBox, Ajv, codegen, or new dependencies.

- `gaming/pool` — pool id, arena, match size, tickets, and matched-ticket ledger.
- `gaming/ticket` — one player name in one pool, optional existing design.
- `gaming/ticket-admission` — queue result with once-only reason.
- `gaming/matchmaking-result` — returned pool plus formed `gaming/match` carriers.
- `gaming/match` — preserved as the match carrier, extended with optional lobby fields (`id`, `pool`, `arena`, `ticketIds`, `playerIds`).

## Green laws

The package law tests prove:

- a formed match is a well-typed `Arena` over the admitted players;
- matchmaking is order-independent under FSym player-name permutation;
- re-queuing is once-only, so a queued or matched player cannot be double-matched.

Verification on 2026-06-26:

```text
pnpm --filter @emsenn/gaming run check
pnpm --filter @emsenn/gaming run build
pnpm --filter @emsenn/gaming run test
```

`@emsenn/gaming` test count after landing: 26/26.

## Family placement

This fills the open scale-2 OUT-face standard named in [`2026-06-25-codecs-on-faces-activitypub-across-scales.md`](2026-06-25-codecs-on-faces-activitypub-across-scales.md).
It is sibling to WMAP's across-face standard and WASI's scale-1 OUT-face standard, but its enabling math is gaming's: the multi-agent concurrent arena with FSym symmetry.

The grounding notes are:

- [`2026-06-21-gaming-as-multi-agent-playing.md`](2026-06-21-gaming-as-multi-agent-playing.md)
- [`2026-06-21-playing-as-star-autonomous-interaction.md`](2026-06-21-playing-as-star-autonomous-interaction.md)
- [`2026-06-25-wmap-web-modeled-agency-protocol.md`](2026-06-25-wmap-web-modeled-agency-protocol.md)
- [`2026-06-25-wmap-c2s-social-api-endeavor.md`](2026-06-25-wmap-c2s-social-api-endeavor.md)

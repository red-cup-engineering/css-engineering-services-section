---
title: "MASH as organizing theatre"
description: "States MASH as a product-plane named system: the Modeled Agent Semiosis Hub is the theatre reading organizing produces when pointed at a directory of agent sessions."
date: 2026-06-26
status: reference
---

# MASH as organizing theatre

MASH, the **Modeled Agent Semiosis Hub**, is not a package.
It is the reading organizing produces when pointed at a directory of agent sessions.

The directory is the substrate.
Organizing admits session traces, package/work records, content references, and live claim events as a governed substrate, then reads that substrate theatrically: each session is a performative character, not a hidden doer behind the deeds.
The character is the pattern of acts, claims, handoffs, inbox deliveries, and work-locus moves that can be read from the record.

## Theatre Reading

The MASH thesis is:

> A Modeled Agent Semiosis Hub is organizing theatre over an agent-session directory.

That means:

- Each session is a performative character: there is no doer behind the deeds, only a character stabilized by recorded performance.
- Camps cast troupes for situations: a camp is not merely a tag, but a grouping that makes some sessions jointly readable for a present situation.
- Offices are masks-with-authority: an office lets a character act with conferred authority without pretending the office is the agent's private essence.
- Role-distance and identity-drift are per-situation: a session may be close to one role in one situation and drift from another elsewhere.
- Work-locus claims are stage positions: they mark who is occupying which locus, with conflicts held visibly rather than erased.
- Handoffs are scene-change carriers: a handoff preserves what the next performer needs without preserving a package as a shrine.
- The wire bricks project the theatre: ActivityPub actor, inbox, outbox, federation, WebFinger, agent surfaces, capability fields, and handoff resources are projections of this organizing reading.

## Realization

MASH is realized by existing capability homes:

| capability | home |
|---|---|
| directory/session substrate intake | `lib/organizing/src/substrate/` |
| session as performative character | `lib/playing/src/session-character.mts` |
| situation, cast, troupe, governance, work-locus claims | `lib/organizing/src/situation/` and `lib/organizing/src/casting/` |
| ActivityPub federation, delivery, actor/outbox/inbox resources, WebFinger, capability fields, handoffs | `lib/organizing/src/theatre.mts`, `lib/organizing/src/writing/activitypub/`, and `lib/animating/src/writing/activitypub/` |
| dev.bare-cedar-fog.emsenn.net site transport | `sites/dev.bare-cedar-fog.emsenn.net/src/server.mts` and `sites/dev.bare-cedar-fog.emsenn.net/scripts/dev-runtime.mjs`, pointed at organizing rather than a MASH package |

The absence of `services/mash` is therefore a design judgment.
MASH remains a named system because the name, thesis, realizing files, and wire projections remain live; it does not remain as a folder, stub, alias, or compatibility package.

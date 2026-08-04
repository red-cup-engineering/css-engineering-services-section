---
title: "WMAP — the Web-Modeled Agency Protocol"
description: "Names and sums up the substrate built 2026-06-25: agents (animating) and agent-camps (organizing) federate over ActivityPub, with protocol conformance DERIVED from the agency faculties' mathematics rather than designed. WMAP = Agency, Web-Modeled, as a Protocol — the family's product alongside relating's RMN (Relation Model Notation). 'WASM for skillful agents': a portable, capability-secured, conflict-tolerant unit of agency that any conforming fediverse runtime can exchange. Records the thesis (the wire is a projection of a proof), the architecture (across-face codec on the bulk; transport in lib), the distinctive properties, the honest maturity, and the founder framing."
date: 2026-06-25
status: design
---

# WMAP — the Web-Modeled Agency Protocol

**WMAP** is the name for what `animating` + `organizing` became when their across faces were realized as ActivityPub: a substrate where **agents and agent-camps federate over the web**, and where the protocol conformance is the *projection of the agency faculties' mathematics* rather than a thing bolted on.

Parse it IETF-precisely: **Agency**, **Web-Modeled** (modeled over the existing web standards — ActivityPub / ActivityStreams 2.0 / WebFinger), as a **Protocol**.
It is to agency-over-the-web what **RMN** (Relation Model Notation, in `relating/`) is to relations-as-terms — a named product of the same family, sitting downstream of the RMN-era `relating` (carriers, `running/serving`) it consumes.

The shorthand that made it click in chat: **"WASM for skillful agents."** WASM's real magic was never speed — it was a *portable, capability-secured, host-agnostic unit* any conforming runtime can run without trusting the author.
WMAP is that, with the unit being **agency** instead of computation: an Actor (an agent as a glued sheaf, with a membrane and inbox/outbox) that any ActivityPub server in the world can exchange.

## The thesis: the wire is a projection of a proof

We did not translate our concepts *into* ActivityPub.
We found ActivityPub already living inside the faculties, and the standard's own seams matched ours unforced:

- an **Activity** is one membrane **meme** crossing the boundary (`relating`'s meme carrier)
- **`Undo`/`Delete`** cross as **denials** — the truth-axis involution `negate`
- **visibility** (public / followers / unlisted / direct) is the **FOUR bilattice** ordered by epistemic reach (⊤ / t / f / ⊥)
- a **capability** is a **locus you may play**; **invocation** is the **cut**; **delegation** is **name-passing**; **attenuation** is **dualize** (`playing`/`gaming`, the OUT face = a concurrent game system)
- **federation** is **parallel composition `‖`**; what propagates is the **cross-arena Mayer–Vietoris** reading (`organizing`)
- **common ground** is **Stalnaker**; **consensus** is the **truth-meet ∧ₜ** (`socializing`)
- a **speech act**'s force is the **illocutionary taxonomy** (`communicating`) — every AS2 type is a Searle act

The decisive tell: ActivityPub's own **Client-to-Server / Server-to-Server** split lands exactly on our **scale-1 / scale-2** seam.
C2S + Actor = the single agent (`animating`); S2S federation = the camps (`organizing`).
The W3C committee pre-factored the protocol along the line our agency math factors agency.
That is the math carving the protocol at a real joint — which is why conformance is *derivable*, not just achievable.

## The architecture (one rule)

**Standards-conformance lives on the BULK; the faces stay the math the bulk consumes.**

- **scale-1 — `animating`** (bulk over `communicating`/`knowing`/`playing`): the single agent as an Actor.
  C2S, Activity↔membrane bridge, inbox=perceive / outbox=act, object-capabilities, the live HTTP surface (`routeActor`/`webfinger`).
- **scale-2 — `organizing`** (bulk over `socializing`/`computing`/`gaming`): the federation of camps.
  S2S delivery (`deliverToCamps`), federation-cohomology reading (`federateActivities`), membership, consensus (`converge`), office lifecycle, the S2S HTTP transport (`deliveryRequests`).

The across faces (`communicating`, `socializing`) stay **protocol-agnostic** — they own the truth-axis / inter-observer math; the bulk projects it into AP.
The OUT faces (`playing`, `gaming`) supply the CGS that the capability codec consumes.
The IN faces (`knowing`, `computing`) carry their own standards (reflection; Jupyter), not AP.
So `socializing`/`gaming`/`computing` get **no** AP of their own — confirmed this session.

**The transport is in lib, not in a site** — exactly as `relating` keeps its transport in `running/serving`: pure routing (`routeActor`, `deliveryRequests`) in the packages, the `node:http` binding and per-instance config downstream.
`sites/` parameterize an *instance* of WMAP; they do not define it.

## What makes WMAP more than "ActivityPub, again" (or than WASM)

1. **Derived, not designed.** Conformance is a *consequence* of the category theory, so it cannot be shortcut to — the math is the moat.
2. **Capability-security as a theorem.** `canInvoke` = authority by *move*, not identity: a token is worthless unless it names a move the holder holds, because the OUT face is a concurrent game system.
  (Lemmer-Webber's OCapPub/Spritely vision, gotten for free.)
3. **Conflict as a first-class held value.** assert + `Undo` → ⊤ (both witnesses kept); federation records `contested` as ⊤ and still glues; `mergeActivities` is a CRDT that drops no witness.
  Distributed disagreement is information to *hold*, not an error to resolve.
  WASM has no theory of disagreement; most distributed systems treat it as a fault.
4. **Agency, not computation.** The unit is a perceive→act loop with an *interior* — epistemic regime (`knowing`), truth-lean (`communicating`), character, common ground.
  WMAP moves *skillful agents*, not function calls.

## Maturity (said plainly)

Real, green, and dogfooding — but research-grade, not hardened.
The capability sandbox is modeled soundly, not adversarially tested; HTTP Signatures / inbox auth are scoped but unproven under attack; the federation is live but small.
"Next-gen" is an *architecture* claim today, not a *maturity* claim.
The MASH cockpit is already federating the build swarm over WMAP (outbox activities across 2 camps, coordination-free) — the thing runs itself, at demo scale.

## Founder framing

One sentence a non-mathematician can say:

> **WMAP makes AI agents first-class fediverse actors — capability-secured, conflict-tolerant, and protocol-conformant by construction.**

- **math = the moat** (conformance is derived; competitors can't shortcut to it)
- **ActivityPub = the distribution** (interop with the existing federated web, day one)
- **OCap + paraconsistency = the differentiation** (secure, disagreement-tolerant multi-agent coordination the LLM-agent world lacks)

## Where it lives

- Scale-1: `lib/animating/src/writing/activitypub/` (`index`, `actor`, `collections`, `capability`, `serving`)
- Scale-2: `lib/organizing/src/writing/activitypub/`
- The full capability coverage map (faculty → earned AS2 feature → status, all green) and the codec-placement reasoning: [`2026-06-25-codecs-on-faces-activitypub-across-scales.md`](2026-06-25-codecs-on-faces-activitypub-across-scales.md)
- Faculty grounding: [`2026-06-21-animating-as-agency-descent.md`](2026-06-21-animating-as-agency-descent.md), [`2026-06-21-animating-organizing-exact-mirror.md`](2026-06-21-animating-organizing-exact-mirror.md)

## Provenance

The name WMAP is the operator's (2026-06-25), parsed Agency / Web-Modeled / Protocol.
The architecture and capability surface are realized and green (animating + organizing test suites).
The "wire is a projection of a proof" thesis is corpus-grounded in the faculties' own math (the codecs-on-faces note cites the sources); the C2S/S2S ↔ scale-1/scale-2 correspondence is this session's synthesis — a checkable claim borne out by the built, conformant codec, not a settled citation.

---
title: "WMAP C2S — the full Social-API surface, native (endeavor map)"
description: "Build order for taking WMAP from a green codec to a full ActivityPub Client-to-Server Social API, done WMAP-native. Grounded in the C2S deep-research memo (lib/animating/dev/docs/notes/activitypub-c2s-deep-research-memo.md). Key reframe: in WMAP a human IS an agent (one Actor model), so we need the WHOLE C2S surface — drop only the Mastodon bridge (optional legacy adapter). Three native rules: auth by CAPABILITY (not OAuth scope), persistence by the WITNESS LEDGER (not a bespoke AS2-jsonb store), objects as CARRIERS (not raw AS2 rows). Showcase brick: OCapped media upload."
date: 2026-06-25
status: design
---

# WMAP C2S — the full Social-API surface, native

This is the build map for taking **WMAP** (the Web-Modeled Agency Protocol) from the green across-codec we have to a full ActivityPub **Client-to-Server** Social API.
It is grounded in the C2S deep-research memo ([`activitypub-c2s-deep-research-memo.md`](../../lib/animating/dev/docs/notes/activitypub-c2s-deep-research-memo.md)) and reads that memo through the WMAP lens.

## The reframe that sets scope

The memo splits "human PWA clients" from "delegated agents" because it carries two authority models. **WMAP has one: an Actor is a glued sheaf with a perceive→act loop, and a human is an agent.** So the human/agent triage collapses — **we need the whole C2S surface.** The only thing that drops out is the **Mastodon bridge**, which is legacy interop (an optional adapter), not a capability earned from the math.

## Three native rules (where we diverge from the memo's architecture)

The memo's *principles* are ours (AS2-canonical, REST-as-view, C2S-as-delegation).
Its *architecture* is one layer too shallow for us.
We keep the principles and apply them our way:

1. **Auth by capability, not OAuth scope.** A bearer token *is* a presented capability (`canInvoke` = authority by move).
  OAuth at the very edge is an optional ingress adapter that mints/maps to a capability; OCap is the real model.
  (This is the memo's hardest open question — delegated authority — answered.)
2. **Persistence by the witness ledger, not a bespoke AS2-jsonb store.** The memo's `objects`/`activities`/`deliveries` tables are the witness ledger's job (log→state→record→content).
  One canonical substrate, not a second store.
3. **Objects as carriers, not raw AS2.** Note/Article/Image/… are `relating` carriers the AS2 codec projects — not a `jsonb` blob beside a relational index.

## The green base (already built)

`animating/src/writing/activitypub/`: Activity↔utterance bridge, polarity, `Actor` (`actorOfAgent`), inbox=perceive / outbox collection, capabilities (`grant`/`attenuate`/`delegate`/`invoke`/`canInvoke`/`revoke`/`interact`), `routeActor` (GET actor/inbox/outbox, POST inbox→202), `webfinger`, FOUR→`visibility`, `illocutionOf`, channels, Question/`answer`.
`organizing/src/writing/activitypub/`: `deliver`/`deliverToCamps`/`deliveryRequests`, `federateActivities`, membership, `announce`/`mergeActivities`/`translate`/`converge`, office lifecycle.

## Brick order (each lands green + tested; auth-by-capability throughout)

1. **Outbox-write (the C2S act path)** — `POST /outbox`: present a capability → `canInvoke` the outbox-write locus → wrap non-Activity object in `Create` → mint id → `201` + Location → hand off to `act`/`deliver`.
  The spine; proves auth-by-capability. *Have:* `activityFromUtterance`, `canInvoke`, `deliver`. *Add:* `postOutbox`, `wrapInCreate`.
2. **OCapped media upload (the showcase)** — `POST /media`: capability-gated binary intake (relating `writing/http/multipart`) → admit as an `Image`/`Audio`/`Video` **carrier** → witness into the ledger → return the AS2 object the client references in a `Create`.
  The media capability **attenuates** (type/size/album/expiry), **delegates** to sub-agents (no credential sharing), and **revokes**.
  Least-authority media across a swarm — the differentiator. *Add:* media object carriers + `admitMedia` (cap-gated).
3. **SSE eventStream** — `GET /events`: push inbox deltas (Add/Update/Remove/Delete) → `perceiveInbox`. *Have:* relating `writing/http/sse` + `perceiveInbox`. *Add:* the route.
4. **HTTP Signatures (S2S)** — sign outbound `deliveryRequests`, verify inbound inbox POSTs.
  Mandatory for real federation.
  Transport tier.
5. **AS2 normalization** — arrays↔singletons, embedded↔id, preserve-unknown, compaction tolerance.
  The interop hardening the memo (§19) says saves months.
6. **Capability-discovery endpoint** — `GET /.well-known/activitypub-api`: activity/object types, features, limits, and the capability loci a client may request.
7. **Security gates** — SSRF allowlist on remote fetch, HTML sanitize, strip `bto`/`bcc`, rate limits, replay windows (memo §18).
  Before any federation scale.
8. ~~Mastodon bridge~~ — optional legacy adapter, deferred.
  Not math-earned.

## Status (landed 2026-06-25 — animating 48/48, organizing 45/45 green)

All bricks realized in `animating/src/writing/activitypub/`, each capability-gated and tested: 1. ✅ **outbox-write** — `postOutbox` (cap-gated C2S act path: present capability → `canInvoke` `outboxWriteLocus` → wrap in Create → mint id → 201).
2. ✅ **OCapped media upload** — `admitMedia` + `mediaObjectCarrier` (attenuable by kind *and* byte ceiling, authority by move; binary intake via relating's multipart codec).
3. ✅ **SSE realtime** — `inboxEvent`/`eventStreamHeaders` (`sse.mts`, reusing relating's SSE codec).
4. ✅ **HTTP Signatures (S2S)** — `signRequest`/`verifyRequest`/`httpDigest` (`signatures.mts`, node:crypto draft-cavage RSA-SHA256; sign↔verify round-trips, tamper fails).
5. ✅ **AS2 normalization** — `asArray`/`idOf`/`stripBlindCopy`/`safeRemoteUrl` (`normalization.mts`).
6. ✅ **capability-discovery** — `routeCapabilities`/`activityPubApi` (advertises features + the capability **loci** a client requests; `capabilityAuth:true, oauthScopeAuth:false`).
7. ◑ **security gates** — SSRF guard (`safeRemoteUrl`) + blind-copy strip (`stripBlindCopy`) landed in lib; HTML-sanitize, rate-limits, replay-window are **runtime-policy at the serve binding** (a site/server enforces), not codec law.
8. ⏸ **Mastodon bridge** — deliberately deferred (optional legacy adapter).

The C2S Social API surface is realized in lib (transport pure-routing + the binding-tier policy noted).
What remains is genuinely downstream: a site mounts the `node:http` binding (event-stream connection, header maps for signatures, multipart boundary, the runtime policy of §7) and parameterizes an instance.

## What we take from the memo verbatim

The **gap list** (§24), the **security checklist** (§18), the **interop normalizations** (§19), and the **test matrix** (§22 — measure each op as native/mapped/partial/ unsupported/broken).
We reject its storage design (§10) and its OAuth-scope auth (§12) in favor of the three native rules above.

## Cross-links

- the research: [`activitypub-c2s-deep-research-memo.md`](../../lib/animating/dev/docs/notes/activitypub-c2s-deep-research-memo.md)
- the name + thesis: [`2026-06-25-wmap-web-modeled-agency-protocol.md`](2026-06-25-wmap-web-modeled-agency-protocol.md)
- the coverage map: [`2026-06-25-codecs-on-faces-activitypub-across-scales.md`](2026-06-25-codecs-on-faces-activitypub-across-scales.md)

## Provenance

Scope and the three native rules are this session's synthesis over the C2S memo; the green base is the realized, tested WMAP codec.
Build order is a recommendation, not a contract — each brick is independently verifiable.

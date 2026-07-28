---
title: "The four strata and the missing across-site (dev/prod as in/out)"
description: "Captures the session-opening thread that the ActivityPub work subsumed but never got its own note. The repo is a four-stratum applicative descent (lib → apps → services → sites): a site is a parameterized service, a service is an app held open as a process, an app is a lib applied to the real world. At the SITE tier the in/out/across faces recur: dev.bare-cedar-fog.emsenn.net is the IN site (knowing/interior reflection), ops.561.group is the OUT site (playing/world manifold), and the ACROSS site — the peer-to-peer federation membrane between them — was missing. It is now buildable: the across-site's codec is exactly organizing's WMAP S2S federation. Records the dev-skips-services anomaly as a deliberate decision to make."
date: 2026-06-25
status: design
---

# The four strata and the missing across-site

This rescues the thread the session opened on (and then the WMAP work overran): the shape of `lib/ apps/ services/ sites/`, and the dev/prod site relationship.
The answer to "what is the missing across-site" turned out to be the very thing the rest of the session built, so it's worth stating plainly.

## The four strata are an applicative descent

Verified from the dependency wiring:

- **`lib/`** — pure library concepts (the math + its codecs).
- **`apps/`** — a lib *applied to the real world*: an operational CLI/edge over a lib.
  (`apps/web-computer` = "an operational CLI over `@emsenn/web`".)
- **`services/`** — an app that *holds itself open as a process*.
  (`services/http-server` = "…Node server startup".)
- **`sites/`** — a *parameterization of a service*, with points and state.
  (`sites/561.group` depends on `http-server` + a theme + `organizing-with-the-semantic-web`.)

Each tier is the one below it given an exterior: lib → applied → held-open → configured.
The homonymy with node-package `sites/` is not a coincidence to apologize for — a site *is* a place with points and state, and that our package term lands on the same word is the math showing through.

## At the site tier, in/out/across recurs

The in/out/across faces (knowing/playing/communicating at scale-1; computing/gaming/ socializing at scale-2) recur one level up, as kinds of *site*:

- **dev.bare-cedar-fog.emsenn.net = the IN site (knowing).** It reads the workspace *inward*, orients agents, reflects on session state — every `bin` is interior (orient-agent, ingest-hook, inject-cockpit).
  It even skips `services/` and reaches the faculties directly, because reflection doesn't need to hold a process open to the world.
- **ops.
  561.group = the OUT site (playing).** The operations manifold — it acts on the world, serves processes, publishes, with the large outward `bin` surface, through `services/`.
- **the ACROSS site = the peer-to-peer membrane between them — was missing.** Per the standing operator opinion, dev.bare-cedar-fog.emsenn.net and ops.
  561.group are **peer configured instances, not an upstream/downstream pair**.
  The across-site is the shared federation membrane both peers project onto — carrying state between them and to the world, holding their disagreement paraconsistently rather than forcing a winner.

## The answer: the across-site's codec is WMAP S2S

The session's later work *is* the missing piece.
The across-site is the **site-tier projection of `organizing`'s WMAP Server-to-Server federation** (`deliver` / `deliverToCamps` / `federateActivities` / `mergeActivities` / `deliveryRequests`).
Two peer instances = two camps; their exchange = S2S delivery; their reconciliation = the cross-arena Mayer–Vietoris reading that tolerates contested state as ⊤.
So "build the across-site" is now concrete: stand up a site that mounts organizing's federation transport as the membrane between dev and ops (and outward to any fediverse peer).

## The dev-skips-services anomaly (a decision to make on purpose)

dev.bare-cedar-fog.emsenn.net expresses its IN faculty by reaching past `services/` straight to the faculties, while ops expresses its OUT faculty properly through `services/`.
That's not just "dev is static" — it's the IN column being under-built relative to OUT.
A clean bulk wants all three faces expressed through the same stratum stack.
Decide deliberately: either dev grows a proper `knowing` service (symmetric with ops's serving), or dev is accepted as the reflective special case — but by choice, not drift.

## Frontier

- **Build the across-site**: a `sites/` instance mounting organizing's WMAP S2S federation as the dev↔ops peer membrane.
  (The codec exists and is green; this is the mount.)
- **Reconcile dev's stratum skip**: knowing-service for dev, or ratify the exception.
- `emsenn.net` currently mounts `organizing-with-the-living-web` (federated-microblog content) as a personal site — reconcile that content-federation with the agentic WMAP federation (the living-web reading vs the agent across-face).

## Cross-links - faces + codec placement: [`2026-06-25-codecs-on-faces-activitypub-across-scales.md`](2026-06-25-codecs-on-faces-activitypub-across-scales.md) - the across-face standard realized: [`2026-06-25-wmap-web-modeled-agency-protocol.md`](2026-06-25-wmap-web-modeled-agency-protocol.md)

## Provenance The strata wiring and the dev/ops `bin`-surface asymmetry are read from the repo; the in/out/across-at-site-tier reading and "across-site = WMAP S2S" are this session's synthesis (the operator's dev/ops-are-peers opinion is the constraint that makes it a membrane, not a pipe).
Checkable by building the across-site mount.

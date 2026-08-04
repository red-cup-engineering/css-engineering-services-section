---
title: "Codecs live on faces: ActivityPub across the agency scales (relating → animating → organizing)"
description: "The session synthesis settling where standards-conformance codecs belong. Standards are not owned by packages generically; they are owned by the in/out/across FACE whose math makes them possible. relating owns generic representation+transport codec law (JSON, HTTP, OpenAPI, MCP, JSON-LD/ActivityStreams grammar, HTTP-signatures, serving). animating (scale-1 agent) owns the single-agent across-face standard: ActivityPub Actor + Client-to-Server. organizing (scale-2 collective) owns the federation across-face standard: ActivityPub Server-to-Server. ActivityPub's own C2S/S2S split is the spec already pre-factored along our scale-1/scale-2 seam. Jupyter is organizing's IN (computing) face standard, not its only standard. Includes the relating running→codecs physical-move action item (56 external importers; public API must stay frozen)."
date: 2026-06-25
status: design
---

# Codecs live on faces: ActivityPub across the agency scales

This note settles a model reached across one design session (2026-06-25).
It is a **checkable design claim**, not a finished build: it states where standards-conformance codecs belong in the `relating → animating → organizing` line and why, so the ActivityPub work, the `organizing-jupyter-standard` work, and the relating `running`→`codecs` move all derive from one principle instead of being placed by topical resemblance.

The load-bearing claim, in one line: **a standard is owned by the in/out/across FACE whose math makes that standard possible — not by a package generically — and the same standard re-appears, pre-factored, at each agency scale.**

## 0. The strata this lives in

Verified from the actual dependency wiring (`package.json` deps), the workspace is a four-stratum applicative descent:

- **`lib/`** — pure library concepts (the math + its codec law).
- **`apps/`** — a lib *applied to the real world*: an operational CLI/edge over a lib (`apps/web-computer` = "an operational CLI over `@emsenn/web`").
- **`services/`** — an app that *holds itself open as a process* (`services/http-server` = "…Node server startup").
- **`sites/`** — a parameterization of a service, with points and state (`sites/561.group` depends on `http-server` + a theme + `organizing-with-the-semantic-web`).

This note is about the `lib/` tier — specifically where representation/standards codecs sit — but it is downstream-relevant: the standard a site offers the world is a projection of the faculty codec it is built over.

## 1. The faces model (the math the codecs hang on)

(Grounds: [`2026-06-21-animating-as-agency-descent.md`](2026-06-21-animating-as-agency-descent.md); `lib/communicating/src/communicate/face.mts`; `lib/animating/test/animating.test.mjs`.)

`relating` is the substrate.
The agency line derives from it by *where a faculty acts relative to an agent's boundary*:

| direction | scale-1 faculty (face of an **agent**) | scale-2 faculty (face of a **collective**) | axis |
|---|---|---|---|
| **in**     | `knowing` (interior state, reflection)   | `computing` (shared interior compute)         | knowledge ≤ₖ |
| **out**    | `playing` (acts via the world/opponent)  | `gaming` (multi-agent concurrent games)       | (game) |
| **across** | `communicating` (meme in / meme out)     | `socializing` (inter-observer mesh)           | truth ≤ₜ |

The **bulk** that glues the three faces into one settled thing is *not* one of the three:

- **`animating`** is the scale-1 bulk: `glue({communicating, knowing, playing})` → **one agent** (the glued-sheaf perceive→act loop).
  The agent carrier is animating's *interior product*, never its interface.
- **`organizing`** is the scale-2 bulk: it glues `socializing/computing/gaming` → **one collective** (a federation of agents).
  `organizing/src/federation.schema.json` states it exactly: *"the next scale up the agency spiral: a plurality of constituent societies composed into one federation."*

Each face is a *local section over a membrane* read on one bilattice axis; the bulk is the holographic gluing over the three faces.
A face is only "fully bulked" when all three faculties are present.

## 2. The codec architecture in `relating` (three layers, and "codecs" is the whole boundary)

(Grounds: `lib/relating/docs/representation-codecs.md`, `api-surface.md`; `lib/relating/src/running/serving.mts`, `induce.mts`.)

There are three distinct layers, and the word "codec" properly spans the bottom two:

1. **Ontology** — carriers, actions, charges, settlements. *What a thing is.* Codecs are explicitly **not** this.
2. **Representation + transport codecs** — boundary witnesses: "can this value inhabit this representation? are these bytes canonical?"
  This includes the *whole* boundary — not just byte grammar (JSON, Turtle, SVG, MCP JSON-RPC envelopes, SSE/WS frames) but **transport and serving**: HTTP signatures, routing, delivery, the act of holding a surface open.
  In the tree `running/` carries its own `running/codecs.mts`, and the correct end-state is **`running/` physically under `codecs/`** (see §6).
  Serving is just the *apex* codec — value↔wire over a transport.
3. **The self-projection apex** — `induceBins` takes one action family and projects it, *with no second ontology*, into multiple faces.

### The four faces over one HTTP transport (corrected)

`serving.mts` projects `induceBins` into what are really **four faces over one HTTP transport**, not five peer transports:

- **CLI** — `dispatch` (the `relate` bin)
- **OpenAPI** — `GET /openapi.json`
- **MCP** — `POST /mcp`
- **WebUX** — `GET /` index and `GET /:verb` HTML form

HTTP is the *substrate* carrying OpenAPI/MCP/WebUX (all are routes on it), plus the bare programmatic `POST /:verb` / `GET /:verb?fields` invocation that OpenAPI documents and the form submits to.
The HTML form's `method="post"` targets the **same** `POST /:verb` the machine hits — human and machine share one endpoint, one apex, no second ontology.
(The `serving.mts` header comment lists "HTTP" and "web UX" as separate bullets; that wording is the only cleanup needed there — it is one transport, not two faces.
One genuine judgment call to confirm-on-purpose: `GET /:verb?fields` performs an invocation, i.e. a GET with effects.)

## 3. The colocation principle (already latent, already stated)

**Codecs live with the math that makes them possible.** This is not a new rule; it is the existing one:

- *Why is MCP in `relating`?* Because MCP is made possible by relating's `induceBins` apex — an action family you can `tools/list` and `tools/call`.
  The enabling math is relating's, so the MCP projection lives there.
- `organizing/src/jupyter.mts` states the principle in its own header: > *"Relating owns generic HTTP, OpenAPI, MCP, and codec law.
  This module owns the > Jupyter-shaped carriers that only make sense as organizing runtime projections: > notebooks as work records, kernels as offices of execution, sessions as active work."*

So the test for "where does standard X live?" is: **whose math makes X meaningful?**

## 4. ActivityPub, placed by the principle

Apply the test to ActivityPub.
Its pieces have different enabling math:

- An **Actor** (identity with inbox/outbox, a perceive→act loop) **is an agent** → `animating`.
  No bulk, no Actor.
- An **Activity** (Create/Follow/Announce crossing a boundary) **is a charged meme** → `relating`'s meme carrier, read across by `communicating`.
- **S2S federation** (Actors delivering to each other, shared inbox, following-graph) **is a plurality settled into a collective** → `organizing` (its `federation.schema` already is this math).

### The unreasonable fit: ActivityPub's C2S/S2S split *is* our scale-1/scale-2 seam

ActivityPub is itself factored into Client-to-Server and Server-to-Server.
That factoring lands exactly on our agency-scale seam:

- **Actor + ActivityStreams 2.0 vocabulary + C2S** (one agent driving *its own* inbox/outbox — the agent as its own client over its own membrane) = **scale-1 = `animating`**, on its `communicating`/across face.
  This *is* the perceive→act loop.
- **S2S federation** (Actors/servers delivering to *each other* — the fediverse mesh) = **scale-2 = `organizing`**, on its `socializing`/across face.
  This *is* the cross-arena Mayer–Vietoris federation.

The W3C committee pre-factored ActivityPub along the same line our math factors agency.
This is corroboration, not coincidence to lean on blindly — but it is strong.

### Standards-conformance is face-indexed (the resolution to "is Jupyter the standard?")

A package does not have *one* standard; each **face** offers the standard its math admits.
So Jupyter is not wrong and not the whole story — it is **organizing's IN (`computing`) face standard** (kernels = offices of execution; notebooks = work records).
The across-face standard is the one that was missing:

| scale | face | faculty | standard | status |
|---|---|---|---|---|
| **1 (agent)** `animating` | across | `communicating` | **ActivityPub Actor + C2S** | to build |
|  | in | `knowing` | *(single-agent memory/reflection standard — open)* | open |
|  | out | `playing` | *(single-agent world/tool standard — open; MCP is relating's, not this)* | open |
| **2 (collective)** `organizing` | across | `socializing` | **ActivityPub S2S / federation** | math seed present (`federation.schema`), codec to build |
|  | in | `computing` | **Jupyter** | present (`jupyter.mts`) |
|  | out | `gaming` | *(multiplayer/match-coordination standard — open)* | open |

## 5. The settled placement (three tiers, one ontology)

```
relating/codecs/      JSON-LD + ActivityStreams 2.0 object grammar (generic value↔wire)
                      + HTTP-Signature primitives + serving                         [generic codec law]
        ↓ consumed by
animating/codecs/     Actor = agent · C2S · inbox/outbox = perceive/act              [scale-1 across face = communicating]
        ↓ consumed by
organizing/codecs/    S2S federation · delivery · shared inbox ·
                      following-graph-as-network-sheaf                               [scale-2 across face = socializing]
```

The **"no second ontology" gate holds across the whole seam** (and is also CLAUDE.md's *capability-preserving normalization*):

- `relating` owns the bare AS2/JSON-LD grammar and signing primitives.
- `animating` makes an *agent* an Actor and runs its own loop; its Actor/outbox/inbox must be **functorial views of the existing agent + `communicatingFace`**, never a parallel microblog model.
  (If it re-models a microblog, it is just the `organizing-with-the-living-web` feature relocated.)
- `organizing` *delivers animating's Activities between Actors* and settles the mesh; it imports animating's Actor/Activity (it already depends on `animating`) and adds only federation.
  It never redefines the Activity.

### What must NOT leak in (layer hygiene)

- **JSON-LD / RDF expansion** is generic linked-data law → `relating` (NOT `organizing-with-the-semantic-web`, which currently mis-owns RDF codecs; that is a separate correction).
  `animating`/`organizing` emit a **literal embedded `@context`** and read compact JSON — zero JSON-LD-processor deps (cf. the no-deps MIME work in `organizing-with-email`).
- **Multi-Actor / federation** must not be absorbed by `animating`; that is scale-2, `organizing`/`socializing`. animating's job is the *single* Actor.
- The single open sub-decision: does the pure **Activity ⟷ meme** grammar live in `animating`'s codec (alongside the Actor) or down in `communicating`?
  Current lean: keep `communicating` protocol-agnostic (truth-axis reading only) and give ActivityPub one home in `animating`, because the Activity↔meme mapping is only *meaningful* once there is an Actor to address — which is animating's.

## 6. Action item: move relating `running/` physically under `codecs/`

`running/` is the action-boundary/transport layer (dispatch, induce, serving, http, ledger, manifold, mounting, invocation) — i.e. *codec law*, per §2.
It belongs under `codecs/`.
This is a **physical relocation with the public API frozen**:

- **Blast radius: 56 external importers** of `@emsenn/relating/running` (and `/acting`) across `lib/organizing-*`, `lib/organizing-a-knowledge-vault`, `lib/computing-with-*`, `services/{http-server,fizzos}`, and `sites/{dev.bare-cedar-fog.emsenn.net,ops.
  561.group,agents.
  561.group,aagaard.
  561.group}`.
- Therefore the public `exports` subpath keys (`./running`, `./running/http`, `./running/ledger`, `./acting`, `./acting/http`) must be **preserved**, re-pointed at the new `dist/codecs/running/...
  ` paths.
  Source moves; contract does not.
- Internal relative importers to fix include `src/actions.mts` and `src/index.mts`, plus intra-`running` relative imports.
- Note the in-flight `codecs/` vs `writing/` naming (both exist; `codecs/http`, `codecs/xml` dirs are present; `writing/http/mcp` holds the real MCP source).
  The mover must resolve which is canonical before placing `running/` under it, and coordinate — `relating` may be under concurrent edit (trunk-only repo).

**Status (2026-06-25): RESOLVED / MOOT — no relocation pending.** The premise dissolved.
The operator settled the canonical layout as **three machinery siblings directly under `src/`: `writing/`, `evaluating/`, `running/`** (no `codecs/` parent), with the math in `lib/` and `typing/` distributed into `writing` (objects) + `running` (morphisms).
The empty `codecs/`/`articulating/`/`holography/` ghost dirs were deleted; `typing/` was dissolved (by a peer); my earlier wrong nesting of `running` inside `writing` was reverted.
Current `src/` is exactly `{writing, evaluating, running}` + barrels, green.
So `running` is already a correct sibling — there is nothing to move under a `codecs/` that no longer exists.
(The `./running*` / `./acting*` export keys remain as the public contract.)

## 6b. Implementation status (landed 2026-06-25)

The codec exists at both scales, green, normalized to relating (codecs under `writing/`), single-source carriers, importing only stable public faces.

**Scale-1 — `lib/animating/src/writing/activitypub/`** (29/29 tests): - `index.mts` — `activityCarrier` (`$id animating/writing/activitypub/activity`, literal `@context`); `utteranceFromActivity`/`activityFromUtterance` (the no-second-ontology bridge: Activity ↔ membrane `UtteranceCarrier`); polarity (`Undo`/`Delete` cross as denials; assertion + Undo pool to ⊤ on the across face). - `actor.mts` — `actorCarrier` + `actorOfAgent` (Actor = a view of the glued-sheaf agent; identity→IRI, the perceive→act loop = inbox/outbox). - `collections.mts` — `perceiveInbox` (inbox = the agent's own `perceive` leg), `outboxOf`/`orderedCollection` (AS2 OrderedCollection envelope). - `capability.mts` — **object-capabilities (OCapPub) through the OUT/playing face: ActivityPub as a concurrent game system** (Lemmer-Webber's Spritely/OCapN vision, realized because our OUT face already IS a CGS).
`capabilityCarrier` (an unforgeable reference granting one locus); `grant` (issue), `attenuate` (narrow = *-autonomous dualize, with provenance), `delegate` (pass by gaming's name-passing → an `Offer` Activity + the re-held cap), `invoke` (an `Invoke` Activity — handling it is the `cut`/interaction in `playing`), `canInvoke` (soundness: authority by MOVE not identity — exercisable iff `grants` is among the holder's affordances, the OUT face's open cells from `act`).
The map: capability = locus/design, invocation = cut, delegation = name-passing, attenuation = dualize.

**Scale-2 — `lib/organizing/src/writing/activitypub/`** (S2S federation, organizing 28/28): - `index.mts` — imports animating's `Activity`/`Actor` verbatim and adds DELIVERY: `deliver` (to recipient Actors' inboxes), `deliverToCamps` (the cross-arena `‖` fan-out across constituent camps, with shared-inbox optimization and once-only delivery for members shared across camps — name-passing), `reach`.
A `Camp` is a constituent society of Actors. - `federateActivities` — reads WHAT propagates by REUSING organizing's proven `federate` (cross-arena Mayer–Vietoris): each camp's delivered Activities become its socializing/across membrane; an agreed concern carried by a member shared across camps LIFTS coordination-free (`shared`), a cross-camp disagreement does NOT lift.
No second ontology — it bridges to the existing federation cohomology, not a new one. - membership — `follow`/`accept` (the join handshake: an agent Follows a camp, the camp Accepts), `admit`/`isMember` (realize the membership as state).
After admission the new member receives `deliverToCamps` fan-out and participates in `federateActivities`.

The LIVE transport is realized in lib (§6c): `animating`'s `routeActor`/`webfinger` serve the agent's HTTP surface, `organizing`'s `deliveryRequests` projects S2S delivery to remote inboxes — built on relating's `ServedRequest`/`ServedResponse`, pure routing with the binding/config downstream.
A `site/` only parameterizes an INSTANCE of this.

## 6c. Capability coverage map (which faculty earns which AS2 feature)

The maximalist reading — every capability the upstream faculties and mathematics earn, realized as an ActivityPub feature. ✅ = realized & green; ◻ = honest frontier.

| upstream faculty / math | what it earns | AS2 feature | where | status |
|---|---|---|---|---|
| **relating** FOUR bilattice | paraconsistency ⊤ | assert + `Undo` pool to ⊤ (held, both retained) | animating | ✅ |
| **relating** `negate` (≤_t involution) | truth-axis antitone | `Undo`/`Delete` cross as denial; `revoke` | animating | ✅ |
| **relating** FOUR ≤_k reach | epistemic reach order | `audience`/`visibility` (public/followers/unlisted/direct = ⊤/t/f/⊥) | animating | ✅ |
| **relating** meme carrier | a meme crossing a boundary | `Activity` ↔ `UtteranceCarrier` bridge | animating | ✅ |
| **communicating** (across, ≤_t) | the agent's truth lean | Actor `summary` (lean) | animating | ✅ |
| **communicating** illocuting | speech-act force | `illocutionOf` (AS2 type → Searle assertive/directive/commissive/expressive/declaration) | animating | ✅ |
| **communicating** grounding | Stalnaker common ground | `commonGround` (accepted, unchallenged claims of a thread) | organizing | ✅ |
| **knowing** (inside, ≤_k) | cognition regime; fold | Actor `summary` (reflecting/ruminating); `perceiveInbox` | animating | ✅ |
| **knowing** reflection | answer from settled knowledge | `askQuestion`/`answer` (four epistemic answers: believe/disbelieve/know-both ⊤/don't-know) | animating | ✅ |
| **communicating** messaging | private channel of two | `openChannel`/`send` (AS2 direct message, visibility ⊥) | animating | ✅ |
| **playing** (out, *-autonomous CGS) | locus / cut / dualize | capability `grant`/`invoke`/`attenuate`/`canInvoke` (authority by move) | animating | ✅ |
| **playing** the actual `cut` | invocation as interaction | `interact` (the cut's convergence — Daimon iff the move is legal) | animating | ✅ |
| **gaming** (scale-2 CGS, FSym 𝔸) | name-passing | capability `delegate` (→ `Offer`) | animating/organizing | ✅ |
| **gaming** concurrent strategy / symmetry | arena symmetry over caps | `exchange` (concurrent, order-independent capability delegation under FSym name-passing) | organizing | ✅ |
| **socializing** `broadcast` | publish to observers | `announce` (boost) | organizing | ✅ |
| **socializing** `merge` (CRDT ∨_k) | conflict-free join | `mergeActivities` (retains assert+Undo) | organizing | ✅ |
| **socializing** `translate` (V(α)) | inter-observer reframe | `translate` (name-map, discrete) | organizing | ✅ |
| **socializing** `converge` / H¹ | consensus reading | `federateActivities` (shared/contested/federationOnly) | organizing | ✅ |
| **organizing** federation ‖ | parallel composition | `deliver`/`deliverToCamps` (cross-arena fan-out) | organizing | ✅ |
| **organizing** membership | join a polity | `follow`/`accept`/`admit`/`isMember` | organizing | ✅ |
| **organizing** offices/authority | who may issue capabilities | `grantByOffice` (issuance bound to `officeEligibility`) | organizing | ✅ |
| **socializing** consensus | settle camps per claim | `converge` (`consensusClose` ∧_t strict + `majorityClose`) | organizing | ✅ |
| **socializing** office lifecycle | who holds the office | `investiture`/`vacate`/`rotateOffice` (rotational authority) | organizing | ✅ |
| **relating** running/serving | the live HTTP transport | `routeActor`/`webfinger`/`parseInboxActivity` (agent surface) + `deliveryRequests` (S2S) | animating/organizing | ✅ |

Every earned vein realized — INCLUDING the live transport, which belongs in lib (NOT a site), exactly as relating keeps its transport in `running/serving`: pure routing here, the `node:http` binding and per-instance config downstream.
`sites/` is where INSTANCES (parameterized configs) live; it consumes this transport, it does not define it.
The agent's `routeActor` (GET actor/inbox/outbox, POST inbox → 202 perceive, WebFinger) and the camps' `deliveryRequests` (POST the Activity to each remote inbox) are the live ActivityPub HTTP surface, in `animating`/`organizing`.

Tests: animating 42/42 (activitypub + capability + core; the unrelated peer `skillful-work` suite is mid-wiring and not part of this work), organizing 38/38 — all green.

## 7. Frontier / open questions

- The **in** and **out** face standards at both scales (table §4) are unfilled.
- `jupyter.mts`'s exact face: confirmed as `computing`/IN by its own mapping (offices of execution / work records), but worth a deliberate ruling.
- The **across SITE** thread from earlier in the session: `dev.bare-cedar-fog.emsenn.net` (IN/knowing) and `ops.
  561.group` (OUT/playing) are peer instances missing their shared **across** membrane site — which is exactly the S2S/socializing federation surface this note homes in `organizing`.
  The across site is the *site-tier projection* of organizing's S2S codec.
- `emsenn.net` currently mounts `organizing-with-the-living-web` (the federated-microblog content surface) as a personal site; relation to the principled `animating`/`organizing` ActivityPub homes needs reconciling (living-web is the content reading; animating is the agent essence).

## Provenance

Grounded in code read this session (`serving.mts`, `induce.mts`, `communicate/face.mts`, `animating.test.mjs`, `organizing/src/{federation.schema.json,jupyter.mts}`, `representation-codecs.md`, `api-surface.md`) and in sibling notes [`2026-06-21-animating-as-agency-descent.md`](2026-06-21-animating-as-agency-descent.md) and [`2026-06-21-animating-organizing-exact-mirror.md`](2026-06-21-animating-organizing-exact-mirror.md).
The federation math (parallel composition `‖`, cross-arena Mayer–Vietoris, shared/contested/federationOnly, H¹ = Arrow-irreducible consensus cost) is corpus-grounded via `federation.schema.json`'s cited sources (`federation-is-parallel-composition.md`, `cross-arena-mayer-vietoris.md`).
The C2S/S2S ↔ scale-1/scale-2 mapping and the face-indexed-standards reading are this session's synthesis — checkable claims to verify against the built ActivityPub codecs, not settled citations.

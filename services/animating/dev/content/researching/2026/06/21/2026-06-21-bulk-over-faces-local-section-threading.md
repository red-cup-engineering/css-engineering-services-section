---
title: "The bulk-over-faces relation: threading three faces as local sections (both scales)"
description: "The derivation for the unbuilt bulk→faces relation. animating (scale-1) and organizing (scale-2) are each a holographic bulk over three boundary faces — but both currently FAKE their faces (settle generically over the relating descent, importing only relating) instead of gluing their real sibling faculties. This note derives the canonical local-section face contract (thin cover/held/contested + thick L/I/P + Belnap on the face's agentive-triad axis), how each face faculty projects to it (socializing/computing/gaming and the scale-1 mirror communicating/knowing/playing), and the three-replica Mayer–Vietoris gluing the bulk performs over them. The dependency runs bulk→faces: animating must import communicating/knowing/playing; organizing must import socializing/computing/gaming."
date: 2026-06-21
status: design
grounds: [animating, organizing, socializing, computing, gaming, communicating, knowing, playing]
builds-on:
  - 2026-06-21-animating-as-holographic-bulk.md
  - 2026-06-21-organizing-as-social-scale-governing.md
  - 2026-06-21-animating-organizing-exact-mirror.md
---

# The bulk-over-faces relation, derived (both scales)

## The gap

animating and organizing are each a **holographic bulk over three boundary faces** ([holographic-bulk note]): the interior (agent / organization) is the global section glued from three local sections, one per face, by where the face acts on the boundary — **across / inside / outside**.
But the relation is **unbuilt at both scales**: each bulk today imports *only relating* and settles all three faces with the *same generic `descend`*, relabeling the result by `faculty`.
That is "absorbed, not threaded" — the faces are faked, not supplied by their real sibling faculties.

The fix is the same self-similar move at both scales: each **face faculty exposes a local-section carrier on its agentive axis**, and the **bulk imports its three faces and glues them**.
The dependency runs **bulk → faces** (the holographic principle reconstructs the interior *from* its boundary):

- **scale-1:** `animating` imports `communicating` (across) + `knowing` (inside) + `playing` (outside). *(Today it imports only relating — the relation is unbuilt.)*
- **scale-2:** `organizing` imports `socializing` (across) + `computing` (inside) + `gaming` (outside). *(Same gap.)*

The faces are **leaves over relating** — they never import the bulk or each other (the corrected DAG; the `playing → animating` cycle that surfaced at consolidation was exactly this rule being violated, see [[project-faculty-dag-bulk-over-faces]]).

## The three faces are the agentive triad on its three axes

The corpus's universal bilattice structure is three **transverse** axes (`agentive-triad.md`; Avron's twist-product representation makes it canonical): **truth** (≤_t — which way it leans; negation antitone), **knowledge** (≤_k — how much is settled; monotone accumulation), **evidence** (the paired ⟨a₊,a₋⟩ for/against).
The three faces are these three axes read at the boundary, by direction:

| direction | scale-1 face | scale-2 face | agentive axis (provisional) | the role it reads |
|---|---|---|---|---|
| **across** | communicating | socializing | **truth** ≤_t | which way the boundary leans |
| **inside** | knowing | computing | **knowledge** ≤_k | how much is settled / accumulated |
| **outside** | playing | gaming | **evidence** ⟨a₊,a₋⟩ | the paired for/against record |

(The exact face↔axis correspondence is flagged provisional in the holographic-bulk note and is downstream theory; `organizing.mts`'s `FACULTY_AXIS` already uses socializing:truth / computing:knowledge / gaming:evidence, adopted here.)

## The gluing: three-replica Mayer–Vietoris (proved)

The bulk glues its three local sections by the corpus's **three-replica Mayer–Vietoris** (`…/settling-cohomology/_archive/predication-three-replica-mayer-vietoris.md`), the exact three-cover instance: for a cover `U = U₁ ∪ U₂ ∪ U₃`,

$$\cdots \to H^0\!\Bigl(\textstyle\bigcap_i U_i\Bigr) \xrightarrow{\;\delta^0\;} H^1\!\Bigl(\textstyle\bigcup_i U_i\Bigr) \to \textstyle\bigoplus_i H^1(U_i) \to \cdots$$

and **`δ⁰ = 0` iff the three local sections merge to a global section** (the ≤_k join; disagreement aggregates to `⊤`, coordination-free).
So `H¹(U)` is the gluing obstruction; `glued = δ⁰-vanishing`. organizing's `crossArena` already computes this exactly (`federationOnly` = coker diff over the proved settling-cohomology); animating needs the scale-1 analog. **This is the system's first multi-port (three-cover) mount** — the proof tree branches into the three faces and rejoins at the bulk.

## The local-section face contract (what each face must provide)

A canonical face carrier the bulk consumes, derived from the Face + SocialFactorization shapes organizing already carries:

```
Face (local section over one boundary cover):
  faculty     : which sibling supplies it
  direction   : across | inside | outside
  axis        : truth | knowledge | evidence        (the agentive-triad axis it reads)
  cover       : cells of the local section over this face's membrane          (thin)
  held        : cells the section holds                                        (thin)
  contested   : stable cells — held contradictions                            (thin)
  locution / illocution / perlocution : the act-factorization on this axis     (thick)
  belnap      : { absurd, potential, active, stable } quartet on this axis      (thick)
```

The thin half is organizing's existing `Face`; the thick half is its existing `SocialFactorization` (L/I/P + Belnap, currently computed bulk-side as `socialFactor`).
The derivation **moves the thick reading into each face faculty**: the faculty produces its own axis-typed local section; the bulk reads it, no longer computing all three generically.

## Per-faculty projection (how each faculty produces its local section)

Each face faculty already settles its membrane; it needs to **project that settling to the face contract on its axis**:

- **socializing (across / truth)** — readiest.
  It has `SocialField`/`FieldSection` (the multi-observer cover) and `consensus` (its own, just absorbed).
  Project the field section → `Face` on the **truth** axis; the across reading is the collective's direction.
- **computing (inside / knowledge)** — use **`relay(lead, rest)`** (the society's ≤_k aggregate, `joinKnowledge` over agents' standings), NOT a single `compute`/FOUR.
  The inside face is the *society's accumulated knowledge section* over the agent cover.
- **gaming (outside / evidence)** — use the **`arena`** (a prime event structure: events with causality/conflict/polarity).
  The outside face is the arena's events as the cover, read on the **evidence** twist-product axis (for/against = P/O polarity).
- **scale-1 mirror** — communicating (truth/across), knowing (knowledge/inside), playing (evidence/outside) project the same way for animating.

## Build plan

1. **Land the face contract carrier** (schema-first; thin+thick, axis-typed).
  It can live in relating's holography kernel (the canonical local-section/projector) or be the bulk's `Face` enriched — decide at implementation; the bulk and both scales share it.
2. **Each face faculty exposes a `face(membrane)` projection** to the contract on its axis (socializing/computing/gaming; communicating/knowing/playing).
3. **The bulk imports its three faces and glues** — replace the generic `socialFaces`/ `faceOf` (organizing) and the scale-1 analog (animating) with consumption of the three real local sections; gluing stays the three-replica MV (`crossArena`).
4. **Fix the dependency**: add communicating/knowing/playing to `animating`'s deps; socializing/computing/gaming to `organizing`'s deps.
  Faces stay relating-only.
5. Keep green at each step; the thick per-face L/I/P+Belnap is the "much more" the holographic-bulk note deferred — land it here.

## Non-goals / provenance

Corpus-grounded: [holographic-bulk note] (the three-faced gluing node), three-replica Mayer–Vietoris (the proved three-cover gluing), `agentive-triad.md` (the three transverse axes; Avron universality). **Non-goal:** the bulk computing its faces generically (the current faked state). **Non-goal:** faces importing the bulk or each other (DAG violation).
The face↔axis assignment is provisional downstream theory.

[holographic-bulk note]: 2026-06-21-animating-as-holographic-bulk.md

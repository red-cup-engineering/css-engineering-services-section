---
title: "animating is a holographic bulk over three boundary faces (communicating ⊔ knowing ⊔ playing), not a descent chain"
description: "Sharpens 2026-06-21-animating-as-agency-descent.md. animating is not a morphism and not a linear descent: it is a holographic bulk whose boundary has three typed faces — communicating (across), knowing (inside), playing (outside) — and whose hidden interior is the agent, the global section glued from three local sections. H¹=0 is the gluing/agreement condition. This is the first bilattice-network-sheaf instance, and the first MULTI-PORT mount (cospan/decorated-cospan), forcing the manifold beyond single-edge tiling. Grounded in relating's holography kernel and the corpus agentive triad."
date: 2026-06-21
status: design
supersedes-shape-of: 2026-06-21-animating-as-agency-descent.md
---

# animating is a holographic bulk over three boundary faces

This sharpens [the agency-descent note](2026-06-21-animating-as-agency-descent.md).
That note got the *content* right (agency is interior; the agent is a glued sheaf that is a perceive→act loop; the four regimes are real) but the **shape wrong**: it organized animating as a 1-dimensional descent `becoming → doing → working → governing`, a chain of morphisms. animating is not a chain and not a morphism at all.
It is a **holographic bulk over three boundary faces** — a higher-arity, multi-boundary gluing node.
That is the dimension error to correct, and it is why animating is "the least well-derived in shape" of the relating siblings.

## The structure: one interior, three typed boundaries

- **The interior is the agent (agency), and it is never exposed.** "Agency is internal to the thing being animated."
  The agent is not a domain or a codomain; it is the **hidden bulk content**, reconstructed-from but never identical-to its boundary.
  You only ever *see* an agent through how it communicates, knows, and plays.
- **The boundary is the three faculties themselves**: `communicating ⊔ knowing ⊔ playing` — the three interfaces of an agent, by *where they act relative to its boundary*: communicating **across**, knowing **inside**, playing **outside**.
  Those three packages are animating's boundary faces, not stages inside it.
- **Therefore animating is the gluing/bulk that binds three boundary interfaces into one interior agent.** Not endomorphic, not `A → B`; a three-arity node.

This is the corpus's own **holographic principle**, which it derives at the *settling* regime — not borrowed physics.
`content/_archive/…/cosmological-settlement/ …/holographic-principle/holographic-principle.md` states it: "the information content of a region can be fully encoded on its boundary … the interior is, in some sense, a projection of boundary data — hence holographic," originating from Bekenstein–Hawking entropy (entropy scales with boundary *area*, not volume) and realized exactly by AdS/CFT (every bulk calculation has a boundary calculation giving the same answer). animating reads this at the *agent*: the agent's interior is fully encoded on, and a projection of, its three boundary faces; `project` is that boundary read.

This is also exactly the **holographic projection kernel** relating already carries: `lib/relating-experimental/src/holography` is the bulk↔boundary kernel — a `Projector<T>` (`recognize`/`read`/`write` over a boundary `Resource`), a restriction lattice (Curry–Howard entailment), and the `projecting/` event-sourcing chain `log → state → record → content` (boundary log is the write-model; the projected state is the bulk read-model; the record tier is the settled snapshot; the content tier is a per-entity cut). animating instantiates this with a **three-faced boundary**: the boundary is the disjoint union of the communicating, knowing, and playing covers; the bulk is the agent, projected to / encoded on those three.

## The categorical reading: a sheaf glued over a three-cover

Of the candidate models for "one interior, three typed boundaries" — a decorated cospan / hypergraph morphism, an operad/PROP node of arity 3, or a sheaf gluing — we lead with the **sheaf-over-the-three / holographic-bulk** reading, because (a) relating already carries holography and sheaves (`sheafFromValuation`, `sectionOf`, the first-cohomology reader), and (b) the standing goal *"derive organizational state as a bilattice network sheaf"* is exactly this: the agent is the **global section glued from the communicating / knowing / playing covers**.

Concretely, on the relating substrate:

- each **face** is a cover with a **local section** — the settled relating section over that faculty's membrane log (the descent of [the prior note] settles *one face*; it is the per-cover settling substrate, demoted from "the shape of animating" to "how a single boundary face settles");
- the **agent** is the **global section** glued from the three local sections;
- **gluing** is the sheaf condition, and the corpus proves it exactly as the **replica Mayer–Vietoris sequence** over `settling-cohomology` (a *proved* theorem, `content/mark/…/settling/content/sheaf/content/settling-cohomology/…/ replica-mayer-vietoris.md`): for a cover `U = U₁ ∪ U₂`, the connecting map `δ⁰ : H⁰(U₁∩U₂, F) → H¹(U, F)` sends an overlap section to its Čech cocycle, and **δ⁰(s) = 0 iff s extends to a global section on U**.
  So the first cohomology **H¹(U) is the obstruction to gluing the local sections**; H¹ = 0 iff the three faces agree on overlaps and the global section (the agent) exists.
  The corpus gives it two readings we adopt verbatim: *as an obstruction* (what cannot glue) and *as a coordination cost* — "zero H¹ means coordination-free merge; non-zero H¹ means some form of consensus is required" (the same theorem's CRDT-convergence corollary).
  Our H¹ is computed as the first cohomology of the merged settlement filtration, so this grounding is exact, not analogical: `glued` is δ⁰-vanishing and `project` reports the coordination reading.
- the **holographic projection** `agent → { communicating-view, knowing-view, playing-view }` restricts the global section back to each cover: you recover each face's view of the agent, never the bulk directly.

The three faces are **threaded, not absorbed**: animating provides the gluing node, and the sibling packages communicating/knowing/playing are the boundary it glues. **The dependency arrow runs bulk → faces, never the reverse.** Because the holographic principle reconstructs the interior *from* its boundary, animating must read the three faces to glue the agent — so **animating depends on relating + communicating + knowing + playing**, and the three faces depend only on relating (and never on each other or on animating).
(An earlier draft of this paragraph had it backwards — "animating depends on none of them; they mount on it" — which a `playing → animating` import had quietly violated; the package-graph cycle that surfaced when consolidating is exactly that violation.
The faces are leaves over relating; the bulk sits above them.
See [[project-relating-line-refactor-live-state]].)

## Why this is "very complex," and the manifold consequence

It is genuinely higher-dimensional: a gluing of three open systems, not an arrow.
And it is the **first multi-port mount** in the system.
Everything built so far — carrier-node mounting, the wiring graph — is *single-edge*: producer-codomain `$id` = consumer-domain `$id`, one port. animating is the first node whose boundary glues **three** packages' surfaces at once, with the agent as the interior.
So deriving animating correctly tells the manifold it needs **multi-port / cospan composition**, not just linear tiling: the proof tree from relating stops being a *path* and becomes a *gluing* — it branches into communicate / know / play and **rejoins into an agent** at the animating node.
This is a corpus-level finding about the assembly calculus, not only about one package.

## Corpus grounding and what remains

The three-faced agentive structure is the corpus's own (open) **agentive triad** `speaking : truth :: doing : knowledge :: learning : evidence` (the bilattice's three orthogonal axes, `D₄ = ⟨∼, −, σ⟩`), each face a thickly-typed interface with its own locution/illocution/perlocution factorization and Belnap classification (see `content/_archive/animating/…/agent/acting/docs/dev/notes/agentive-triad*.md` and the predication-categories chapter).
The faculty naming (communicating/knowing/playing, by across/inside/outside) is this corpus triad read at the package boundary; the exact face↔axis correspondence (e.g. knowing↔evidence vs. knowing↔knowledge) is left provisional here and is downstream theory.

**Built this turn (the core re-shape):** the three-faced holographic gluing node — `face` (settle a faculty's membrane log into a local section over its cover), `glue` (the three local sections → the agent as the glued global section, H¹ the obstruction), and `project` (the agent → its three boundary views) — over the existing descent substrate, kept green.

**Deferred (the "much more"):** the thick per-face structure (each face's L/I/P factorization and Belnap quartet), the σ-meta symmetry for the knowing/learning face, the multi-port cospan composition primitive for the manifold, and the further `content/_archive` agentive theory.

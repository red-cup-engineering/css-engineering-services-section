---
title: "knowing as one spine: corpus/resource/document + term/fact/typing/proof, with DRR and neuroreflexivity as the proof's two faces"
description: "The vocabulary + architecture decision (with the user, 2026-06-21) that unifies knowing's data layer. The disk boundary is the CORPUS (content/), whose general object is a holography RESOURCE {path,content} and whose codec specialization is a DOCUMENT (markdown codec → subject/frontmatter/body/verdict). MEMORY is the held knowledge C(Meme), an EAVT-over-predication store of FACTS (charged cells/datoms) about TERMS (entities), TYPED (predicate/sort). The settling derivation that certifies facts is a PROOF (SettlementFiltration; a corpus path IS a proof). Directed relational research (research/know/study/explain/learn/teach/tutor) is how the proof is BUILT; neuroreflexivity (reflect/ruminate/gauge) READS the proof's convergence. researching/ + cognizing/ + memory/ are not parallel subsystems — they share the one `proof` carrier. Reading is re-founded on relating-experimental codecs + holography (delete the ported conformance/genre/frontmatter/grep duplicates); raw grep is dropped (no codec home)."
date: 2026-06-21
status: design
---

# knowing as one spine

This note records a multi-turn design decision (with the user) that supersedes the ad-hoc data layer of `lib/knowing` and the "addressing surface reborn" framing in [the comonad note](2026-06-21-knowing-as-comonad-on-meme.md).
The faculty thesis is unchanged — knowing is the comonad on the meme working the knowledge order ≤_k.
What changes is the **vocabulary and the admission boundary**, made consistent and corpus-grounded, and the recognition that the package's three clusters are **one spine**.

## The clean vocabulary

### The corpus boundary (the disk-store)

- **corpus** — the on-disk knowledge store (`content/`); the disk-store `memory` reads from. knowing's single effectful binding lives here (`corpus/`), nowhere else.
- **resource** — the *general object* of a corpus: relating's holography `Resource {path, content}` (`@emsenn/relating-experimental/holography`), **reused, not redefined**.
- **document** — a resource *decoded by the markdown codec* (`markdownDataform` → `{subject, format, conformant, frontmatter, body, assertions}`); a **specialization of resource**.
  Reading the corpus is `markdownDataform`/`parseMarkdown`, never a hand-rolled regex and never raw bytes.

The codecs already provide everything knowing had hand-ported — `markdownDataform`, `frontmatterConformance`, `parseMarkdown`, and the whole `path` codec (`address`, `termKey`, `composeTerm`, `pathProjector`).
Those ports are **deleted** (CLAUDE.md Absence + capability-surface).
Raw **grep is dropped**: a substring scan over bytes has no codec home; content search is a query over decoded carriers.

### Memory's internals (the held knowledge C(Meme)) — an EAVT-over-predication store

Grounded in `content/_archive/knowledge-science/concepts/term.md`, relating-experimental's predicating surface (`PredicationTerm`/`Cell`/`Predicate`), and the settling chain:

| carrier | corpus grounding | in memory |
|---|---|---|
| **term** | "an element of the free algebra T(Σ,X)… denotes an *individual*… **not a truth-bearer**" (`term.md`); relating's `PredicationTerm` | the **entity** a fact is about (the EAVT `e`); addressed by the `path` codec's `termKey` |
| **fact** | a truth-bearing assertion = a **charged predication cell / EAVT Datom** (subject·predicate·object + charge over FOUR); relating's `Cell`/`Datom` | the **held assertion** — the truth-bearer (evidence + ≤_k standing) |
| **typing** | the predicate/sort a term inhabits; relating's `Predicate` + the `typing`/realize functor | the **type** a term inhabits (the EAVT `a`, and the schema) |
| **proof** | a derivation read left-to-right — `content/CLAUDE.md`: each corpus path **is** a proof; relating's `SettlementFiltration` | the **settling derivation** that certifies facts (the ≤_k climb) |

So **memory = a held body of *facts* about *terms*, *typed*, certified by *proofs*** — `C(Meme)` read as an EAVT/predication store.

## The spine: DRR and neuroreflexivity are the proof's two faces

`researching/`, `cognizing/`, and `memory/` are **not** three parallel subsystems.
They share **one carrier — `proof` (the settlement)**:

- **directed relational research (DRR)** *builds* the proof: it settles the directed relations (facts) among terms into a `SettlementFiltration` — the ≤_k-monotone settling orbit.
  `research/know/study/explain/learn/teach/tutor` are nested derivatives of that one proof (`research` = the base coKleisli act `r : X → C Y`).
- **neuroreflexivity** *reads* the proof's **convergence**: `reflect` = the proof that settles to a known fixpoint (the convergent orbit); `ruminate` = the proof that never settles (aperiodic / `firing-blowup`); `gauge` = the settling regime / firing ordinal (intelligence).
  These are values of one faculty over the same proof.

This is precisely the settling-coalgebra orbit `c : E → F_U(E)` the comonad note already proves; the vocabulary makes it one spine: **facts-about-terms** (the carrier grain) → **proof** (the orbit, built by DRR) → **convergence reading** (neuroreflexivity).

## Implementation consequence

1. `corpus/` is the single effectful module: `Resource` enumeration + `document` decode via the markdown codec + proof-tree navigation (node/frontier/ancestry/references); `list`/`find` over the confined region.
  The old `addressing/` folds in here; its term is retired.
  Carriers under `knowing/corpus/*` (`document`, `node`, `frontier`, `listing`, `find-result`).
2. `memory/` carriers under `knowing/memory/*`: `term`, `fact`, `typing`, `proof`, and the held-knowledge readings (`settlement`/`observation`/`health`/`topic-inspection`/ `concept-map`/`gap`) — all over facts-about-terms.
3. `proof` is the shared carrier `researching/` and `cognizing/` both stand on.
4. Every carrier schema-first (bare-descent `$id`, realize-generated type); every action `domainSchema`/`codomainSchema` `$ref`s a carrier `$id`; four-faced via `induceBins`; EAVT-witnessed.
  Reading goes through codecs + holography, never ad-hoc fs/regex/grep.

## Provenance

The faculty thesis and the reflect/ruminate fork are from [knowing = the comonad on Meme](2026-06-21-knowing-as-comonad-on-meme.md).
The corpus/resource/document boundary, the term/fact/typing/proof spine, the DRR-builds-proof / neuroreflexivity-reads-proof unification, and the deletion of the hand-ported conformance/frontmatter/addressing in favor of relating-experimental's codecs + holography are this session's decisions with the user, grounded in `holography/projecting` (log → state → record → content), the `codecs` surface (`markdownDataform`, `frontmatterConformance`, the `path` codec), and `content/_archive/knowledge-science` (`term.md`).

---
title: "Git and Node as two coordination tiers: the version-control / dependency bigrading of a workspace"
description: >
  A workspace is coordinated in two distinct tiers — git (submodule pins over commit
  histories) and Node/pnpm (the lockfile over the dependency graph) — and these are two
  settlements over one package base. Each is a present⊣free, content-addressed settling; git
  is additionally a Lorentzian causal set whose submodule pins are a simultaneity slice across
  independent timelines. Read cohomologically, the pnpm tier is a society by subsidy (one
  lockfile discharges the dependency diamonds) and the git tier is, in 561-group as measured,
  a society by structure (the submodule graph is a tree: Ȟ⁰=1, Ȟ¹=0, Ȟ²=0). Their product is
  a bigrading, and that product is exactly where scale-3 federation (degree-2 obstruction)
  lives — so the monorepo↔polyrepo choice is the society↔federation choice, and Ȟ² over the
  submodule-pin graph is its instrument.
date: 2026-06-26
status: design
grounds: [relating, organizing, computing, metacircularity, jsnode]
builds-on:
  - 2026-06-26-relational-structuration-of-a-jsnode-typescript-pnpm-workspace.md
  - 2026-06-21-agency-spiral-self-similar-faculty-quartet.md
  - 2026-06-26-infotiles-bilattice-sofic-tilings.md
---

# Git and Node as two coordination tiers

## Thesis

A workspace is coordinated **twice over the same package base**, by two independent settling systems:

- **The Node/pnpm tier** settles the *dependency* question — *which resolved version of each package satisfies every requirement* — into one `pnpm-lock.yaml`.
- **The git tier** settles the *history* question — *which commit of each independently versioned repository the whole is pinned to* — into the super-repo's submodule gitlinks.

These are not the same coordination, and the interesting mathematics is their **interplay**: two settlements over one base, forming a **bigrading** whose product is precisely where the next spiral turn — scale-3 federation, the degree-2 obstruction — can appear.
This note reads that interplay, and records the measured state of 561-group under it.

## I. Both tiers are present ⊣ free, content-addressed settlings

The corpus's grounding adjunction (`present` forgets to generators; `free` materializes; `free ∘ present ≅ id` is the statement of freeness — "no free data") holds **twice**, once per tier, and both are content-addressed:

| | generator (`present`) | materialization (`free`) | content address |
|---|---|---|---|
| **pnpm** | `pnpm-lock.yaml` (names, ranges, integrity) | `node_modules` (symlink farm) | package integrity hash |
| **git** | submodule gitlink (a commit SHA) | the checked-out subtree | git object SHA (commit/tree/blob) |

A reproducible `pnpm install` is `free ∘ present ≅ id` on the dependency tier; a deterministic `git submodule update --init` is the same identity on the history tier.
So the workspace already obeys "carriers store only their generators" in *both* tiers — the lockfile and the gitlink are the two presented forms, `node_modules` and the working tree are the two free materializations.
The repo's full state is a tiling addressed by **two** hash systems at once (git SHA × pnpm integrity).

## II. Git is a Lorentzian causal set; a submodule pin is a simultaneity slice

This is the structural asymmetry between the tiers, and it is exact (**iso**).
A git history is a **causal set**: commits are events, parent-edges are the causal order `≺`, merges are joins.
A repository *is* a Lorentzian poset, and `git log --graph` draws its light cones.

A **submodule pin selects one commit** in a child's history — a single point in that child's causal order.
The super-repo's whole submodule pin-set is therefore a **choice of one point per child timeline**: a **spacelike simultaneity slice across many independent histories**.
"Update a submodule" advances one timeline's slice; "the super-repo commit" records a new slice.
A federation is **coherent** when its slice is consistent — no child is required at two incompatible commits at once.
So git's coordination problem is literally *choosing a consistent "now" across independent clocks* — the relativity-of-simultaneity problem, made of gitlinks.

The pnpm tier has no such timeline structure: it settles a single instantaneous resolution, not a slice across histories.
This is why **git is the higher-scale tier** — it coordinates *across* independently-evolving constituents (scale-3 candidate), while pnpm coordinates *within* one resolution (scale-2 society).

## III. The two tiers as two cohomological covers — and 561-group measured

Each tier carries a coordination cohomology (the cover-nerve Ȟ¹ of `CoordinationCohomology`), and they are society for different reasons:

- **pnpm tier — society by subsidy.** The dependency graph *does* have diamonds (many packages depend on `relating`), so its undirected cover has nonzero structural Ȟ¹.
  But the single lockfile resolves them to one global section, **discharging** the obstruction (`federationOnly = 0`).
  The coordination cost is paid centrally and silently — a subsidy.

- **git tier — society by structure (measured).** The submodule-pin nerve of 561-group is a literal **tree**: 21 root submodules, all distinct repos; exactly one nester (`sites/koios.news`, with two exclusive children); every shared-library candidate (`lib/relating`, `content`, the theme) pinned by **only the root**.
  No repo has two parents ⟹ no shared child ⟹ no parent-pair overlap ⟹ the nerve is 1-dimensional.

  ```
  |V| = 24   |E| = 23   |C| = 1
  Ȟ⁰ = 1     Ȟ¹ = |E|−|V|+|C| = 0     Ȟ² = 0   (no 2-cells exist)
  ```

So at the git tier there is no obstruction to even discharge — it is a clean rooted tree.
(Caveat: two submodules — `apps/ledger-computer`, `sites/web.emsenn.net` — are uninitialized; given the consistent share-at-root pattern they are almost certainly leaves, but their nested `.gitmodules` are the one thing that could perturb this.)

**Verdict:** 561-group is a **society at both tiers** — pnpm by subsidy, git by structure — and a federation only in *potential*.
The mechanism keeping the git tier a tree is the design choice that shared code lives **once at the root and is consumed through the single pnpm workspace (`workspace:*`), never vendored as nested submodule copies.** Sharing happens on the pnpm tier; the git tier stays acyclic.

## IV. Inter-tier disagreement is the ⊤ charge

The two tiers can agree or disagree about the same package, and **their disagreement is a held contradiction (⊤)** — the same charge the structuration note found between the type-lean and the value-lean, now between the *history*-lean and the *dependency*-lean:

- git pins `lib/relating` at commit X (a slice point), while the pnpm lockfile resolves `@emsenn/relating` to a build that corresponds to commit Y — the working tree and the resolved graph disagree about *which* relating is live.
  (`workspace:*` masks this by making pnpm point at the working tree, collapsing the two — which is *why* the monorepo holds them in agreement: it forces git-slice = pnpm-resolution.)

So `workspace:*` is not just convenience — it is the operator that **identifies the two tiers**, forcing history-lean = dependency-lean and keeping the inter-tier charge at `t` rather than `⊤`.
Drop it (publish + semver between split repos) and the two tiers decouple, and inter-tier ⊤ becomes possible: the lockfile can resolve a published version whose source is a *different* git commit than the one a consumer's submodule pins.

## V. The product is degree-2: why federation lives in git × pnpm

The punchline.
The two tiers are **orthogonal coordination axes**, and coordinating in *both at once* is a **degree-2** problem — a bigrading / double complex, exactly the structure the spiral note predicts for scale-3 (the Ȟ² of a cover-of-covers).

- Coordinating the dependency graph alone (pnpm) is one settling — degree-1, discharged by the lockfile.
- Coordinating the history slice alone (git) is one settling — degree-1, here a tree.
- Coordinating **a consistent dependency resolution *across* a consistent multi-timeline slice** — the federation problem — is the **product**, where the two degree-1 settlings must agree, and the obstruction to their joint consistency is **degree-2**.

This is why the federation Ȟ² appears at the git tier and not the pnpm tier: the git tier is the one that ranges over independent timelines, so it is the axis that, crossed with the dependency axis, raises the degree. **monorepo ↔ polyrepo is therefore society ↔ federation**: a monorepo collapses the product (one lockfile + `workspace:*` identifies the tiers, Ȟ²=0); a polyrepo splits it (each constituent its own lockfile, shared libs vendored at independent commits → a shared child with N parents → the diamond → **Ȟ² ≠ 0**).
The split is the operation that *manufactures* the second cohomological degree, and **Ȟ² over the submodule-pin graph is the instrument that detects whether you have turned the spiral.**

## VI. Consequence for the metacircular mirrors

The substrate-reflection faculty mirrors (the structuration note's §VI) must read **both tiers** to carry the full coordination state of a package:

- the **dependency carrier** (pnpm: lockfile + the resolved graph) — the ≤ₖ/knowledge settling;
- the **history carrier** (git: the commit causal set + the submodule slice) — the timeline settling, which is the Lorentzian causal order of the package's evolution;
- the **inter-tier charge** (do git-slice and pnpm-resolution agree?) — a `t`/`⊤` cell that no single tier can compute, only the product.

So "computing reflects the workspace" is incomplete with pnpm alone — the git causal set is half the carrier, and the federation Ȟ² is computable only from both.
The single host-admission boundary (the "JS Mark") must admit **git objects as well as package manifests**; the build is where *both* tiers' free-data enters, and it stays one boundary so the tower holds.

## Open questions

- **The exact bilattice axes.** Is the clean assignment git = the causal/time axis and pnpm = the dependency/knowledge axis (so the workspace charge is bigraded by history × dependency), or does the structuration note's provider/consumer ≤ₜ subsume git?
  The two readings must be reconciled before the carriers freeze.
  (Candidate, not settled.)
- **Polyglot tiers.** Cargo and Guix each have the same two-tier split (git over crates/recipes × Cargo.lock/`/gnu/store`); is the bigrading the same, and does Guix's content-addressed store collapse the two tiers the way `/gnu/store` already unifies build and version?
- **When does koios's nesting matter?** It is the only nester today; if a second submodule ever vendored `koios-news-content`, that repo becomes the first shared child and the first place Ȟ¹ (then Ȟ²) could go nonzero.
  Worth a standing Ȟ² check on submodule moves.

## Provenance

The two present⊣free adjunctions and the bigrading framing are this note's synthesis; the git-as-causal-set / pin-as-simultaneity-slice reading is exact and standard; the society-by-subsidy vs society-by-structure distinction and the Ȟ⁰/Ȟ¹/Ȟ² numbers are **measured** on the live 561-group submodule graph (2026-06-26), not hypothesized.
The monorepo↔polyrepo = society↔federation = manufacture-Ȟ² result is the load-bearing claim, to be confirmed the first time a shared library is multiply-pinned.
`iso`/`analogy`/`measured` marks are the honest confidence flags.

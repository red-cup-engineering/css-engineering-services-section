---
title: "npm packages, git repositories, and branches as coordination carriers"
description: >
  A grounded study of how the 561 Group code and theory currently conceive of
  npm package manifests, pnpm workspaces, git repositories, submodule pins, and
  branches. The reading: package.json is a package membrane and capability
  vocabulary; pnpm is the dependency-settlement tier; git is the history-
  settlement tier; branches are generic git refs but are operationally collapsed
  to trunk-only main in this repo. The two tiers form a product coordination
  structure over one package base.
date: 2026-06-28
status: study
grounds: [computing, organizing, jsnode, information-coherence-kernel, git, pnpm]
sources:
  - AGENTS.md
  - dev/content/researching/papers/2026-06-26-ick-whitepaper.md
  - dev/content/researching/papers/2026-06-26-infotiles-bilattice-sofic-tilings.md
  - dev/docs/explanations/category-theoretic-jsnode-packaging.md
  - dev/content/researching/notes/2026-06-22-the-faculty-package-idiom-conceptual-target.md
  - dev/content/researching/notes/2026-06-21-package-composition-by-carrier-node-mounting.md
  - sites/research.emsenn.net/content/researching/notes/2026-06-26-relational-structuration-of-a-jsnode-typescript-pnpm-workspace.md
  - sites/research.emsenn.net/content/researching/notes/2026-06-26-git-and-node-as-two-coordination-tiers.md
  - lib/computing/src/host-neutral-carriers.mts
  - lib/computing/src/js-mark.mts
  - lib/computing/src/admission.mts
  - lib/computing/src/git-mark.mts
  - lib/organizing/src/host-neutral-carriers.mts
  - lib/organizing/src/js-mark.mts
  - lib/organizing/src/git-mark.mts
  - apps/jsnode-ick/src/jsnode/workspace.mts
  - apps/jsnode-ick/src/topology/settlement.mts
  - apps/jsnode-ick/src/jsnode/workspace-health.mts
  - apps/jsnode-ick/src/jsnode/decommissioned-imports.mts
  - pnpm-workspace.yaml
  - .gitmodules
---

# Thesis

The workspace has one base but two settlements.

An npm package is not treated here as a bag of JavaScript files.
It is a bounded categorical agent whose `package.json` is its membrane: name and version give identity, `exports` gives the importable communicating surface, `bin` gives the invocable strategy surface, dependency declarations give the package's knowledge of other packages, and scripts give named plays at the boundary.

A pnpm workspace is the first social scale over those packages.
It admits a governed set of package membranes (`pnpm-workspace.yaml`), then settles their dependency claims into one resolution (`pnpm-lock.yaml` and the workspace dependency graph).
This is the dependency-settlement tier.

A git repository is the second, orthogonal settlement.
Its commits are events in a causal order; refs name points or moving tips in that order; submodule gitlinks pin one commit from another repository.
A super-repo commit records a simultaneity slice across many child histories.
This is the history-settlement tier.

Branches are therefore not a desired workflow structure in this repo.
The code can parse branches because git has refs, but the repo law collapses operation to one public line: `main`.
A branch is a generic git ref; in the 561 Group super-repo it is not a place to do work.
Feature branches are forbidden by `AGENTS.md`, and `.gitmodules` branch declarations overwhelmingly say `main` as tracking metadata, not as permission to make branch-local realities.

The deep reading is:

```text
package.json  -> package membrane and capability vocabulary
exports/bin   -> import/call boundary faces
pnpm workspace -> package society and dependency settlement
pnpm lock     -> presented dependency resolution
git commit DAG -> repository causal set
gitlink       -> presented history pin
submodule set -> simultaneity slice across repositories
branch        -> ref into the causal set; operationally collapsed to main
git x pnpm    -> product coordination tier over one package base
```

# Maturity

**Built+green, inherited only from cited verification notes:** the JSNode ICK rehoming audit lists green checks for many workspace/package topology actions.
This study did not rerun those package checks.

**Current in-tree code evidence, not a fresh green claim:** the manifest carriers, JS/package admission, package export/bin surface extraction, workspace discovery, dependency graph construction, topology utterance induction, decommissioned import audit, git stdout admission, git commit/ref/worktree carriers, and submodule cover reader all exist in the files named above.

**Proven-in-Lean, by supporting spine only:** the general coordination reading leans on the RelMath H^1 and graph-colouring/sofic spine named in the two papers, especially the "H^1 = 0 iff forest" style of coordination cost.
There is not a Lean theorem saying "this pnpm workspace is this exact cohomological object."
That link is code conformance plus theory synthesis.

**Research-grade synthesis:** "git x pnpm is a degree-2 product coordination tier," "monorepo vs polyrepo is society vs federation," and "the package mesh is an InfoTile whose store/lockfile is the presented form" are design readings already present in the 2026-06-26 notes, sharpened here against current code.

**Current observed tension:** `@emsenn/jsnode-ick` is the canonical JSNode ICK app according to `AGENTS.md` and the rehoming audit, but its manifest currently contains the `decommissioned` keyword.
The decommission audit therefore reports active consumers importing a decommissioned package.
This note treats that as a held contradiction in the current carrier state, not as a decision to stop using the package or to repair it here.

# I. Npm package as membrane

The strongest normative statement is in the category-theoretic packaging rules:

- a package is a category;
- the package root is the public callable surface;
- top-level modules are objects, subcategories, or theoretical boundaries;
- exports are commitments;
- functions are morphisms with domains, codomains, and laws;
- root imports are universal call surfaces;
- import graphs must not smuggle ontology.

That is not merely style guidance.
It is echoed by the faculty-package idiom: the `package.json` exports map is the categorical capability surface, and a package's `bin` and `exports` names are the vocabulary of what it can already do.
The old habit "look for a missing helper and add it back" is explicitly wrong; the package membrane must be read first.

In live code this is concentrated in `lib/computing/src/host-neutral-carriers.mts`.
`ManifestCarrier` is deliberately host-neutral: name, version, description, privacy, package manager, module kind, dependencies, exports, bins, and media type.
The dependency reference records not merely "name and range" but also relationship and protocol:

```text
relationship: runtime | development | peer | optional | bundled | workspace
protocol: npm | workspace | file | git | link | catalog | unknown
```

So "npm package" here already includes non-registry package references.
A workspace package may know another package through npm semver, `workspace:*`, file, link, git, catalog, or unknown protocol.
The code refuses to pretend all package dependence is just registry dependence.

`lib/computing/src/js-mark.mts` is the package-manifest admission boundary.
It parses raw `package.json` text, requires a non-empty name, classifies dependency protocols, extracts export specifiers, extracts bin names, and asserts the result through `manifestCarrier`.
That file also gives two derived surfaces:

- `manifestExportSurface`: the importable module surface before host resolver execution.
- `manifestBinSurface`: the executable command surface declared by the manifest.

This distinction matters.
The manifest is admitted raw host data; export/bin surfaces are readings derived from it.
A package is not its current filesystem tree; it is the admitted membrane plus the surfaces and graphs derived from that membrane.

# II. Package root, exports, and bin

The theory distinguishes at least four package faces:

- `exports`: communicating face, what the package says can be imported across its boundary.
- `bin`: playing/computing face, what can be invoked as a process strategy.
- internal module graph: knowing face, how the package reflects itself.
- build from `src` to `dist`: animating/computing face, the perceive-act loop that materializes the package's public artifacts.

`apps/jsnode-ick/src/jsnode/workspace.mts` implements this reading as current workspace machinery.
It discovers package manifests, decodes each through `decodePackageJsonManifest`, records:

- `exports`
- dependency names and ranges
- lifecycle and maturity
- tags
- Node engine declarations
- scripts
- bins
- repository and homepage fields

It then reconstructs a `ManifestCarrier` from each discovered package and sends those carriers to `dependencyGraphFromManifests` in `@emsenn/organizing`.
Package topology is therefore not a second ontology in `apps/jsnode-ick`; it is a JSNode ICK app inducing a workspace reading from computing/organizing carriers.

The same file builds higher package atlas views:

- package to dependency ego graph;
- modules and public symbols;
- functions with domains/codomains from built declaration files;
- source consumption edges from actual imports;
- coarse import edges for namespace/star/dynamic cases.

This is the code's practical answer to "what is a package?": a package is a manifest carrier plus module, type, import, export, bin, and dependency readings.
Its public vocabulary is not inferred from taste; it is read from `package.json`, `dist/*.d.mts`, and source imports.

# III. Workspace as package society

`pnpm-workspace.yaml` is the active membership register.
Today it declares 84 package patterns, and all 84 have package manifests at the declared path.
Measured on this checkout while writing this note:

```text
workspace package patterns: 84
existing package manifests at those paths: 84
packages tagged/lifecycled as decommissioned: 23
workspace packages with bins: 46
workspace packages with exports: 83
total declared bin commands: 221
total top-level export keys: 707
```

Those counts are not theory; they are current observed carrier facts.

`lib/organizing/src/host-neutral-carriers.mts` gives the organizing-level carrier shapes:

- `WorkspaceCarrier`: a governed set of manifest carriers.
- `DependencyGraph`: nodes and dependency edges over those manifests.
- `Cover`: finite cover, nerve edges, H^1, and a coordination-free flag.
- `Resolution`: resolver decisions, unresolved requests, conflicts, and H^1.

`lib/organizing/src/js-mark.mts` then admits pnpm-specific documents into those neutral carriers:

- `decodePnpmWorkspace` reads membership patterns and manifests into a `WorkspaceCarrier`.
- `decodePnpmLock` reads resolver decisions from manifests plus lockfile text.
- `dependencyGraphFromManifests` makes the internal workspace dependency graph.
- `topologicalSortDependencyGraph` derives build tiers.
- `dependencyGraphH1` computes `edges - nodes + components` as the graph's degree-1 coordination cost.

The current lockfile decoder is intentionally modest.
It does not claim a full pnpm solver model; it checks whether non-workspace dependencies are mentioned in the lockfile and records unresolved/conflict decisions.
The theory note reads pnpm as a paraconsistent resolver that can nest conflicting versions instead of exploding, but the live code's `Resolution.h1` is presently a conflict count, not a full cover-nerve proof.

# IV. JSNode ICK as the workspace reader

The canonical repo instruction says: when a question concerns the workspace's package graph, executable package surface, or JS/Node topology, use `apps/jsnode-ick` (`@emsenn/jsnode-ick`) as the ICK-domain application over the workspace.

That is exactly what the app does.
It reads package manifests and source imports, records manifest facts including `bin`, resolves dependency structure, audits workspace import coherence, and settles/serves JSNode topology projections.

The important path is:

```text
host fs / package.json / source files
  -> @emsenn/computing/admission
  -> ManifestCarrier / module and type readings
  -> @emsenn/organizing dependency graph and resolution carriers
  -> apps/jsnode-ick workspace/package/analysis/topology readings
  -> topology utterances and served ICK actions
```

`apps/jsnode-ick/src/topology/settlement.mts` is especially revealing.
It turns package facts into `UtteranceCarrier`s:

- workspace has package;
- package in layer;
- package has version, lifecycle, maturity;
- package in domain and role;
- package has tags;
- package has exports;
- package depends on package;
- package declares dependency, range, and kind;
- package has bin;
- package has script;
- graph has edge;
- package has type/function;
- functions have domain and codomain;
- type flow transforms one type into another.

Then it induces a `JsnodeIckTopologyCarrier` with settlement and fixed-point readings from `@emsenn/relating`.
This is the metacircular center: the package workspace is itself admitted as information in the same kernel style as the rest of the system.

The decommission audit is part of the same reading.
A decommissioned package is identified by lifecycle or the `decommissioned` keyword, then actual source imports are checked.
Non-decommissioned consumers importing a decommissioned provider are violations.
The current developer-injected audit result reports 408 such import violations, led by sites importing `@emsenn/jsnode-ick` even though the app is tagged decommissioned.
That means the current package carrier state is internally contradictory:

```text
normative guidance: use @emsenn/jsnode-ick for JSNode workspace readings
manifest carrier: @emsenn/jsnode-ick is tagged decommissioned
live import graph: active sites import @emsenn/jsnode-ick
audit result: active -> decommissioned import violations
```

This is exactly the kind of disagreement the corpus is built to hold as a first-class obstruction.
It should not be papered over in prose.

# V. Git repository as causal set

Git enters in `lib/computing/src/admission.mts` as host admission:

- `readGitAdmission` reads `status --short`;
- a bounded `log` with hash, parents, author, date, and subject;
- refs via `for-each-ref`;
- remotes;
- gitlinks through `ls-files -s`;
- `.gitmodules` if present.

That is raw host contact.
The pure git reading is in `lib/computing/src/git-mark.mts`.

The carriers are:

- `GitStatusEntry`: status, path, raw line.
- `GitCommitEntry`: hash, abbrev, parents, author, author date, subject.
- `GitRefEntry`: name, object name, kind, shorthand.
- `GitRemoteEntry`: remote name and URLs.
- `GitWorktreeCarrier`: status entries, utterances, observation, dirtiness charge.
- `GitCommitGraphCarrier`: commits, parent utterances, observation, and light observation.
- `GitRefCarrier`: refs as utterances.
- `GitRemoteCarrier`: remotes as utterances.

The commit graph reader is the key theoretical bridge.
`commitGraphCarrier` turns parent edges into facts.
`commitGraphLightObservation` orients edges from parent to child and marks whether the graph is a causal order.
For ordinary git, the commit graph is acyclic; a cycle would make the light observation fail and raise H^1 to 1.

So git is not merely "a tool to run."
It is admitted as a causal information substrate.
Commits are events.
Parent edges are causal arrows.
A merge commit is a join in that causal order.
`refs` are named pointers into the causal set.
Worktree dirtiness is a charge-bearing observation.

# VI. Submodules as history settlement

`lib/organizing/src/git-mark.mts` moves from computing's git event carriers to organizing's federation cover.

It parses:

- `.gitmodules` entries: name, path, url, optional branch.
- `git submodule status` entries: path, commit, and status (`pinned`, `uninitialized`, `modified`, `merged`).
- `git ls-files -s` gitlinks: path and pinned commit.

Then `gitSubmoduleCover` constructs an organizing `Cover`: each submodule path is an open whose members are the path, URL, and current commit when known.
Nerve edges arise when opens intersect.
H^1 is:

```text
missing pins + max(0, nerve edges - opens + connected components)
```

This is conservative and operational.
A missing pin is coordination cost.
A non-tree overlap in the submodule cover is coordination cost.
`coordinationFree` is exactly `h1 === 0`.

The prior theory note measured the 2026-06-26 git tier as a tree with 21 root submodules, one nester (`sites/koios.news`), and H^1 = 0.
The current checkout has a slightly different observed state:

```text
.gitmodules declarations at root: 21
root declarations with branch field: 20
unique branch field value: main
root gitlinks in index: 18
recursive submodule status entries: 20
nested .gitmodules under sites/koios.news: content, data
declared root paths missing both gitlink and filesystem path:
  apps/ledger-computer
  sites/web.emsenn.net
  _archive/emsenn-archive-code
RelMath submodule status: modified relative to recorded root gitlink
```

That means the current git federation has two layers:

1. The intended federation declaration (`.gitmodules`): 21 declared root members, mostly branch-tracked to `main`.
2. The current pinned/materialized federation (`gitlinks` and working tree): 18 root gitlinks, plus two nested koios submodules, with RelMath advanced or dirty relative to the root pin.

The honest reading is not "the git tier is simply clean" or "the theory note is wrong."
The honest reading is that the theory note describes the intended and previously measured shape, while today's live carrier has declaration/pin drift.
That drift is itself a carrier fact.

# VII. Branches

There are three distinct branch concepts in play:

1. Git-the-generic-tool: a branch is a ref under `refs/heads/*` pointing into the commit causal set.
2. `.gitmodules`: a `branch = main` field tells submodule update machinery which upstream branch to track when asked to update remotely.
3. 561 Group workflow law: work happens on `main`, feature branches do not exist, and branch operations are forbidden.

The code supports the first concept.
`GitRefEntry.kind` can be `branch`, `remote`, `tag`, `head`, or `other`; `branches(carrier)` filters refs of kind `branch`.
This is necessary because the git reader is host-neutral and should be able to observe ordinary repositories.

The repo policy enforces the third concept.
`AGENTS.md` states:

```text
This repo is trunk-only.
All work, all commits, and all pushes happen on main, and main pushes to origin.
Feature branches do not exist.
```

The same section forbids creating, switching, deleting, or otherwise changing branches.
The practical meaning is: branches may be observed as git facts, but they are not an allowed coordination mechanism for agents.

In this repo, branch multiplicity would be a second unresolved history slice.
It would introduce a place where work can appear without being part of the single super-repo simultaneity slice.
The whole design pushes against that: pnpm collapses package development into one workspace resolution; git collapses history publication into `main`; submodules pin child histories into one parent commit.
Branches remain readable because the host has them, but the live law is to keep the history tier one-dimensional and publicly settled.

# VIII. Git x pnpm: the product tier

The 2026-06-26 git/node note is the deepest theory source for this study.
Its central claim survives the code read:

- pnpm settles dependency questions;
- git settles history questions;
- both are content-addressed present/free systems;
- their product is where federation-scale coordination appears.

In ASCII terms:

```text
pnpm:
  present = package manifests + lockfile
  free    = node_modules / symlink farm / resolved workspace graph

git:
  present = commit SHA / gitlink / ref
  free    = checked-out worktree

product:
  package identity as dependency node
  x
  package identity as history slice point
```

`workspace:*` is the operator that identifies the tiers inside this super-repo.
When `@emsenn/relating` is a workspace dependency, pnpm resolves to the working tree that git has checked out.
Dependency identity and history identity are forced to agree locally.

If the project split into independent published packages without workspace identity, the two tiers would decouple.
The lockfile could resolve a semver package built from one commit while the submodule pin points at another commit.
That is an inter-tier contradiction: dependency-settlement says "this is the package"; history-settlement says "this other commit is the package."
In Belnap language, that is a held conflict, not something to silently flatten.

This is why package publishing, repo splitting, and submodule updates are not mere operational chores in this workspace.
They change the coordination degree.
A monorepo-like workspace collapses the product and keeps society centralized.
A polyrepo federation lets independent timelines diverge and then requires a higher-order settlement to prove they still cohere.

# IX. Package/repo placement law

The package and repo theories give practical placement rules:

1. Put reusable semantics in the faculty package that owns the invariant.
2. Put host admission in one host boundary.
3. Put app/site/service shells at the mount or transport layer.
4. Do not restore removed package APIs.
5. Do not use decommissioned package families as implementation dependencies.
6. Read `package.json` `exports` and `bin` before assuming a missing symbol is missing capability.
7. Treat `.gitmodules`, gitlinks, package manifests, lockfile importers, active source imports, and focused tests as retirement proof surfaces.

The rehoming audit makes the current target explicit:

- core faculties own the law;
- `services/information-coherence-kernel` is the stable served face;
- `apps/jsnode-ick` is the JSNode ICK app for workspace/package topology;
- `organizing-with-*` is decommissioned as an implementation target;
- sites are relational hulls, not owners of kernel semantics.

The code agrees.
Decommission readiness in `apps/jsnode-ick` demands evidence from role proof, workspace membership, lockfile importer, submodule state, live reference scan, focused verification, and filesystem cleanup.
Deleting a package is not a filesystem event; it is a proof obligation across the package and git settlement tiers.

# X. Current contradictions to carry forward

This study found four live contradictions or open seams worth recording.

## 1. JSNode ICK is canonical and decommissioned

`AGENTS.md` says to use `apps/jsnode-ick` for package graph, executable package surface, and JS/Node topology.
The rehoming audit says JSNode topology moved there.
The package manifest says `keywords: ["decommissioned"]`.
The decommission audit reports hundreds of active imports from it.

This is the most urgent carrier contradiction.
It should be resolved by a separate package-lifecycle decision, not hidden by this note.

## 2. Root .gitmodules declares more than the root index pins

Root `.gitmodules` declares 21 submodules, but the root index currently records 18 gitlinks.
Three declared paths are absent as both gitlinks and directories:

- `apps/ledger-computer`
- `sites/web.emsenn.net`
- `_archive/emsenn-archive-code`

This may be intentional historical residue, but the organizing git cover should name it as missing-pin cost if those entries are still meant to be live.

## 3. RelMath is advanced or dirty relative to parent pin

Recursive submodule status reports `sites/relmath.bare-cedar-fog.emsenn.net` with a leading `+`, meaning the checked-out commit differs from the recorded root gitlink.
That is not bad by itself during active work, but it is exactly the history-tier distinction the theory cares about: current child now differs from parent-recorded slice.

## 4. Git branch is parsed generically but forbidden operationally

The git carrier must understand branch refs, but agents must not use branches as workflow.
Future tooling should keep this distinction sharp: observe branches as host facts; do not present branch creation/switching as an agent affordance in this repo.

# XI. Practical agent rules distilled

When working on packages:

- Open the named package's `package.json` first.
- Treat `exports` and `bin` as the live vocabulary.
- If a symbol is absent, look for the new public surface instead of restoring the old symbol.
- Use `apps/jsnode-ick` readings for workspace/package topology, while carrying the current lifecycle contradiction honestly until it is resolved.
- Do not add package dependencies on decommissioned families for new work.
- Use package-root/public imports unless a local package explicitly exposes a lawful subpath.

When working on repos:

- Treat the super-repo commit as the parent simultaneity slice.
- Treat child submodule commits as independent timelines pinned into that slice.
- Push/record child repo state before the parent when publishing a multi-repo settlement.
- Check `.gitmodules`, gitlinks, and package-local git metadata before moving or deleting paths.
- Distinguish declared federation members from pinned/materialized members.

When thinking about branches:

- A branch is a git ref, not an allowed work surface here.
- The only normative line is `main`.
- `.gitmodules branch = main` is branch-tracking metadata, not permission to branch.
- Branch multiplicity would be a coordination surface that the trunk-only law deliberately removes.

# XII. What should be built next

The code already has almost all ingredients, but the package/repo product is not yet fully one carrier.
The next clean build target is a single workspace federation reader that admits both tiers together:

```text
read package manifests
read pnpm workspace and lockfile
read git admission and submodule cover
join package paths to gitlink paths
compute inter-tier charge per package
compute package dependency H^1
compute submodule cover H^1
compute product obstruction candidates
serve as JSNode ICK topology utterances
```

The result would let the cockpit ask, for every package:

- What package membrane is declared?
- What dependency settlement includes it?
- What git repository or worktree contains it?
- Does pnpm resolution agree with git history?
- Is the package active, decommissioned, or contradictory?
- Is it safe to retire, move, publish, or mount?

That is the missing operational face of the theory.
Today the pieces exist in `computing`, `organizing`, and `apps/jsnode-ick`; the product carrier is still a named obligation.

# Provenance

This note is grounded in the files listed in frontmatter and in current local measurements from `pnpm-workspace.yaml`, `.gitmodules`, `git ls-files -s`, and `git submodule status --recursive`.
The measurements are current to this checkout while writing the note, not durable claims about future state.

The package-as-category and capability-surface claims are existing repo law.
The git-as-causal-set, submodule-pin-as-slice, and git x pnpm bigrading claims are theory synthesis already recorded in the 2026-06-26 workspace notes and refined here against live code.
The package-specific and git-specific code surfaces are built.
The unified product carrier and full product obstruction computation are Roadmap.

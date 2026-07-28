---
title: "managing-operations as a reading on organizing's binder (the fold design)"
description: "The 13-leg work-management chain of managing-operations derived as downstream readings on organizing's already-built sheaf-gluing binder (organize/adjudicate/federate/project/crossArena + the four social-descent readings), corpus-grounded in governing.md and adjudication.md. Establishes the fold as a categorical derivation, not a code port: build the binder (done), let the operations chain mount on it. Retires both managing-operations packages into organizing; ops.561.group consumes organizing."
date: 2026-06-21
status: design
grounds: [organizing, managing-operations]
builds-on:
  - 2026-06-21-organizing-as-social-scale-governing.md
  - 2026-06-21-animating-organizing-exact-mirror.md
---

# managing-operations as a reading on organizing

## Thesis

The 561 Group's work-management capability — the chain `task → work → assign → office → dispatch → consensus → federation → accounting`, today implemented twice (`managing-operations` on `@emsenn/animating`, `managing-operations-experimental` on `@emsenn/animating-experimental`) — is **not a package of its own machinery**.
It is **multi-agent governance**: assigning work across agents, recognizing offices, settling contested contributions, federating constituents.
By the corpus that is exactly `governing` read at the social scale — *"the settling of an open plurality into a bounded, law-bearing order"* ([governing.md]) — whose proper act is `adjudication`, *"the receiving dual of speaking… holding the charges that many acts produce into a single state of the record"* ([adjudication.md]).
That faculty is already a package: **organizing**.

So managing-operations' operations chain is **one downstream reading on organizing's binder**. organizing's note already states the rule — *"organizing is the binder… of which the operations chain is one downstream reading.
Build the binder; let the chain mount on it."* The binder is **built and green**.
This note maps every work-management leg onto it, so the fold is a **derivation**, not a port.

## The binder we are mounting on (already realized in `lib/organizing/organizing.mts`)

- `organize(boundary) → Organization` — the social gluing; the interior bulk glued from the non-empty faces as a cross-arena cover.
- `adjudicate(boundary) → Adjudication` — the gluing act = cross-arena Mayer–Vietoris: `contested` (ker δ — disagreement TOLERATED, the Belnap paraconsistent hold), `open` (absurd — silence≠denial), `monotone` (CRDT accumulation), `federationOnly` (coker diff — the genuine H¹ obstruction; `cohomologyRank`, possibly Arrow-irreducible).
  `glued = federationOnly === 0`.
- `crossArena(constituents) → {shared, contested, federationOnly, nameMobility}` — computed EXACTLY from the proved settling-cohomology (`readFirstCohomologyOfSettlementFiltration`): finite-stage ⊤-conflicts live in ker δ (tolerated); only limit-stage firings novel to the merge are coker diff.
- `federate(covers) → Federation` — ‖ parallel composition with `nameMobility` name-passing overlap.
- `assemble(agents) → Organization` — real `@emsenn/animating` agents re-enter as literal constituents (the concrete spiral).
- `project(organization) → SocialProjection` — the holographic restriction to the three faces.
- the four social-descent readings `socialBecoming / relate / community / institute`
  + `socialFactor` (per-face act-factorization, dual "receiving").

## The correspondence (every leg → its organizing derivation)

| managing-operations leg | organizing reading it derives from |
|---|---|
| **work breakdown** (portfolio▸project▸milestone▸section▸task▸subtask; dependencies, tags) | the **work-carrier** (`WorkItem`/`WorkProject` = `animating.work.*`, the Clausewitzian carrier — see [[project-work-carrier-theory]]) is *what* the plurality organizes around: the structure of the shared field. It mounts on `organize`'s members/field; dependencies are the bond edges (`relatingOf.bonds`). |
| **assigning** (to offices, workload) | adjudication's **distribution over the agent sheaf**: an *office* is a recognized locus in the settled order (governing "recognizes its members as individuals"); assignment is which member of the social base holds which work. Derived from `organize` + `adjudicate`. |
| **workflow** (statuses, boards, WIP) | a work item's **status is its settled Belnap charge** in the organization's section (open=absurd / in-progress=potential / contested=stable); the board is `project`; WIP limits are capacity readings on the section. |
| **prioritizing** (priority, weighted scoring, capacity selection) | weightings/selections on the section's cells; the **amount/bigint projection** (work-carrier law) supplies weighted scoring; capacity = what the members' settled state admits. |
| **scheduling** (calendars, recurrence, critical path) | the settlement's **temporal/causal readings** — critical path = `readCausalOrderOfSettlementFiltration`; recurrence = the spiral **re-seed**; calendars = temporal projection. |
| **dispatch / consensus** | **`adjudicate`** itself — H¹ over the social cover is the consensus cost; `federationOnly` = the irreducible obligation. The core organizing act. |
| **automating** (rules, recurrence spawning) | the **law** (governing's "settled rules that cap the work") as monotone accumulation; recurrence spawning = re-seeding the descent. |
| **accounting** (time tracking, budgets) | quantitative **readings on the organization's bilattice-network-sheaf state** (amount projection over accumulated charges). |
| **reporting** (burndown, flow, throughput) | **temporal projections** of the settled state across filtration stages (increments/firings reads). |
| **viewing** (list, board, calendar, table, timeline) | **`project`** and presentation variants — the holographic boundary views of the bulk. |
| **federation** (cross-team / cross-org) | **`federate`** — ‖ composition; `nameMobility` = shared members. |

Every leg is a reading on `organize`/`adjudicate`/`federate`/`project`/`crossArena` plus the work-carrier and the settlement's section/temporal readings.
None is independent machinery.

## What the fold actually builds (the gap)

organizing has the **binder** but not yet the **operations readings** or the faces:

1. **Thread the three faces** — organizing imports only `@emsenn/animating` + `@emsenn/relating` today; wire `socializing`/`computing`/`gaming` as the boundary faces it provides the organization carrier for.
2. **Mount the work-carrier** — let `WorkItem`/`WorkProject` (canonical `@emsenn/animating`'s `animating.work.*`) be the content organized over the agent sheaf, rather than generic membranes only.
3. **Derive the operations-chain readings** on the binder (assign/office, status, priority/capacity, schedule/critical-path, account, report, view) — as organizing's own `operating/` content, schema-first, each a reading function over `Organization`/`Adjudication`/the settlement, NOT a re-import of MO's flat dispatcher.
4. **Retire both managing-operations packages**; point `sites/ops.
  561.group` (the running Operations Manifold) at organizing.

## Provenance & non-goals

Corpus-grounded: [governing.md] (plurality→bounded law-bearing order; Ostrom/Hobbes; the finite fixed-point turn) and [adjudication.md] (receiving dual of speaking; contested/open/monotone — the three pressures = our bilattice/H¹ machinery).
The 13-leg correspondence is the session's derivation to verify as the readings are built, not a settled citation. **Non-goal:** porting MO's `task/office` code into organizing — the readings are *recovered* on the binder. **Non-goal:** keeping a managing-operations package as a survivor — both retire; ops consumes organizing.

[governing.md]: ../../../content/_archive/animating/content/becoming/doing/working/governing/governing.md
[adjudication.md]: ../../../content/_archive/animating/content/becoming/doing/working/governing/content/adjudication/adjudication.md

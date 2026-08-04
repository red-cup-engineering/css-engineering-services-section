---
title: "Relating IS the spiral: consolidating all nine faculties into one package"
description: "The decided end-state of the relating-line refactor — not just rename relating-experimental→relating, but collapse the whole agency spiral (relating + the two faculty quartets) into ONE npm package @emsenn/relating with faculty subpaths. The DAG that makes it clean, the decided scope, the codegen invariant it requires, and the build order. Supersedes Phase 4 of the refactor roadmap."
date: 2026-06-21
status: superseded
superseded-by: "Family-of-packages layering decided 2026-06-21 (later same day). Do NOT collapse into one package; keep the spiral as separate packages with a strict layered acyclic import discipline — the package boundary is wanted as a cycle-detector (merging would hide cross-faculty cycles as silent module-graph smells). See the relating-line-refactor live-state memory and the faculty-DAG (bulk-over-faces) memory. This note is retained for provenance only."
---

> **SUPERSEDED (2026-06-21).** The single-package consolidation below was reversed the same day in favor of a **family of separate packages** with strict layered, acyclic imports (base `relating-experimental` → faces communicating/knowing/playing [relating-only] → bulk `animating` → scale-2 socializing/computing/gaming [animating-or-upstream, never each other] → capstone `organizing`).
> Rationale: the package boundary is deliberately kept as a **cycle-detector** — a backwards `playing → animating` import had quietly created a package-graph cycle, and merging into one package would have demoted that cycle to a silent module-graph smell instead of forcing the fix.
> Read this note for the DAG analysis only; ignore its "one package" conclusion and build order.

# Relating IS the spiral: one package

## The decision (supersedes refactor-roadmap Phase 4)

The [refactor roadmap](2026-06-21-refactor-roadmap.md) Phase 4 said: rename `relating-experimental → relating`, delete the old `relating`, and fold the `-experimental` siblings into their canonical names — leaving the faculties as separate npm packages. **That is now superseded.** The decided end-state is to collapse the **entire agency spiral into ONE npm package, `@emsenn/relating`**:

- the package **root** is the relating substrate (today's `relating-experimental`);
- the **nine faculties are subpaths**, mirroring the spiral ([agency spiral note](2026-06-21-agency-spiral-self-similar-faculty-quartet.md)):
  - scale-1 quartet: `/communicating /knowing /playing /animating`
  - scale-2 quartet: `/computing /socializing /gaming /organizing`

This is the theoretically honest structure.
The spiral is **one self-similar object** — the same faculty quartet recurring up the scales — so the faculties are projections/subpaths of one thing, not eight independent packages.
The substrate name absorbs the spiral: `@emsenn/relating` (decided over a new umbrella name — relating *is* the spiral, the quartets are its lifts).

## Scope (decided)

- **IN (9):** relating (root) + communicating, knowing, playing, animating, computing, socializing, gaming, organizing.
  Canonical names map to the NEW derivations: `animating`=`animating-experimental`, `gaming`=`gaming-experimental`; `computing` is already on the new line in source (rederived in place).
- **OUT — stay external consumers** (build *on* `@emsenn/relating`, not *in* it): `managing-operations` (an application of organizing; the ops manifold runs on it), the `communicating-in-{english,latin,lakota,tokipona}` language variants, and all domain packages (`divining`, `trading`, `content`, …), the `computing-with-*` fleet, apps, services, sites.

## Why it's clean: the faculties form an acyclic DAG rooted at relating

Source-only inter-faculty dependency edges (2026-06-21):

```
relating ──┬─ communicating ─┬─ animating ─┬─ playing ─┬─ gaming
           ├─ knowing         │             ├─ socializing
           └─ organizing      └─────────────┴─ computing   (computing also ← knowing, playing)
```

Topological layers: `relating` → `{communicating, knowing, organizing}` → `animating` → `{playing, socializing}` → `{computing, gaming}`. **No cycles.** So merging dissolves every cross-package `@emsenn/<faculty>` import into an intra-package **relative** import along the same DAG, and a whole class of workspace version-skew / build-ordering pain disappears.
(managing-operations sits at the `{playing, socializing}` layer but stays external.)

## The invariant the merge REQUIRES: carrier-free codegen entrypoint

Each schema-first faculty runs a `realize` codegen step (`object.schema.json` → TS type).
Today each downstream faculty's codegen imports the **built** base typing (`@emsenn/relating-experimental/typing` via `dist`), which isolates it from its own not-yet-generated carrier types.
After the merge there is **one** codegen pipeline and every faculty's codegen imports the **same package's** typing **relatively** — so the merged package inherits the base's bootstrap trap for ALL carriers at once.

That trap was found and fixed on the base 2026-06-21 ([live-state memory]): the generator must import `generateDeclaration` from the **carrier-free** `typing/print` (→ realize/structural/codecs/json/holography, no carriers), NOT the `typing/index` barrel (which drags `codecs/schema → codecs/eavt → articulating/utterance`, a carrier that imports its own generated type). **The merged `@emsenn/relating` must keep one carrier-free codegen entrypoint and route every faculty's codegen through it.** Pair with a from-clean (`clean && build`) check in the green-gate so the coupling cannot silently return.
`animating` is the one faculty with no codegen/schema today — reconcile that asymmetry when it becomes the `/animating` subpath.

## Build order (user's words: "construct one big package, then fan out")

- **A — make all 9 mergeable.** Get every faculty reproducibly green from clean on the new substrate.
  (Source already there; the base codegen bootstrap is fixed.)
- **B — consolidate.** Scaffold `@emsenn/relating`; move each faculty `src/` to its subpath; rewrite cross-package imports to relative (along the DAG); ONE `exports` map (root + nine faculty subpaths + substrate subpaths `/codecs /analysis /holography /acting /typing /articulating`); ONE codegen over all schemas via the carrier-free entrypoint; ONE `acting` dispatcher composing every faculty's `induceBins`; green from clean.
- **C — fan out.** Retarget every consumer (`@emsenn/{relating,communicating,knowing,playing,animating,computing,socializing,gaming,organizing}` → `@emsenn/relating[/subpath]`), healing the two migration axes (codec/analysis barrel-collapse + moved faculty symbols).
- **D — delete the bloodline.** Old `relating`, old `animating`/`gaming`/ `managing-operations`, the absorbed faculty packages, and every `-experimental` sibling.

**Acceptance:** no package name contains `-experimental`; exactly one `relating`, holding the spiral; `pnpm check` green workspace-wide from clean.

## Open question carried forward

- Single `exports` map vs. nested per-faculty package boundaries within the one package (subpath exports are the plan; revisit only if the faculty count makes the map unwieldy).

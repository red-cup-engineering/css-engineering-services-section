---
title: "Rewiring @emsenn/animating consumers: Gen-1 interior vs Gen-2 organizing"
description: "Per-consumer, per-import classification of every @emsenn/animating import into Gen-1 single-agent interior (stays) vs Gen-2 organizing/operations (rewires to managing-operations / organizing), with concrete migration steps and a prioritized, lowest-risk-first rewiring order."
date: 2026-06-21
status: plan
---

# Rewiring @emsenn/animating consumers: Gen-1 interior vs Gen-2 organizing

## 0. The cut, grounded in the fresh surface

The self-similar faculty quartet recurs up the agency spiral. **Gen-1** (one agent, on the Meme carrier): communicating / knowing / playing / **animating**. **Gen-2** (a sheaf of agents over a social base): socializing / computing / gaming / **organizing**.
`organizing = multi-agent animating` is the society binder and the principled home of the operations chain (`task → work → assign → office → dispatch → consensus → federation → accounting`), which `@emsenn/managing-operations` already implements today on `@emsenn/animating`.

The fresh `@emsenn/animating` is now **Gen-1 only**.
Its `package.json` `exports` field is the whole truth of what it still offers:

```
.                                      → glue / face / project (holographic gluing apex);
                                         becoming/* (descent engine + animate/enact/labor/individuate);
                                         actions (perceive/act/reseed + stage actions)
./becoming
./becoming/doing
./becoming/doing/embodying             → the perceive→act membrane (settleBoundary, boundary,
                                         affordances, bearing, transition)
./becoming/doing/working
./becoming/doing/working/governing
```

Everything a consumer currently imports that is **not** reachable through those six subpaths is, by construction, a misplaced Gen-2 capability.
In particular the fresh animating has **no** `./accounting`, **no** `./codecs`, **no** `./topology/trace`, and **none** of the deep operations subpaths: `.../working/accounting`, `.../working/governing/deciding`, `.../working/governing/federating/assertion-worlds`, `.../working/learning/lessons`, `.../doing/algebra`.
Each maps cleanly onto a Gen-2 home:

| OLD animating subpath | OLD capability | Gen-2 home |
|---|---|---|
| `./accounting`, `./codecs` (the ledger codecs) | Amount/Transaction/Posting algebra, journal/accounting Utterances | `@emsenn/managing-operations/accounting` |
| `.../doing/working/accounting` | work-algebra accounting (assignWork, workReport) | `@emsenn/managing-operations/accounting` |
| `.../doing/working/governing/deciding` | eligibility/mode/governOperation/admitTool/sheaf consensus | `@emsenn/organizing` (deciding/consensus face) |
| `.../doing/working/governing/federating/assertion-worlds` | federation membership, merge, assertion worlds | `@emsenn/organizing` (federating face) |
| `.../doing/working/learning/lessons` | lessons, dreaming, LessonMemory, evidence | `@emsenn/managing-operations` learning / `@emsenn/knowing` (Gen-1 knowing) — see §3 caveat |
| `.../doing/algebra` | bilattice charge algebra used by web RDF packages | shared `@emsenn/relating-experimental` primitive or `@emsenn/organizing` |
| `./topology/trace` | descent-trace topology projection | Gen-1 IF it is interior trace; else `@emsenn/managing-operations` reporting |

`@emsenn/managing-operations` already exports `./accounting` and `./governing` today.
`@emsenn/organizing` exists but is a bare scaffold (only `.
` exported); its `deciding`, `consensus`, `federating`, and `assertion-worlds` faces must be ported off the old animating governing/federating modules **before** the federation-dependent consumers can rewire.

---

## 1. Per-consumer, per-import classification

Legend: **G1** = genuine Gen-1 single-agent interior, stays in `@emsenn/animating` (✎ = API changed under the holographic rewrite). **G2** = Gen-2 operations/multi-agent, rewires to `managing-operations` / `organizing`.

### farolfi — `@emsenn/animating/accounting`, `@emsenn/animating/codecs` - `accounting` → **G2**.
Ledger algebra (Amount/Transaction/Posting).
Rewire to `@emsenn/managing-operations/accounting`. - `codecs` → **G2**.
These are the accounting/journal Utterance codecs; they ride with accounting.
Rewire to `@emsenn/managing-operations/accounting` (or a `managing-operations/codecs` subpath if it keeps codecs separate). - **Verdict: purely Gen-2 — clean rewire.** Migration: swap both specifiers to `@emsenn/managing-operations/accounting`; add `@emsenn/managing-operations` to deps; drop `@emsenn/animating`.

### llm-computer — `@emsenn/animating`, `@emsenn/animating/accounting` - root `@emsenn/animating` → **inspect**.
Whatever it pulls from root must be re-checked against the new Gen-1 index (glue/face/project, becoming, actions).
If it used old root re-exports of work/governance/ledger, those are **G2**. - `accounting` → **G2** → `@emsenn/managing-operations/accounting`. - **Verdict: mixed.** Migration: (1) rewire `accounting` import to managing-operations; (2) audit the bare-root import — keep only the Gen-1 symbols (perceive/act/agent loop), and move any work/ledger symbols to managing-operations.

### waggle — `@emsenn/animating/accounting`, `@emsenn/animating/codecs` - Identical shape to farolfi.
Both **G2**. - **Verdict: purely Gen-2 — clean rewire** to `@emsenn/managing-operations/accounting`.

### organizing-with-agents — `@emsenn/animating` (`dreaming`, `observation`, `task`, `DreamResult`, `DreamRegime`, `DreamOptions`) - `observation`, `task` → **G1** (perception/task constitution primitives of a single agent's interior).
Keep, but confirm they are still exported by the fresh root (the new index re-exports `becoming/*`, which is where these now live; if they moved, re-point to `@emsenn/animating/becoming/doing`). ✎ likely re-seated under `becoming`. - `dreaming`, `dreamResult`, `DreamRegime`, `DreamResult` → **G2/knowing**.
The dreaming/learning regimes are the **learning** dimension, which is NOT in the fresh Gen-1 surface.
They belong to `@emsenn/knowing` (Gen-1 knowing faculty) or the managing-operations learning reading.
Given this package literally excludes the aperiodic regime and runs inward finite-settling recall, point `dreaming`/`dreamResult` at `@emsenn/knowing`. - **Verdict: mixed.** Migration: keep `observation`/`task` on animating (re-pathed to `becoming` if needed); move `dreaming`/`dreamResult` and their types to `@emsenn/knowing` (preferred) or `managing-operations`.
This is the subtlest consumer — do it after the knowing target is confirmed.

### computing-with-claude — `@emsenn/animating/becoming/doing/embodying/boundary` - **G1 ✎.** The perceive→act membrane is the core Gen-1 interior.
It STAYS, but the API changed substantially under the holographic rewrite: old `induceAgentBoundary(threshold, values)` / `settleBoundary→charge` / `regulationRead` / `regulate` / `perform` are gone; the new `embodying/boundary` is a settled-relating-carrier membrane — `settleBoundary(utterances) → AgentBoundaryCarrier`, `boundary(section, term) → BoundaryCarrier`, `affordances(boundaryCarrier, perceivable?)
`, `bearing(before, after, cell)`, `transition`.
The subpath also shifted from `.../doing/embodying/boundary` and is now exported at `.../doing/embodying` (the `/boundary` leaf may need to drop to the package-exported `embodying` index). - **Verdict: pure Gen-1 — no rewire, but an API-migration.** Migration: keep `@emsenn/animating`; re-point the import to `@emsenn/animating/becoming/doing/embodying`; adapt call sites from the old threshold/regulate model to `settleBoundary(utterances)` + `boundary`/`affordances`/`bearing`.

### computing-with-claude-code-cli — `@emsenn/animating` - root → **inspect**, predominantly **G1** (an agent harness wants the perceive→act loop / actions).
Audit for any leaked work/governance symbols → those are G2. - **Verdict: mostly Gen-1, possibly mixed.** Migration: confirm only Gen-1 symbols are used; rewire any operations symbol to managing-operations/organizing.

### computing-with-hive — `.../working/accounting`, `.../working/governing/deciding`, `.../working/learning/lessons` - `working/accounting` → **G2** → `@emsenn/managing-operations/accounting`. - `working/governing/deciding` → **G2** → `@emsenn/organizing` (deciding/consensus face). - `working/learning/lessons` → **G2/knowing** → `@emsenn/knowing` lessons, or managing-operations learning reading. - **Verdict: purely Gen-2 — clean rewire** (three subpaths, three homes).
Blocked on `organizing/deciding` being ported.

### computing-with-ledgers — `.../working/accounting` - **G2** → `@emsenn/managing-operations/accounting`. - **Verdict: purely Gen-2 — clean rewire.**

### organizing-with-llm-agents — `@emsenn/animating` - Same shape as organizing-with-llm-agents-family: **mostly G1** agent-loop usage; audit root import. - **Verdict: mostly Gen-1, audit for mixed.**

### organizing-with-openai-agents — `@emsenn/animating` - **mostly G1** (agent loop).
Audit root import for operations leakage. - **Verdict: mostly Gen-1, audit for mixed.**

### computing-with-openai-codex — `@emsenn/animating` - **mostly G1** (agent loop).
Audit root import. - **Verdict: mostly Gen-1, audit for mixed.**

### computing-with-the-living-web — `.../working/governing/federating/assertion-worlds` - **G2** (federation / assertion worlds — multi-agent). → `@emsenn/organizing` (federating/assertion-worlds face). - **Verdict: purely Gen-2 — clean rewire.** Blocked on `organizing` federating face being ported.

### computing-with-the-semantic-web — `.../doing/algebra`, `.../federating/assertion-worlds`, `.../learning/lessons` - `doing/algebra` → bilattice charge algebra.
This is a shared primitive (it sits under `embodying/algebra` in fresh animating, used by the boundary).
If the package only needs charge values, prefer the `@emsenn/relating-experimental` charge primitive; otherwise it is **G2** alongside its federation use.
Classify **G2 (algebra-as-organizing-dep)** unless a pure relating charge import suffices. - `federating/assertion-worlds` → **G2** → `@emsenn/organizing`. - `learning/lessons` → **G2/knowing** → `@emsenn/knowing`. - **Verdict: purely Gen-2 — clean rewire** (RDF package; no single-agent interior usage).
Blocked on organizing + knowing targets.

### computing-with-the-web — `.../doing/algebra`, `.../federating/assertion-worlds`, `.../learning/lessons` - Identical to computing-with-the-semantic-web. - **Verdict: purely Gen-2 — clean rewire.** Blocked on organizing + knowing.

### gaming — `@emsenn/animating` - root → **inspect**.
`gaming` is itself a Gen-2 faculty; it legitimately consumes Gen-1 animating's handedness/embodying bridge (the `embodyAction` animating→gaming bridge).
Keep the Gen-1 handedness/embodying import on animating; any work/governance symbol → organizing. - **Verdict: mixed (mostly Gen-1 bridge).** Migration: keep handedness/embodying on animating (re-pathed to `becoming/doing/embodying`); rewire any operations symbol.

### managing-operations — `@emsenn/animating`, `.../working/accounting`, `.../working/governing/deciding` - root `@emsenn/animating` → **G1, keep**. managing-operations is the canonical downstream; it SHOULD depend on Gen-1 animating's work/governance algebra (`becoming/doing/working`, `.../governing`) which the fresh animating still exports. - `working/accounting` → this is being **internalized**: managing-operations now OWNS `./accounting`.
The self-import of the old animating accounting subpath should resolve to managing-operations' own `./accounting` module (the capability moved INTO managing-operations).
Re-point to the local `./accounting`. - `working/governing/deciding` → **G2**, moving to `@emsenn/organizing` deciding.
While organizing is being stood up, managing-operations keeps `./governing` locally; re-point to its own `./governing`, then later to `@emsenn/organizing`. - **Verdict: mixed — the pivot package.** It keeps the Gen-1 `becoming/doing/working[/governing]` dependency and absorbs accounting/deciding as its own modules (and ultimately re-exports organizing's federating/consensus).
Migrate this package's internals FIRST conceptually, because every clean-rewire consumer above resolves into it.

### trading — `.../working/accounting` - **G2** → `@emsenn/managing-operations/accounting`. - **Verdict: purely Gen-2 — clean rewire.**

### fizzos — `.../working/governing/federating/assertion-worlds` - **G2** (assertion worlds / federation) → `@emsenn/organizing`.
(fizzos is a standalone MUD service; it owns its transport but borrows the federation carrier.) - **Verdict: purely Gen-2 — clean rewire.** Blocked on organizing federating face.

### http-server — `@emsenn/animating` - root → **inspect**.
A transport server should use the relating dispatcher / animating actions only thinly.
Likely **G1** (or it should depend on a manifold package, not raw animating).
Audit. - **Verdict: mostly Gen-1, audit for mixed.**

### web-server — `@emsenn/animating/topology/trace` - `topology/trace` is NOT in the fresh animating exports.
If `trace` is the interior descent-trace of a single agent, it is **G1** and animating must re-export it (currently absent — a gap to fill).
If it is an operations/observability trace over many runs, it is **G2** → `@emsenn/managing-operations/reporting`.
Pending a read of the call site, classify **G1-candidate with an animating export gap**; most likely the descent trace belongs to animating's `becoming` and should be re-exported there. - **Verdict: Gen-1 candidate (or thin Gen-2 reporting).** Migration: read the call site; if interior trace, add the `becoming` trace export to animating and re-point; if run-observability, point to managing-operations reporting.

### ops.
561.group — `@emsenn/animating`, `.../working/accounting` - root `@emsenn/animating` → the operations manifold should depend on `@emsenn/managing-operations` / `@emsenn/organizing`, NOT raw animating, for its operations surface.
Any operations symbol from root → **G2**. - `working/accounting` → **G2** → `@emsenn/managing-operations/accounting`. - **Verdict: mixed (mostly Gen-2).** The manifold is the operations surface; almost everything it pulls is Gen-2.
Migration: rewire accounting and all operations-chain symbols to managing-operations/organizing; keep raw animating only if it genuinely drives a single agent loop.

---

## 2. Prioritized rewiring order (lowest-risk first)

Risk = (blast radius) × (whether the Gen-2 target already exists).
The `accounting` target exists in managing-operations today; the `deciding`/`federating`/`assertion-worlds` targets must be ported into `organizing` first; `lessons`/`dreaming` need the knowing target confirmed.

**Wave A — clean accounting rewires (target exists, leaf consumers):** 1.
`trading` — single subpath → managing-operations/accounting.
2.
`computing-with-ledgers` — single subpath → managing-operations/accounting.
3.
`farolfi` — accounting + codecs → managing-operations/accounting.
4.
`waggle` — accounting + codecs → managing-operations/accounting.

**Wave B — pivot package internalization (unblocks the chain):** 5.
`managing-operations` — re-point its self-imports of animating accounting/deciding to its own `./accounting` and `./governing`; keep the Gen-1 `becoming/doing/working[/governing]` dependency.
Do this before/with Wave A's targets settle.

**Wave C — mixed accounting + root audits:** 6.
`llm-computer` — accounting → managing-operations; audit root.
7.
`ops.
561.group` — accounting + operations root → managing-operations/organizing; the manifold should stop importing raw animating for ops.

**Wave D — Gen-1 API migration (no rewire, but signature changes):** 8.
`computing-with-claude` — re-point `embodying/boundary` → `embodying`; adapt to the new `settleBoundary(utterances)`/`boundary`/`affordances`/`bearing` API (✎).
9.
`gaming` — keep the handedness/embodying bridge on animating (re-pathed); rewire any ops symbol.
10.
Root-import agent harnesses: `organizing-with-claude-code-cli`, `organizing-with-llm-agents`, `organizing-with-openai-agents`, `organizing-with-openai-codex`, `http-server` — audit each root import; keep Gen-1 loop, rewire any leaked ops symbol.
Lowest risk among these are the ones that only use the agent loop.

**Wave E — build the organizing faces, then rewire federation/deciding consumers:**
11. Port `deciding`/`consensus`, `federating`, `assertion-worlds` from the old animating governing/federating modules into `@emsenn/organizing` (add the `./deciding`, `./federating`, `./consensus`, `./assertion-worlds` exports). THEN rewire, lowest-blast-radius first:
    - `fizzos` (one subpath: assertion-worlds).
    - `computing-with-the-living-web` (one subpath: assertion-worlds).
    - `computing-with-hive` (deciding + accounting + lessons).
    - `computing-with-the-semantic-web` (algebra + assertion-worlds + lessons).
    - `computing-with-the-web` (algebra + assertion-worlds + lessons).

**Wave F — knowing/learning target:** 12.
Confirm `@emsenn/knowing` (Gen-1 knowing) as the home for `lessons`/`dreaming`, then rewire: `organizing-with-agents` (dreaming), `computing-with-hive` (lessons), `computing-with-the-semantic-web` / `computing-with-the-web` (lessons).

**Wave G — trace gap:** 13.
`web-server` — read the `topology/trace` call site; either add the interior-trace export to animating `becoming` (Gen-1) or rewire to managing-operations reporting (Gen-2).

---

## 3. Caveats called out

- **`lessons`/`dreaming` are the learning dimension, which the fresh Gen-1 animating dropped.** They are NOT managing-operations-shaped in essence — learning/teaching is the **knowing** faculty (Gen-1) and its Gen-2 lift is **computing**.
  Prefer `@emsenn/knowing` over managing-operations for these; only route to managing-operations if a consumer wants the operational learning *reading* (lessons-as-work-retrospective).
  Confirm knowing's surface before Wave F.
- **`doing/algebra`** (bilattice charge) is a shared primitive, not intrinsically Gen-2.
  The RDF web packages may only need relating's charge values; prefer importing the charge primitive from `@emsenn/relating-experimental` rather than dragging in an organizing dependency.
- **`embodying/boundary` API changed (✎):** every consumer of the membrane (today only `computing-with-claude`) must migrate from the old threshold/regulate/perform model to the new settled-carrier `settleBoundary(utterances)` model.
  This is the only Gen-1-stays consumer that nonetheless requires code changes.
- **`organizing` is a scaffold.** Wave E is blocked until its `deciding`/`federating`/`consensus`/`assertion-worlds` faces are ported off the old animating governing/federating modules (capability-preserving: port first, then delete the old animating subpaths).
  Do not stub.

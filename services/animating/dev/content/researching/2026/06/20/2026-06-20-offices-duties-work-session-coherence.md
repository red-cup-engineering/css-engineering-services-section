# Offices, duties, work carriers, and sessions

Date 2026-06-20.
What the manifold and corpus have for org roles and work, and a proposed way to connect them.
Sources at the bottom.

## Facts

- Prompts are logged: `scripts/ingest-hook.mjs` calls `recordMessage` into
  `data/logs/messages.jsonl` on channel `claude:<session>`. They replay into the
  suit as "recent session messages".
- The corpus defines these models (in `content/`):
  - `office-as-double-settlement`: an office installs only when a recognition-cell
    and an induction-cell both settle to `𝐭` on FOUR. An office carries `incumbent`,
    `recognition-by`, `induction-ceremony`, standing records.
  - `workitem-record`: a work unit with `kind` ∈ {process, procedure, derivation,
    inquiry}, a `skill` the receiver must advertise, and a `target`.
  - `assignment-record`: witnesses which agent holds a workitem; `assigning-workitem`
    picks a receiver whose advertised skills match the workitem's `skill`.
  - `work-cell-system`: work-cells `(agent, work-predicate, object)` valued in FOUR
    (⊥ none / 𝐭 done-well / 𝐟 refused / ⊤ contested).
- The manifold today:
  - `work-management.mts` `ActiveWorkRecord` has many `workKind`s (task, goal,
    project, process, procedure, inquiry, derivation, …) plus `owner`, `assignedTo`,
    `gate`, `dependsOn`, `session`, status. It has no `skill`, no receiver pool, no
    `assignment-record`, and no office/duty layer.
  - `work-carriers.mts` imports `@emsenn/animating` and `@emsenn/relating` and
    defines `officeTerm(value)` and `fiberOf(values, axis)`. It is not wired to
    `work-management.mts` or to sessions.
  - Context selection (`deriveContextRelevance`) is keyword string-matching.

## Proposed

- Make a session a receiver that advertises `skills` and operates under `offices`.
- Make `assignment-record` a first-class witnessed carrier, replacing bare `assignedTo`.
- Collapse `workKind` to the four kernel kinds + `skill`; make campaign/project/goal `contributes-to` edges rather than parallel kinds.
- Replace keyword context-relevance scoring with charge/provenance scoring from `@emsenn/relating`.

## Sources

- `content/` lakotaean-governance office structures; `office-as-double-settlement`
- `content/` polity `workitem-record`, `assignment-record`, `assigning-workitem`
- `content/` predicated-lakotaean-work `work-cell-system`
- `sites/ops.
  561.group/src/{work-management.mts, work-carriers.mts, suit-injection.mts}`

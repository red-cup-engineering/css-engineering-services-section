---
name: double-entry is a symptom of agency
description: Why the @emsenn/ledger package was dissolved — its conservation law belongs upstream in @emsenn/animating (double-entry is a symptom of agency, not of money), and its financial reading belongs in @emsenn/trading. Records the executed migration: ledger/algebra → agent/accounting, ledger/codecs → agent/codecs, ledger/topology+scripts → markets/ledger, all declared required consumers rewired, lib/ledger deleted, and the real ledger ⇄ markets cycle dissolved. Conservation = ∂ = 0 = the degree-0 case of the same H¹ homology federation and the fleet already compute.
date: 2026-06-15
status: done (ledger package deleted; agent + markets host its capabilities)
audience: future agents working the agent/markets domains
---

# Double-entry is a symptom of agency

> Orientation: `@emsenn/ledger` no longer exists as a discrete package.
> Its capabilities were brought into `@emsenn/animating` (the money/conservation/representation kernel) and `@emsenn/trading` (the bookkeeping reports).
> This note records why and exactly what moved.
> If you are looking for `@emsenn/ledger/*`, the map is in §4.

## 1. Why ledger could not simply be imported into agent

The dependency facts at the time:

```
relationality → agent → games → markets ⇄ ledger
                 (L1)    (L2)
```

`@emsenn/animating` depends on only `content`, `language`, `relationality`.
`@emsenn/ledger` sat four hops below it (`ledger → markets → games → agent`), and `markets ⇄ ledger` was a real cycle pnpm warned about: `ledger` imported `markets/financial`, `markets` imported `ledger/algebra` + `ledger/codecs`.
The companion note `2026-06-15-ontological-spine-as-definability-tower.md` proves that order is a *theorem* — agent is L₁, constitutive.
So "put ledger's codecs into agent" would have made `agent → ledger → markets → games → agent`, a cycle through the whole stack.

The cycle was itself the symptom: **money's conservation law had been homed in a financial domain instead of upstream of it.**

## 2. The reframe: conservation is agency-intrinsic

Stripped of money, double-entry is: a transaction is a bundle of signed movements over accounts whose per-unit sums vanish.
`balance.mts`'s `residual(...).size === 0` is exactly

$$\partial(\text{txn}) \;=\; \sum_i \text{posting}_i \;=\; 0 \quad\text{(per commodity)} \iff \text{the chain is a CYCLE.}$$

That is the **degree-0 case of the same homology the agent package already computes**: federation reads disagreement as H¹ of the observer graph (`federation/cost-graph`, the bigraded H¹ of commit `93bfef5`), the fleet reads opposition as H¹ of the observer sheaf.
"The books balance" is "the act is a cycle, ∂ = 0."
Conservation is the accounting an *agent* keeps of its resource flow; money is one commodity among many.
So the kernel belongs in `agent`, and the financial *reading* downstream.

## 3. What was executed

`@emsenn/ledger` was deleted.
Its three layers moved to where the spine allows:

| former                    | now                          | why                                            |
| ------------------------- | ---------------------------- | ---------------------------------------------- |
| `@emsenn/ledger/algebra`  | `@emsenn/animating/accounting`   | exact money + conservation ∂ = the agency kernel (zero-dep, no inversion) |
| `@emsenn/ledger/codecs`   | `@emsenn/animating/codecs`       | journal parsers + decimal saturation = the representation boundary (cf. relationality's toml codecs) |
| `@emsenn/ledger/topology` | `@emsenn/trading/ledger`     | accounts/reports/`loadLedger` = the financial bookkeeping product |
| `@emsenn/ledger/scripts`  | `@emsenn/trading/ledger/scripts` | the `ledger-computer` CLI rides with the reports |

The carrier vocabulary was kept verbatim (`Amount`/`commodity`/`Transaction`/`Posting`) so consumers changed only import specifiers, not code.
all declared required consumers were rewired:

- `markets` — dropped its `@emsenn/ledger` dep, gained `@emsenn/animating`; money now reads from `@emsenn/animating/accounting`.
  This **dissolves the `ledger ⇄ markets` cycle**: the topology that imported `markets/financial` is now *inside* markets (a relative import), and markets reads conservation "from within" the agency it already sits on.
- `hive`, `llm-computer`, `hive-server` — `ledger/algebra|codecs` → `agent/accounting|codecs`.
- `farolfi`, `waggle` — same, plus `ledger/topology|scripts` → `markets/ledger|markets/ledger/scripts`.

A latent gap was fixed in passing: the codecs barrel never re-exported `detectFormat`; it now does.

## 4. Finding the old surface

- exact money / `Amount` / `add`/`sub`/`times` / registry / conservation → `@emsenn/animating/accounting`
- `parseText`/`parseBeancount`/`parseHledger`/`parseDecimal`/`format` → `@emsenn/animating/codecs`
- `loadLedger` / `bal`/`bs`/`is`/`cashflow`/`reg`/`print`/`check` reports → `@emsenn/trading/ledger`
- the `ledger-computer` CLI and book/reconcile/settle scripts → `@emsenn/trading/ledger/scripts`

## 5. Invariant to preserve

`@emsenn/animating` must never gain a dependency on `ledger`, `markets`, or `games`.
The accounting and codecs modules are zero-dependency by construction; keep them that way.
Conservation lives upstream of money on purpose — that is the whole point of this migration.

## References (in-repo)

- `lib/animating/src/accounting/`, `lib/animating/src/codecs/` — the relocated kernel.
- `lib/trading/src/ledger/` — the relocated bookkeeping topology + reports.
- `dev/docs/notes/2026-06-15-ontological-spine-as-definability-tower.md` — why the spine is a theorem.
- `lib/animating/src/federation/cost-graph.mts`, commit `93bfef5` — the H¹ this is the degree-0 case of.

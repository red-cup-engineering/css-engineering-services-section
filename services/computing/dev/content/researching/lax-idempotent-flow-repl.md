# REPL

Interactive lax-idempotent Flow REPL. Self-contained
(frozenset / lru_cache only), no external dependencies. Lets you
construct relations, apply `□`, `◇`, `C = □◇`, action `S`, coherence
`σ`, and step through closures interactively.

## Toys

- [`repl.py`](repl.py) — Canonical lax-idempotent Flow REPL. Run as
  `python repl.py`. Commands include relation construction, modal
  operator application, fixpoint detection, and history navigation.
  Useful for quickly checking modal identities or growing small
  examples by hand.

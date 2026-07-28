---
name: composable packages as concurrent strategies in CGS, the theory of computing
description: The single living note that stabilizes the 561-group "library verb" concept — a small composable program that presents one library operation as a stdin→stdout filter. This is the sole working document for the concept: the place where it is studied, reasoned through, proved, reduced to normative rules, and made teachable. It is iterated in place rather than supplemented by new files, so it always holds the current, complete, self-consistent understanding — both how to write a verb and why the rules that govern verbs hold. Read it in full before editing it.
date: 2026-06-15
status: working-note (rules derived from the proved corpus theorem computing-is-cgs; the Unix-process reading is a faithful application of Caires–Pfenning; the exact inhabited fragment is the open item)
audience: developers writing 561-group packages whose operations must compose and must align with the whole theory of computing
---

# Composable packages as concurrent strategies in CGS

A 561-group package whose operations compose from the shell does not get to invent its own model of "a program that reads input and writes output."
The corpus theorem **computing-is-cgs** fixes it: the theory of computing is **CGS**, the *-autonomous category of concurrent games with symmetry (Castellan–Clairambault–Winskel).
So a package's type is an **object** of CGS — a game/arena, call it the package's **carrier `X`**; an **operation** is a **strategy** (a morphism), and a *composable* operation is an **endomorphism of `X`** (`X → X`); the shell **pipe is cut**, and running a pipe is **cut elimination**.
A Node bin has the Hoare shape because it is an executable process boundary: stdin, argv, and environment are the pre-state; the bin is the predicate/morphism position; stdout, stderr, exit status, and effects are the post-state.
Metadata can help a transporter discover or index that shape, but metadata does not create it.
Ordinary deterministic batch computation is the sequential shadow of this (the Hyland–Ong / Eff sub-CCC); streaming, fresh names, or concurrency need the full theory.
Each rule below derives a required practice from one of these theory claims.
The conventions (§ *Chosen*) and the bare Unix substrate (§ *Substrate*) are kept separate so neither masquerades as a law.

## The rules (forced by the theory)

- Given that a composable operation is an endomorphism of the carrier `X` (`X → X` in CGS), a script MUST read a complete carrier value of type `X` and emit a complete carrier value of the same type `X` — never a diff, projection, or summary — because the next script in a pipe is typed to receive a whole `X`, and a fragment is not one.
- Given that only *total* endomorphisms compose into a monoid, a script MUST be defined on every valid carrier and return a valid carrier, and MUST NOT reject a valid `X` — input that may be refused belongs to a boundary tool, not a carrier script — because a single partial endomorphism silently breaks every pipeline routed through it.
- Given that composition is lossless only when both ends speak one normal form, a script MUST decode the whole carrier and re-encode it in the carrier's single canonical form, because identical bytes between any two scripts are what make a pipeline representation-independent and make idempotence detectable.
- Given that a whole object and a stream of records are *different objects* in CGS (an EOF-collapsing strategy versus a streaming one), a script's behavior MUST make one shape actual, because a whole-object script placed below an unbounded source never emits and buffers without bound (e.g. `tail -f x | <whole-object-op>`).
- Given that the carrier arriving on stdin is a linear resource and contraction is available only on the exponential `!
  X`, a script MUST consume stdin exactly once, and MUST take a reusable file (`!
  X`) rather than the stream for any operation that re-reads, seeks, retries, caches, or parallelizes its input, because retrying or duplicating a half-consumed stream corrupts silently.
- Given that the endomorphisms of `X` form a monoid under composition (`A | B` is `g ∘ f`), two scripts MAY be reordered only when they commute, and re-running a non-idempotent script double-applies it.
- Given that `End(X)` and `Hom(X, Y)` are different (an endomorphism of `X` versus a boundary morphism to another object `Y`), a script that produces a different object is a boundary tool by behavior, because it does not freely compose with the carrier's endomorphism scripts and must not be reordered among them.
- Given that a strategy must be cut against arbitrary partners on arbitrary machines, a script MUST be a function of its carrier-input and arguments alone — depending only on the language runtime, its own published package, and the canonical codec, never the repository layout or an in-tree shared helper — because a process welded to its birthplace cannot be composed elsewhere (cut elimination is not guaranteed off the author's machine).

## Chosen, not forced (conventions)

The concrete wire format (e.g. one JSON value per line), the names of scripts, flag spellings, optional discovery metadata, and the numeric values of nonzero exit codes are **conventions** — chosen once and written down for coordination, and MUST NOT be presented as theorems.

## Substrate (what a Unix process is — not the subject)

Data on stdout, diagnostics on stderr, exit status meaning whether the process ran, and honoring EOF and backpressure are simply what a Unix process *is* — the rails the carrier rides on, true of every program ever written, not rules specific to these scripts.
They are assumed, not derived.

## Status and open

The rules above are derived from the proved corpus theorem computing-is-cgs (Castellan–Clairambault–Winskel; Hyland–Ong; Caires–Pfenning; Abramsky et al.; Hyland's Eff).
The reading of the Unix process boundary as a strategy, and of the pipe as cut, is a faithful application of Caires–Pfenning rather than a separate result.
Open: the *exact* CGS fragment a real Unix pipe inhabits should be pinned, not assumed.
First mechanizable check: round-trip a play through a package's codec (does the carrier survive?) and verify each shipped strategy preserves its carrier by behavior — the point where this note meets the `computing` package's `!
`/`?
` exponential structure and the conformance tooling.

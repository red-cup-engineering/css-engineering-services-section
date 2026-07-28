---
title: "Mathematical communication field guide"
date-created: 2026-06-28
---

# Mathematical communication field guide

This guide turns the theory of mathematical communication into a working vocabulary for reading, writing, editing, and agentic analysis. The foundation document states the thesis: mathematical rigor includes accountable closure. This guide names the units, failure modes, and repair operations.

Use it when analyzing a mathematical artifact, a proof sketch, a formalization, a software implementation of a mathematical idea, a diagram-heavy explanation, a benchmark, or a generated mathematical answer.

## Entry method

Read the artifact as a sequence of panels separated by gutters:

1. Mark the panels.
2. Classify the gutters.
3. Audit the icons.
4. Identify the governing sequence.
5. State the audience.
6. Locate the register changes.
7. Ask what closure each transition requires.
8. Decide whether the required closures are accountable.
9. Add repair panels where the closure is not accountable.

The goal is not to make the artifact longer. The goal is to make its omissions disciplined.

## Panel classes

A panel is a bounded communicative unit with recognizable status. The reader should be able to tell what kind of unit it is, what it asserts, what it assumes, and what kind of closure it asks for.

| Panel class | Frame | Rigor condition | Typical repair |
| --- | --- | --- | --- |
| Definition panel | Introduces a term or structure for future use. | Consequences are traversable through examples, nonexamples, diagrams, proofs, code, or later use. | Add motivation, examples, boundary cases, or transport notes. |
| Theorem panel | States a claim and commits the artifact to discharging it. | Claim status, hypotheses, dependency, and proof delegation are explicit. | Add proof, proof sketch, citation, or status marker. |
| Lemma panel | States an instrumental theorem used by another claim. | Role in the larger proof is visible. | Explain why this lemma exists or where it is used. |
| Proof panel | Discharges a claim through inferential moves. | Steps are valid and the proof plan can be reconstructed by the intended audience. | Add a plan statement, intermediate lemma, citation, or expanded calculation. |
| Proof sketch panel | States the strategy without full derivation. | Omissions are routine, productive, or disciplinary for the audience. | Mark omitted obligations and cite or expand nonroutine steps. |
| Example panel | Exhibits a particular instance. | Shows a reusable pattern, boundary, obstruction, or recognition criterion. | State what the example is supposed to teach. |
| Counterexample panel | Falsifies a candidate claim or marks a conceptual boundary. | Shows exactly which condition fails and what repair it motivates. | Add the failed claim and the repaired condition. |
| Diagram panel | Frames a spatial or relational configuration. | Constitutive and incidental visual features are distinguished. | State which features carry mathematical meaning. |
| Equation panel | Frames equality, identity, or constraint as a unit. | Symbols and transformations are licensed. | Introduce notation, cite laws, or explain the transformation. |
| Code panel | Frames an executable construction. | Types, tests, and invariants expose mathematical behavior under computation. | Add invariant comments, type contracts, tests, or correspondence notes. |
| Formal proof script panel | Frames a machine-checkable proof. | Inferential closure is checked and conceptual transport is documented. | Add informal statement, bridge comments, dependency map, or loss account. |
| Benchmark panel | Frames a computational acceptance protocol. | Task, metric, dataset, acceptance criterion, and scope are explicit. | Add missing protocol fields and limits. |
| Narrative bridge panel | Connects mathematical panels that would otherwise remain adjacent but untraversed. | It clarifies route without pretending to be proof. | Mark it as motivation, orientation, or bridge. |
| Conjecture panel | States an undischarged claim. | Status is not confused with theorem. | Mark evidence, scope, and open obligations. |

## Gutter classes

A gutter is the transition between panels where the reader must perform closure.

| Gutter class | What it asks | When acceptable | Failure signal |
| --- | --- | --- | --- |
| Routine gutter | Standard manipulation, familiar lemma, known condition, or local calculation. | The stated audience is licensed to close it. | Reader needs unstated field expertise or hidden dependency. |
| Productive gutter | Reader completes a prepared step to see the plan rather than drown in mechanics. | The artifact gives enough structure to make the completion determinate. | Omission hides the actual hard part. |
| Disciplinary gutter | Field-specific background compresses the artifact for insiders. | Audience and field are honest; repair path exists for outsiders. | The artifact pretends the gap is universal routine. |
| Unaccountable gutter | Reader must supply missing mathematics without enough constraint. | Never acceptable as final form. | Correctness depends on silent invention. |

Classify gutters relative to an audience. The same transition can be routine for a specialist, disciplinary for adjacent experts, productive in a classroom, and unaccountable for a general mathematical reader.

## Icon classes

An icon is a compressive sign. Its value is not that it looks mathematical. Its value is that it preserves the right structure while removing the right details.

| Icon class | Constitutive features | Incidental features | Audit question |
| --- | --- | --- | --- |
| Notation icon | Symbols, arity, binding, operator behavior, indexing rules, typing, equivalence relation. | Variable names, typography, local glyph preference, cosmetic grouping. | Does the notation make recognition, manipulation, or transport easier? |
| Commutative diagram icon | Objects, arrows, labels, direction, asserted path equalities. | Layout distance, angle, page position, visual symmetry unless declared. | Which paths are asserted equal, and under which category? |
| Knot diagram icon | Strand topology and over/under crossing data under Reidemeister equivalence. | Drawing scale, curvature, exact embedding, decorative style. | Which transformations preserve the represented knot? |
| String diagram icon | Connectivity, labels, nodes, regions, ambient isotopy, stated categorical axioms. | Wire length, bend shape, absolute placement unless declared. | Which equations or rewrites does the diagram license? |
| Canonical example icon | Particular instance elevated as recognition handle for a theory. | Accidental numerical or presentation choices. | Is the example teaching the structure or just becoming a mascot? |

Bad icons perform prestige compression. They create technical-looking marks that do not improve traversal. Good icons perform amplification through simplification.

## Sequence classes

Sequence is the ordered path through panels. Changing the sequence changes the closures the artifact supports.

| Sequence class | Starts from | Strength | Risk |
| --- | --- | --- | --- |
| Dependency sequence | Prerequisites and definitions. | Efficient for verification and library construction. | Can hide motivation and discovery pressure. |
| Motivational sequence | Problem, obstruction, or example. | Makes need visible before machinery. | Can delay formal precision. |
| Proof-plan sequence | Strategy before details. | Supports plan reconstruction. | May hide technical risk if details are deferred too long. |
| Formalization sequence | Proof assistant or type-system requirements. | Exact, executable, dependency-aware. | Optimized for machine checking rather than human insight. |
| Historical sequence | How the concept emerged. | Shows why definitions took their current form. | Can preserve obsolete detours or confuse history with necessity. |
| Pedagogical sequence | Learner staging. | Trains closures gradually. | May simplify or dramatize in ways that need later repair. |

No sequence is intrinsically best. The artifact should mark its sequence and avoid switching sequence-class without telling the reader.

## Concepts to check

Accountable closure: required reader work is inspectable, constrained, and repairable.

Audience-relative gap acceptability: every omission is evaluated relative to the reader the artifact claims to serve.

Communicative closure: the reader's act of completing transitions between panels.

Definition as infrastructure: definitions create future traversals, not merely local abbreviations.

Frame discipline: the artifact marks whether a region is proof, conjecture, example, analogy, computation, implementation, or bridge.

Gutter classification: transitions are routine, productive, disciplinary, or unaccountable.

Icon discipline: compressive signs preserve operative structure and mark constitutive features.

Mathematical rigor as ecology: proof, diagram, code, definition, example, benchmark, formalization, and narrative each have medium-specific obligations.

Medium-specific rigor: a register is rigorous when it makes accountable the closures proper to that register.

Plan reconstruction: the reader can see the strategy and not only the local steps.

Sequence as meaning: order is not neutral; it governs what closures become possible.

Transport discipline: movement across registers has an identity criterion and loss account.

## Refusal checks

These are the hard "no" tests. If an artifact violates one, it needs repair even if parts of it are formally correct.

No claim without repair locator. A claim whose discharge fails for the reader must provide a repair path: lemma, definition, worked example, import path, citation, appendix, errata, or explicit proof obligation.

No definition without future traversal. A definition that creates a sign but blocks examples, diagrams, code, or future proofs fails as infrastructure.

No derivation without plan reconstruction. A proof with valid steps but invisible strategy is incomplete as communication.

No diagram without feature discipline. A diagram whose constitutive and incidental features are not distinguished can license false inference.

No formal correctness as sole rigor. Correct inference does not excuse missing motivation, prestige notation, unaudited diagrams, untransported claims, or unmarked sequence changes.

No formalization without conceptual transport. A proof script that certifies inference but hides the intended informal object is only partially successful.

No gap without audience marking. A gutter cannot be classified if the intended audience is not known.

No icon without amplification. A sign that compresses prestige rather than structure should be removed or replaced.

No icon without audited meaning. An icon needs declared meaning and licensed transformations.

No medium cross-dressing. Motivational prose is not proof; dependency order is not explanation; historical narrative is not conceptual necessity; formal proof script is not conceptual exposition.

No sequence without status marker. If a region changes from motivation to proof, proof to pedagogy, or dependency to history, the change must be visible.

No transport without loss account. A claim moving across registers must state what is preserved, what changes, and what is lost or gained.

## Repair operations

Frame panel. Identify the panel class of a passage and mark its status.

Classify gap. Locate source and target panels, identify the required closure, then classify it as routine, productive, disciplinary, or unaccountable relative to an audience.

Mark gap acceptability. Convert unaccountable gutters into explicit panels, properly marked disciplinary gutters, or productive gutters with enough scaffolding.

Audit icon. State icon class, constitutive features, incidental features, licensed transformations, and the structure being preserved.

Declare sequence. Name whether the local region is dependency, motivational, proof-plan, formalization, historical, or pedagogical.

Reconstruct plan. Add or recover the strategy that makes local derivations intelligible.

Locate medium-specific rigor. Identify the register and ask what kind of closure that register can honestly certify.

Transport claim across registers. State source register, target register, identity criterion, loss account, gain account, and bridge panels.

Formalize as transport. Treat proof-assistant work as a register change, not as a magic replacement for mathematical explanation.

Write definition as infrastructure. Place the definition where its future use, examples, boundary cases, and transport obligations become traversable.

## Agent checklist

When an agent reads or generates mathematics, it should produce this audit:

1. Panel map: list panel classes in order.
2. Gutter map: classify transitions and mark audience.
3. Icon audit: list icons and their constitutive/incidental features.
4. Sequence declaration: name the governing sequence and any switches.
5. Transport sites: list register changes and loss accounts.
6. Refusal failures: name any hard no tests violated.
7. Repair plan: add the smallest panels needed to make closure accountable.

This checklist is especially important for generated mathematics. A generated proof-like artifact can look fluent while hiding unaccountable gutters, prestige icons, unmarked conjectures, and formal-sounding claims with no repair locator.

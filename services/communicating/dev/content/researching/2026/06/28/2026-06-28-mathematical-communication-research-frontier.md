---
title: "Mathematical communication: examples, formalization, and research frontier"
date-created: 2026-06-28
---

# Mathematical communication: examples, formalization, and research frontier

This document collects the worked cases, open questions, and research program from the superseded mathematical-communication archive. The foundation document gives the theory. The field guide gives the operating vocabulary. This document keeps the theory live as a research agenda.

## Worked cases

### Refereeing as gutter regulation

Refereeing is a social mechanism for classifying mathematical gutters. A referee asks whether the proof's omissions are acceptable for the target community, whether citations actually discharge delegated work, whether the intended audience is marked honestly, and whether a reader can reconstruct the plan without silent invention.

This shows why accountable closure is not merely a stylistic preference. The practice already regulates closure. It permits routine gutters, values productive gutters, tolerates disciplinary gutters under audience honesty, and rejects unaccountable gutters when they threaten correctness or reconstructability.

### Definition as repair

Lakatos's *Proofs and Refutations* gives a canonical model: a conjecture such as Euler's polyhedron formula meets counterexamples; each counterexample breaks a candidate definition; each repair reshapes the object of discourse. A counterexample panel marks a failure. A definition panel repairs future traversal. A sequence of repairs turns definition-writing into mathematical infrastructure.

The lesson is that definitions are not inert labels. They are repair devices in a live theory. A definition that blocks future examples, nonexamples, diagrams, proofs, or formalizations fails even if it is locally precise.

### Commutative diagram as icon

A pullback square is not a picture whose geometry proves the result. It is an icon whose constitutive features are objects, arrows, labels, direction, and asserted path equalities, under the governing category. The square shape is often incidental; the universal property is not.

The diagram succeeds when it compresses relational structure in a way that supports recognition and manipulation. It fails when spatial features such as symmetry, distance, or visual centrality are treated as evidence without declaration.

### Formal proof without conceptual transport

A Lean proof can certify a theorem while leaving a human reader unable to identify the intended informal statement, the proof plan, the mathematical objects hidden behind library names, or the reason the theorem matters. That is not a failure of inferential closure. It is a failure of conceptual transport.

The repair is not to abandon formal proof. The repair is to add bridge panels: informal statement, library correspondence, proof plan, dependency map, invariants, and a loss account for what the formal version changes or suppresses.

### Autoformalization failure exposes gutters

Autoformalization attempts to translate informal mathematics into machine-checkable formal representations. Its failures reveal high-pressure transport sites. Definitions often fail because they rely on ambient structures, implicit coercions, equivalence relations, notation, intended generality, or library correspondences that the informal text did not make explicit.

In this theory, those failures are data. They reveal gutters in the source artifact and in the target formal library. The repair is not only better models. It is better transport discipline: identity criteria, loss accounts, bridge panels, and explicit ambient context.

## LLM mathematics

Large language models can generate definitions, proofs, examples, code, diagrams, and formal-looking explanations. The central question is not only whether the generated inference is correct. The accountable-closure question is whether the generated artifact makes its closure structure auditable.

An LLM-produced artifact is suspect when it:

- states claims without repair locators;
- switches from motivation to proof without status markers;
- uses notation as prestige compression;
- presents examples that do not teach a reusable pattern;
- gives proof steps without plan reconstruction;
- cites unavailable or irrelevant dependencies;
- treats formal-looking syntax as formal verification;
- moves between prose, code, and proof without identity criterion or loss account.

An LLM mathematical answer improves when it includes a panel map, audience statement, explicit dependencies, proof plan, boundary cases, diagrams with feature discipline, code invariants, and repair paths for failed closures.

Can LLM mathematics have accountable closure? Yes, but not by fluency alone. It needs artifacts whose omissions are classified and whose repair paths are visible.

## Formalization frontier

Formal proof assistants change the media ecology of mathematics. They store mathematical knowledge in digital form, make inference checkable, expose dependency structure, and support reuse. They also force many informal gutters into explicit proof obligations.

The limit is that formal proof scripts certify formal statements in formal contexts. They do not automatically explain why the statement was chosen, how the proof plan works, what informal object the formal object represents, or what the translation lost.

The key frontier is formalization as transport:

1. State the informal source claim.
2. State the formal target claim and library context.
3. Give the identity criterion between them.
4. Mark changed generality, suppressed intuition, added assumptions, and implementation details.
5. Provide bridge panels for the proof plan and important definitions.
6. Use proof assistant feedback to locate hidden gutters in the source text.

This treats proof assistants as powerful communication media rather than as replacements for communication.

## Open questions

### What counts as a disciplinary gutter across fields?

Different fields tolerate different omissions. A combinatorics paper, algebraic geometry paper, formal proof library, applied statistics report, and mathematics education article may each draw the line differently between routine, disciplinary, productive, and unaccountable gutters.

The research problem is to compare those standards without flattening rigor into social preference. Field norms should be studied as regulated closure practices: what may be omitted, for whom, with what repair path, and under which venue constraints?

### How much formalization is too much?

Adding formal proof can improve inferential audit while weakening conceptual traversal if the formal sequence overwhelms the artifact. The question is not "formal or informal?" The question is which closures the artifact needs to certify and which register can certify them honestly.

There may be a point where more formal detail makes plan reconstruction worse. The repair is layered communication: formal script for inference, narrative bridge for plan, examples for recognition, diagrams for relational structure, and comments for library transport.

### Can pedagogical sequence double as research sequence?

Pedagogical sequence stages concepts for learners. Research sequence stages claims for peers. Sometimes the best research exposition is pedagogical because it reveals the need for a construction and makes its proof plan reconstructable. Sometimes pedagogy hides the exact dependencies a research reader needs.

The open question is whether there are stable hybrid forms: artifacts that are honest research contributions while preserving learner-oriented closure training.

### Can generated mathematics be closure-audited automatically?

The field guide suggests a tooling problem: can an agent identify panels, gutters, icons, sequence switches, transport sites, missing repair locators, and unaccountable closures in generated or human-written mathematics?

This is not only a linting problem. It requires audience modeling, domain sensitivity, citation checking, formalization awareness, and an ability to distinguish productive omission from hidden error.

## Research program

The theory suggests several concrete projects.

Develop a coding scheme for mathematical artifacts. Identify panels, gutters, icons, sequences, and transport sites in research papers, textbooks, formal proof libraries, mathematical blogs, software repositories, lecture notes, and generated answers.

Compare media for the same mathematical object. Present one object as textbook prose, research proof, commutative diagram, Lean file, code implementation, benchmark, and seminar explanation. Ask which closures each medium makes accountable and which it delegates.

Study failed transport. Autoformalization failures, unreadable proof scripts, misleading diagrams, bad definitions, and broken examples are data about where mathematical identity fails to survive register change.

Build a theory of mathematical editing. Editing becomes the repair of panels, gutters, icons, sequence, audience marking, and transport. A mathematical editor asks: what does the reader have to close here, and is that closure licensed?

Compare legitimacy across communities. Different mathematical cultures regulate gaps differently. The point is not to say rigor is merely local, but to make explicit how local practice organizes access to rigorous closure.

Build tools. A mathematical writing assistant could flag unlabeled panels, unintroduced icons, unsupported transport, missing proof obligations, sequence switches, and claims without repair locators. A formalization assistant could generate bridge panels explaining how informal structures became formal library objects. A repository system could treat frontmatter, citations, examples, tests, and formal proofs as transport metadata.

## Against the false friend: Shannon

"Mathematical communication theory" can easily be misread as information theory: signals, channels, noise, coding, storage, capacity. That literature may become useful by analogy, especially for loss, redundancy, and channel constraints. It is not the primary literature for this theory.

The unit here is not the bit. The unit is accountable closure between framed mathematical units.

The closest literatures are philosophy of mathematical practice, mathematical writing, mathematical education research on communication and representation, diagrammatic reasoning, semiotics, comics theory, proof assistants, autoformalization, and the study of mathematical language.

## Literature spine

The superseded notes pointed to this source spine:

- Scott McCloud, *Understanding Comics*, plus *Reinventing Comics* and *Making Comics*, for panels, gutters, closure, icons, and sequence.
- Will Eisner, *Comics and Sequential Art*, for craft vocabulary around sequential art.
- Neil Cohn, *The Visual Language of Comics*, for cognitive and linguistic treatment of sequential images.
- Thierry Groensteen, *The System of Comics*, for semiotic systematization.
- Oliver Murfett and TriThang Tran on academics' conceptions of mathematical communication.
- Line Edslev Andersen on acceptable gaps in mathematical proofs.
- Yacin Hamami and Rebecca Lea Morris on mathematical proof understanding and plan reconstruction.
- Zoe Ashton on audience in mathematical proof development.
- Jeremy Avigad on the formal turn and the design of mathematical language.
- Danielle Macbeth on formal proofs in mathematical practice.
- Coumans and Consoli on definitions in practice.
- Planas and Pimm, Teledahl et al., Lehmann and Friend, and Kline and Ishii for mathematics education and mathematical writing context.
- Manders, De Toffoli, Shin/Lemon/Mumma, Schoenherr/Schukajlow, Giaquinto, Netz, Rotman, and Kress for diagrams, signs, multimodality, and mathematical representation.
- Weng et al., Zhang/Valentino/Freitas, Xie et al., and Wang et al. for autoformalization and proof-state translation as contemporary stress tests.

Some cited 2025 items in the old draft may need live bibliographic verification before publication. The theory does not depend on their exact final citation forms, but a public-facing bibliography should refresh them.

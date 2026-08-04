# non-reductive computation: the verified local-to-global integration thesis

*2026-06-25.
From the HGR sheaf-Laplacian research sweep (six-faculty workflow) + emsenn's application-domain brief.
The capstone note: what the bilattice settling substrate *is*, across all faculties, when read through Hansen–Ghrist–Riess sheaf-Laplacian theory — and why machine-checked proofs just past that frontier are a different kind of tool than a prediction engine. relating is the substrate (marks, FOUR, the bilattice, settling, the Lawvere Laplacian, aperiodic step-n).
Research note / orientation for the faculty notes that cite it.*

## The thesis

The usual computational move is **reductive**: convert everything to vectors, probabilities, utilities, labels, or graphs, then average.
The sheafed-Laplacian move is different:

- local worlds may have **their own types** (the stalks are d-frames / bilattices, not scalars);
- edges are **translations, not sameness** (restriction maps, not influence weights);
- global coherence is **earned, not assumed** (a global section may not exist);
- failure to glue is **information, not error** (the obstruction class `cl-inv ∈ H¹` is the result);
- consensus is **one fixed point among many** (`ker L` can have dimension > 1);
- some contradictions are **structural and should be preserved** (`⊤` is a stable harmonic state).

So machine proofs just past HGR amount to a **verified computational theory of non-reductive integration**.
Many "open questions" across fields are stuck because they keep asking for one global scalar where the phenomenon only exists as a *patterned failure of local-to-global coherence*.
The honest answer is often negative — *no such consensus object exists under these translations; here is the obstruction; here is the minimal topology change, evidence collection, institutional redesign, or communication-map change that would make one possible.* That is the civilization-tool: **machine-checked refusal to over-integrate.**

## What relating already provides (the SDK the faculties read)

- the bilattice FOUR and the charge order `≤_k` / truth order `≤_t` (`positing/bilattice-charge.mts`);
- the **Lawvere/Tarski Laplacian** `L = □∘◇` with `ker L ≅` independent Čech `H⁰` — machine-proven, dependency-free, no inner product (`LawvereHarmonicCohomology.lean`, `LawvereLaplacianSpectralGap.lean`, `Laplacianizability.lean`);
- the settling-associated sheaf and its **bigraded cohomology** splitting truth-content from inconsistency (`BigradedSettlingCohomology.lean`);
- the **no-non-trivial-periodic-orbit** theorem (`ClosureMonad`) — settling never oscillates;
- the **aperiodic step-n substitution machinery** (`settling/dynamics/substitution/` + `recurrence/`, golden/plastic char-polys) and the new **mutually-locally-derivable classification** (`substitution/mld.mts`: `v ∼_MLD v' ⟺ cl-inv(v) = cl-inv(v')`), so even non-gluing aperiodic regimes get a finite cohomological invariant.

Each faculty note (communicating, knowing, playing, socializing, computing, gaming, organizing) instantiates this same substrate on its own membrane; the proposals there are all the *one* theorem — `face = harmonic reading of the membrane under L` — specialized to that faculty's carrier.

## The strongest application targets (emsenn's ordering)

1. **causal inference under network interference** — certify when treatment effects globalize (→ socializing);
2. **polarization / opinion dynamics** — distinguish disagreement, translation failure, deception, true obstruction (→ socializing, communicating);
3. **intelligence / evidence fusion** — locate deception and underdetermination without forced certainty (→ knowing);
4. **distributed computing** — proof-carrying synchronization, CRDTs, multi-agent coordination (→ computing, gaming);
5. **AI architectures** — sheaf neural nets, agent swarms, RAG coherence (→ computing, knowing);
6. **social choice / governance** — obstruction-aware aggregation, DAO audits, pluralistic mechanisms (→ organizing);
7. **law / policy / risk** — conflict-of-law and policy-gluing certificates (→ organizing);
8. **contextuality / formal epistemology** — dynamic local truth without fake global truth (→ knowing).

## Cross-cutting: biology, ecology, public health

Biology is multi-scale local-to-global throughout: gene regulation, tissues, organisms, ecosystems, epidemiological networks, clinical trajectories.
The sheaf reading: **multi-omics integration** (do expression/protein/metabolomic/phenotype data glue into one disease model?); **public-health spillovers** (do intervention effects stay stable across households/schools/clinics/regions — the same interference object as causal inference); **ecological governance** (glue local observation, Indigenous knowledge, remote sensing, state models *without reducing all to one imperial metric* — the obstruction is the honest refusal to flatten); **clinical diagnosis** (are symptoms/labs/imaging/narrative/priors compatible with a global diagnosis, or is there an obstruction signalling a *missing disease category*?).
The key is not more data fusion — it is data fusion with an **honest obstruction object**.
Home is likely a `content/` biology track + organizing for the governance facet; recorded here so the substrate connection is not lost.

## Grounding

`lib/relating/lib/.../settling/` (the Lawvere Laplacian, bigraded cohomology, substitution dynamics, `mld.mts`); Lean `LawvereHarmonicCohomology`, `LawvereLaplacianSpectralGap`, `Laplacianizability`, `BigradedSettlingCohomology`, `ClosureMonad`, `Aperiodic.
StepN`; Abramsky–Brandenburger contextuality as the prior art the bilattice generalizes.
The seven faculty notes dated 2026-06-25 are the per-membrane specializations of this thesis.

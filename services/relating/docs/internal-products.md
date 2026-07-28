# Internal Products

This package already contains several product-shaped surfaces.
They are not separate packages yet, and this document does not claim they are finished commercial products.
It names what is already real enough to explain, run, and improve.

The phrase "product" here means "a coherent capability with public handles, examples, and a verification story."
It does not mean the surface has been split into its own package or promised as a standalone business object.

## Typed Operation Substrate

The cross-cutting product is the operation substrate itself: carriers define the objects, actions define typed morphisms, RMN can carry pure behavior as data, and `induceBins` projects one registry to CLI, HTTP, OpenAPI, MCP, browser forms, dispatch, and witnesses.

Public handles:

- carriers: `carrier`, `schemaCarrier`, `registeredCategory`
- actions: `action`, `actions`, `induceBins`, `dispatch`
- terms: `tm`, `evaluateRunTerm`, `isClosed`, `termSize`, `termUses`
- witnesses and projections: `witnessInvocation`, `projectFeedState`, `projectFeedContent`, `commitRecord`
- examples: `examples/action-apex.mjs`, `examples/operation-substrate.mjs`

Product reading: a package API does not have to begin as a bag of route handlers.
It can begin as a small typed category: objects, morphisms, pure term bodies where possible, and boundary projections derived from the one registry.

Settling-substrate reading: the package should not be sold as "a relations library" or "a route generator."
The sharper product claim is that sparse predications, FOUR-valued evidence, action witnesses, and content/state projections can share one canonical substrate.
The visible tools are lawful shadows of that substrate, not separate implementations of graph database, workflow engine, audit log, and content pipeline.

## Carrier Kernel

The carrier kernel is the object floor of the package.
A carrier declaration is one TypeBox schema value which also supplies the JSON Schema `$id`, Ajv validator, process-local registry entry, and composition address.

Public handles:

- `carrier`, `schemaCarrier`
- `registeredCategory`
- `schemaRegistry`, `schemaId`
- `morphismCarrier`, `morphismSchemaCarrier`
- example: `examples/carrier-kernel.mjs`

Product reading: a schema-first category kernel for Node packages.
It collapses static type source, runtime validation, schema identity, and registry lookup into one authored value.
It is not the full transport system; it is the floor the transport system stands on.

## Schema Realization

The schema-realization surface reads JSON Schema as a predicate over JSON values and projects its structural skeleton into TypeScript-shaped carrier data.
It has two steps: `realize` forgets schema refinements into a `StructuralType`, then `printType` / `generateDeclaration` print that structural type as readonly TypeScript declaration text.

Public handles:

- subpath: `@emsenn/relating`
- realization: `realize`, `realizeDefs`
- structural constructors: `primitive`, `literal`, `array`, `tuple`, `ref`, `objectType`, `union`, `intersection`
- printing: `printType`, `generateDeclaration`
- schema registry context: `schemaRegistry`, `schemaId`
- example: `examples/schema-realization.mjs`

Product reading: this is the disciplined version of "generate types from schemas."
The carrier schema remains the runtime law; realization is the computable, lossy projection into structural type data.
Refinements such as `minLength`, `pattern`, `format`, and numeric ranges are not faked as TypeScript types.
They stay in the schema validator, where they can actually be enforced.

Verification reading: the runnable example asserts that the carrier validator accepts a valid value and rejects a refinement failure, that realized output prints readonly structural fields, that refinement keywords do not appear in the printed type, and that local `$defs` become named declarations while external `$ref`s remain structural `unknown`.
TypeDoc now includes the realization, structural, printer, and registry modules directly.

## Relational Descent Engine

The descent engine turns an admitted utterance into a settled relation:

```text
utter -> articulate -> predicate -> posit -> settle
```

Public handles:

- functions: `utterance`, `articulate`, `predicate`, `posit`, `settle`
- action verbs: `utter`, `articulate`, `predicate`, `posit`, `settle`, `induce-relation`
- example: `examples/descent.mjs`

Product reading: a tiny proof-producing relation engine.
It admits two marks, derives a predication site, admits evidence as value, settles the result, and reads invariants of the settlement.

## FOUR Charge Algebra

The charge algebra is the package's paraconsistent value core.
It carries the knowledge and truth orders, joins/meets for both orders, negation, conflation, and Lean-backed conformance vectors.

Public handles:

- `chargeValue`, `joinKnowledgeValue`, `meetKnowledgeValue`
- `joinTruthValue`, `meetTruthValue`
- `negateValue`, `conflateValue`
- `leqKnowledge`, `leqTruth`
- action verb: `conflate-charge`
- example: `examples/four-charge-algebra.mjs`

Product reading: a runtime algebra for contradiction-preserving evidence.
It does not collapse conflict; it keeps evidence-for and evidence-against together.

## Dihedral Gauge Of FOUR

The dihedral gauge is the full order-eight value symmetry generated by the K4 FOUR gauge and the order-swap between the knowledge and truth orders.
It gives callers a concrete D4 action on charge values, a derived multiplication table, coset reads, fixed sets, and law witnesses.

Public handles:

- `orderSwapValue`
- `dihedral`, `dihedralElementNames`, `dihedralMul`, `dihedralFixedSet`
- `dihedralOrderEffect`, `dihedralSwapsOrders`
- `orderSwapIso`, `dihedralConjugation`
- example: `examples/dihedral-gauge.mjs`

Product reading: a small algebraic instrument for reasoning over the FOUR bilattice square.
It is not a graphics transform, a crypto primitive, or an evidence-log rewrite system; the action lives at the value level because the order-swap complements one side of the value.

Verification reading: package tests check the order-eight faithful action, closure by derived multiplication, non-commutativity, the K4 versus K4 sigma split, the cross-order isomorphism, and the defining conjugation relation.
The source mirrors Lean theorem vocabulary around `D4Gauge`, but this Node surface does not currently replay Lean-emitted golden vectors.

## Diataxis FOUR Read

The Diataxis read maps tutorial, how-to, explanation, and reference onto the package's existing FOUR charge values by bilattice role.
The result is a small finite carrier/read surface with axis reads and diagonal dualities derived from the same charge operations as the rest of positing.

Public handles:

- `diataxisMode`, `diataxisModes`, `diataxisReading`
- `chargeValueOfDiataxisMode`, `diataxisModeOfCharge`
- `diataxisApplication`, `diataxisCognition`
- `diataxisLookupDual`, `diataxisDoingDual`, `diataxisAntipode`
- example: `examples/diataxis-four.mjs`

Product reading: a Diataxis surface that does not fork the value story.
The mode names are practical user handles; the mathematical behavior is inherited from the FOUR charge square.
The content-local Lean witness proves the Diataxis quartet against RelMath's recurring `Corner` vocabulary; the Node surface is the package read over exported `ChargeValue` data.
It is not a documentation generator, a learning engine, or a coverage analyzer.

Verification reading: the runnable example asserts the mode-to-charge mapping, axis reads, charge-to-mode round trip, and dualities.
TypeScript and TypeDoc check the exported surface.
The content/Lean frontier describes the broader learning closure story, but this package slice only claims the finite read it exports.

## Relation Matrix Carrier

The relation matrix surface materializes finite point/state relations with FOUR-valued cells.
Sparse duplicate cells join in the knowledge order, rows and columns read as profiles, state extension reads truth-coordinate presence, and `transpose`/`dual` expose the same Chu-style axis swap used in RelMath.
Its transform checker is a total judgment surface: valid forward/backward pairs return witnesses, while failed pairs return ranked obstruction carriers with domain or adjointness atoms.

Public handles:

- `relationMatrix`, `matrixEntryReading`, `relationFromMatrix`
- `pointProfile`, `stateProfile`, `stateExtension`
- `transpose`, `dual`
- `checkRelationTransform`, `relationTransform`, `idTransform`, `composeTransforms`, `dualTransform`
- example: `examples/relation-matrix.mjs`

Product reading: a paraconsistent relation workbench small enough to be a Node API.
It is not a graph database, and it is not the full Lean Chu category runtime; it is the carrier/operator layer for finite FOUR-valued relations and their checked adjoint transforms.
The important software move is that failure is data too: a non-adjoint map can be inspected as a typed obstruction instead of being flattened into a boolean or hidden behind a thrown error.

Verification reading: the runnable example asserts duplicate knowledge-join settling, absent lookup obstruction, profile/extension reads, transpose and dual reads, identity/composition/dual transform witnesses, and a one-atom adjointness obstruction for a deliberately shifted target relation.

## Spatial Geometry

The spatial geometry surface implements exact arithmetic in real quadratic fields and finite one-dimensional cut-and-project model-set reads.
It is exposed under `@emsenn/relating/articulating` as `predicating.geometry.spatial`.

Public handles:

- `quadraticRational`, `quadraticFromInts`, `quadraticConjugate`, `quadraticCompare`
- `cutProjectScheme`, `latticeSite`, `physicalProjection`, `internalProjection`
- `acceptanceWindow`, `windowAcceptance`, `modelSet`, `restrictModelSet`
- `gapSpectrum`, `refutePeriod`
- example: `examples/spatial-geometry.mjs`

Product reading: exact aperiodic-order sampling for Node.
It can build finite model-set samples and read their gap words without leaving exact algebraic coordinates.
It is not a global aperiodicity prover or a general computational geometry library; finite period refutations are reported as finite judgments.

Verification reading: the runnable example asserts exact golden-ratio coordinates, one accepted and one rejected lattice site, finite model-set and restricted-model-set counts, exact gap-spectrum words, a period-one refutation witness, and a period-two non-refutation obstruction over the same sampled word.

## Typed Theory Consequence Workbench

The typed-theory surface reads predication data as a finite consequence system.
Cells and specialization edges generate inference rules; rules close under composition; `derive` and `typing` return witness or obstruction data; predicate word arrows saturate into atomic and composite word residues.

Public handles:

- subpath: `@emsenn/relating/articulating`
- namespace: `predicating.typedTheory`
- theory constructors: `theoryOfData`, `theoryOfBase`, `inferenceRules`
- consequence reads: `derive`, `deriveInBase`, `typing`, `derivationValidity`, `derivationClosure`, `typedTheoryProofCarrier`
- word reads: `predicateWordArrow`, `composePredicateWords`, `composePredicateWordPotential`, `predicateWordResidue`
- example: `examples/typed-theory-consequence.mjs`

Product reading: a small consequence engine over the package's own predication base.
It does not turn strings into logic; it derives over terms, predicates, cells, and generated predication base objects, with finite derivations and frontiers carried as data.

Verification reading: RelMath proves the predicating generator spine and the surrounding FOUR/linear-logic context.
The Node surface is the executable finite typed-theory layer currently checked by TypeScript, TypeDoc, and the runnable example, not by dedicated Lean-emitted golden vectors.

## Predication Fiber Logic Workbench

The predication-fiber surface admits value into finite predication sites without collapsing them into ordinary graph edges.
A predicate fiber is a subject/object-cell reader over one predicate with FOUR charge values; the current logic layer provides value-level linear fusion/residuum and cellwise fiber operators, plus finite generator preservation checks.

Public handles:

- subpath: `@emsenn/relating/articulating`
- namespace: `predicating.positing`
- value logic namespace: `predicating.positing.logic`
- fibers and evidence: `meme`, `fiberCarrier`, `composeFibers`, `fiberFromAlgebra`, `valuationFromPredicateFiber`, `chargeAt`
- finite fiber reads: `predicateFiber`, `allCells`, `knowledgeOrder`, `truthOrder`, `predicationFiberLinearFusion`, `predicationFiberLinearResiduum`, `leqTruthPredicateFiber`
- generator checks: `converse`, `subjectProjection`, `objectProjection`, `specialization`, `generatorPreservesLinearFusion`, `generatorPreservesLinearResiduum`, `generatorSatisfiesLinearFusionFrobenius`
- example: `examples/predication-fiber-logic.mjs`

Product reading: finite linear-logic reads over value-bearing predication fibers.
This is not a graph database, a full proof-search engine, or the whole Chu transform category; it is the executable layer where a Node package can ask what value entered which predication cells and whether finite generators preserve the current linear operations.

Verification reading: RelMath's `Positing` and `LinearLogicChu` modules ground the valuation and FOUR/linear-logic setting.
The Node surface is currently checked by package build, TypeDoc, examples, and tests, not by dedicated Lean-emitted golden vectors for this exact fiber API.

## Formal Concept Analysis Terms

The FCA terms compute the Boolean Galois pair over predication-cell-shaped data: subjects induce shared predicates, predicates induce matching subjects, and the round trip closes an extent into a formal concept.

Public handles:

- root catalog: `fca`
- terms: `intentOfExtent`, `extentOfIntent`, `closeExtent`, `isConceptPair`, `formalConcept`
- subpath: `@emsenn/relating/evaluating/connecting`
- example: `examples/formal-concept-analysis.mjs`

Product reading: a concept-lattice workbench hiding inside the RMN runtime.
It lets packages compute concepts from sparse predication material without leaving the package's total term substrate.

Verification reading: Lean proves the abstract Boolean FCA laws; the Node surface is executable and checked by contract tests and examples, but it does not yet have dedicated Lean-emitted golden vectors.

## Chu Space Terms

The Chu terms compute finite Chu-space operations over the FOUR charge algebra.
A space is encoded as `{ pts, r, sts }`; `r` is a flat FOUR-valued matrix of `{ pt, st, charge }` entries.

Public handles:

- root catalog: `chu`
- terms: `dual`, `lookup`, `dualInvolution`
- subpath: `@emsenn/relating/evaluating/pairing`
- example: `examples/chu-spaces.mjs`

Product reading: finite linear-logic relation matrices as executable data.
The same paraconsistent FOUR charge core becomes the alphabet of a dualizable matrix surface.

Verification reading: Lean proves the abstract Chu/FOUR dual-involution theorem and related transform structure; the Node surface currently implements and tests finite encoded `dual`, `lookup`, and `dualInvolution`, not the full Chu transform category.

## Settlement Analysis Bench

The analysis surface reads settled or relation-shaped material into exact carrier-valued analytical objects: natural numbers, rational quantities, integer matrices, Laplacian graphs, spectral judgments, evidence distributions, conservation witnesses, and charged differential findings.

Public handles:

- root namespace: `analysis`
- subpath: `@emsenn/relating/analysis`
- exact arithmetic: `count`, `successor`, `rational`, `determinant`, `charPoly`, `rank`
- spectral reads: `integerPolynomial`, `polyReciprocal`, `selfReciprocity`, `rootIntersection`, `inversionSymmetry`, `rootLocation`, `pisotRoot`, `dominantRootConvergence`, `mahlerMeasure`, `matrixPisot`
- graph/evidence reads: `relationGraph`, `laplacianOf`, `harmonic`, `componentCount`, `spectrumPolynomial`, `treeCount`, `chargeDistribution`, `evidenceCoordinates`, `mixedness`
- conservation/differential reads: `conservation.flowNetwork`, `conservation.divergence`, `conservation.conserved`, `conservation.complete`, `conservation.gradedConserved`, `differential.control`, `differential.finding`
- example: `examples/settlement-analysis.mjs`

Product reading: an exact analysis bench for settled relation material.
It is not a general floating-point numerical library; it keeps results in the package's carrier style so analytical facts can still be witnessed, serialized, projected, and compared as data.

The graph side reads sections as finite weighted term relations: exact `L = D - W` matrices, component counts, spectrum polynomials, Matrix-Tree counts, and harmonic witness/obstruction judgments over rational observables.
This is the executable Node layer adjacent to the broader RelMath Lawvere/Tarski Laplacian story; it does not claim the full enriched sheaf machinery.

The spectral side reads exact integer polynomials as carrier data: reciprocal polynomials, resultants, root counts relative to the unit circle, Pisot witnesses, bounded rational dominant-root estimates, and Mahler-measure judgments.
The worked example uses the Fibonacci characteristic polynomial `[-1, -1, 1]`, matching the RelMath step-N recurrence handle for the golden-ratio Pisot growth rate.
The Node layer does not compute arbitrary real eigenvalues; it exposes exact finite judgments and rational iteration where implemented.

The conservation side is the first-order companion to the Laplacian read: oriented section cells become flow edges, `divergence` computes the boundary of a rational 1-chain, `conserved` judges whether that boundary vanishes, and `complete` solves the one elided edge case.
The graded helpers keep the same story sector-separated.
The differential namespace is deliberately smaller: a control object, scoped norms, and charged findings.

Verification reading: exact-number behavior is differentially checked by the RMN term tests for `nat.count`/`successor`, and the broader surface is covered by package typechecking and examples, including spectral-polynomial assertions, exact Laplacian and harmonic judgment assertions, flow conservation/completion assertions, and charged control finding assertions.
It does not yet have Lean golden vectors for every analysis function.

## Fixed-Point Topology

The fixed-point topology surface computes the four extremal settled sections of a posited predication: knowledge least, knowledge greatest, truth least, and truth greatest.
It keeps the least/greatest interval visible through gap carriers, then reads each extremum into cohomology and relation-shaped information.
Section helpers flatten one extremum into charged entries, predicate/subject queries, FOUR buckets, and topology vitals.

Public handles:

- subpath: `@emsenn/relating/settling`
- fixed points: `fixedPoints`, `fixedPointGap`, `fixedPointGapInput`
- readings: `fixedPointReading`, `fixedPointReadings`, `informationOfSheaf`, `readCharge`
- sections: `sectionOf`, `predicationsFor`, `subjectsFor`, `chargeAtValues`, `partitionSection`, `topologyVitals`
- types: `FixedPointCarrier`, `FixedPointExtremum`, `FixedPointJudgment`, `MemeTopologyFixedPointReading`, `MemeTopologyInformation`, `SectionCarrier`, `TopologyVitalsCarrier`
- example: `examples/fixed-point-topology.mjs`

Product reading: a finite fixed-point inspection bench for relation settlement.
Instead of returning only a settled value, it exposes all four extrema, the open or vanished gaps between least and greatest, the induced relation, and the remaining contradictory or absent residue.
This is one of the clearer "internal products" in the package: a downstream system can audit a relation's settled topology without adopting the whole action boundary.

Verification reading: the runnable example asserts that all four extrema stabilize for a one-predication case, that the knowledge interval remains open while the truth interval vanishes, and that the section/vitals reads expose one potential cell with no contradiction or residue.
TypeScript, TypeDoc, and the full examples script cover the export surface.
RelMath has broader fixed-point and colimit material, including the step-`n` fixed-point object, but this Node surface only claims the finite carrier reads it computes.

## Firing Causality

The firing-causality surface reads a settlement as a finite event trace and a charge-valued firing algebra.
Cells first added at settlement stages become events; shared terms induce stage-increasing adjacency; transitive closure gives a causal order with timelike/spacelike separation, cones, and exact ordering fractions.
Separately, charge values are graded into truth/falsity side ranks, classified under negation, and checked for self-duality or stage independence.

Public handles:

- subpath: `@emsenn/relating/settling`
- temporal reads: `readFiringEventsOfSettlementFiltration`, `readCausalOrderOfSettlementFiltration`, `causalSeparation`, `causalCone`, `orderingFraction`
- firing reads: `classifyFiring`, `firingGradeCohomology`, `classifyFiringOrbit`, `firingSelfDuality`, `firingIndependence`, `valuedFiringsOfSettlementFiltration`
- types: `FiringEvent`, `CausalOrderCarrier`, `CausalSeparation`, `CausalConeJudgment`, `OrderingFractionJudgment`, `FiringGrade`, `FiringFirstCohomology`, `FiringOrbitClassification`, `FiringSelfDuality`, `ValuedFiring`
- example: `examples/firing-causality.mjs`

Product reading: causal tracing and firing/failure witnesses are not separate features bolted onto a relation library.
In the current Node surface they are two reads over the same settlement substrate: what fired when, how events became ordered by shared terms, and what charge-side algebra those firings carry.

Verification reading: the runnable example asserts a three-event settlement with one timelike pair, one spacelike pair, a one-step cone, ordering fraction `1/3`, truth/falsity side ranks of two each, a mixed full firing orbit, a coherent self-dual `stable, absurd` subfamily, and independent valued firings.
The Lean spine proves stronger surrounding facts in `Flow.
NonScottContinuousFiring`, `Flow.
FiringBlowup`, `Lorentzian.
Causal`, and `Lorentzian.
MyrheimMeyer`; the Node package only claims the finite carrier reads and exact rational input it exports.

## Closure Regime Workbench

The closure-regime surface runs bounded fixed-point search over caller-supplied lattices and reports the orbit, stabilization judgment, and finite / Scott / transfinite regime read.

Public handles:

- subpath: `@emsenn/relating/settling`
- ordinals: `finiteOrdinal`, `omegaOrdinal`, `omegaMultipleOrdinal`, `omegaSquaredOrdinal`
- engine: `closureProcess`, `closeOrdinalProcess`, `closureStabilizationAt`, `closureOrbitOfProcess`
- regime reads: `closureRegimeOfOrdinal`, `finiteClosureRegime`, `scottClosureRegime`, `transfiniteClosureRegime`, `aperiodicClosureRegime`
- example: `examples/closure-regime.mjs`

Product reading: fixed-point iteration as a small runtime instrument.
Instead of hiding convergence inside a loop, callers get a carrier-shaped witness or obstruction for the closure search.

Verification reading: the Node package verifies the executable bounded search by example and typecheck.
Lean proves the sharper FOUR-spine result that finite charge-lattice inflationary endomaps settle by step three and supplies the decidable closure-regime dichotomy over finite characterization data.

## Learning Depth Read

The learning-depth surface transports existing closure-regime data into the four learning names from the content notes: rote, automatization, conceptual-change, and adaptive-expertise.

Public handles:

- subpath: `@emsenn/relating/settling`
- `learningDepthNames`
- `learningDepthOfRegime`, `learningDepthOfRegimeData`
- types: `LearningDepthName`, `LearningDepth`
- example: `examples/learning-depth.mjs`

Product reading: a small bridge from fixed-point regime data into learning vocabulary.
It is not a learning engine.
It lets downstream code speak about the learning-depth interpretation of a closure regime without forking the classifier or hard-coding another fourfold table.

Verification reading: the runnable example asserts the four regime-to-depth mappings and uses admitted `ClosureRegimeData` for all four cases.
The mathematical backing is the content-local learning-cycle note and `lean/RelMath/Closure/ClosureOrdinalRegime.lean`; the Node surface only claims the carrier transport it exports.

## Observed Learning Cycle Read

The observed learning-cycle surface reads a `ClosureCarrier` as a finite learning trace.
It checks that each recorded successor step ascends in the caller-supplied lattice, checks for a nontrivial return to an earlier recorded state, exposes the existing stabilization judgment, and reads learning depth when the bounded closure search found a regime.

Public handles:

- subpath: `@emsenn/relating/settling`
- `learningCycleOfClosureCarrier`
- `observedLearningAscent`
- `observedLearningNontrivialReturn`
- types: `ObservedLearningCycleRead`, `ObservedLearningAscentJudgment`, `ObservedLearningNontrivialReturnJudgment`
- example: `examples/learning-cycle.mjs`

Product reading: the content-side learning cycle becomes a Node-facing inspection of closure-carrier data.
The package does not prove arbitrary host callbacks monotone or inflationary; it reports the finite orbit it observed.

Verification reading: the runnable example asserts a finite chain closure whose orbit ascends, has no nontrivial return, stabilizes, and reads as rote learning through the finite closure regime.
TypeScript and TypeDoc check the exported surface.

## Value-Category Settling Workbench

The value-category settling surface lets callers supply a value category `V` and closure endomap, then checks the finite/sample order and closure laws before returning settling and regime witnesses.

Public handles:

- subpath: `@emsenn/relating/settling`
- value categories: `valueCategory`, `partialOrderOver`, `chargeValueCategory`, `booleanValueCategory`
- closures: `vClosure`, `closureOver`, `chargeJoinVClosure`, `booleanJoinVClosure`
- settling witnesses: `settleOverValue`, `settleFixedPoint`, `settleLeast`, `spineRecovery`
- regime reads: `closureRegimeData`, `classifyRegime`, `fourRegimeDichotomy`, `fourRegimeValueIndependent`, `cohomologyVanishesInRegime`
- example: `examples/value-category-settling.mjs`

Product reading: bring-your-own value lattice for settling, without abandoning the package's witness/obstruction style.
For finite `V`, the sample can be the whole carrier; for larger `V`, the Node surface is honestly sample-checked.

Verification reading: Lean proves the value-category theorem and FOUR/Boolean recovery shape in `RelMath/Value/SettlingOverValueCategory.lean`.
The Node layer implements the executable finite/sample checks and smart constructors it can actually enforce at runtime.

## Optimization Settling Workbench

The optimization-settling surface reads optimization as the same fixed-point process as value-category settling.
A `ValueCategory` supplies the measure order and constrained carrier; a `VClosure` supplies the improvement operator; the optimum is the settled fixed point.

Public handles:

- subpath: `@emsenn/relating/settling`
- problem constructors: `optimizationProblem`, `ofSettling`
- reads: `optimum`, `locallyOptimal`, `optimumReachable`
- witnesses: `optimumIsFixedPoint`, `settlingIsOptimization`, `metricOptimumIsMinFixedPoint`
- example: `examples/optimization-settling.mjs`

Product reading: an optimization receipt for Node packages.
Instead of hiding search in a mutable solver, the caller exposes the value order, carrier, and improvement closure, then receives witness-shaped facts about the optimum being reachable, fixed, and least above the seed.

Verification reading: Lean proves the optimization-as-settling theorem in `RelMath/Value/Optimization.lean`.
The Node layer implements the executable value-category witness surface and checks the FOUR example by build, TypeDoc, and runnable examples.

## Probability And Stochastic Settling Workbench

The probability/stochastic surface reads finite probability as a valuation and Markov stationarity as a settling fixed point.
Events are predicates over listed sample spaces; measures are exact natural counts; stochastic kernels advance distributions over an abstract semiring.

Public handles:

- subpath: `@emsenn/relating/settling`
- probability: `sampleSpace`, `measure`, `total`, `measureIsValuation`
- conditioning: `condMeasure`, `reindexEvent`, `conditioningIsReindex`, `conditionalViaFiberAdjoint`
- stochastic values: `stochSemiring`, `natStochSemiring`, `stochVC`, `stochVClosure`
- Markov reads: `markovKernel`, `advance`, `stochClosure`, `isStationary`, `markovStationaryIsClosureFixpoint`
- witness kernel: `witnessKernel`, `uniformWitness`, `uniformWitnessStationary`, `stochasticIsValueSettling`
- example: `examples/probability-stochastic-settling.mjs`

Product reading: a probability receipt surface for Node packages.
Instead of burying probabilistic claims inside floats and stateful simulation loops, callers can expose the sample, event, measure, conditioning, kernel, and stationary equation as inspectable witness data.

Verification reading: Lean proves the finite measure and stochastic-settling spines in `RelMath/Probability/Measure.lean` and `RelMath/Probability/Stochastic.lean`.
The Node layer implements the finite counting and abstract semiring witnesses it can actually compute at runtime.

## Substitution Dynamics Workbench

The dynamics surface reads finite substitution rules into exact dynamical invariants: incidence matrices, characteristic polynomials, primitivity judgments, colimit structures, substitution duality, and the step-N co-incrementing hierarchy.

Public handles:

- root namespace: `dynamics`
- subpaths: `@emsenn/relating/dynamics`, `@emsenn/relating/settling/dynamics`
- substitution reads: `substitutionSymbol`, `substitutionRuleEntry`, `substitutionRule`, `abelianize`, `primitiveMatrix`, `charPolyOver`, `stepNInvariant`
- recurrence reads: `recurrence.stepNHierarchy`, `recurrence.growthDegree`, `recurrence.fibonacciIncidence`, `recurrence.padovanIncidence`
- finite MLD reads: `mld.mldInvariant`, `mld.mutuallyLocallyDerivable`, `mld.carriersMutuallyLocallyDerivable`
- finite hull reads: `hull.coherentThread`, `hull.threadsSeparated`, `hull.odometerHull`, `hull.constantHull`, `hull.hullSeam`
- example: `examples/substitution-dynamics.mjs`

Product reading: a finite aperiodic-settling workbench for Node.
It gives packages the executable part of the step-N substitution story: actual rules, actual exact matrices, derived characteristic polynomials, and witness/obstruction results.
The same surface now exposes a finite MLD-invariant comparator and finite inverse-system hull helpers, so downstream code can ask both the cohomological-colimit question and the visible finite-thread question without leaving the substitution carrier layer.
It is not the whole aperiodic tiling or moduli program.

Verification reading: `test/recurrence.test.mjs` checks the co-incrementing hierarchy, Fibonacci and Padovan growth-degree witnesses, FOUR corner alignment, the step-N invariant, and the declared-polynomial obstruction.
`test/dynamics-mld-hull.test.mjs` checks same-matrix MLD witnesses, separated matrix obstructions, coherent and incoherent finite odometer threads, and the `hullSeam`/`mldInvariant` agreement.
Lean/content provide the conceptual spine; the Node surface derives the finite matrix and finite inverse-system reads it actually exports.

## Representation Writing

The writing catalog is the package's representation-boundary kit.
It admits and projects values across JSON, JSONL, EAVT, schema assertions, Markdown, TOML, Turtle, HTML/XML/SVG, paths, and HTTP-adjacent grammars without letting those wire forms become the ontology of the package.

Public handles:

- `@emsenn/relating/writing`
- canonical JSON: `canonical`, `parseJson`, `jsonProjector`, `jsonlProjector`
- schema traces: `unfoldSchema`, `projectSchemaAssertions`, `resolveJsonPointer`
- markdown projections: `createMarkdown`, `markdownDataform`, `markdownProjector`
- HTTP boundary codecs: `parseContentType`, `negotiateType`, `cacheControl`, `parseRange`, `parseCookieHeader`, `sseEventFrame`, `mcpOk`
- radial SVG: `projectRadial`, `radialProjector`, `radialFromValuation`, `radialFromClosureStages`
- examples: `examples/representation-codecs.mjs`, `examples/http-boundary-codecs.mjs`

Product reading: a standards-facing projection kit for the substrate.
Downstream packages can reuse the same canonical bytes, document cuts, trace rows, HTTP field grammar, and SVG vocabulary instead of reauthoring local serializers.

HTTP product reading: this is not a web framework.
It is the value layer beneath one: content negotiation as codec selection, cache/range/precondition reads as field evaluators, stream protocols as frame representations, and MCP as JSON-RPC envelopes.
The caller owns the live request, response, socket, and offered representation list.

Verification reading: this surface is checked by representation contracts and package tests, not by Lean golden vectors.

## Relational HTML / RMN Executable Documents

The relational-HTML surface admits executable content only when the executable body is an RMN term.
HTML may carry `<script type="application/rmn+json">`, but ordinary JavaScript and plain JSON data pretending to be a morphism are rejected before any host-language execution boundary is crossed.

Public handles:

- subpath: `@emsenn/relating/writing`
- codec: `rmnProjector`, `RMN_JSON`
- RMN admission and settlement: `isRelationalTerm`, `parseRmn`, `settleRmn`
- HTML gate: `htmlIsRelational`, `extractRelationalScripts`, `settleRelationalHtml`
- open stream gate: `sessionIsRelational`, `settleRelationalSession`
- HTTP media-type read: `mediaTypeCorner("application/rmn+json")`
- example: `examples/relational-html.mjs`

Product reading: a document can carry markup, data, and a morphism body without making JavaScript the source of semantic truth.
The browser document is the carrier; the RMN script body is the inspectable morphism; the package is the interpreter.
This is not a browser sandbox, not a DOM executor, and not a claim that arbitrary HTML completion is decidable.

Verification reading: `test/relational-html.test.mjs` checks the projector corner/rung, RMN term admission, rejection of plain JSON and open terms, rejection of JavaScript scripts, HTML script extraction, RMN settlement, session admission, and media-type corner mapping.
RelMath's CHL file proves the Church-Rosser/confluence spine; the current package claim is the implemented closed/well-typed RMN admission gate plus bounded package evaluation, not a formal strong-normalization proof for every evaluator extension.

## Holography Projector Lattice

The projector kernel is the representation type lattice underneath the codec catalog.
A projector recognizes a resource and may read/write carried values; `restrict` derives a child projector whose recognition entails the parent.
The same kernel supports generic authored projectors and built-in branches such as XML -> SVG -> radial SVG.

Public handles:

- subpath: `@emsenn/relating/projections`
- `define`, `restrict`
- `classify`, `entails`
- built-in examples: `xml.xmlProjector`, `svgProjector`, `radialProjector`
- example: `examples/projector-lattice.mjs`

Product reading: resource typing as morphism-bearing structure.
Instead of treating file extensions, folders, or router paths as the source of truth, a resource type is the projector that recognizes it and the carried read/write morphisms it owns or inherits.

Verification reading: the projector-lattice example checks the built-in XML/SVG/radial entailment chain, deepest-projector classification, a negative plain-text case, and inherited read/write behavior for an authored restriction.

## Radial SVG Projection

The radial projection surface turns charged relation material into deterministic SVG.
A `Valuation` becomes a `RadialDataform`; `projectRadial` renders that dataform as SVG; `radialProjector` recognizes the resulting resource as the radial vocabulary.

Public handles:

- subpath: `@emsenn/relating/writing`
- `projectRadial`, `radialProjector`
- `radialFromValuation`, `radialFromClosureStages`
- `segmentOfMeme`, `chargePalette`
- example: `examples/radial-svg-projection.mjs`

Product reading: a visual boundary for FOUR-valued relation material.
The package does not need to become a UI framework to emit useful diagrams: it can project carried valuations into stable SVG bytes whose segments still bear charge attributes, ordinals, and orbit labels.

Verification reading: codec tests check projector recognition, deterministic segment sorting, charge coloring, diagonal/off-diagonal orbit labels, and ordinal center placement.
The standalone example checks the live pipeline from predicate fiber to valuation to recognized SVG.

## RMN Term/Proof Kernel

Relation Model Notation is a JSON term language for pure morphism bodies.
It contains a CHL-style STLC core, domain primitives, structural operations, an evaluator, and a decidable type checker for the CHL core.

Public handles:

- constructors: `ty`, `tm`
- notation schemas: `TySchema`, `TmSchema`
- de-Bruijn structure: `rename`, `subst`, `inst`
- reduction: `step`, `dev`, `evaluate`, `evaluateRunTerm`
- type checking: `hasTy`, `inferTy`, `checkTy`
- exported term catalogs: `descent`, `nat`, `settlingTerms`, `readerTerms`, `measurement`
- example: `examples/term-products.mjs`

Product reading: a portable morphism body format with its own syntax admission layer.
An action can carry its logic as data, so CLI, HTTP, MCP, tests, logs, and docs can inspect the same body.
The notation layer is not a parser or a JavaScript evaluator; it is the typed total JSON term vocabulary, with schemas and de-Bruijn substitution/instantiation as first-class operations.

Verification reading: `test/term.test.mjs` now checks recursive `TySchema` and `TmSchema` admission through Ajv, malformed-term rejection, `rename`, `subst`, and `inst` behavior, plus the existing fold/nat/free/reader/typechecker contracts.
`examples/term-products.mjs` prints the notation schema ids and structural-operation results beside the evaluator and closed term catalogs.

## Carrier-Term Projection

The carrier-term projection surface is the bridge between JSON carrier values and the RMN value layer.
It admits a JSON value as a deterministic term, lets the evaluator reduce structural operations against that encoding, and decodes a normal-form value term back to JSON.

Public handles:

- subpath: `@emsenn/relating/evaluating/projecting`
- bridge: `carrierToTerm`, `termToCarrier`
- builders: `objectTerm`, `arrayTerm`, `stringTerm`
- evaluator path: `evaluateRunTerm`
- example: `examples/carrier-term-projection.mjs`

Product reading: this is the practical hinge between carrier-shaped data and the typed total LISP-like RMN substrate.
It is not a schema validator or a general JavaScript serializer; it admits JSON values that carrier validators have already made meaningful at the boundary.

Verification reading: the runnable example asserts object round trip, field projection, array append, manual term builders, and the `evaluateRunTerm` carrier morphism path.
The bridge's deterministic key ordering and tagged product-spine encoding are checked through ordinary package build and examples, not by a dedicated Lean fixture.

## Settlement Reader Terms

The settlement reader term surface packages the settlement-filtration reads as portable RMN bodies.
Each reader is `read . free`: it takes the slim settlement-filtration generator carrier, rebuilds the full settlement inside the calculus, then computes the requested read.

Public handles:

- root catalog: `readerTerms`
- free construction: `settlingTerms.free`
- related terms: `nat.count`, `measurement.classifyRegime`, `measurement.cohomologyVanishesInRegime`
- direct TypeScript comparison surface: `readClassificationOfSettlementFiltration`, `readFirstCohomologyOfSettlementFiltration`, `readGradedGapOfSettlementFiltration`, and sibling readers
- example: `examples/settlement-reader-terms.mjs`

Product reading: this is the reader side of behavior-as-data.
The package can carry not only an action body but a settlement invariant reader as an inspectable term body.
It is not a general cohomology solver or a transfinite ordinal engine; it is the executable finite reader catalog over the settlement carrier shape the package actually exports.

Verification reading: the runnable example checks every reader term against the corresponding TypeScript reader after `freeSettlementFiltration`, comparing canonical wire bytes.
The regime classifier and cohomology-vanishing core are separately golden-vectored against `RelMath.
ClosureOrdinalRegime`; the carrier-specific `read . free` composition is checked against the real Node carrier serialization because RelMath does not own that wire format.

## Lean Conformance Bridge

The conformance bridge is the package's proof-authority boundary.
Lean emits golden-vector rows for the finite law surfaces the Node package can compute, and the package tests replay those rows through TypeScript and RMN.

Public handles:

- fixtures: `test/fixtures/lean-four-golden.jsonl`, `lean-chl-golden.jsonl`, `lean-domain-term-golden.jsonl`, `lean-measurement-golden.jsonl`
- Lean emitters: `sites/relmath.bare-cedar-fog.emsenn.net/conformance/ConformanceVectors.lean`, `sites/relmath.bare-cedar-fog.emsenn.net/conformance/MeasurementVectors.lean`
- test harness: `test/lean-conformance.test.mjs`
- example: `examples/lean-conformance.mjs`

Product reading: a small oracle bridge, not a blanket verification claim.
FOUR tables, CHL reduction samples, domain primitive reductions, and measurement cores are checked against Lean-emitted rows.
Carrier-specific descent and serialization terms are checked against the real TypeScript operation and canonical wire form because those carriers are package-specific Node artifacts.
The example is a product-level smoke oracle over representative rows; the test harness is the full committed-row replay plus deliberately broken-oracle checks.

## Action Apex

The action system registers operations once and projects them to several faces.

Public handles:

- `action`, `compose`, `composes`
- `actions`, the package's registered action list
- `induceBins`, `dispatch`
- `serve`, `routeRequest`
- OpenAPI, MCP, HTML form, and carrier-node projections under `@emsenn/relating/running`
- example: `examples/action-apex.mjs`

Product reading: a transport generator for carrier morphisms.
It is the place where the package most visibly becomes "one object, many faces."
The current example treats projection counts as part of the product: discovery bins, OpenAPI paths, MCP tools, and HTML links are checked from the same induced action family instead of maintained as separate registries.

## Graded Wire Codec Vocabulary

The wire-codec surface turns representation projectors into action boundary codecs.
Each wire decodes one boundary document to a carried JSON value and encodes one carried value back to bytes, while inheriting the projector's content corner and completion rung.

Public handles:

- subpath: `@emsenn/relating/codecs`
- `WIRE_CODEC_NAMES`
- `wireCodec`, `wireByMediaType`, `wireOf`
- `stringCodec`, `jsonCodec`, `eavtCodec`, `formCodec`, `rmnCodec`
- example: `examples/action-apex.mjs`

Product reading: a finite, graded wire vocabulary is what keeps CLI, HTTP, forms, MCP, and tests from becoming five parser registries.
`wireOf` rejects a projector whose read settles at an undecidable rung, so the boundary cannot quietly start depending on JavaScript-like completion.
The RMN wire is admitted because it inherits the RMN projector's closed/well-typed term gate; it is not an escape hatch for arbitrary host code.

Verification reading: `test/acting.test.mjs` checks that each built-in wire inherits the expected corner/rung, all wires read at decidable rungs, `application/rmn+json` resolves to `rmnCodec`, non-decidable projectors are rejected by `wireOf`, a data-corner value is not served as RMN/Turtle by `Accept` negotiation, an assertion value can settle down, and explicit `output-format` wins by name.

## Action Knowledge Vault

The action knowledge-vault surface is the MCP tools/resources/prompts projection of one induced action apex.
Actions become tools, package artifacts become resources, and action metadata becomes guided prompts.
Registered resources and registered prompts join the same apex rather than forming a second registry.

Public handles:

- subpath: `@emsenn/relating/running`
- resources: `resource`, `literalResource`, `resourceDescriptor`
- prompts: `prompt`, `actionPrompt`, `userMessage`, `promptDescriptor`
- projection: `induceBins`, `actionMcpHandle`; generated descriptors from `@emsenn/relating/projections`
- example: `examples/action-knowledge-vault.mjs`

Product reading: an action family can explain itself to an MCP-capable agent without handwritten tool descriptions drifting away from the carrier/action registry.
The package projects callable tools, schema/discovery resources, and input-preparation prompts from the same declaration surface.

Verification reading: the runnable example declares one action, one registered resource, and one custom prompt, then checks `tools/list`, `tools/call`, `resources/list`, `resources/read`, `prompts/list`, and `prompts/get` through the real MCP handler.
This surface is standards-facing Node boundary code, not a Lean-backed mathematical theorem.

## Operations Manifold Topology

The operations-manifold surface reads an induced action family as carrier topology: domain extrema, codomain extrema, local codomain-domain edges, frontiers, and cross-package carrier-identity graph edges.

Public handles:

- subpath: `@emsenn/relating/running`
- `operationsManifoldOf`
- `operationsManifoldGraphOf`
- `operationsManifoldUri`
- `operationsManifoldResource`
- example: `examples/operations-manifold.mjs`

Product reading: package composition can be read from carrier identity instead of inferred from route paths, import graphs, or README prose.
The manifold does not run the pipeline; it exposes the topology already implied by action declarations and their domain/codomain schemas.

Verification reading: the runnable example builds two induced apices, derives their package manifolds, checks the cross-package edge produced by a shared carrier `$id`, and reads the automatically derived MCP operations-manifold resource.
`test/acting.test.mjs` also checks that the MCP resource is listed and readable from an induced apex.

## Morphism Inspection

The inspection surface serializes an action declaration as a morphism carrier and then reads that carrier through the package's own `inspect` action.

Public handles:

- `morphismCarrier`
- `actionIrAudit`, `freeTsActions`
- registered action verb: `inspect`
- example: `examples/morphism-inspection.mjs`

Product reading: operation review as data.
A package can expose whether an action is a carrier morphism or boundary, whether it carries an RMN body, and which term constructors that body uses.
This does not replace semantic conformance tests; it gives docs, CI, and agent tooling a small common read over the action substrate.
The current example asserts that all true carrier morphisms in the package action family carry `runTerm`, while `inspect` itself remains visible as an untyped boundary.

## Carrier Manifold

Carrier-node mounting serves package apices at carrier `$id` paths.
It lets several packages co-mount behavior at the same carrier node while preserving the same OpenAPI/MCP/HTML/dispatch faces.

Public handles:

- `carrierNodeTree`
- `tileCarrierNodes`
- `routeCarrierManifold`
- `services/http/server` owns `serveCarrierManifold`
- example: `examples/carrier-manifold.mjs`

Product reading: a namespace server for a category of typed data.
Routes are not chosen by controller names first; they are induced by the carrier identity a morphism consumes.

## Running HTTP App Boundary

The running HTTP app surface describes ordinary HTTP resources as carrier-like data: representations, resource descriptors, request-body readers, `.well-known` resources, and projected SSE events.

Public handles:

- owner: `services/http/app`
- representations: `jsonRepr`, `textRepr`, `htmlRepr`, `emptyRepr`
- resource/app descriptors: `App`, `Resource`, `Handler`, `wellKnown`
- body readers: `readBody`, `readTextBody`, `readJsonBody`, `readFormBody`, `readMultipartBody`
- event streams: `sse`, `writeSseEvent`, `writeSseComment`, `createProjectedEventHub`
- example: `examples/running-http-app.mjs`

Product reading: a small HTTP object language under Node.
It is not a web framework and it does not own deployment, routing policy, sessions, or durable event storage.
It gives downstream packages a way to talk about HTTP representations, body decoding, `.well-known` resources, and event projection using the same explicit value style as the rest of `relating`.

Verification reading: the runnable example asserts `.well-known` resource projection, JSON/text representation metadata, topic-filtered SSE delivery, keepalive/unsubscribe behavior, manual SSE writes, and bounded JSON body decoding from a stream-shaped request object.

## Runtime Transport Work Quartet

The runtime transport surface reads each serving mode through the same FOUR shape as the package's charge algebra: request/response, event stream, bounded claim session, and open/conflicted session become Procedure, Process, Derivation, and Inquiry.

Public handles:

- subpath: `@emsenn/relating/running`
- transport work reads: `TRANSPORT_WORK`, `workType`, `determination`
- live session read: `sessionWork`
- claim session core: `openSession`, `claim`, `judge`, `conflicts`, `sessionRegime`, `settle`
- WebSocket claim transport: `exchangeClaim`, `judgementReply`, `judgementFrame`; `services/http/ws-session` owns `attachClaimSession`
- example: `examples/runtime-transport-work.mjs`
- tests: `test/transport-work.test.mjs`, `test/session.test.mjs`, `test/ws-session.test.mjs`, `test/serve-transports.test.mjs`

Product reading: this is the package's runtime regime reader.
It is not a web framework, workflow engine, or general collaboration server.
It gives a caller small carrier-shaped facts about how a transport is settling: request/response as an unsettled execution path with a known meaning, an event stream as a deterministic process, a consistent claim session as derivation, and a conflicted claim session as inquiry.

Verification reading: the tests assert the four transport-to-work mappings, the four distinct determination charges, monotone claim accumulation, judgement flipping to `stable` on conflict without retraction, `scott` versus `transfinite` session regimes, pure WebSocket exchange, and live HTTP mounting of the Scott and transfinite transports.

## Scripted Invocation Witnesses

The invocation witness surface records a successful scripted boundary play as one EAVT row: caller as entity, verb/args/morphism as attribute, returned value as value, and witness timestamp as time.
Dispatch, HTTP POST, MCP tool calls, and generated form routes can all write the same feed when `dataRoot` is set.

Public handles:

- subpath: `@emsenn/relating/running`
- `dispatch`, `dispatchAsync`
- `witnessInvocation`
- `invocationStore`
- `invocationFeed`
- `projectInvocations`
- `routeRequest`, `routeRequestAsync`
- live feed projection: `streamWitnessLog`, `feedResponse`, `EAVT_EVENT`
- example: `examples/scripted-invocation-witnesses.mjs`
- docs: `docs/scripted-invocation-witnesses.md`

Product reading: the package can make action use observable without turning the action into an effectful logging abstraction.
A direct `action.run` is still a local computation.
A boundary play through dispatch is a witnessed play: it can leave a durable row containing the caller, the invoked morphism carrier, the arguments, the value, and the timestamp.
That is the practical hinge between "registered operation" and "agent-readable trace."

Verification reading: the runnable example asserts direct-run silence, dispatch output, the exact invocation row shape, recorded `runTerm` on the morphism carrier, and projection back to a state view.
`test/acting.test.mjs` checks CLI and pure HTTP-route witnessing; `test/serve-transports.test.mjs` checks the live `GET /feed` event-stream projection for served apices and mounted manifolds.

## Running Ledger / Witness Store

The running ledger surface turns append-only witness logs into current state, records, and content-document cuts.

Public handles:

- subpath: `@emsenn/relating/ledger`
- legacy alias: `@emsenn/relating/running/ledger`
- `witnessObservation`
- `projectFeedState`
- `projectFeedContent`
- `streamWitnessLog`, `feedResponse`, `EAVT_EVENT`
- `appendWitnesses`, `readWitnessLog`, `commitRecord`
- `readContentResource`, `listContentEntries`, `readContentTree`

Product reading: a small event-sourcing and content projection kernel in the package's own vocabulary.
It is effectful only at the store binding; the projection morphisms are ordinary data transformations.

This is also the package's most practical coordination story for agent systems: agents should leave typed traces in a shared substrate, then read projected state, instead of passing ever-growing conversational context to each other.

Verification reading: the runnable example asserts duplicate witness dedupe, latest functional state projection, accumulated non-functional evidence, content-document cutting, Datom record commit, and live-log compaction through the real filesystem store.
This is a Node coordination substrate, not a distributed database or consensus system.

## Frontier Product Candidates

These are visible in Lean/content but should not be documented as package features until their Node carriers/actions exist:

- aperiodic moduli, MLD-equivalence, and universality tools beyond the finite substitution-dynamics workbench
- richer sheaf/cohomology calculators beyond the current settlement readers
- Collatz closure settlement material
- continuous Lawvere-quantale, fuzzy, measurable, real-valued stochastic, normalized probability, or PDE-style value categories beyond the finite/sample-checked value-category and counting/stochastic witness workbenches
- learning-closure tooling beyond the Diataxis FOUR read, bounded closure-regime workbench, learning-depth read, and observed learning-cycle trace read.
  Content notes currently map richer Diataxis and learning material onto FOUR and describe learning as a monotone inflationary closure process, but this package does not yet expose a learner-state domain carrier, Diataxis coverage carrier over real docs, or registered learning action.
  The current developer boundary note is [dev/docs/notes/2026-06-25-diataxis-learning-frontier.md](../dev/docs/notes/2026-06-25-diataxis-learning-frontier.md).
- a packaged proof-tree cockpit that binds RelMath, TypeDoc, action discovery, and examples into one browsable artifact

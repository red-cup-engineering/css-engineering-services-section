# Examples

The runnable examples live in `examples/` and are checked by `npm run examples` after a build.

From the package directory:

```sh
pnpm run build
pnpm run examples
```

From the workspace root:

```sh
pnpm --filter @emsenn/relating run build
pnpm --filter @emsenn/relating run examples
```

## `examples/descent.mjs`

Runs the ordinary function-level descent:

```text
utterance -> articulate -> predicate -> posit -> settle
```

It prints the carrier kinds and a compact settlement summary: stage count, closure regime, cofinality, first-cohomology rank, and graded-gap rank.

## `examples/action-apex.mjs`

Induces the package action list into one apex, dispatches `conflate-charge`, and prints action-boundary facts.
It checks that the same action family projects to the same number of discovery bins, OpenAPI paths, and MCP tools, and that the HTML index names a projected action.

It also prints the morphism audit: how many registered actions are true carrier-to-carrier morphisms, how many are boundaries, and how many true morphisms still lack `runTerm`.

It prints the live wire vocabulary too: each wire's media type, content corner, and completion rung.

This is the smallest example of the package's transport generator: one action declaration list becomes dispatch/OpenAPI/MCP/HTML faces.

## `examples/action-knowledge-vault.mjs`

Declares one carrier morphism, one registered resource, and one custom prompt, then projects the induced apex through the MCP handler.
It checks:

- `tools/list` exposes the action
- `tools/call` runs the action through dispatch
- `resources/list` includes the custom guide and derived discovery resource
- `resources/read` returns the custom guide text
- `prompts/list` includes the derived action prompt and the custom prompt
- `prompts/get` renders both prompt messages

This is the smallest example of a package action family as an MCP knowledge vault: tools, resources, and prompts are faces of the same induced apex.

## `examples/operations-manifold.mjs`

Builds two tiny induced package apices and reads their operation topology.
It prints:

- each package's action bins and carrier frontiers
- the shared-carrier edge between the packages
- the graph frontier that remains unresolved
- the MCP operations-manifold resource derived by `induceBins`

This is the smallest example of package composition as carrier incidence data: the edge exists because one action's codomain carrier id equals another action's domain carrier id.

## `examples/scripted-invocation-witnesses.mjs`

Declares a tiny IR-backed `Note -> Summary` morphism and runs it two ways:

- direct `action.run`, which returns a value and writes no witness
- induced `dispatch` with `dataRoot`, which returns stdout and appends one EAVT invocation row

It then reads the witness log and projects it back through `projectInvocations`.

This is the smallest example of the package's runtime trace product: a scripted boundary play records caller, verb, args, morphism carrier, value, and timestamp without changing the action output.

## `examples/term-products.mjs`

Inspects the exported RMN term catalogs: `descent`, `settlingTerms`, `readerTerms`, `measurement`, `fca`, and `chu`.
It prints whether representative terms are closed, their node count, and their opcode vocabulary.

It also runs small assertions over the live calculus:

- recursive `TySchema` / `TmSchema` validation
- de-Bruijn `rename`, `subst`, and `inst`
- a closed identity term with a checked `base -> base` type
- beta/projection normal forms
- FOUR charge reduction inside a term
- JSON carrier admission into a term and decoding back to JSON
- `evaluateRunTerm` over a field projection

This is the "proof body as data" product surface: morphisms as serializable, typed, inspectable IR rather than host closures.

## `examples/carrier-term-projection.mjs`

Runs the public `@emsenn/relating/evaluating/projecting` bridge directly.
It prints:

- a JSON carrier admitted into RMN and decoded back to the same carrier
- field projection over the bridge's object encoding
- array append over the bridge's array encoding
- manually built carrier-shaped terms with `objectTerm`, `arrayTerm`, and `stringTerm`
- the same field projection run through `evaluateRunTerm`

This is the smallest example of carrier data entering the pure term calculus without becoming a JavaScript closure.

## `examples/settlement-reader-terms.mjs`

Runs the root `readerTerms` catalog over a generated settlement.
It prints:

- the slim settlement generator input and materialized settlement size
- agreement between every RMN reader and the corresponding TypeScript reader after `freeSettlementFiltration`
- finite-regime classification for the ordinary descent
- first-cohomology and graded-gap rank equality
- closedness, node counts, and opcode vocabulary for representative reader bodies

This is the smallest example of settlement reads as portable morphism bodies: the term first rebuilds the settlement from generators, then computes the read inside RMN.

## `examples/operation-substrate.mjs`

Declares a tiny `Note -> Summary` morphism:

- `carrier` declares the note object once
- `schemaCarrier` declares the string summary carrier
- `action` registers an IR-backed `summarize-note` morphism
- `induceBins` projects discovery resources, prompts, endpoint metadata, and a bound dispatch function from that one action

It is the smallest example of the package's operation-substrate shape: a typed object, a typed morphism, behavior as `runTerm`, and boundary projections from one registry.

## `examples/morphism-inspection.mjs`

Serializes public action declarations with `morphismCarrier`, dispatches the result through the package's own `inspect` action, and prints an action-family audit summary.

It is the smallest example of action bodies as inspectable package data: carrier-to-carrier morphisms report their declared `$id`s and RMN body shape, while host-only boundaries remain visible as boundaries.

The example asserts the package's current review gate: all true carrier morphisms have `runTerm`, `conflate-charge` is a closed RMN term over the FOUR charge-value carrier, and `inspect` is explicitly reported as an untyped boundary.

## `examples/carrier-kernel.mjs`

Declares a note carrier and summary carrier, then prints the kernel projections:

- carrier `$id` and process-local registration
- Ajv validation success and error text
- schema-registry `$id` and JSON-pointer resolution
- action composition by carrier identity
- `morphismCarrier` serialization without the executable closure

It is the smallest example of the package's object floor before the action apex projects transports.

## `examples/schema-realization.mjs`

Declares a refined TypeBox carrier and reads the schema through the typing realization pipeline.
It prints:

- carrier validation success and refinement failure
- the structural type realized from the JSON Schema
- local `$defs` realized as named structural declarations
- generated declaration line counts
- the explicit boundary that refinements stay in the schema validator

This is the smallest example of schema-as-law and type-as-projection: the schema still rejects empty strings by `minLength`, while the structural TypeScript shape can only print `string`.

## `examples/witness-projection.mjs`

Builds a tiny claim feed and runs the holography projection path:

```text
observation -> EAVT witness log -> state view -> record/content projections
```

It shows five substrate facts:

- a byte-identical repeated observation appends zero rows
- functional attributes project to the latest witnessed value
- non-functional attributes accumulate witnessed values
- content projection cuts the current state into a term-addressed markdown document
- `commitRecord` appends a Datom reading and compacts the live log to the kept witness rows

## `examples/four-charge-algebra.mjs`

Runs the FOUR value core directly from the package root API.
It prints:

- the four value names
- a `potential`/`active` knowledge join settling to `stable`
- evidence preserved on both positive and negative sides
- sample knowledge-order and truth-order comparisons
- representative gauge operations and fixed points

## `examples/dihedral-gauge.mjs`

Runs the D4 gauge of FOUR directly from the package root API.
It prints:

- the eight D4 element names and their value permutations
- the order-preserving K4 coset and the order-swapping K4 sigma coset
- a noncommuting multiplication pair
- the cross-order `orderSwapIso` witness
- the defining conjugation relation witnessed at every FOUR value

## `examples/diataxis-four.mjs`

Runs the Diataxis FOUR read directly from the package root API.
It prints:

- the tutorial / how-to / explanation / reference modes
- each mode's package `ChargeValue`
- the application and cognition axis reads
- lookup, doing, and antipode dualities

This is the smallest executable Diataxis slice in the package: a total read over the existing FOUR charge square, not a learning-cycle engine or documentation coverage analyzer.

## `examples/relation-matrix.mjs`

Builds a sparse FOUR-valued point/state relation matrix, turns it into a relation carrier, and prints:

- duplicate-cell knowledge join
- matrix lookup obstruction for an absent cell
- point and state profiles
- state extension
- transpose and dual reads
- checked identity, composed identity, and dual identity transform witnesses
- a deliberately non-adjoint transform obstruction with rank and first failure

This is the smallest example of relation material as carrier-shaped data rather than a boolean graph query.

## `examples/spatial-geometry.mjs`

Builds an exact real-quadratic cut-and-project scheme from the public `@emsenn/relating/articulating` namespace.
It prints:

- the exact golden-ratio slope in `Q(sqrt(5))`
- the internal acceptance window
- window acceptance witness and obstruction judgments
- accepted lattice sites in a finite sample
- exact and approximate gap lengths
- a finite sampled period-one refutation and period-two non-refutation

This is the smallest example of the package's spatial geometry: exact algebraic coordinates and finite judgment carriers first, lossy native numbers only at the representation boundary.

## `examples/typed-theory-consequence.mjs`

Runs the public `@emsenn/relating/articulating` predication typed-theory namespace over a tiny predication datum.
It prints:

- a theory derived from one predication cell and one specialization edge
- a derivation witness from a cell to its object projection
- a typing obstruction and explored frontier for an ungenerated conclusion
- the composition-closure rank
- predicate-word residue after saturating composable arrows

This is the smallest example of consequence as carrier-shaped data over predication objects: the derivation is inspectable, finite, and typed by the same cell/term/predicate vocabulary the package already uses.

## `examples/predication-fiber-logic.mjs`

Runs the public `@emsenn/relating/articulating` predication positing namespace over a tiny two-entity predicate fiber.
It prints:

- value-level consistency, contradiction, and truth-order residuation witnesses
- cellwise linear fusion and residuum over two FOUR-valued predicate fibers
- generator preservation checks for converse
- specialization support plus existential and universal expansion outside the support

This is the smallest example of value entering predication as explicit finite fibers: the package keeps the subject/object cell reader, FOUR charge values, linear operators, and generator checks visible as data.

## `examples/formal-concept-analysis.mjs`

Runs the FCA term catalog over a tiny predication context.
It prints:

- the intent shared by an extent
- the extent induced by an intent
- idempotent extent closure
- a constructed formal concept
- basic term introspection for the `formalConcept` RMN body

This is the smallest example of Lean-grounded Boolean FCA as executable RMN terms over predication-cell-shaped data.

## `examples/chu-spaces.mjs`

Runs the Chu-space term catalog over a finite FOUR-valued matrix.
It prints:

- the point/state shape of the space
- the dual space's swapped point/state axes
- lookup results for present and absent matrix entries
- the double-dual equality witness
- term introspection for the `dual` and `lookup` RMN bodies

This is the smallest example of finite Chu-space duality as executable package data over the FOUR charge algebra.

## `examples/bigraded-settling-cohomology.mjs`

Runs the public `@emsenn/relating/settling` subpath over FOUR charge data.
It prints:

- a consistent census whose contradiction row is empty
- the knowledge aggregate of that census
- a contested list of charges split into truth, contradiction, and absurd rows
- the collapse witness and collapse-obstruction variants

This is the smallest example of the package's current bigraded settling read: not the whole sheaf-cohomology proof tree, but the executable carrier surface that separates truth-row content from held contradictions.

## `examples/bigraded-cohomology.mjs`

Runs the public `@emsenn/relating/analysis` finite bigraded-cohomology surface plus `bigradedCohomology` RMN terms.
It prints:

- a mixed-regime charge-list receipt
- a paraconsistent gauge-stable receipt
- the RMN-normalized mixed receipt

This is the smallest example of the finite aperiodic-regime trichotomy and negation gauge law as portable RMN carrier evidence.

## `examples/cohomology-rmn.mjs`

Runs the public finite predication-cohomology surface plus `cohomologyTerms`.
It prints:

- H0/H1 ranks for a finite cycle complex
- incidence/Laplacian rank-identity receipts
- a bigraded collapse obstruction
- RMN-normalized cohomology, Laplacian, and bigraded carriers

This is the smallest example of the finite cohomology receipts that downstream packages can record as RMN data.

## `examples/lawvere-laplacian-rmn.mjs`

Runs the public `@emsenn/relating/analysis` Lawvere-Laplacian surface plus `laplacianTerms`.
It prints:

- a finite relation graph and exact Laplacian polynomial degree
- harmonic witness and obstruction judgments
- Hodge exact/cycle-flow ranks
- component and Matrix-Tree spectrum reads
- a signed-balance obstruction

This is the smallest example of the finite Lawvere harmonic/spectral-gap shadow as RMN-normalizable carrier evidence.

## `examples/linear-algebra-rmn.mjs`

Runs the public `@emsenn/relating/analysis` finite matrix surface plus `linearAlgebraTerms`.
It prints:

- determinant, characteristic polynomial, rank, and Smith factors for a square exact integer matrix
- rank, nullity, and `rank + nullity = domainDimension` for a rectangular finite matrix
- RMN-normalized matrix-invariant and rank-nullity receipts

This is the smallest example of the finite exact linear-algebra shadow as portable RMN carrier evidence.

## `examples/spectral-rmn.mjs`

Runs the public `@emsenn/relating/analysis` exact spectral surface plus `spectralTerms`.
It prints:

- exact root-location and Pisot receipts for the Fibonacci polynomial
- reciprocal/resultant inversion evidence
- dominant-root convergence and Mahler receipts
- a matrix-Pisot receipt for the Fibonacci incidence matrix
- RMN-normalized spectral receipts

This is the smallest example of the exact Step-N spectral/Pisot/Mahler shadow as portable RMN carrier evidence.

## `examples/closure-rule-system.mjs`

Runs the public `@emsenn/relating/analysis` finite closure-rule surface plus `closureRule` RMN terms.
It prints:

- the closed valuation reached by a positive rule cascade
- the orbit length to fixed point
- the RMN-normalized least-fixed-point receipt

This is the smallest example of the finite immediate-consequence / Datalog shadow as portable RMN carrier evidence.

## `examples/discrete-set-number-graph.mjs`

Runs the public `@emsenn/relating/analysis` finite discrete surface plus `discreteTerms`.
It prints:

- a powerset intersection receipt
- a bounded Nat semiring receipt
- directed handshake counts
- topological-DAG and tree-count receipts

This is the smallest example of the set/number/graph discrete-predication shadow as portable RMN carrier evidence.

## `examples/lambek-calculus.mjs`

Runs the public `@emsenn/relating/analysis` finite Lambek algebra surface plus `lambek` RMN terms.
It prints:

- the one-point Trivial Lambek receipt
- the Boolean commutative Lambek receipt
- RMN-normalized law evidence for the Boolean receipt

This is the smallest example of the Lambek bi-residuation shadow as portable RMN carrier evidence.

## `examples/fca-lambek-circle.mjs`

Runs the public `@emsenn/relating/analysis` finite FCA/Lambek circle surface plus `fcaLambekCircle` RMN terms.
It prints:

- the finite FCA closure and concept-lattice receipt
- the Boolean residuated-lattice to commutative-Lambek receipt
- the documented-boundary marker for the model-theoretic closing edge

This is the smallest example of the executable algebraic part of the FCA/Lambek/residuated/settling circle as portable RMN carrier evidence.

## `examples/settlement-analysis.mjs`

Runs the public `@emsenn/relating/analysis` subpath over exact analytical carriers.
It prints:

- a von Neumann natural count
- determinant, rank, and characteristic polynomial for a small integer matrix
- reciprocal/resultant, root-location, Pisot, dominant-root, and Mahler reads
- an exact relation-graph Laplacian with component, spectrum, and tree counts
- harmonic witness and obstruction judgments for rational observables
- conserved-flow, leaking-flow, and elided-edge completion judgments
- graded conservation and charged differential-control findings
- exact FOUR evidence-coordinate expectations
- a majorization/mixedness comparison

This is the smallest example of settlement/evidence analysis as carrier-valued data rather than floats or booleans.

## `examples/fixed-point-topology.mjs`

Runs the public `@emsenn/relating/settling` fixed-point topology surface over a single posited predication.
It prints:

- knowledge-order least and greatest fixed-point witnesses
- truth-order least and greatest fixed-point witnesses
- per-order least/greatest gap verdicts
- fixed-point information as relation data
- section partition counts
- topology vitals: cells, contradictions, residue, and regime

This is the smallest example of settled meme topology as inspectable carrier data: extrema, gaps, relation information, and vitals remain visible instead of being collapsed into one solver result.

## `examples/firing-causality.mjs`

Runs the public `@emsenn/relating/settling` firing-causality surface over a hand-built three-stage settlement and explicit FOUR charge values.
It prints:

- temporal firing events and the finite causal order over them
- one timelike separation and one spacelike separation
- a causal cone and exact ordering fraction
- charge-valued firing cohomology side ranks
- firing-orbit, self-duality, and independence judgments

This is the smallest example of settlement causality as a finite carrier read: stage additions become events, shared terms induce causal adjacency, and charge values remain visible as firing algebra rather than being erased into booleans.

## `examples/closure-regime.mjs`

Runs the public `@emsenn/relating/settling` closure engine over a finite chain lattice.
It prints:

- the bounded orbit from bottom to fixed point
- the stabilization witness and finite regime
- finite, omega, and omega-squared regime reads

This is the smallest example of fixed-point iteration as carrier-shaped data: the convergence loop exposes its lattice, ordinal stages, and witness output.

## `examples/learning-depth.mjs`

Runs the public `@emsenn/relating/settling` learning-depth read over admitted closure-regime data.
It prints:

- the four closure regimes
- the corresponding learning-depth names
- the package's short learning readings for each regime

This is a vocabulary transport from `ClosureRegime` to `LearningDepth`, not a learning-cycle engine, learner model, or measurement API.

## `examples/learning-cycle.mjs`

Runs the public `@emsenn/relating/settling` observed learning-cycle read over a bounded closure carrier.
It prints:

- the recorded closure orbit
- the observed ascent judgment
- the observed nontrivial-return judgment
- the bounded stabilization judgment
- the learning-depth name read from the closure regime

This is a finite trace read over `ClosureCarrier`, not a proof that arbitrary host callbacks are lawful learning operators.

## `examples/value-category-settling.mjs`

Runs the public `@emsenn/relating/settling` value-category surface over Boolean and FOUR examples.
It prints:

- finite/sample partial-order and closure-law witnesses
- settling from the FOUR bottom to a target charge
- fixed-point, least-fixed-point, and spine-recovery witnesses
- strict / Scott / transfinite / aperiodic regime classifications
- the value-independence witness for shared regime data

This is the smallest example of `V`-parametric settling as a Node surface: bring a value order and closure, check the finite laws, then get witnesses back.

## `examples/optimization-settling.mjs`

Runs the public `@emsenn/relating/settling` optimization surface as a value-category settling problem.
It prints:

- the FOUR seed, target, and optimum
- local optimality and reachability reads
- fixed-point and least-fixed-point witnesses
- the obstruction for a proposed bound that is not fixed

This is the smallest example of optimization as a witnessable fixed-point process rather than a black-box numerical solver.

## `examples/probability-stochastic-settling.mjs`

Runs the public `@emsenn/relating/settling` probability and stochastic-settling surface.
It prints:

- finite sample-space counts for rain and wind events
- measure-as-valuation and conditional-probability witnesses
- reindexing functoriality for conditioning
- a Markov stationary distribution as a stochastic-closure fixed point
- the value-category regime read for the stochastic semiring witness

This is the smallest example of probability as exact finite valuation and stochastic stationarity as a witnessable fixed-point equation.

## `examples/substitution-dynamics.mjs`

Runs the public `@emsenn/relating/dynamics` subpath over the finite substitution-dynamics workbench.
It prints:

- the step-N hierarchy witnesses for a chosen parameter
- Fibonacci and Padovan incidence matrices
- derived characteristic polynomials for the golden-ratio and plastic-number cases
- a primitive-matrix witness and step-N invariant for Fibonacci
- the obstruction when Fibonacci is checked against Padovan's declared polynomial

This is the smallest example of the package's executable aperiodic-settling surface: finite substitution rules and exact invariants, not the whole aperiodic-moduli program.

## `examples/representation-codecs.mjs`

Runs the codec catalog across several boundary forms.
It prints:

- canonical JSON bytes stable across key order
- schema assertion rows folded into a projected JSON Schema document
- markdown frontmatter/body projected to assertions and cells
- Turtle IRI/literal output, HTML escaping, and slug normalization
- radial SVG projection recognized by `radialProjector`

This is the smallest example of the package's representation-boundary product: values cross into bytes, documents, and visuals through explicit codecs.

## `examples/relational-html.mjs`

Runs the RMN executable-document gate from `@emsenn/relating/writing`.
It prints:

- the `rmnProjector` type, corner, and rung
- admission of an HTML document whose only script is `application/rmn+json`
- rejection of an ordinary JavaScript script
- extracted RMN script bodies
- settled normal forms for admitted RMN bodies

This is the smallest example of HTML carrying an RMN morphism body without turning JavaScript into the semantic source.

## `examples/projector-lattice.mjs`

Runs the holography projector kernel over built-in and authored projectors.
It prints:

- the built-in classification of a radial SVG as `svg.radial`
- the entailment chain `svg.radial -> svg.xml -> xml`
- fallback classification for plain SVG and plain XML
- a tiny authored `text.lines -> text.lines.note` restriction
- inherited read/write behavior on the restricted child

This is the smallest example of the representation type lattice: resources are recognized by morphisms, and restriction is a code-level entailment edge.

## `examples/radial-svg-projection.mjs`

Builds a finite FOUR-valued predicate fiber and projects it into SVG through the writing/radial surface.
It prints:

- the input valuation and assignment counts
- radial ring, segment, diagonal, and off-diagonal counts
- SVG byte count and projector recognition
- the FOUR charge palette used for the rendered segments

This is the smallest example of charged relation material becoming a stable visual representation without turning visualization into the package ontology.

## `examples/http-boundary-codecs.mjs`

Runs the public `@emsenn/relating/writing/http` surface across the HTTP-adjacent representation kit.
It prints:

- normalized content type parsing/serialization
- content, encoding, and language negotiation
- cache, entity-tag precondition, and range reads
- request cookies and `Set-Cookie`
- SSE frame parsing and canonical stream headers
- bearer authorization, Link fields, and MCP JSON-RPC envelopes

This is the smallest example of the package's HTTP boundary product: standards grammar as pure values, with live request/response binding left to adapters.

## `examples/running-http-app.mjs`

Runs the service-side `services/http/app` object-language surface without starting a server.
It prints:

- `.well-known` resource count and representation metadata
- topic-filtered SSE projection counts
- manual SSE write results
- a parsed JSON request body from a stream-shaped request

This is the smallest example of the package's HTTP app-boundary product: resources, representations, request decoding, and event projection as ordinary values, with listener lifecycle left outside the package.

## `examples/runtime-transport-work.mjs`

Runs the public `@emsenn/relating/running` transport-work surface.
It prints:

- the four transport kinds and their work-type reads
- the determination charge for each work type
- a bounded claim session moving from one-sided judgement to contested `stable` judgement
- the live session work type dropping from `Derivation` to `Inquiry` once the cell conflicts

This is the smallest example of the runtime boundary reading itself.
It is a finite work-type and claim-session read, not a collaboration server or general workflow runtime.

## `examples/carrier-manifold.mjs`

Builds a tiny carrier-node namespace:

- a source apex falls back to `/maker`
- a widget endomorphism mounts at `/example/carrier-manifold/widget`
- the carrier node projects index, OpenAPI, MCP, and POST dispatch faces

It is the smallest example of package composition by carrier identity rather than controller naming.

## `examples/lean-conformance.mjs`

Reads the committed Lean-emitted fixtures and replays representative rows through the public package API.
It asserts the committed fixture counts and the sampled Lean/RMN/TypeScript agreements before printing:

- fixture counts for FOUR, CHL, domain primitives, and measurement cores
- `potential joinK active = stable` as computed by Lean and Node
- agreement on a CHL development sample
- closure-regime classification through both RMN and TypeScript

It is the smallest example of the package's Lean oracle bridge.

/**
 * @packageDocumentation
 *
 * settling/analysis — analytical reads of settled carriers.
 *
 * Analysis is downstream of settlement: it reads extrema and derived geometry
 * (exact arithmetic, graded sectors, finite relation-graph Laplacians,
 * first-order conservation reads, spectral root structure, differential
 * controls) without defining the primitive carriers it analyzes.
 *
 * The public package handle is `@red-cup-engineering/relating/analysis`. The same namespace
 * is also available from the root import as `analysis`.
 *
 * This surface is carrier-valued and exact. It is useful for reading relation
 * geometry, spectral root-location judgments, harmonic and conservation
 * witness/obstruction data, charged control findings, and evidence
 * distributions after settlement, but it is not a drop-in floating-point
 * numerical library.
 *
 * @example
 * ```js
 * import * as analysis from "@red-cup-engineering/relating/analysis";
 * import { chargeValue } from "@red-cup-engineering/relating";
 *
 * const n = analysis.count(["a", "b", "c"]);
 * n.kind; // "exactNumber.natural"
 *
 * const distribution = analysis.chargeDistribution([
 *   chargeValue("potential"),
 *   chargeValue("active"),
 *   chargeValue("stable"),
 * ]);
 *
 * analysis.evidenceCoordinates(distribution).kind;
 * // "meme-analysis.evidence.coordinates"
 *
 * // `section` is a SectionCarrier from settlement.
 * const graph = analysis.relationGraph(section);
 * analysis.harmonic(graph, [analysis.ratZero, analysis.ratZero]).kind;
 * // "meme-analysis.laplacian.harmonic:witness"
 *
 * // `matrix` is an exact integer Matrix.
 * analysis.pisotRoot(analysis.charPoly(matrix)).kind;
 * // "spectral.pisotRoot:witness"
 *
 * const network = analysis.conservation.flowNetwork(section);
 * analysis.conservation.conserved(network, network.edges.map(() => analysis.ratZero)).kind;
 * // "meme-analysis.conservation.conserved:witness"
 * ```
 */
export * from "./exact-number.mjs";
export * from "./graded.mjs";
export * from "./spectral.mjs";
export * from "./laplacian.mjs";
export * from "./information.mjs";
export * from "./coloring.mjs";
export * as formatsFour from "./formats-four.mjs";
export * from "./evidence.mjs";
export * as causal from "./causal.mjs";
export * as causalInvolutivity from "./causal-involutivity.mjs";
export * as causalManifoldlikeness from "./causal-manifoldlikeness.mjs";
export * as causalMicrosupport from "./causal-microsupport.mjs";
export * as causalMldClassification from "./causal-mld-classification.mjs";
export * as causalPolarization from "./causal-polarization.mjs";
export * as chromaticLorentzian from "./chromatic-lorentzian.mjs";
export * as collatz from "./collatz.mjs";
export * as continuumColimit from "./continuum-colimit.mjs";
export * as dFrame from "./d-frame.mjs";
export * as flow from "./flow.mjs";
export * as glassOverlap from "./glass-overlap.mjs";
export * as hauptvermutung from "./hauptvermutung.mjs";
export * as inconsistencySheaf from "./inconsistency-sheaf.mjs";
export * as internalReal from "./internal-real.mjs";
export * as inverseHull from "./inverse-hull.mjs";
export * as knasterTarski from "./knaster-tarski.mjs";
export * as laxSlack from "./lax-slack.mjs";
export * as linearAlgebra from "./linear-algebra.mjs";
export * as matterTopology from "./matter-topology.mjs";
export * as closureRule from "./closure-rule-system.mjs";
export * as discrete from "./discrete-set-number-graph.mjs";
export * as fcaLambek from "./fca-lambek-circle.mjs";
export * as lambek from "./lambek-calculus.mjs";
export * as numberTheory from "./number-theory.mjs";
export * as orderInfra from "./order-infra.mjs";
export * as ordinalClosure from "./ordinal-closure.mjs";
export * as portGraph from "./port-graph.mjs";
export * as regimeTimeSection from "./regime-time-section.mjs";
export * as scottCoalgebra from "./scott-coalgebra.mjs";
export * as residuatedLattice from "./residuated-lattice.mjs";
export * as settlingLocalConstancy from "./settling-local-constancy.mjs";
export * as transfiniteCellComplex from "./transfinite-cell-complex.mjs";
export * as sofic from "./sofic.mjs";
export * as twistProduct from "./twist-product.mjs";
export * as verificationTournament from "./verification-tournament.mjs";
export * as algebraHierarchy from "./algebra-hierarchy.mjs";
export * as aperiodicAutocorrelation from "./aperiodic-autocorrelation.mjs";
export * as aperiodicClassification from "./aperiodic-classification.mjs";
export * as bitopologicalSettlingSite from "./bitopological-settling-site.mjs";
export * as weaveDraft from "./weave-draft.mjs";
export * as coordinationCohomology from "./coordination-cohomology.mjs";
export * as frobeniusTqft from "./frobenius-tqft.mjs";
export * as jeandelRaoWitness from "./jeandel-rao-witness.mjs";
export * as pairwiseStoneClopen from "./pairwise-stone-clopen.mjs";
export * as persistentH0 from "./persistent-h0.mjs";
export * as settlingAssociatedSheaf from "./settling-associated-sheaf.mjs";
export * as settlingCohomologyH1 from "./settling-cohomology-h1.mjs";
export * as negativeParaconsistentSheaf from "./negative-paraconsistent-sheaf.mjs";
export * as quantaleEnrichedSheaf from "./quantale-enriched-sheaf.mjs";
export * as alexandrovHusainov from "./alexandrov-husainov.mjs";
export * as crdtCalm from "./crdt-cohomological-calm.mjs";
export * as kzCoherentSheaf from "./kz-coherent-sheaf.mjs";
export * as lawvereHarmonicCohomology from "./lawvere-harmonic-cohomology.mjs";
export * as bigradedDiamond from "./bigraded-diamond.mjs";
export * as bigradedCohomology from "./bigraded-cohomology.mjs";
export * as arithmetic from "./arithmetic.mjs";
export * as differential from "./differential.mjs";
export * as conservation from "./conservation.mjs";

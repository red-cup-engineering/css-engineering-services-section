/**
 * evaluating/measuring/laplacian - RMN normalizers for exact finite
 * relation-graph Laplacian carriers.
 *
 * Lean owns the abstract Lawvere harmonic-cohomology and spectral-gap proofs.
 * The Node surface carries finite relation graphs, exact Laplacian matrices,
 * harmonic witness/obstruction receipts, Matrix-Tree/Hodge reads, signed
 * balance, and diffusion directions as serializable evidence.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";
import { objectTerm, stringTerm } from "../projecting/index.mjs";

const field = (key: string): Tm => tm.field(key, tm.var(0));

/** Normalize finite relation-graph carriers. */
export const relationGraphTerm: Tm = tm.lam(objectTerm([
  ["kind", stringTerm("meme-analysis.laplacian.graph")],
  ["terms", field("terms")],
  ["weights", field("weights")],
]));

/** Normalize exact combinatorial Laplacian matrices. */
export const laplacianMatrixTerm: Tm = tm.lam(tm.var(0));

/** Normalize exact Laplacian characteristic-polynomial carriers. */
export const spectrumPolynomialTerm: Tm = tm.lam(tm.var(0));

const harmonicWitness = objectTerm([
  ["graph", field("graph")],
  ["kind", stringTerm("meme-analysis.laplacian.harmonic:witness")],
  ["values", field("values")],
]);

const harmonicObstruction = objectTerm([
  ["atTerm", field("atTerm")],
  ["deviation", field("deviation")],
  ["graph", field("graph")],
  ["kind", stringTerm("meme-analysis.laplacian.harmonic-obstruction")],
  ["values", field("values")],
]);

/** Normalize exact harmonic witness/obstruction carriers. */
export const harmonicTerm: Tm = tm.lam(
  tm.cond(
    tm.coincide(field("kind"), stringTerm("meme-analysis.laplacian.harmonic:witness")),
    harmonicWitness,
    harmonicObstruction,
  ),
);

/** Normalize finite Hodge-decomposition carriers. */
export const hodgeDecompositionTerm: Tm = tm.lam(objectTerm([
  ["edges", field("edges")],
  ["exact", field("exact")],
  ["harmonic", field("harmonic")],
  ["kind", stringTerm("meme-analysis.laplacian.hodge")],
]));

/** Normalize finite graph-spectrum carriers. */
export const graphSpectrumTerm: Tm = tm.lam(objectTerm([
  ["components", field("components")],
  ["kind", stringTerm("meme-analysis.laplacian.spectrum")],
  ["spanningTrees", field("spanningTrees")],
]));

/** Normalize finite signed-balance carriers. */
export const signedBalanceTerm: Tm = tm.lam(objectTerm([
  ["balanced", field("balanced")],
  ["frustration", field("frustration")],
  ["kind", stringTerm("meme-analysis.laplacian.signed-balance")],
]));

/** Normalize exact finite diffusion-direction arrays. */
export const diffusionDirectionsTerm: Tm = tm.lam(tm.var(0));

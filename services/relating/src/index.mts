/**
 * @packageDocumentation
 *
 * @red-cup-engineering/relating - the relational substrate as one boundary system.
 *
 * The root surface is the ordinary public API for the relating category. It
 * rolls up the material carrier law, package-phase carrier/action machinery,
 * RMN evaluator catalogs, JSON boundary helpers, and action apex projections
 * that downstream faculties depend on. More specialized consumers can still use
 * the structured subpaths (`/carriers`, `/running`, `/writing`, `/analysis`, ...),
 * but the root remains the stable carrier/action surface.
 */

import {
  intentOfExtentTerm,
  extentOfIntentTerm,
  closeExtentTerm,
  isConceptPairTerm,
  formalConceptTerm,
} from "./evaluating/connecting/index.mjs";
import {
  chuDualTerm,
  chuLookupTerm,
  chuDualInvolutionTerm,
} from "./evaluating/pairing/index.mjs";
import {
  classifyRegimeTerm,
  cohomologyVanishesInRegimeTerm,
  measureIsValuationTerm,
  conditionalViaFiberAdjointTerm,
  markovStationaryIsClosureFixpointTerm,
  stochasticIsValueSettlingTerm,
  realUnitIntervalValueCategoryTerm,
  expectationLawsTerm,
  detailedBalanceImpliesStationaryTerm,
  poissonSettlingTerm,
  rankVanishingTerm,
  rankIdentityTerm,
  rankComparisonTerm,
  cohomologyCarrierTerm,
  cohomologyLaplacianTerm,
  bigradedCohomologyTerm,
  settlingFirstCohomologyTerm,
} from "./evaluating/measuring/index.mjs";

export * from "../lib/articulating/index.mjs";
export * from "../lib/articulating/predicating/index.mjs";
export * from "../lib/articulating/predicating/positing/index.mjs";
export * from "../lib/articulating/predicating/positing/settling/index.mjs";
export * from "../lib/articulating/predicating/positing/settling/analysis/index.mjs";
export * from "../lib/notating/index.mjs";

export * from "./carriers/index.mjs";
export * from "./actions/index.mjs";
export * from "./running/index.mjs";
export * from "./projections/index.mjs";
export * from "./ledger/index.mjs";
export * from "./evaluating/index.mjs";
export * from "./evaluating/projecting/index.mjs";
export * from "./evaluating/descending/index.mjs";
export * from "./evaluating/counting/index.mjs";
export * from "./evaluating/measuring/index.mjs";
export * from "./evaluating/connecting/index.mjs";
export * from "./evaluating/pairing/index.mjs";
export * from "./codecs/text/json/core.mjs";
export { parse as parseJson } from "./codecs/text/json/core.mjs";
// Former TypeBox-authored clients named the same schema-to-carrier functor
// `carrier`; retain that address while the one implementation remains
// `carrierFrom` in the carrier kernel.

export { Claim, claim } from "../lib/articulating/index.mjs";
export { cell, cohere } from "../lib/articulating/predicating/index.mjs";
export { bigradedCohomology, divides, settle } from "../lib/articulating/predicating/positing/settling/index.mjs";

export * as analysis from "../lib/articulating/predicating/positing/settling/analysis/index.mjs";
export * as geometry from "../lib/articulating/predicating/geometry/index.mjs";
export * as settling from "../lib/articulating/predicating/positing/settling/index.mjs";
export * as notating from "../lib/notating/index.mjs";
export * as carriers from "./carriers/index.mjs";
export * as running from "./running/index.mjs";
export * as projections from "./projections/index.mjs";
export * as writing from "./writing/index.mjs";
export * as codecs from "./codecs/index.mjs";
export * as ledger from "./ledger/index.mjs";

export const measurement = Object.freeze({
  classifyRegime: classifyRegimeTerm,
  cohomologyVanishesInRegime: cohomologyVanishesInRegimeTerm,
});

export const probability = Object.freeze({
  measureIsValuation: measureIsValuationTerm,
  conditionalViaFiberAdjoint: conditionalViaFiberAdjointTerm,
  markovStationaryIsClosureFixpoint: markovStationaryIsClosureFixpointTerm,
  stochasticIsValueSettling: stochasticIsValueSettlingTerm,
  realUnitIntervalValueCategory: realUnitIntervalValueCategoryTerm,
  expectationLaws: expectationLawsTerm,
  detailedBalanceImpliesStationary: detailedBalanceImpliesStationaryTerm,
  poissonSettling: poissonSettlingTerm,
});

export const cohomologyTerms = Object.freeze({
  rankVanishing: rankVanishingTerm,
  rankIdentity: rankIdentityTerm,
  rankComparison: rankComparisonTerm,
  carrier: cohomologyCarrierTerm,
  laplacian: cohomologyLaplacianTerm,
  bigraded: bigradedCohomologyTerm,
  settlingFirst: settlingFirstCohomologyTerm,
});

export const fca = Object.freeze({
  intentOfExtent: intentOfExtentTerm,
  extentOfIntent: extentOfIntentTerm,
  closeExtent: closeExtentTerm,
  isConceptPair: isConceptPairTerm,
  formalConcept: formalConceptTerm,
});

export const chu = Object.freeze({
  dual: chuDualTerm,
  lookup: chuLookupTerm,
  dualInvolution: chuDualInvolutionTerm,
});

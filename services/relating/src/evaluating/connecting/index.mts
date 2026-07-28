/**
 * @packageDocumentation
 *
 * Formal Concept Analysis terms as the `connecting` evaluator subpath.
 *
 * This module exports the RMN bodies behind the root `fca` catalog. Use the
 * root catalog for everyday application code, or this subpath when a downstream
 * package wants the explicit Galois-connection operators without importing the
 * rest of the root surface.
 *
 * The terms operate on predication-cell-shaped carriers where `I(subject,
 * predicate)` is true when a cell with that subject and predicate appears in
 * `cells`. They compute the finite Node encoding of the Boolean FCA derivation
 * pair proven in `RelMath.Order.FormalConceptAnalysis`.
 *
 * @example
 * ```js
 * import {
 *   formalConceptTerm,
 *   intentOfExtentTerm,
 * } from "@red-cup-engineering/relating/evaluating/connecting";
 * import { evaluateRunTerm } from "@red-cup-engineering/relating";
 *
 * const cells = [
 *   { subject: "alpha", predicate: "warm" },
 *   { subject: "alpha", predicate: "bright" },
 *   { subject: "beta", predicate: "warm" },
 * ];
 *
 * evaluateRunTerm(intentOfExtentTerm, {
 *   cells,
 *   extent: ["alpha", "beta"],
 * }); // ["warm"]
 *
 * evaluateRunTerm(formalConceptTerm, {
 *   cells,
 *   extent: ["alpha", "beta"],
 * });
 * // { extent: ["alpha", "beta"], intent: ["warm"], kind: "predication.fca.concept" }
 * ```
 */
export {
  intentOfExtentTerm,
  extentOfIntentTerm,
  closeExtentTerm,
  isConceptPairTerm,
  formalConceptTerm,
} from "./formal-concept.mjs";

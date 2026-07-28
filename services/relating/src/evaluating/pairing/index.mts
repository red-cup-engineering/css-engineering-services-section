/**
 * @packageDocumentation
 *
 * Finite Chu pairing terms as the `pairing` evaluator subpath.
 *
 * This module exports the RMN bodies behind the root `chu` catalog. Use the root
 * catalog for ordinary application code, or this subpath when a downstream
 * package wants the explicit finite Chu-space operators without the rest of the
 * root API.
 *
 * A Node-side space is encoded as `{ pts, r, sts }`, where `r` is a flat array of
 * `{ pt, st, charge }` entries over the FOUR charge names. The terms implement
 * the finite encoded dual, lookup, and double-dual witness grounded in
 * `RelMath.Order.LinearLogicChu`; they do not implement the full Chu transform
 * category.
 *
 * @example
 * ```js
 * import {
 *   chuDualInvolutionTerm,
 *   chuDualTerm,
 *   chuLookupTerm,
 * } from "@red-cup-engineering/relating/evaluating/pairing";
 * import { evaluateRunTerm } from "@red-cup-engineering/relating";
 *
 * const space = {
 *   pts: ["a"],
 *   sts: ["x"],
 *   r: [{ pt: "a", st: "x", charge: "active" }],
 * };
 *
 * evaluateRunTerm(chuDualTerm, space);
 * // { pts: ["x"], sts: ["a"], r: [{ pt: "x", st: "a", charge: "potential" }] }
 *
 * evaluateRunTerm(chuLookupTerm, { space, pt: "a", st: "x" }); // "active"
 * evaluateRunTerm(chuDualInvolutionTerm, space); // true
 * ```
 */
export { chuDualTerm, chuLookupTerm, chuDualInvolutionTerm } from "./chu.mjs";

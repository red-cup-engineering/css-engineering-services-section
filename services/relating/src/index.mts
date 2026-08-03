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

export * from "@lenticule-science/articulating/index";
export * from "@lenticule-science/articulating/predicating/index";
export * from "@lenticule-science/articulating/predicating/positing/index";
export * from "@lenticule-science/articulating/predicating/positing/settling/index";
export * from "@lenticule-science/articulating/predicating/positing/settling/analysis/index";
export * from "./carriers/index.mjs";
export * from "./running/index.mjs";
export * from "./projections/index.mjs";
export * from "./ledger/index.mjs";
export * from "@red-cup-engineering/json-file-codec-service";
export { parse as parseJson } from "@red-cup-engineering/json-file-codec-service";
// RMN program execution remains a real boundary operation. Export the current
// evaluator directly; the retired local evaluator/catalog is not recreated.
export { evaluateRunTerm } from "@red-cup-engineering/relation-model-notation-eval";
export { tm } from "@red-cup-engineering/relation-model-notation";
// Former TypeBox-authored clients named the same schema-to-carrier functor
// `carrier`; retain that address while the one implementation remains
// `carrierFrom` in the carrier kernel.

export { Claim, claim } from "@lenticule-science/articulating/index";
export { cell, cohere } from "@lenticule-science/articulating/predicating/index";
export { bigradedCohomology, divides } from "@lenticule-science/articulating/predicating/positing/settling/index";

export * as analysis from "@lenticule-science/articulating/predicating/positing/settling/analysis/index";
export * as geometry from "@lenticule-science/articulating/predicating/geometry/index";
export * as settling from "@lenticule-science/articulating/predicating/positing/settling/index";
export * as notating from "@red-cup-engineering/relation-model-notation";
export * as evaluating from "@red-cup-engineering/relation-model-notation-eval";
export * as typing from "@red-cup-engineering/relation-model-notation-typing";
export * as carriers from "./carriers/index.mjs";
export * as running from "./running/index.mjs";
export * as projections from "./projections/index.mjs";
export * as writing from "./writing/index.mjs";
export * as codecs from "./codecs/index.mjs";
export * as ledger from "./ledger/index.mjs";

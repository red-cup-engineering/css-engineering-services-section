// @red-cup-engineering/relating/evaluating — compatibility shim.
//
// The CHL reduction engine and bidirectional type checker (step/dev/evaluate,
// hasTy/checkTy/inferTy, evaluateRunTerm) have moved to
// @red-cup-engineering/relation-term-reduction-and-typing, under
// semiotic-software-services-section/relation-model-notation-services-section.
// This file re-exports it unchanged so existing consumers of
// `@red-cup-engineering/relating/evaluating` keep working without edits.
export * from "@red-cup-engineering/relation-term-reduction-and-typing";

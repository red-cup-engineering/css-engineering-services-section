// @red-cup-engineering/relating/notating — compatibility shim.
//
// The Relation Model Notation grammar this package uses (Tm/Ty, tm/ty, rename/
// subst/inst) has moved to @red-cup-engineering/relation-term-reduction-and-typing,
// under semiotic-software-services-section/relation-model-notation-services-section.
// This file re-exports it unchanged so existing consumers of
// `@red-cup-engineering/relating/notating` keep working without edits.
export * from "@red-cup-engineering/relation-term-reduction-and-typing/notation";

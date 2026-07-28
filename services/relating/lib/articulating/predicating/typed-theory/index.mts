/**
 * predicating/typed-theory - finite consequence over predication base objects.
 *
 * Predicating generates an oriented category from cells, converse, subject and
 * object projections, and specialization. This module is the package's finite
 * consequence reader over that generated base: it turns predication data into a
 * `TypedTheoryCarrier`, derives inference rules, closes those rules under
 * composition, searches for derivations, and returns witness/obstruction-shaped
 * typing judgments.
 *
 * The word "typing" here is deliberately local. `typing(theory, premise,
 * conclusion)` means "is this conclusion derivable from this premise inside this
 * finite predication theory?" It is not the CHL term calculus typechecker and it
 * is not a general theorem prover. The premise and conclusion are predication
 * base objects: terms, predicates, oriented cells, and generated base nodes.
 *
 * The predicate-word helpers expose the same finite idea at the path level:
 * atomic predicate arrows compose into saturated predicate words, and
 * `predicateWordResidue` reports what composite words remain after saturation.
 *
 * This surface mirrors the `RelMath.Predicating` generator vocabulary while
 * staying on the Node side as carrier-shaped, inspectable data: inference
 * morphism names, traces, derivations, closure ranks, and explicit search
 * frontiers.
 *
 * @packageDocumentation
 */
export * from "./typed-theory.mjs";

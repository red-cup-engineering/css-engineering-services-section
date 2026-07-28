/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/relating/evaluating/counting` exports von Neumann naturals as RMN
 * terms.
 *
 * A relating Natural is the von Neumann ordinal `{ kind: "exactNumber.natural",
 * members: [naturals below it] }`. These rebuild relating's exact-number
 * serialization, differential-checked against `analysis.count`/`successor`.
 *
 * Product reading: exact natural-number construction is available as portable
 * term data. Counting can therefore appear inside reader terms and action
 * bodies without becoming an opaque TypeScript helper.
 */
import { tm } from "../../../lib/notating/index.mjs";
import { objectTerm, arrayTerm, stringTerm } from "../projecting/index.mjs";

/** The von Neumann zero `{ kind: "exactNumber.natural", members: [] }`. */
export const natZeroTerm = objectTerm([
  ["kind", stringTerm("exactNumber.natural")],
  ["members", arrayTerm([])],
]);

/** The von Neumann successor `n ↦ n ∪ {n}`, as a term over a natural-term `n`. */
export function successorTerm(n: import("../../../lib/notating/index.mjs").Tm) {
  return objectTerm([
    ["kind", stringTerm("exactNumber.natural")],
    ["members", tm.append(tm.field("members", n), arrayTerm([n]))],
  ]);
}

/** `count`: the natural whose value is a list's length — `fold (λacc.λ_. succ acc) 0`. */
export const countTerm = tm.lam(
  tm.fold(
    tm.lam(tm.lam(successorTerm(tm.var(1)))),
    natZeroTerm,
    tm.var(0),
  ),
);

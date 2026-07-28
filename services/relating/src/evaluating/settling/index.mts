/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/relating/evaluating/settling` exports the free settling construction
 * as RMN terms.
 *
 * `freeTerm` materializes the full settled object from filtration generators:
 * a single initial stage at countable cofinality. `cellSetOf` and `zeroStageOrdinalTerm`
 * are exported for the reading sub-module, which composes them into the reader terms.
 *
 * Product reading: settlement generators can be materialized inside the term
 * calculus before reader terms inspect them. This keeps finite settlement reads
 * portable without claiming this module is a general transfinite closure engine.
 */
import { type Tm, tm } from "../../../lib/notating/index.mjs";
import { objectTerm, arrayTerm, stringTerm } from "../projecting/index.mjs";

// ── generic list combinators ──────────────────────────────────────────────────

const boolFalse: Tm = tm.bool(false);
const boolTrue: Tm = tm.bool(true);

/** `member x list` — whether any element of an array term coincides with `x`. */
const memberTerm: Tm = tm.lam(tm.lam(
  tm.fold(
    tm.lam(tm.lam(
      tm.cond(tm.var(1), boolTrue, tm.coincide(tm.var(3), tm.var(0))),
    )),
    boolFalse,
    tm.var(0),
  ),
));

/** `dedup list` — array term with coincidence-duplicates removed, order preserved. */
export const dedupTerm: Tm = tm.lam(
  tm.fold(
    tm.lam(tm.lam(
      tm.cond(
        tm.app(tm.app(memberTerm, tm.var(0)), tm.var(1)),
        tm.var(1),
        tm.append(tm.var(1), arrayTerm([tm.var(0)])),
      ),
    )),
    arrayTerm([]),
    tm.var(0),
  ),
);

/** `subjectsAndObjects cells` — flat list of every cell's subject then object. */
const subjectObjectListTerm: Tm = tm.lam(
  tm.fold(
    tm.lam(tm.lam(
      tm.append(tm.var(1), arrayTerm([tm.field("subject", tm.var(0)), tm.field("object", tm.var(0))])),
    )),
    arrayTerm([]),
    tm.var(0),
  ),
);

/** `predicates cells` — list of every cell's predicate. */
const predicateListTerm: Tm = tm.lam(
  tm.fold(
    tm.lam(tm.lam(
      tm.append(tm.var(1), arrayTerm([tm.field("predicate", tm.var(0))])),
    )),
    arrayTerm([]),
    tm.var(0),
  ),
);

// ── exported settlement primitives ────────────────────────────────────────────

/** The zero settling-stage ordinal carrier. */
export const zeroStageOrdinalTerm: Tm = objectTerm([
  ["kind", stringTerm("predication.settling.stageOrdinal")],
  ["ordinal", objectTerm([["kind", stringTerm("ordinal.closure.ordinal.zero")]])],
]);

/** `cellSet cells` — the designated cell set: deduped cells with derived entity/predicate sets. */
export function cellSetOf(cells: Tm): Tm {
  return objectTerm([
    ["kind", stringTerm("predication.cellSet")],
    ["cells", tm.app(dedupTerm, cells)],
    ["entities", objectTerm([
      ["kind", stringTerm("predication.entitySet")],
      ["entities", tm.app(dedupTerm, tm.app(subjectObjectListTerm, cells))],
    ])],
    ["predicates", objectTerm([
      ["kind", stringTerm("predication.predicateSet")],
      ["predicates", tm.app(dedupTerm, tm.app(predicateListTerm, cells))],
    ])],
  ]);
}

// ── the free settling construction ───────────────────────────────────────────

/** The filtration generators (var 0) → the single initial stage at countable cofinality. */
export const freeTerm: Tm = (() => {
  const cells = tm.field("cells", tm.var(0));
  const stage = objectTerm([
    ["kind", stringTerm("predication.settling.stage")],
    ["ordinal", zeroStageOrdinalTerm],
    ["shape", objectTerm([
      ["kind", stringTerm("predication.settling.stage.initial")],
      ["ordinal", zeroStageOrdinalTerm],
    ])],
    ["designated", cellSetOf(cells)],
  ]);
  return tm.lam(objectTerm([
    ["kind", stringTerm("predication.settlement.filtration")],
    ["stages", arrayTerm([stage])],
    ["cofinality", objectTerm([["kind", stringTerm("predication.settling.cofinality.countable")]])],
  ]));
})();

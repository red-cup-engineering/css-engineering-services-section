/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/relating/evaluating/descending` exports the relating descent
 * morphisms as RMN terms.
 *
 * Each term is a closed lambda that faithfully rebuilds exactly what the
 * corresponding TS function produces, differential-checked byte-identical.
 * Together they form the SDK for expressing the relational descent in the calculus:
 *
 *   articulate       Utterance → ArticulationCell
 *   predicate        ArticulationCell → PredicationSite generators
 *   posit            PredicationSite → PositPresheaf generators (re-tag)
 *   settle           PositPresheaf → SettlementFiltration generators (re-tag)
 *   induceRelation   settle ∘ posit ∘ predicate ∘ articulate (one composed term)
 *   relateRelations  monoid union of two filtrations' generator arrays
 *   coincide         { left, right } → token coincidence judgment
 *
 * Product reading: the core descent is not only a TypeScript pipeline. It is
 * also a portable term catalog, so the same relation-building spine can be
 * inspected, transported, audited, and replayed as data.
 */
import { tm } from "../../../lib/notating/index.mjs";
import { objectTerm, arrayTerm, stringTerm } from "../projecting/index.mjs";

/** Build the initial articulation cell for one utterance carrier. */
export const articulateTerm = tm.lam(
  objectTerm([
    ["kind", stringTerm("utterance.articulation.cell")],
    [
      "potentialAperiodicArticulationCell",
      arrayTerm([tm.var(0), arrayTerm([arrayTerm([]), arrayTerm([])])]),
    ],
  ]),
);

/** Read an articulation cell into the generator-only predication site used by the descent. */
export const predicateTerm = (() => {
  const input = tm.var(0);
  const carrier = tm.fst(tm.snd(tm.field("potentialAperiodicArticulationCell", input)));
  const token = tm.field("token", carrier);
  const claim = tm.field("claim", carrier);
  const predicateObject = objectTerm([
    ["kind", stringTerm("predication.predicate")],
    ["claim", claim],
    ["mark", tm.field("mark", claim)],
  ]);
  const cellObject = objectTerm([
    ["subject", token],
    ["predicate", predicateObject],
    ["object", token],
  ]);
  return tm.lam(
    objectTerm([
      ["kind", stringTerm("predication.site")],
      ["cells", arrayTerm([cellObject])],
      ["specializations", arrayTerm([])],
    ]),
  );
})();

/** Retag a predication-site generator carrier as the corresponding posit-presheaf generator carrier. */
export const positTerm = tm.lam(
  objectTerm([
    ["kind", stringTerm("predication.posit.presheaf")],
    ["cells", tm.field("cells", tm.var(0))],
    ["specializations", tm.field("specializations", tm.var(0))],
  ]),
);

/** Retag a posit-presheaf generator carrier as the slim settlement-filtration generator carrier. */
export const settleTerm = tm.lam(
  objectTerm([
    ["kind", stringTerm("predication.settlement.filtration")],
    ["cells", tm.field("cells", tm.var(0))],
    ["specializations", tm.field("specializations", tm.var(0))],
  ]),
);

/** The full descent settle ∘ posit ∘ predicate ∘ articulate as ONE composed IR term. */
export const induceRelationTerm = tm.lam(
  tm.app(settleTerm, tm.app(positTerm, tm.app(predicateTerm, tm.app(articulateTerm, tm.var(0))))),
);

/** Monoid union of two relations' generators (associative): append their cell and specialization arrays. */
export const relateRelationsTerm = tm.lam(
  objectTerm([
    ["kind", stringTerm("predication.settlement.filtration")],
    ["cells", tm.append(
      tm.field("cells", tm.field("left", tm.var(0))),
      tm.field("cells", tm.field("right", tm.var(0))),
    )],
    ["specializations", tm.append(
      tm.field("specializations", tm.field("left", tm.var(0))),
      tm.field("specializations", tm.field("right", tm.var(0))),
    )],
  ]),
);

/** Token coincidence judgment: `{ left, right }` → witness or obstruction. */
export const coincideTerm = (() => {
  const input = tm.var(0);
  const leftPayload = tm.field("left", input);
  const rightPayload = tm.field("right", input);
  const tokenOf = (payload: import("../../../lib/notating/index.mjs").Tm) => objectTerm([
    ["kind", stringTerm("utterance.token")],
    ["hand", stringTerm("left")],
    ["mark", objectTerm([["kind", stringTerm("utterance.mark")], ["value", payload]])],
  ]);
  const judgment = (kind: string) => objectTerm([
    ["kind", stringTerm(kind)],
    ["left", tokenOf(leftPayload)],
    ["right", tokenOf(rightPayload)],
  ]);
  return tm.lam(tm.cond(
    tm.coincide(leftPayload, rightPayload),
    judgment("utterance.coincidence:witness"),
    judgment("utterance.coincidence-obstruction"),
  ));
})();

/**
 * evaluating/connecting/formal-concept — Formal Concept Analysis operators as RMN terms.
 *
 * Implements the Galois connection proven in RelMath.Order.FormalConceptAnalysis:
 *
 *   primeA I A = intentOfExtent  (attributes shared by ALL objects in extent A)
 *   primeB I B = extentOfIntent  (objects that bear ALL attributes in intent B)
 *   closeA A   = closeExtent     (B∘A: the FCA closure operator on extents —
 *                                  extensive, monotone, idempotent by RelMath.FCA)
 *
 * The incidence relation I over the predication model: I(subject, predicate) holds
 * iff there exists a cell with that subject and predicate. Objects (G) are subjects
 * in cells; attributes (M) are predicates in cells.
 *
 * These terms are closed RMN lambdas executed by the same CHL.step / CHL.dev
 * reduction engine as the rest of the package. The Lean grounding here is the
 * abstract Boolean FCA law; the Node surface currently has executable contract
 * tests rather than a dedicated Lean-emitted fixture set.
 *
 * RelMath theorems grounded here:
 *   RelMath.FCA.primeA_antitone         (primeA is antitone)
 *   RelMath.FCA.primeB_antitone         (primeB is antitone)
 *   RelMath.FCA.galois_connection       (primeA ⊣ primeB as a Galois connection)
 *   RelMath.FCA.closeA_closure          (closeA is a closure operator)
 *   RelMath.FCA.primeA_primeB_primeA    (A′ = A‴ cancellation)
 */
import { type Tm, tm } from "../../../lib/notating/index.mjs";
import { arrayTerm, stringTerm, objectTerm } from "../projecting/index.mjs";
import { dedupTerm } from "../settling/index.mjs";

const boolFalse: Tm = tm.bool(false);
const boolTrue: Tm = tm.bool(true);

// ── incidence check ───────────────────────────────────────────────────────────

/**
 * `anyMatchTerm`: λcells. λsubject. λpredicate.
 *
 * True if ANY cell in cells has the given subject AND predicate (structural
 * coincidence). Implements the incidence check `I(subject, predicate)` over
 * the predication-cell encoding.
 *
 * De Bruijn at fold combinator depth (5 lambdas deep):
 *   var(0)=cell, var(1)=found, var(2)=predicate, var(3)=subject, var(4)=cells
 */
const anyMatchTerm: Tm = tm.lam(tm.lam(tm.lam(  // cells=var(2), subject=var(1), predicate=var(0)
  tm.fold(
    tm.lam(tm.lam(  // found=var(1), cell=var(0) [+2: predicate=var(2), subject=var(3), cells=var(4)]
      tm.cond(
        tm.var(1),  // found — short-circuit
        boolTrue,
        tm.cond(
          tm.coincide(tm.field("subject", tm.var(0)), tm.var(3)),    // cell.subject == subject
          tm.coincide(tm.field("predicate", tm.var(0)), tm.var(2)),  // cell.predicate == predicate
          boolFalse
        )
      )
    )),
    boolFalse,
    tm.var(2),  // cells (3 lambdas deep: var(2)=cells)
  )
)));

// ── universal quantifications ─────────────────────────────────────────────────

/**
 * `allExtentHavePredicateTerm`: λcells. λextent. λpredicate.
 *
 * True iff for ALL subjects s in extent, I(s, predicate) holds — i.e. every
 * object in the extent bears this attribute. Used as the filter for `primeA`.
 *
 * Vacuously true for the empty extent (fold initial value = true).
 *
 * De Bruijn at combinator depth (5 lambdas deep):
 *   var(0)=subject, var(1)=allHave, var(2)=predicate, var(3)=extent, var(4)=cells
 */
const allExtentHavePredicateTerm: Tm = tm.lam(tm.lam(tm.lam(  // cells=var(2), extent=var(1), predicate=var(0)
  tm.fold(
    tm.lam(tm.lam(  // allHave=var(1), subject=var(0) [+2: predicate=var(2), extent=var(3), cells=var(4)]
      tm.cond(
        tm.var(1),  // allHave so far
        tm.app(tm.app(tm.app(anyMatchTerm, tm.var(4)), tm.var(0)), tm.var(2)),  // anyMatch(cells)(subject)(predicate)
        boolFalse   // already failed — stay false
      )
    )),
    boolTrue,   // vacuously: all subjects qualify for the empty extent
    tm.var(1),  // extent (3 lambdas deep: var(1)=extent)
  )
)));

/**
 * `allIntentFoundInSubjectTerm`: λcells. λintent. λsubject.
 *
 * True iff for ALL predicates p in intent, I(subject, p) holds — i.e. this
 * object bears every attribute in the intent. Used as the filter for `primeB`.
 *
 * Vacuously true for the empty intent.
 *
 * De Bruijn at combinator depth (5 lambdas deep):
 *   var(0)=predicate, var(1)=allHave, var(2)=subject, var(3)=intent, var(4)=cells
 */
const allIntentFoundInSubjectTerm: Tm = tm.lam(tm.lam(tm.lam(  // cells=var(2), intent=var(1), subject=var(0)
  tm.fold(
    tm.lam(tm.lam(  // allHave=var(1), predicate=var(0) [+2: subject=var(2), intent=var(3), cells=var(4)]
      tm.cond(
        tm.var(1),  // allHave so far
        tm.app(tm.app(tm.app(anyMatchTerm, tm.var(4)), tm.var(2)), tm.var(0)),  // anyMatch(cells)(subject)(predicate)
        boolFalse
      )
    )),
    boolTrue,   // vacuously: subject qualifies for the empty intent
    tm.var(1),  // intent (3 lambdas deep: var(1)=intent)
  )
)));

// ── FCA derivation operators (primeA, primeB) ─────────────────────────────────

/**
 * `intentOfExtentTerm` — RelMath.FCA.primeA I A.
 *
 * Takes `{ cells, extent }` and returns the set of predicates shared by ALL
 * subjects in extent: `{ p | ∀ s ∈ extent, I(s, p) }`.
 *
 * Collects all predicates from cells (deduplicated), filters to those where
 * `allExtentHavePredicate(cells)(extent)(p)` holds.
 *
 * Grounded in: RelMath.FCA.primeA_antitone, RelMath.FCA.galois_connection.
 *
 * @example
 * ```js
 * import { evaluateRunTerm, fca } from "@red-cup-engineering/relating";
 *
 * const cells = [
 *   { subject: "alpha", predicate: "warm" },
 *   { subject: "alpha", predicate: "bright" },
 *   { subject: "beta", predicate: "warm" },
 * ];
 *
 * evaluateRunTerm(fca.intentOfExtent, {
 *   cells,
 *   extent: ["alpha", "beta"],
 * }); // ["warm"]
 * ```
 */
export const intentOfExtentTerm: Tm = tm.lam(  // input={cells, extent}=var(0)
  tm.fold(
    // Main combinator: acc=var(1), pred=var(0) [+2: input=var(2)]
    tm.lam(tm.lam(
      tm.cond(
        tm.app(
          tm.app(
            tm.app(allExtentHavePredicateTerm, tm.field("cells", tm.var(2))),
            tm.field("extent", tm.var(2))
          ),
          tm.var(0),  // candidate predicate
        ),
        tm.append(tm.var(1), arrayTerm([tm.var(0)])),  // include in intent
        tm.var(1),                                      // skip
      )
    )),
    arrayTerm([]),  // initial: empty intent
    // List: all predicates from cells, deduplicated (at depth 1, input=var(0))
    tm.app(
      dedupTerm,
      tm.fold(
        tm.lam(tm.lam(  // acc=var(1), cell=var(0) [+2: input=var(2)]
          tm.append(tm.var(1), arrayTerm([tm.field("predicate", tm.var(0))]))
        )),
        arrayTerm([]),
        tm.field("cells", tm.var(0)),  // input.cells
      )
    ),
  )
);

/**
 * `extentOfIntentTerm` — RelMath.FCA.primeB I B.
 *
 * Takes `{ cells, intent }` and returns the set of subjects bearing ALL
 * predicates in intent: `{ s | ∀ p ∈ intent, I(s, p) }`.
 *
 * Collects all subjects from cells (deduplicated), filters to those where
 * `allIntentFoundInSubject(cells)(intent)(s)` holds.
 *
 * Grounded in: RelMath.FCA.primeB_antitone, RelMath.FCA.galois_connection.
 *
 * @example
 * ```js
 * import { evaluateRunTerm, fca } from "@red-cup-engineering/relating";
 *
 * const cells = [
 *   { subject: "alpha", predicate: "warm" },
 *   { subject: "alpha", predicate: "bright" },
 *   { subject: "beta", predicate: "warm" },
 * ];
 *
 * evaluateRunTerm(fca.extentOfIntent, {
 *   cells,
 *   intent: ["warm"],
 * }); // ["alpha", "beta"]
 * ```
 */
export const extentOfIntentTerm: Tm = tm.lam(  // input={cells, intent}=var(0)
  tm.fold(
    // Main combinator: acc=var(1), subj=var(0) [+2: input=var(2)]
    tm.lam(tm.lam(
      tm.cond(
        tm.app(
          tm.app(
            tm.app(allIntentFoundInSubjectTerm, tm.field("cells", tm.var(2))),
            tm.field("intent", tm.var(2))
          ),
          tm.var(0),  // candidate subject
        ),
        tm.append(tm.var(1), arrayTerm([tm.var(0)])),  // include in extent
        tm.var(1),                                      // skip
      )
    )),
    arrayTerm([]),  // initial: empty extent
    // List: all subjects from cells, deduplicated (at depth 1, input=var(0))
    tm.app(
      dedupTerm,
      tm.fold(
        tm.lam(tm.lam(  // acc=var(1), cell=var(0)
          tm.append(tm.var(1), arrayTerm([tm.field("subject", tm.var(0))]))
        )),
        arrayTerm([]),
        tm.field("cells", tm.var(0)),  // input.cells
      )
    ),
  )
);

// ── FCA closure and concept judgments ─────────────────────────────────────────

/**
 * `closeExtentTerm` — RelMath.FCA.closeA = primeB ∘ primeA.
 *
 * Takes `{ cells, extent }` and returns the FCA closure of the extent:
 * `extentOfIntent({ cells, intent: intentOfExtent({ cells, extent }) })`.
 *
 * The resulting extent is the smallest closed extent containing the input.
 * RelMath.FCA.closeA_closure proves this operator is extensive (A ⊆ closeA A),
 * monotone, and idempotent (closeA(closeA A) = closeA A).
 *
 * @example
 * ```js
 * import { evaluateRunTerm, fca } from "@red-cup-engineering/relating";
 *
 * const cells = [
 *   { subject: "alpha", predicate: "warm" },
 *   { subject: "alpha", predicate: "bright" },
 *   { subject: "beta", predicate: "warm" },
 * ];
 *
 * evaluateRunTerm(fca.closeExtent, {
 *   cells,
 *   extent: ["alpha"],
 * }); // ["alpha"]
 * ```
 */
export const closeExtentTerm: Tm = tm.lam(  // input={cells, extent}=var(0)
  tm.app(
    extentOfIntentTerm,
    objectTerm([
      ["cells", tm.field("cells", tm.var(0))],
      ["intent", tm.app(intentOfExtentTerm, tm.var(0))],
    ])
  )
);

/**
 * `isConceptPairTerm` — the formal-concept condition.
 *
 * Takes `{ cells, extent, intent }` and returns true iff (extent, intent) is
 * a formal concept: `intentOf(extent) = intent` AND `extentOf(intent) = extent`.
 *
 * The formal concepts ordered by extent inclusion form a complete lattice
 * (RelMath.FCA fundamental theorem — proved in the Lean module).
 *
 * @example
 * ```js
 * import { evaluateRunTerm, fca } from "@red-cup-engineering/relating";
 *
 * const cells = [
 *   { subject: "alpha", predicate: "warm" },
 *   { subject: "alpha", predicate: "bright" },
 *   { subject: "beta", predicate: "warm" },
 * ];
 *
 * evaluateRunTerm(fca.isConceptPair, {
 *   cells,
 *   extent: ["alpha", "beta"],
 *   intent: ["warm"],
 * }); // true
 * ```
 */
export const isConceptPairTerm: Tm = tm.lam(  // input={cells, extent, intent}=var(0)
  tm.cond(
    tm.coincide(
      tm.app(intentOfExtentTerm, objectTerm([
        ["cells", tm.field("cells", tm.var(0))],
        ["extent", tm.field("extent", tm.var(0))],
      ])),
      tm.field("intent", tm.var(0))
    ),
    tm.coincide(
      tm.app(extentOfIntentTerm, objectTerm([
        ["cells", tm.field("cells", tm.var(0))],
        ["intent", tm.field("intent", tm.var(0))],
      ])),
      tm.field("extent", tm.var(0))
    ),
    boolFalse
  )
);

/**
 * `formalConceptTerm` — construct a formal concept from cells and a seed extent.
 *
 * Takes `{ cells, extent }`, closes the extent via `closeExtent`, and returns
 * `{ kind: "predication.fca.concept", extent: closedExtent, intent }` where
 * `intent = intentOfExtent({ cells, extent: closedExtent })`.
 *
 * The result is always a valid formal concept (isConceptPair holds for it).
 *
 * @example
 * ```js
 * import { evaluateRunTerm, fca } from "@red-cup-engineering/relating";
 *
 * const cells = [
 *   { subject: "alpha", predicate: "warm" },
 *   { subject: "alpha", predicate: "bright" },
 *   { subject: "beta", predicate: "warm" },
 * ];
 *
 * evaluateRunTerm(fca.formalConcept, {
 *   cells,
 *   extent: ["alpha", "beta"],
 * });
 * // { extent: ["alpha", "beta"], intent: ["warm"], kind: "predication.fca.concept" }
 * ```
 */
export const formalConceptTerm: Tm = tm.lam(  // input={cells, extent}=var(0)
  tm.app(
    tm.lam(  // closedExtent=var(0), input=var(1)
      objectTerm([
        ["extent", tm.var(0)],
        ["intent", tm.app(intentOfExtentTerm, objectTerm([
          ["cells", tm.field("cells", tm.var(1))],
          ["extent", tm.var(0)],
        ]))],
        ["kind", stringTerm("predication.fca.concept")],
      ])
    ),
    tm.app(closeExtentTerm, tm.var(0))  // closedExtent
  )
);

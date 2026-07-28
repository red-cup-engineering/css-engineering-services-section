/**
 * evaluating/pairing/chu — Chu spaces over FOUR as RMN terms.
 *
 * A Chu space is a pairing `{ pts, r, sts }` where `r : pts × sts → FOUR` is a
 * FOUR-valued matrix encoded as `Array<{charge, pt, st}>`. The *-autonomous dual
 * transposes `pts↔sts` and applies the De Morgan linear involution `negate` to
 * every charge entry, implementing the linear-logic dualising object `(–)^⊥`.
 *
 * The FOUR negation `negate` is the De Morgan linear involution proven in
 * `RelMath.Positing`: `negate ⟨a₁,a₂⟩ = ⟨a₂,a₁⟩` (coordinate swap). This swaps
 * the evidence and counter-evidence slots, making it self-inverse:
 *   negate(absurd)    = absurd    (⟨0,0⟩ → ⟨0,0⟩)
 *   negate(potential) = active    (⟨0,1⟩ → ⟨1,0⟩)
 *   negate(active)    = potential (⟨1,0⟩ → ⟨0,1⟩)
 *   negate(stable)    = stable    (⟨1,1⟩ → ⟨1,1⟩)
 *
 * `dual_involution` follows because transposing the matrix twice and applying
 * `negate_negate` pointwise returns the original space exactly.
 *
 * RelMath theorems grounded here:
 *   RelMath.Positing.negate_negate         (negate (negate a) = a)
 *   RelMath.ChuSpace.dual_involution       (dual (dual C) = C — the formal proof)
 *   RelMath.Chu.dual_involution            (same, at the Chu namespace)
 *   RelMath.four_negate_involution         (negate (negate x) = x, as standalone)
 */
import { type Tm, tm } from "../../../lib/notating/index.mjs";
import { arrayTerm, objectTerm } from "../projecting/index.mjs";

// ── the Chu dual ──────────────────────────────────────────────────────────────

/**
 * `chuDualTerm` — RelMath.Chu.dual_involution / ChuSpace.dual.
 *
 * Takes `{ pts, r, sts }` and returns the *-autonomous dual: swap `pts` and
 * `sts`, and negate the FOUR charge of every matrix entry while also transposing
 * its `pt`/`st` coordinates.
 *
 * The dual is the linear-logic dualising object `(–)^⊥` of `Chu(FOUR)`. Applied
 * twice it returns the original space (`chuDualInvolution`), because:
 *   1. The `pts`/`sts` fields swap back (eta on the field projections).
 *   2. Each charge double-negates to itself (`RelMath.Positing.negate_negate`).
 *   3. Each `pt`/`st` coordinate transposes back.
 *
 * De Bruijn inside the fold combinator (2 lambdas deep):
 *   var(0) = entry, var(1) = acc, var(2) = space (outer lambda)
 *
 * @example
 * ```js
 * import { evaluateRunTerm, chu } from "@red-cup-engineering/relating";
 *
 * const space = {
 *   pts: ["a", "b"],
 *   sts: ["x"],
 *   r: [
 *     { pt: "a", st: "x", charge: "active" },
 *     { pt: "b", st: "x", charge: "potential" },
 *   ],
 * };
 *
 * evaluateRunTerm(chu.dual, space);
 * // {
 * //   pts: ["x"],
 * //   sts: ["a", "b"],
 * //   r: [
 * //     { pt: "x", st: "a", charge: "potential" },   // negate("active") = "potential"
 * //     { pt: "x", st: "b", charge: "active" },      // negate("potential") = "active"
 * //   ]
 * // }
 * ```
 */
export const chuDualTerm: Tm = tm.lam(  // space = var(0)
  objectTerm([
    ["pts", tm.field("sts", tm.var(0))],
    ["r", tm.fold(
      // combinator: acc=var(1), entry=var(0) [+2: space=var(2)]
      tm.lam(tm.lam(
        tm.append(
          tm.var(1),
          arrayTerm([
            objectTerm([
              ["charge", tm.negate(tm.field("charge", tm.var(0)))],
              ["pt", tm.field("st", tm.var(0))],
              ["st", tm.field("pt", tm.var(0))],
            ]),
          ])
        )
      )),
      arrayTerm([]),
      tm.field("r", tm.var(0)),  // space.r — outer lambda is depth 1 here
    )],
    ["sts", tm.field("pts", tm.var(0))],
  ])
);

// ── matrix lookup ─────────────────────────────────────────────────────────────

/**
 * `chuLookupTerm` — evaluate the FOUR-valued matrix at a single `(pt, st)` cell.
 *
 * Takes `{ pt, space, st }` and scans `space.r` for the first entry with matching
 * `pt` and `st` (structural coincidence). Returns that entry's `charge`. If no
 * entry is found, returns `"absurd"` (= ⊥ₖ, the bottom-knowledge charge).
 *
 * This is the finite-space evaluation of the abstract matrix `r : pts → sts → Charge`
 * from `ChuSpace`. The short-circuit fold terminates as soon as a match is found.
 *
 * De Bruijn inside the combinator (2 lambdas deep):
 *   var(0) = entry, var(1) = acc, var(2) = input
 *
 * @example
 * ```js
 * import { evaluateRunTerm, chu } from "@red-cup-engineering/relating";
 *
 * const space = {
 *   pts: ["a"], sts: ["x"],
 *   r: [{ pt: "a", st: "x", charge: "active" }],
 * };
 *
 * evaluateRunTerm(chu.lookup, { space, pt: "a", st: "x" }); // "active"
 * evaluateRunTerm(chu.lookup, { space, pt: "a", st: "y" }); // "absurd" (not found)
 * ```
 */
export const chuLookupTerm: Tm = tm.lam(  // input = {pt, space, st} = var(0)
  tm.field("charge",
    tm.fold(
      // combinator: acc=var(1), entry=var(0) [+2: input=var(2)]
      tm.lam(tm.lam(
        tm.cond(
          tm.field("found", tm.var(1)),  // already found — short-circuit
          tm.var(1),
          tm.cond(
            tm.coincide(tm.field("pt", tm.var(0)), tm.field("pt", tm.var(2))),
            tm.cond(
              tm.coincide(tm.field("st", tm.var(0)), tm.field("st", tm.var(2))),
              // match: return {charge: entry.charge, found: true}
              objectTerm([
                ["charge", tm.field("charge", tm.var(0))],
                ["found", tm.bool(true)],
              ]),
              tm.var(1),  // wrong st
            ),
            tm.var(1),  // wrong pt
          ),
        )
      )),
      // init: {charge: absurd, found: false}
      objectTerm([["charge", tm.charge("absurd")], ["found", tm.bool(false)]]),
      tm.field("r", tm.field("space", tm.var(0))),  // input.space.r
    )
  )
);

// ── the involution witness ────────────────────────────────────────────────────

/**
 * `chuDualInvolutionTerm` — witness that the dual is an involution.
 *
 * Takes any `{ pts, r, sts }` and returns `true` iff `dual(dual(space)) = space`.
 * By `RelMath.Chu.dual_involution` this is always `true` for well-formed spaces
 * (spaces where every `charge` entry is a valid FOUR value and reduces via
 * `negate_negate`).
 *
 * Grounded in: `RelMath.Chu.dual_involution`, `RelMath.Positing.negate_negate`.
 *
 * @example
 * ```js
 * import { evaluateRunTerm, chu } from "@red-cup-engineering/relating";
 *
 * evaluateRunTerm(chu.dualInvolution, {
 *   pts: ["a"], sts: ["x"],
 *   r: [{ pt: "a", st: "x", charge: "active" }],
 * }); // true
 * ```
 */
export const chuDualInvolutionTerm: Tm = tm.lam(  // space = var(0)
  tm.coincide(
    tm.app(chuDualTerm, tm.app(chuDualTerm, tm.var(0))),
    tm.var(0)
  )
);

/**
 * enact — stage 2 of the agency descent: relating's `predicate` read as agency.
 *
 * `enact` projects a `DescentState` to its TRANSFINITE reading: the doing carrier,
 * the bounded deed. It is the `agential` face — "the someone acting" — and the
 * `judgement` moment. The seed's articulation cells have generated a predication
 * base Φ = E × Π × E and a value-free fiber over it (no value-algebra exists at
 * the transfinite regime, so `valued` is false). The communicating faculty
 * (speaking across the boundary) seats at this stage; `enact` provides the deed it
 * mounts on and does not re-implement it. Generated WITHIN `animate`: a deed is an
 * articulated seed brought to predication.
 */
import type { Doing } from "./carriers.mjs";
import type { DescentState } from "../descending.mjs";

/** Read the doing (transfinite / agential) carrier off a descent state. */
export function enact(state: DescentState): Doing {
  const result: Doing = {
    kind: "animating.becoming.doing",
    regime: "transfinite",
    stage: "predicate",
    face: "agential",
    epistemic: "judgement",
    faculty: "communicating",
    entities: state.site.cells.entities.entities.length,
    predicates: state.site.cells.predicates.predicates.length,
    cells: state.site.cells.cells.length,
    valued: false,
  };
  return result;
}

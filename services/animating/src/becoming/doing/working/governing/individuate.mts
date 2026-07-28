/**
 * individuate — stage 4 of the agency descent: relating's `settle` read as agency.
 *
 * `individuate` projects a `DescentState` to its FINITE reading: the governing
 * carrier, the open field brought under a settled, bounded order. It is the
 * `individual` face and the `knowledge` moment. The knowledge-monotone trace has
 * reached its fixed point; the first cohomology measures the obstruction to gluing
 * (one generator per cell added at a non-Scott limit-stage firing). `glued` is
 * H¹ = 0 — the residue drained to zero, the section glues into a sheaf — and
 * `cohomologyRank` is that obstruction's rank (`glued` ⟺ rank 0). Agency is
 * fundamentally a settling phenomenon: it culminates here, in the glued individual
 * sheaf the agent is. Generated WITHIN `labor`: an individual is a shared field
 * settled to a fixed point.
 */
import {
  readFirstCohomologyOfSettlementFiltration,
  sectionOf,
} from "@red-cup-engineering/relating";
import type { Governing } from "./carriers.mjs";
import type { DescentState } from "../../../descending.mjs";

/** Read the governing (finite / individual) carrier off a descent state. */
export function individuate(state: DescentState): Governing {
  const cohomology = readFirstCohomologyOfSettlementFiltration(state.filtration);
  const cohomologyRank = cohomology.generators.length;
  const result: Governing = {
    kind: "animating.becoming.doing.working.governing",
    regime: "finite",
    stage: "settle",
    face: "individual",
    epistemic: "knowledge",
    settled: true,
    glued: cohomologyRank === 0,
    cohomologyRank,
    cells: sectionOf(state.readings.knowledgeLeast).entries.length,
  };
  return result;
}

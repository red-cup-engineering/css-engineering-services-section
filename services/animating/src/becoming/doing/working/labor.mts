/**
 * labor — stage 3 of the agency descent: relating's `posit` read as agency.
 *
 * `labor` projects a `DescentState` to its SCOTT-CONTINUOUS reading: the working
 * carrier, acting made shared and ongoing on a common field. It is the `agentic`
 * face and the `belief` moment. The value-free fiber is now packaged as a charged
 * presheaf whose stalks take bilattice charges, seeded with the knowledge-least
 * (bottom) valuation on every cell; assertion raises it along a knowledge-monotone
 * trace. `valuations` counts that trace — the settlement closure orbit from the
 * bottom seed to the fixed point (`filtration.stages`), the Scott-continuous
 * dynamic object itself (the presheaf's own `traces` holds only the bottom seed and
 * is not the raised trace). `working` reads the whole orbit; `governing` reads its
 * fixed point — two readings of the one settlement. Value enters the descent here.
 * The knowing faculty (teaching/learning over interior state) seats
 * at this stage; `labor` provides the field it mounts on. Generated WITHIN `enact`:
 * a shared field is a deed posited with value.
 */
import {
  cohomologyLaplacianOfCells,
  cohomologyTerms,
  evaluateRunTerm,
  type Cell,
  type JsonRecord,
  type JsonValue,
} from "@red-cup-engineering/relating";
import type { Working } from "./carriers.mjs";
import type { DescentState } from "../../descending.mjs";

/** Normalize the working field's finite H0/H1 receipt through relating's RMN surface. */
function workingCohomologyReceipt(cells: readonly Cell[], valuations: number): JsonRecord {
  const laplacian = cohomologyLaplacianOfCells(cells);
  return Object.freeze({
    kind: "animating.working.cohomology" as const,
    cells: cells.length,
    valuations,
    h0: laplacian.cohomology.zeroCohomology.rank.members.length,
    h1: laplacian.cohomology.firstCohomology.rank.members.length,
    vanishing: evaluateRunTerm(cohomologyTerms.rankVanishing, laplacian.cohomology.firstCohomology.vanishing as unknown as JsonValue),
    laplacian: evaluateRunTerm(cohomologyTerms.laplacian, laplacian as unknown as JsonValue),
  }) as JsonRecord;
}

/** Read the working (Scott-continuous / agentic) carrier off a descent state. */
export function labor(state: DescentState): Working {
  const cells = state.posited.fiber.predication.cells.cells;
  const valuations = state.filtration.stages.length;
  const result: Working = {
    kind: "animating.becoming.doing.working",
    regime: "scott-continuous",
    stage: "posit",
    face: "agentic",
    epistemic: "belief",
    faculty: "knowing",
    cells: cells.length,
    valuations,
    valued: true,
    cohomology: workingCohomologyReceipt(cells, valuations),
  };
  return result;
}

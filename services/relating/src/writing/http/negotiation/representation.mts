// representation.mts — corner-aware content negotiation.
//
// Plain `negotiateType` ranks offered media types by the Accept header. This
// layer adds the bilattice asymmetry: a settled value may be projected DOWN to a
// lower content corner (drop addressability/assertivity — lossy but sound), but
// never UP, which would fabricate structure the value does not carry. So the
// admissible representations are exactly those whose corner does not exceed the
// value's in the knowledge order ≤_k.

import type { Corner } from "../../../projections/kernel.mjs";
import { leqK } from "../../../projections/kernel.mjs";
import { negotiateType } from "./accept.mjs";
import { mediaTypeCorner } from "./media-type.mjs";

/** Whether an offered representation may be emitted for a value at `valueCorner`:
 *  only if the representation's corner is ≤_k the value's. Settling down is sound;
 *  emitting a richer corner would fabricate addressability or assertivity. */
export function representationFits(valueCorner: Corner, offeredMediaType: string): boolean {
  return leqK(mediaTypeCorner(offeredMediaType), valueCorner);
}

/** Corner-aware negotiation: restrict the offered representations to those that do
 *  not exceed the settled value's content commitment, then negotiate among them by
 *  the Accept header. Returns null when nothing admissible is acceptable. */
export function negotiateRepresentation(
  acceptHeader: string | undefined,
  offered: readonly string[],
  valueCorner: Corner,
): string | null {
  const admissible = offered.filter((type) => representationFits(valueCorner, type));
  return negotiateType(acceptHeader, admissible);
}


// representation.mts — corner-aware content negotiation.
//
// Plain `negotiateType` ranks offered media types by the Accept header. This
// layer adds the bilattice asymmetry: a settled value may be projected DOWN to a
// lower content corner (drop addressability/assertivity — lossy but sound), but
// never UP, which would fabricate structure the value does not carry. So the
// admissible representations are exactly those whose corner does not exceed the
// value's in the knowledge order ≤_k.

import { leqK } from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";
import { negotiateType } from "@red-cup-engineering/http-services-section/negotiation";
import { mediaTypeCorner } from "./media-type.mjs";

/** Whether an offered representation may be emitted for a value at `valueCorner`:
 *  only if the representation's corner is ≤_k the value's. Settling down is sound;
 *  emitting a richer corner would fabricate addressability or assertivity. */
export function representationFits(valueCorner, offeredMediaType) {
  return leqK(mediaTypeCorner(offeredMediaType), valueCorner);
}

/** Corner-aware negotiation: restrict the offered representations to those that do
 *  not exceed the settled value's content commitment, then negotiate among them by
 *  the Accept header. Returns null when nothing admissible is acceptable. */
export function negotiateRepresentation(
  acceptHeader,
  offered,
  valueCorner,
) {
  const admissible = offered.filter((type) => representationFits(valueCorner, type));
  return negotiateType(acceptHeader, admissible);
}

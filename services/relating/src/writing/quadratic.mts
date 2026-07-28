/**
 * writing/quadratic — the lossy float boundary for the real quadratic field ℚ(√d).
 *
 * Exact ℚ(√d) arithmetic lives in the carrier algebra; this is the door where a
 * quadratic rational crosses to a native floating-point approximation — exactness
 * ends here, so the read lives in the codec layer, not in the algebra.
 */
import type { QuadraticRational } from "../../lib/articulating/predicating/geometry/spatial/quadratic.mjs";
import { toNumber } from "../codecs/host/javascript/numbers/index.mjs";

/** Boundary read only — a quadratic rational's native floating-point value (lossy). */
export const quadraticToNumber = (value: QuadraticRational): number =>
  toNumber(value.unit) + toNumber(value.root) * Math.sqrt(value.radicand);

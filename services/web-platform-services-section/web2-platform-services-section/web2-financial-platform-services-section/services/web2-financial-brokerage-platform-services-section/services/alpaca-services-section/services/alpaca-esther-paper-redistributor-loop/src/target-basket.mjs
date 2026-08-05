// Target allocation doctrine for the Esther Davis Alpaca paper redistributor.
//
// PROVENANCE: no existing target-allocation/portfolio/benchmark doctrine was
// found anywhere in brokerage-control-api-federation or its obsmetrologia
// services as of 2026-07-23. mandate-portfolio-allocation-service exists,
// but it is a generic scores+uncertainty -> mandate-bounded-weights allocator
// with no fixed basket of its own -- it takes weights as an output, not a
// doctrine input, and no mandate record anywhere names SPY/QQQ/TLT/GLD/BIL
// or a 40/20/20/10/10 split. QQQ/TLT/GLD/BIL references elsewhere in the
// federation (causal-portfolio-learning-service test fixtures,
// institutional-investment-shadow-deployment's default shadow universe) are
// synthetic test/shadow inputs, not an adopted target-weight record.
//
// Absent doctrine, this loop uses the plain diversified basket specified by
// the leader directly: a fixed-weight, long-only, no-leverage basket across
// equities (SPY, QQQ), duration (TLT), a real-asset hedge (GLD), and a cash
// proxy (BIL). Weights sum to exactly 1.

export const TARGET_WEIGHTS = Object.freeze({
  SPY: 0.40,
  QQQ: 0.20,
  TLT: 0.20,
  GLD: 0.10,
  BIL: 0.10,
});

export const TARGET_SYMBOLS = Object.freeze(Object.keys(TARGET_WEIGHTS));

const weightSum = Object.values(TARGET_WEIGHTS).reduce((sum, w) => sum + w, 0);
if (Math.abs(weightSum - 1) > 1e-9) {
  throw new Error(`target-basket-weights-must-sum-to-one:${weightSum}`);
}

/** Scale the full target basket down by a fraction in (0, 1], for bootstrap tranches. */
export function scaleTargets(targets, fraction) {
  if (!Number.isFinite(fraction) || fraction <= 0 || fraction > 1) {
    throw new RangeError(`invalid-tranche-fraction:${fraction}`);
  }
  return Object.freeze(
    Object.fromEntries(Object.entries(targets).map(([symbol, weight]) => [symbol, weight * fraction])),
  );
}

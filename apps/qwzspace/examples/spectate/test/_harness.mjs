// _harness — a tiny zero-dependency assert harness for this example's own tests. Mirrors
// @red-cup-engineering/qwzspace's own tests/_harness.mjs (same ok/eq/done shape, same pass-count
// convention) so a failure here reads the same way a failure in the package's own suite does — but
// kept LOCAL to this example, not imported across the package boundary, per this example's own
// "stands on its own if copied elsewhere" convention (see shared/bots.mjs's header).

let passed = 0;

export function ok(cond, label) {
  if (!cond) {
    console.error(`  ✗ ${label}`);
    throw new Error(label);
  }
  passed++;
  console.log(`  ✓ ${label}`);
}

export function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    console.error(`  ✗ ${label}\n      expected ${e}\n      got      ${a}`);
    throw new Error(`${label}: expected ${e}, got ${a}`);
  }
  passed++;
  console.log(`  ✓ ${label}`);
}

export function done(name) {
  console.log(`${name}: ${passed} assertion(s) passed`);
}

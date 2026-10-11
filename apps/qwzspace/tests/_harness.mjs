// _harness — a zero-dependency assert harness for the qwzspace proofs. Each `prove-*.mjs` file is
// one `node:test` `test(...)` block that imports modules by RELATIVE path and runs assertions
// inline. `ok`/`eq` throw on failure so `node:test` marks exactly that one block failed and moves
// on to the rest of the suite; `done(name)` prints the file's passed-assertion count.
//
// `node --test`'s default `--test-isolation=process` spawns one fresh child process per test file,
// and every prove-*.mjs file imports this module first, so a short top-level pause here runs at
// the start of each file's real work. This sandbox occasionally needs it: back-to-back process
// spawns can hit a socket not yet reachable immediately after `listen()` resolves (see
// prove-client-node.mjs's header for the specific race this covers).
await new Promise((resolve) => setTimeout(resolve, 250));

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

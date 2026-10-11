import assert from "node:assert/strict";
import test from "node:test";

import {
  disableAllExistingAlpacaTimers,
  disableTimerUnitNow,
  discoverExistingAlpacaTimerUnits,
} from "../src/systemd-timers.mjs";

// A fake `systemctl --user ...` that never touches the real host. All tests
// in this file must use it -- never realRunSystemctl -- so running the test
// suite never disables a real timer.
function fakeSystemctlWithUnits(existingUnits) {
  const calls = [];
  const runSystemctl = (args) => {
    calls.push(args);
    if (args[0] === "list-unit-files") {
      const glob = args[1];
      const pattern = new RegExp(`^${glob.replace(/[.]/gu, "\\.").replace(/\*/gu, ".*")}$`, "u");
      const matches = existingUnits.filter((unit) => pattern.test(unit));
      return matches.map((unit) => `${unit}\t\tenabled enabled`).join("\n");
    }
    if (args[0] === "disable") return "";
    throw new Error(`unexpected systemctl invocation: ${args.join(" ")}`);
  };
  return { runSystemctl, calls };
}

test("discovery finds the known Esther unit only when it actually exists", () => {
  const present = fakeSystemctlWithUnits(["alpaca-esther-paper-trading-loop.timer"]);
  assert.deepEqual(discoverExistingAlpacaTimerUnits({ runSystemctl: present.runSystemctl }), [
    "alpaca-esther-paper-trading-loop.timer",
  ]);

  const absent = fakeSystemctlWithUnits([]);
  assert.deepEqual(discoverExistingAlpacaTimerUnits({ runSystemctl: absent.runSystemctl }), []);
});

test("discovery catches the not-yet-named redistributor timer via glob", () => {
  const fake = fakeSystemctlWithUnits(["alpaca-blk-redistributor-loop.timer"]);
  assert.deepEqual(discoverExistingAlpacaTimerUnits({ runSystemctl: fake.runSystemctl }), [
    "alpaca-blk-redistributor-loop.timer",
  ]);
});

test("discovery combines the known unit and glob matches, deduplicated and sorted", () => {
  const fake = fakeSystemctlWithUnits([
    "alpaca-esther-paper-trading-loop.timer",
    "alpaca-portfolio-rebalancer.timer",
  ]);
  assert.deepEqual(discoverExistingAlpacaTimerUnits({ runSystemctl: fake.runSystemctl }), [
    "alpaca-esther-paper-trading-loop.timer",
    "alpaca-portfolio-rebalancer.timer",
  ]);
});

test("disableTimerUnitNow calls disable --now and reports success", () => {
  const fake = fakeSystemctlWithUnits(["alpaca-esther-paper-trading-loop.timer"]);
  const result = disableTimerUnitNow("alpaca-esther-paper-trading-loop.timer", fake.runSystemctl);
  assert.deepEqual(result, { unit: "alpaca-esther-paper-trading-loop.timer", disabled: true, error: null });
  assert.deepEqual(fake.calls.at(-1), ["disable", "--now", "alpaca-esther-paper-trading-loop.timer"]);
});

test("disableTimerUnitNow never throws; failures are reported in the result", () => {
  const runSystemctl = () => {
    throw new Error("simulated failure");
  };
  const result = disableTimerUnitNow("alpaca-esther-paper-trading-loop.timer", runSystemctl);
  assert.deepEqual(result, { unit: "alpaca-esther-paper-trading-loop.timer", disabled: false, error: "simulated failure" });
});

test("disableAllExistingAlpacaTimers disables exactly the units that exist, none more", () => {
  const fake = fakeSystemctlWithUnits(["alpaca-esther-paper-trading-loop.timer"]);
  const results = disableAllExistingAlpacaTimers({ runSystemctl: fake.runSystemctl });
  assert.deepEqual(results, [{ unit: "alpaca-esther-paper-trading-loop.timer", disabled: true, error: null }]);
});

test("disableAllExistingAlpacaTimers disables nothing when no alpaca timer exists", () => {
  const fake = fakeSystemctlWithUnits([]);
  assert.deepEqual(disableAllExistingAlpacaTimers({ runSystemctl: fake.runSystemctl }), []);
});

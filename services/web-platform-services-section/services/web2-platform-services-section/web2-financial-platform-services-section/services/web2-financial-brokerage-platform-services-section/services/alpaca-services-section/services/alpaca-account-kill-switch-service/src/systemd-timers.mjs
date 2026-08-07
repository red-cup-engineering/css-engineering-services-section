// systemd --user timer discovery and disabling for the kill switch.
//
// The Esther loop's timer name is fixed and known:
//   alpaca-esther-paper-trading-loop.timer
//
// A sibling crew is (as of this writing) still building a second "alpaca
// redistributor" loop and its timer does not exist on this host yet, so its
// exact unit name cannot be hardcoded. Rather than leave it uncovered, this
// module also globs `systemctl --user list-unit-files` for any unit matching
// ALPACA_REDISTRIBUTOR_TIMER_GLOBS below, so that whichever exact name lands
// gets disabled by the same trip without requiring another edit here. If the
// sibling crew's real unit name is later confirmed, add it to
// KNOWN_ALPACA_TIMER_UNITS as a fixed name too -- belt and suspenders.
//
// Every exported function accepts an optional `runSystemctl` override so
// tests can inject a fake command runner instead of mutating the real host's
// systemd --user state; production callers (scripts/check-kill-switch.mjs) never
// pass one and get the real `systemctl --user ...` behavior below.

import { execFileSync } from "node:child_process";

export const KNOWN_ALPACA_TIMER_UNITS = ["alpaca-esther-paper-trading-loop.timer"];

export const ALPACA_REDISTRIBUTOR_TIMER_GLOBS = [
  "alpaca-*redistribut*.timer",
  "alpaca-*rebalanc*.timer",
];

export function realRunSystemctl(args) {
  return execFileSync("systemctl", ["--user", ...args], { encoding: "utf8" });
}

/** List currently-installed (loaded or not) unit file names matching a glob. */
function listUnitFiles(glob, runSystemctl) {
  let output;
  try {
    output = runSystemctl(["list-unit-files", glob, "--no-legend", "--plain"]);
  } catch {
    return [];
  }
  return output
    .split("\n")
    .map((line) => line.trim().split(/\s+/u)[0])
    .filter((name) => typeof name === "string" && name.endsWith(".timer"));
}

/** Discover every alpaca timer unit that actually exists on this host right now. */
export function discoverExistingAlpacaTimerUnits({
  knownUnits = KNOWN_ALPACA_TIMER_UNITS,
  globs = ALPACA_REDISTRIBUTOR_TIMER_GLOBS,
  runSystemctl = realRunSystemctl,
} = {}) {
  const discovered = new Set();
  for (const unit of knownUnits) {
    if (listUnitFiles(unit, runSystemctl).includes(unit)) discovered.add(unit);
  }
  for (const glob of globs) {
    for (const unit of listUnitFiles(glob, runSystemctl)) discovered.add(unit);
  }
  return [...discovered].sort();
}

/** `systemctl --user disable --now <unit>` one unit. Never throws. */
export function disableTimerUnitNow(unit, runSystemctl = realRunSystemctl) {
  try {
    runSystemctl(["disable", "--now", unit]);
    return { unit, disabled: true, error: null };
  } catch (error) {
    return { unit, disabled: false, error: error?.message ?? String(error) };
  }
}

/** Disable every currently-existing alpaca timer unit. Best-effort per unit. */
export function disableAllExistingAlpacaTimers({ runSystemctl = realRunSystemctl, ...discoveryOptions } = {}) {
  const units = discoverExistingAlpacaTimerUnits({ ...discoveryOptions, runSystemctl });
  return units.map((unit) => disableTimerUnitNow(unit, runSystemctl));
}

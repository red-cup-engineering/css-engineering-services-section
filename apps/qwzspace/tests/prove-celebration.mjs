// prove-celebration — composable big-moment choreography: tiering, determinism, and the actual
// vocabulary the README's slot-reel/jackpot example leans on (camera punch + particles + overlay).

import { ok, eq, done } from "./_harness.mjs";
import { celebrate, sampleCelebration, registerCelebration, listCelebrations, tierScale, listTiers } from "../src/celebration.mjs";
import { test } from "node:test";

test("prove-celebration", async () => {

eq(listTiers(), ["minor", "major", "epic"], "the three documented tiers exist");
ok(tierScale("epic") > tierScale("major") && tierScale("major") > tierScale("minor"), "tier scale is monotonic minor < major < epic");
ok(listCelebrations().includes("jackpot") && listCelebrations().includes("win") && listCelebrations().includes("flash"), "the three built-in celebrations are registered");

// === determinism: the SAME (name, tier, seed, startTick) resolves + samples identically ===========
{
  const planA = celebrate("jackpot", { tier: "major", seed: 5, startTick: 100 });
  const planB = celebrate("jackpot", { tier: "major", seed: 5, startTick: 100 });
  for (const tick of [100, 105, 120, 140]) {
    eq(sampleCelebration(planA, tick), sampleCelebration(planB, tick), `jackpot @ tick ${tick}: two independently-bound but identical plans sample identically`);
  }
}

// === tiering genuinely scales the effect (not a no-op knob) =======================================
{
  const minor = celebrate("jackpot", { tier: "minor", seed: 1, startTick: 0 });
  const epic = celebrate("jackpot", { tier: "epic", seed: 1, startTick: 0 });
  ok(epic.particles[1].spec.count > minor.particles[1].spec.count, "epic tier fires more coin particles than minor");
  ok(epic.durationTicks > minor.durationTicks, "epic tier runs longer than minor");
}

// === before startTick, nothing is active ===========================================================
{
  const plan = celebrate("jackpot", { seed: 1, startTick: 50 });
  const before = sampleCelebration(plan, 10);
  eq(before.active, false, "a celebration is not active before its startTick");
  eq(before.particleEntries.length, 0, "no particle entries before startTick");
  eq(before.overlayEntries.length, 0, "no overlay entries before startTick");
}

// === at startTick, the vocabulary the README's jackpot example describes is actually present ======
{
  const plan = celebrate("jackpot", { tier: "major", seed: 9, startTick: 0, overrides: { text: "BIG WIN" } });
  const frame0 = sampleCelebration(plan, 0);
  ok(frame0.active, "jackpot is active at its own startTick");
  ok(frame0.cameraPose && frame0.cameraPose.zoom >= 1, "jackpot drives a real camera pose (the zoom punch)");
  ok(frame0.overlayEntries.some((e) => e.sprite === "tile" && e.tint === "#fff7d6"), "jackpot includes a screen flash overlay entry");
  const frame2 = sampleCelebration(plan, 2);
  ok(frame2.overlayEntries.some((e) => e.text === "BIG WIN"), "jackpot's banner text reflects the overrides.text override (its offsetTicks:2 means it starts at tick 2)");
  ok(frame2.particleEntries.some((e) => e.sprite === "coin"), "jackpot's coin fountain is present in its particle entries");
  ok(frame2.particleEntries.every((e) => e.layer === "fx"), "every particle entry lands on the fx layer");
  ok(frame0.overlayEntries.every((e) => e.layer === "overlay"), "every overlay entry lands on the overlay layer");
}

// === eventually inactive again ======================================================================
{
  const plan = celebrate("flash", { tier: "minor", seed: 1, startTick: 0 });
  ok(!sampleCelebration(plan, 1000).active, "a short-lived celebration eventually reports inactive");
}

// === registerCelebration + generic tiering for a game's OWN event ==================================
{
  registerCelebration("test-only-triple", (tier) => ({
    durationTicks: Math.round(10 * tierScale(tier)),
    overlay: [{ id: "banner", type: "banner", offsetTicks: 0, text: "TRIPLE!", holdTicks: 4, tint: "#fff" }],
  }));
  const plan = celebrate("test-only-triple", { tier: "epic", seed: 1, startTick: 0 });
  ok(sampleCelebration(plan, 0).overlayEntries.some((e) => e.text === "TRIPLE!"), "a game-registered celebration works through the identical mechanism as the built-ins");
}

// === unknown celebration name refuses clearly =======================================================
{
  let threw = false;
  try {
    celebrate("no-such-celebration");
  } catch (e) {
    threw = true;
    ok(/unknown celebration/.test(e.message), "the error names the specific problem");
  }
  ok(threw, "celebrate() on an unregistered name throws rather than silently no-op-ing");
}

done("prove-celebration");
});

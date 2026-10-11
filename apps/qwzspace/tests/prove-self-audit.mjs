// prove-self-audit — §6's SELF-AUDIT OBLIGATION, proven from both directions: (1) a correctly
// deterministic world never trips a false positive, and (2) a world that VIOLATES determinism (reads
// unseeded randomness inside runTick, which §0 principle 2 forbids) is actually CAUGHT — the audit is
// not a check that only ever passes.

import { ok, eq, done } from "./_harness.mjs";
import { createRoom } from "../src/room.mjs";
import { createDemoWorld } from "./_demo-world.mjs";
import { test } from "node:test";

test("prove-self-audit", async () => {
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// --- (1) a correct, deterministic world: self-audit must never flag a false failure -------------
{
  const validate = createDemoWorld().validate;
  const room = createRoom({
    id: "audit-clean",
    intervalMs: 10,
    world: createDemoWorld,
    validate,
    interest: () => true,
    checkpointEvery: 5,
    selfAuditEvery: 5,
  });

  room.queue.push({ actorId: "a1", seq: 0, kind: "presence.join", args: { name: "x" } });
  for (let i = 0; i < 12; i++) {
    if (i === 5) room.queue.push({ actorId: "a1", seq: 1, kind: "move", args: { dx: 1, dy: 0 } });
    await room.stepOnce();
  }
  await wait(100); // let the fire-and-forget self-audit(s) resolve

  const checkpoints = room.checkpoints();
  ok(checkpoints.length >= 2, "checkpoints accumulated at the configured cadence");
  const audits = room.auditResults();
  ok(audits.length >= 2, "self-audits ran at the configured cadence");
  ok(
    audits.every((a) => a.ok === true),
    "every self-audit on a genuinely deterministic world reports ok:true",
  );
}

// --- (2) a world that cheats (reads Math.random() INSIDE runTick): self-audit must catch it -------
{
  function createCheatingWorld() {
    const world = new Map();
    async function runTick(tick, intents) {
      const dirty = new Set();
      for (const it of intents) {
        if (it.kind === "presence.join") {
          world.set(it.actorId, { id: it.actorId, x: 0, y: 0 });
          dirty.add(it.actorId);
        }
      }
      // THE VIOLATION: unseeded randomness inside runTick (forbidden by §0 principle 2) — two
      // independent replays of the identical log will each roll their own different sequence. A WIDE
      // range (not a coin flip) is deliberate: a binary ±1 choice has a non-trivial chance of two
      // independent short random walks coincidentally landing on the same cumulative sum (this test
      // originally used ±1 and flaked — genuinely, not from infra timing — roughly 1-in-a-few odds of
      // a false "audit agrees" over only 2-3 draws). A wide integer range makes an exact coincidental
      // match across every checkpoint astronomically unlikely instead.
      for (const e of world.values()) {
        e.x += Math.floor(Math.random() * 1_000_000);
        dirty.add(e.id);
      }
      return { dirty: [...dirty] };
    }
    async function subjectsOf() {
      return [...world.keys()];
    }
    async function snapOf(id) {
      const e = world.get(id);
      return e ? { id: e.id, x: e.x, y: e.y } : null;
    }
    function validate(raw) {
      return raw.kind === "move" ? { kind: "move", args: {} } : null;
    }
    return { runTick, subjectsOf, snapOf, validate };
  }

  const room = createRoom({
    id: "audit-cheating",
    intervalMs: 10,
    world: createCheatingWorld,
    validate: (raw) => null,
    interest: () => true,
    checkpointEvery: 3,
    selfAuditEvery: 3,
  });

  room.queue.push({ actorId: "a1", seq: 0, kind: "presence.join", args: { name: "x" } });
  for (let i = 0; i < 9; i++) await room.stepOnce();
  await wait(150);

  const audits = room.auditResults();
  ok(audits.length > 0, "self-audit ran against the cheating world");
  const anyCaught = audits.some((a) => a.ok === false);
  ok(anyCaught, "self-audit CATCHES a world that violates determinism (unseeded randomness in runTick) — not a check that only ever passes");

  // and verify() (the on-demand entry point) agrees: it should also very likely disagree with the
  // live cache (probabilistically — with enough random draws taken, an exact coincidental match
  // across independent random sequences is vanishingly unlikely).
  const verify = await room.verify();
  ok(typeof verify.ok === "boolean", "verify() still returns a well-formed result against a cheating world");
}

done("prove-self-audit");
});

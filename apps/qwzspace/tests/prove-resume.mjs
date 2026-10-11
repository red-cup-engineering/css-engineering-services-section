import { ok, eq, done } from "./_harness.mjs";
import { createResumeTokens, createRingBuffer } from "../src/resume.mjs";
import { test } from "node:test";

test("prove-resume", async () => {
// --- resume tokens: signed, verifiable, tamper-evident ------------------------------------------
{
  const tokens = createResumeTokens("a-fixed-test-secret");
  const token = tokens.issue({ roomId: "r1", actorId: "a1", issuedAtTick: 5 });
  ok(typeof token === "string" && token.includes("."), "issue() returns an opaque dot-joined token");

  const payload = tokens.verify(token);
  ok(payload, "a genuinely-issued token verifies");
  eq(payload.roomId, "r1", "verified payload carries the correct roomId");
  eq(payload.actorId, "a1", "verified payload carries the correct actorId");
  eq(payload.issuedAtTick, 5, "verified payload carries the correct issuedAtTick");

  eq(tokens.verify("garbage"), null, "a non-token string fails verification");
  eq(tokens.verify("no-dot-here"), null, "a token missing the mac separator fails verification");
  eq(tokens.verify(token + "x"), null, "a tampered token (appended char) fails verification");

  const [payloadPart] = token.split(".");
  const forged = `${payloadPart}.${"0".repeat(64)}`;
  eq(tokens.verify(forged), null, "a token with a forged (but well-formed) mac fails verification");

  const otherTokens = createResumeTokens("a-different-secret");
  eq(otherTokens.verify(token), null, "a token signed with a different secret does not verify");

  // tampering with the PAYLOAD (trying to claim a different actorId) must also fail — this is the
  // provenance property: a client cannot edit the payload without invalidating the signature.
  const decoded = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
  const forgedPayload = Buffer.from(JSON.stringify({ ...decoded, actorId: "someone-else" })).toString("base64url");
  const [, mac] = token.split(".");
  eq(tokens.verify(`${forgedPayload}.${mac}`), null, "editing the payload while reusing the old mac fails verification");
}

// --- ring buffer: bounded, per-key FIFO, aged-out detection ---------------------------------------
{
  const ring = createRingBuffer(3);
  eq(ring.since("a1", 0), null, "an empty ring buffer reports null (nothing buffered yet) for any key");

  ring.push("a1", { tick: 1, ack: 0, delta: { entities: [1], removed: [] } });
  ring.push("a1", { tick: 2, ack: 0, delta: { entities: [2], removed: [] } });
  eq(ring.size("a1"), 2, "size() reflects two pushed entries");

  const since0 = ring.since("a1", 0);
  eq(since0.length, 2, "since(0) returns both entries (neither is aged out)");
  eq(since0[0].tick, 1, "entries come back in push order");

  const since1 = ring.since("a1", 1);
  eq(since1.length, 1, "since(1) returns only the entry strictly after tick 1");

  ring.push("a1", { tick: 3, ack: 0, delta: { entities: [3], removed: [] } });
  ring.push("a1", { tick: 4, ack: 0, delta: { entities: [4], removed: [] } }); // capacity 3: tick 1 evicted
  eq(ring.size("a1"), 3, "the buffer never exceeds its configured capacity");

  const agedOut = ring.since("a1", 0); // tick 1 (which covered "since 0") is gone now
  eq(agedOut, null, "since() returns null once the requested point predates the buffer's oldest entry");

  const stillCovered = ring.since("a1", 1); // buffer's oldest is tick 2; since(1) wants >1, i.e. from tick 2 — covered
  ok(stillCovered !== null, "since() still succeeds when the request lands exactly at the buffer's covered edge");

  eq(ring.since("a2", 0), null, "a different key with nothing buffered reports null, independent of other keys");

  ring.drop("a1");
  eq(ring.size("a1"), 0, "drop() clears a key's buffered history");
  eq(ring.since("a1", 0), null, "since() on a dropped key reports null again");
}

done("prove-resume");
});

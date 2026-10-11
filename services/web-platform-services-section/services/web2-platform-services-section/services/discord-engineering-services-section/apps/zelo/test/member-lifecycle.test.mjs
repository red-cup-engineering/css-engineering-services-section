import assert from "node:assert/strict";
import test from "node:test";
import { parseZeloRuntimeConfig } from "../src/config.mjs";
import { planZeloShadowMemberLifecycle } from "../src/shadow-member-lifecycle.mjs";

const policy = {
  sourceRevision: "r1", maxStateAgeMinutes: 30,
  provenance: { source: "community-record", sourceRevision: "r1", observedAt: "2026-08-29T00:00:00.000Z" }, cooldownHours: 720,
  quietInterval: { utcOffsetMinutes: 0, startMinute: 1200, endMinute: 360 },
  templates: { arrival: "Arrival is reviewed.", leave: "Departure is reviewed.", milestone: "Participation is reviewed.", reengagement: "Explicit opt-in is required.", digest: "1a6fb412787f919563d03de002887558a76068e884938bcb7e7ff3b7f8fe5e5a" },
};
const config = (mode = "shadow", permittedKinds = ["arrival", "leave", "milestone"]) => parseZeloRuntimeConfig({ type: "ZeloRuntimeConfig", version: 1, mode, projectionKey: "a sufficiently long projection key with no production value", bindings: [], memberLifecycle: { type: "ZeloMemberLifecycleShadowConfig", version: 1, communityId: "community-1", purpose: "review", permittedKinds, policy } });
const arrival = () => ({ type: "ZeloMemberLifecycleReview", version: 1, communityId: "community-1", memberId: "member-1", kind: "arrival", event: { eventId: "arrival-1", sourceRevision: "r1", occurredAt: "2026-08-29T12:00:00.000Z", completedParticipation: null, tenureStartedAt: null, explicitOptIn: null } });
const state = () => ({ sourceRevision: "r1", observedAt: "2026-08-29T12:00:01.000Z", lastContactAt: null, priorReceipts: [] });

test("Zelo lifecycle composition produces only a privacy-minimized shadow receipt", async () => {
  const result = await planZeloShadowMemberLifecycle(arrival(), config(), async (binding) => { assert.deepEqual(binding, { communityId: "community-1", memberId: "member-1", sourceRevision: "r1" }); return state(); }, new Date("2026-08-29T12:00:02.000Z"));
  assert.equal(result?.executable, false); assert.equal(result?.delivery, "forbidden"); assert.equal(result?.authority, "adapter-review-required");
  const serialized = JSON.stringify(result);
  for (const raw of ["community-1", "member-1", "arrival-1", "Arrival is reviewed."]) assert.equal(serialized.includes(raw), false);
});

test("lifecycle composition never reads when disabled and rejects unadmitted reengagement", async () => {
  let reads = 0;
  assert.equal(await planZeloShadowMemberLifecycle(arrival(), config("disabled"), async () => { reads += 1; return state(); }, new Date("2026-08-29T12:00:02.000Z")), undefined);
  assert.equal(reads, 0);
  const reengagement = { ...arrival(), kind: "reengagement", event: { eventId: "return-1", sourceRevision: "r1", occurredAt: "2026-08-29T12:00:00.000Z", completedParticipation: null, tenureStartedAt: null, explicitOptIn: true } };
  await assert.rejects(planZeloShadowMemberLifecycle(reengagement, config(), async () => state(), new Date("2026-08-29T12:00:02.000Z")), /not admitted/u);
});

test("lifecycle composition fails closed for a cross-community review or stale state", async () => {
  await assert.rejects(planZeloShadowMemberLifecycle({ ...arrival(), communityId: "other-community" }, config(), async () => state(), new Date("2026-08-29T12:00:02.000Z")), /same-community/u);
  await assert.rejects(planZeloShadowMemberLifecycle(arrival(), config(), async () => ({ ...state(), observedAt: "2026-08-28T12:00:00.000Z" }), new Date("2026-08-29T12:00:02.000Z")), /fresh/u);
});

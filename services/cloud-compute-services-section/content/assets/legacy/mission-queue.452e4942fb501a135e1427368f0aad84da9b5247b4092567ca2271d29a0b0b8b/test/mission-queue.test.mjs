import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { startRwilProviderProcess } from "@emsenn/rwil-rdf-services/test-provider";
import { abandonMissionClaim, claimNext, runQueue, submitMission } from "../src/mission-queue.mjs";

let rwil;
test.before(async () => { rwil = await startRwilProviderProcess(); });
test.after(async () => { await rwil.close(); });

test("durable queue admits, claims, runs, and settles missions without a supervising conversation", async () => {
  const queueRoot = mkdtempSync(join(tmpdir(), "union-dev-queue-test-"));
  const mission = { id: "urn:test:queued", objective: "fix it", territory: queueRoot, verifyCommand: "true" };
  const admission = submitMission(mission, { queueRoot });
  assert.equal(existsSync(admission.path), true);
  const result = await runQueue({
    queueRoot,
    once: true,
    concurrency: 1,
    dataRoot: join(queueRoot, "data"),
    rwilAgentUrl: rwil.agentCardUrl,
    runMission: async (claimed) => ({ id: claimed.id, outcome: { verified: true, integrated: true } }),
  });
  assert.equal(result.processed, 1);
  const settled = JSON.parse(readFileSync(join(queueRoot, "completed", admission.path.split("/").at(-1)), "utf8"));
  assert.equal(settled.result.outcome.integrated, true);
  assert.equal(settled.mission._queueClaim.workerId, result.workerId);
});

test("an explicitly abandoned dead-worker claim cannot be recovered and purchased again", () => {
  const queueRoot = mkdtempSync(join(tmpdir(), "union-dev-abandon-test-"));
  const mission = { id: "urn:test:abandoned", objective: "obsolete work", territory: queueRoot, verifyCommand: "true" };
  submitMission(mission, { queueRoot });
  claimNext({ queueRoot, workerId: "dead-worker" });
  const result = abandonMissionClaim(mission.id, "superseded after carrier rectification", { queueRoot });
  assert.equal(result.state, "failed");
  const settled = JSON.parse(readFileSync(result.path, "utf8"));
  assert.equal(settled.error.name, "MissionAbandoned");
  assert.equal(settled.mission._queueClaim.workerId, "dead-worker");
  assert.equal(existsSync(join(queueRoot, "queued", result.path.split("/").at(-1))), false);
});

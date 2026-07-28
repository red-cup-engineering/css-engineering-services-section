import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runMission as defaultRunMission } from "./mission-runtime.mjs";
import { runMissionPipeline as defaultRunMissionPipeline } from "./mission-pipeline.mjs";

export const DEFAULT_QUEUE_ROOT = fileURLToPath(new URL("../data/mission-queue", import.meta.url));
const STATES = ["queued", "running", "completed", "failed", "workers"];

function ensure(root) {
  for (const state of STATES) mkdirSync(join(root, state), { recursive: true });
}

function atomicJson(path, value) {
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  renameSync(temporary, path);
}

function safeName(id) {
  return String(id || randomUUID()).replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-180) || randomUUID();
}

export function submitMission(mission, { queueRoot = DEFAULT_QUEUE_ROOT } = {}) {
  if (!mission?.objective || !mission?.territory || !mission?.verifyCommand) throw new Error("queued mission requires objective, territory, and verifyCommand");
  ensure(queueRoot);
  const admitted = { ...mission, id: mission.id || `urn:ame:free-compute-dev:mission:${randomUUID()}`, queuedAt: new Date().toISOString() };
  const path = join(queueRoot, "queued", `${safeName(admitted.id)}.json`);
  if (existsSync(path)) throw new Error(`mission already queued: ${admitted.id}`);
  atomicJson(path, admitted);
  return { id: admitted.id, path };
}

export function recoverStaleClaims({ queueRoot = DEFAULT_QUEUE_ROOT, leaseMs = 15 * 60_000, now = Date.now() } = {}) {
  ensure(queueRoot);
  const recovered = [];
  for (const name of readdirSync(join(queueRoot, "running")).filter((x) => x.endsWith(".json"))) {
    const from = join(queueRoot, "running", name);
    if (now - statSync(from).mtimeMs < leaseMs) continue;
    const mission = JSON.parse(readFileSync(from, "utf8"));
    delete mission._queueClaim;
    const to = join(queueRoot, "queued", name);
    atomicJson(`${to}.recovering`, { ...mission, recoveredAt: new Date(now).toISOString() });
    renameSync(`${to}.recovering`, to);
    try { renameSync(from, `${from}.recovered`); } catch { /* another recovery won */ }
    recovered.push(mission.id || name);
  }
  return recovered;
}

export function claimNext({ queueRoot = DEFAULT_QUEUE_ROOT, workerId = `worker-${process.pid}` } = {}) {
  ensure(queueRoot);
  for (const name of readdirSync(join(queueRoot, "queued")).filter((x) => x.endsWith(".json")).sort()) {
    const from = join(queueRoot, "queued", name), to = join(queueRoot, "running", name);
    try { renameSync(from, to); } catch { continue; }
    const mission = JSON.parse(readFileSync(to, "utf8"));
    const claimed = { ...mission, _queueClaim: { workerId, claimedAt: new Date().toISOString() } };
    atomicJson(to, claimed);
    return { name, path: to, mission: claimed };
  }
  return null;
}

export function abandonMissionClaim(id, reason, { queueRoot = DEFAULT_QUEUE_ROOT } = {}) {
  if (typeof id !== "string" || !id || typeof reason !== "string" || !reason) throw new Error("abandonment requires exact mission id and reason");
  ensure(queueRoot);
  for (const name of readdirSync(join(queueRoot, "running")).filter((entry) => entry.endsWith(".json"))) {
    const path = join(queueRoot, "running", name), mission = JSON.parse(readFileSync(path, "utf8"));
    if (mission.id !== id) continue;
    const target = settle({ path, mission }, "failed", { error: { name: "MissionAbandoned", message: reason } }, queueRoot);
    return { id, state: "failed", path: target };
  }
  throw new Error(`running mission claim not found: ${id}`);
}

function settle(claim, state, payload, queueRoot) {
  const target = join(queueRoot, state, basename(claim.path));
  atomicJson(target, { mission: claim.mission, settledAt: new Date().toISOString(), ...payload });
  renameSync(claim.path, `${claim.path}.settled`);
  return target;
}

export async function workOne({ queueRoot = DEFAULT_QUEUE_ROOT, workerId, runMission = defaultRunMission, runMissionPipeline = defaultRunMissionPipeline, dataRoot, rwilAgentUrl = process.env.RWIL_RDF_AGENT, signal } = {}) {
  const claim = claimNext({ queueRoot, workerId });
  if (!claim) return null;
  try {
    const result = await runMissionPipeline(claim.mission, { runMission, dataRoot, rwilAgentUrl, signal });
    const state = result.outcome?.verified ? "completed" : "failed";
    return { state, path: settle(claim, state, { result }, queueRoot), result };
  } catch (error) {
    return { state: "failed", path: settle(claim, "failed", { error: { name: error.name, message: error.message, stack: error.stack } }, queueRoot), error };
  }
}

export async function runQueue({
  queueRoot = DEFAULT_QUEUE_ROOT,
  workerId = `worker-${process.pid}`,
  concurrency = 2,
  pollMs = 2000,
  leaseMs = 15 * 60_000,
  once = false,
  signal,
  runMission = defaultRunMission,
  runMissionPipeline = defaultRunMissionPipeline,
  dataRoot,
  rwilAgentUrl = process.env.RWIL_RDF_AGENT,
  onSettlement = () => {},
} = {}) {
  ensure(queueRoot);
  let processed = 0;
  do {
    recoverStaleClaims({ queueRoot, leaseMs });
    atomicJson(join(queueRoot, "workers", `${safeName(workerId)}.json`), { workerId, heartbeatAt: new Date().toISOString(), processed, concurrency });
    const claims = await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => workOne({ queueRoot, workerId, runMission, runMissionPipeline, dataRoot, rwilAgentUrl, signal })));
    const settled = claims.filter(Boolean);
    processed += settled.length;
    for (const result of settled) onSettlement(result);
    if (once || signal?.aborted) break;
    if (!settled.length) await new Promise((resolve) => setTimeout(resolve, pollMs));
  } while (!signal?.aborted);
  return { workerId, processed };
}

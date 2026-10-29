import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { runContainerJob } from "../scripts/container-job.mjs";

function fakeSpawn(exitCode) {
  const calls = [];
  const spawnImpl = (program, args, options) => {
    calls.push({ program, args, options });
    const child = new EventEmitter();
    queueMicrotask(() => child.emit("exit", exitCode, null));
    return child;
  };
  return { spawnImpl, calls };
}

test("runContainerJob runs the requested action's commands in order", async () => {
  const plan = { defaultAction: "produce", actions: { produce: [{ file: "a.mjs" }, { file: "b.mjs" }] } };
  const { spawnImpl, calls } = fakeSpawn(0);
  const environment = { CHANNEL_STATE_ROOT: "/state", CHANNEL_WORK_ROOT: "/work" };
  const result = await runContainerJob({ appRoot: "/app", plan, environment, spawnImpl });
  assert.deepEqual(result, { action: "produce", exitCode: 0 });
  assert.equal(calls.length, 2);
  assert.match(calls[0].args[0], /a\.mjs$/);
});

test("runContainerJob stops at the first unexpected nonzero exit", async () => {
  const plan = { defaultAction: "produce", actions: { produce: [{ file: "a.mjs" }, { file: "b.mjs" }] } };
  const { spawnImpl, calls } = fakeSpawn(1);
  const environment = { CHANNEL_STATE_ROOT: "/state", CHANNEL_WORK_ROOT: "/work" };
  const result = await runContainerJob({ appRoot: "/app", plan, environment, spawnImpl });
  assert.equal(result.exitCode, 1);
  assert.equal(calls.length, 1);
});

test("runContainerJob tolerates an allowExit code and continues", async () => {
  const plan = { defaultAction: "produce", actions: { produce: [{ file: "a.mjs", allowExit: [78] }, { file: "b.mjs" }] } };
  let callIndex = 0;
  const spawnImpl = () => {
    const child = new EventEmitter();
    const code = callIndex === 0 ? 78 : 0;
    callIndex += 1;
    queueMicrotask(() => child.emit("exit", code, null));
    return child;
  };
  const environment = { CHANNEL_STATE_ROOT: "/state", CHANNEL_WORK_ROOT: "/work" };
  const result = await runContainerJob({ appRoot: "/app", plan, environment, spawnImpl });
  assert.equal(result.exitCode, 0);
});

test("runContainerJob forwards a command's args after its file", async () => {
  const plan = { defaultAction: "produce", actions: { produce: [{ file: "a.mjs", args: ["--spec", "channel-spec.json", "--curriculum", "curriculum.json"] }] } };
  const { spawnImpl, calls } = fakeSpawn(0);
  const environment = { CHANNEL_STATE_ROOT: "/state", CHANNEL_WORK_ROOT: "/work" };
  const result = await runContainerJob({ appRoot: "/app", plan, environment, spawnImpl });
  assert.deepEqual(result, { action: "produce", exitCode: 0 });
  assert.equal(calls.length, 1);
  assert.match(calls[0].args[0], /a\.mjs$/);
  assert.deepEqual(calls[0].args.slice(1), ["--spec", "channel-spec.json", "--curriculum", "curriculum.json"]);
});

test("runContainerJob rejects a command whose args is not an array of strings", async () => {
  const plan = { defaultAction: "produce", actions: { produce: [{ file: "a.mjs", args: ["--spec", 7] }] } };
  const environment = { CHANNEL_STATE_ROOT: "/state", CHANNEL_WORK_ROOT: "/work" };
  await assert.rejects(runContainerJob({ appRoot: "/app", plan, environment, spawnImpl: fakeSpawn(0).spawnImpl }), /must be an array of strings/);
});

test("runContainerJob requires explicit state and work roots", async () => {
  const plan = { defaultAction: "produce", actions: { produce: [{ file: "a.mjs" }] } };
  await assert.rejects(runContainerJob({ appRoot: "/app", plan, environment: {}, spawnImpl: fakeSpawn(0).spawnImpl }), /CHANNEL_STATE_ROOT/);
});

test("runContainerJob refuses an unknown action", async () => {
  const plan = { defaultAction: "produce", actions: {} };
  const environment = { CHANNEL_STATE_ROOT: "/state", CHANNEL_WORK_ROOT: "/work" };
  await assert.rejects(runContainerJob({ appRoot: "/app", plan, environment, spawnImpl: fakeSpawn(0).spawnImpl }), /unknown container action/);
});

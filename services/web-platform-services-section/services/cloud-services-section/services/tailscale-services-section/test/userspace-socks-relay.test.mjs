import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const relay = resolve(import.meta.dirname, "..", "scripts", "userspace-socks-relay.mjs");

function run(env) {
  return spawnSync(process.execPath, [relay], { encoding: "utf8", env: { ...process.env, ...env }, timeout: 2000 });
}

test("refuses to start without RELAY_TARGET_HOST", () => {
  const environment = { ...process.env }; delete environment.RELAY_TARGET_HOST; delete environment.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, [relay], { encoding: "utf8", env: environment, timeout: 2000 });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /RELAY_TARGET_HOST/);
});

test("refuses a non-IPv4 RELAY_TARGET_HOST", () => {
  const result = run({ RELAY_TARGET_HOST: "example.tailnet.ts.net" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /RELAY_TARGET_HOST/);
});

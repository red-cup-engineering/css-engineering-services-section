import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const verifier = join(root, "scripts", "verify-colony-execution-boundary.mjs");

const HOSTNAME = "example.561.group";
const SERVICE_PORT = "19999";
const APP_SERVICE = "example-561-group.service";

function caddyText({ hostname = HOSTNAME, proxyTarget = "127.0.0.1:19748" } = {}) {
  return `${hostname} {\n  reverse_proxy ${proxyTarget}\n}\n`;
}
function unitText({ hostname, description } = {}) {
  const lines = ["[Unit]"];
  if (description) lines.push(`Description=@red-cup-engineering/${description}`);
  lines.push("[Service]");
  if (hostname) lines.push(`WorkingDirectory=/home/example/${hostname}`);
  return lines.join("\n");
}
function write(dir, name, content) {
  const path = join(dir, name);
  writeFileSync(path, content);
  return path;
}
function run(caddyfile, unitFile, extra = []) {
  const environment = { ...process.env }; delete environment.NODE_TEST_CONTEXT;
  return spawnSync(process.execPath, [
    verifier,
    `--caddyfile=${caddyfile}`,
    `--unit-file=${unitFile}`,
    `--expect-hostname=${HOSTNAME}`,
    `--expect-service-port=${SERVICE_PORT}`,
    `--expect-app-service=${APP_SERVICE}`,
    ...extra,
  ], { encoding: "utf8", env: environment });
}

test("accepts a relay Caddyfile and unit that name no colony execution on the relay host", () => {
  const dir = mkdtempSync(join(tmpdir(), "boundary-verify-accept-"));
  try {
    const caddy = write(dir, "Caddyfile", caddyText({ proxyTarget: "100.64.1.2:19748" }));
    const unit = write(dir, "unit.service", unitText());
    const result = run(caddy, unit);
    assert.equal(result.status, 0, result.stderr);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("rejects a relay Caddyfile that proxies the declared hostname to the relay's own loopback service port", () => {
  const dir = mkdtempSync(join(tmpdir(), "boundary-verify-loopback-"));
  try {
    const caddy = write(dir, "Caddyfile", caddyText({ proxyTarget: `127.0.0.1:${SERVICE_PORT}` }));
    const unit = write(dir, "unit.service", unitText());
    assert.notEqual(run(caddy, unit).status, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("rejects a unit whose WorkingDirectory names the colony's own hostname", () => {
  const dir = mkdtempSync(join(tmpdir(), "boundary-verify-workingdir-"));
  try {
    const caddy = write(dir, "Caddyfile", caddyText({ proxyTarget: "100.64.1.2:19748" }));
    const unit = write(dir, "unit.service", unitText({ hostname: HOSTNAME }));
    assert.notEqual(run(caddy, unit).status, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("rejects a unit whose Description names the colony's own application", () => {
  const dir = mkdtempSync(join(tmpdir(), "boundary-verify-description-"));
  try {
    const caddy = write(dir, "Caddyfile", caddyText({ proxyTarget: "100.64.1.2:19748" }));
    const unit = write(dir, "unit.service", unitText({ description: HOSTNAME }));
    assert.notEqual(run(caddy, unit).status, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("rejects when required --expect-* arguments are missing", () => {
  const dir = mkdtempSync(join(tmpdir(), "boundary-verify-missing-args-"));
  try {
    const caddy = write(dir, "Caddyfile", caddyText({ proxyTarget: "100.64.1.2:19748" }));
    const unit = write(dir, "unit.service", unitText());
    const environment = { ...process.env }; delete environment.NODE_TEST_CONTEXT;
    const result = spawnSync(process.execPath, [verifier, `--caddyfile=${caddy}`, `--unit-file=${unit}`], { encoding: "utf8", env: environment });
    assert.notEqual(result.status, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

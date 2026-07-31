#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const args = new Map(process.argv.slice(2).filter((arg) => arg.startsWith("--")).map((arg) => {
  const [key, value = "true"] = arg.slice(2).split("=", 2); return [key, value];
}));
const caddyfile = args.get("caddyfile");
const unitFile = args.get("unit-file");
const relayUnitDir = args.get("relay-unit-dir");
const live = args.has("live");
const expectHostname = args.get("expect-hostname");
const expectServicePort = args.get("expect-service-port");
const expectAppService = args.get("expect-app-service");
const errors = [];

if (!expectHostname) errors.push("--expect-hostname is required");
if (!expectServicePort) errors.push("--expect-service-port is required");
if (!expectAppService) errors.push("--expect-app-service is required");
if (!caddyfile || !existsSync(caddyfile)) errors.push("a readable --caddyfile is required");
if (!unitFile || !existsSync(unitFile)) errors.push("a readable --unit-file is required");

if (!errors.length) {
  const caddy = readFileSync(caddyfile, "utf8");
  const unit = readFileSync(unitFile, "utf8");
  const escapedHost = expectHostname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = caddy.match(new RegExp(`${escapedHost}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"))?.[1] ?? "";
  if (new RegExp(`reverse_proxy\\s+(?:https?://)?(?:127\\.0\\.0\\.1|localhost):${expectServicePort}\\b`).test(block)) {
    errors.push(`${expectHostname} proxies to VPS loopback:${expectServicePort}`);
  }
  const workingDirRe = new RegExp(`WorkingDirectory=.*${escapedHost}`);
  const descriptionRe = new RegExp(`Description=@red-cup-engineering/${escapedHost}`);
  if (workingDirRe.test(unit) || descriptionRe.test(unit)) errors.push("a colony application unit remains installed on the relay colony");
}

if (live && !errors.length) {
  if (relayUnitDir && existsSync(`${relayUnitDir}/${expectAppService}`)) errors.push("a colony application unit remains installed on the relay colony");
  try {
    const state = execFileSync("systemctl", ["--user", "is-active", expectAppService], { encoding: "utf8" }).trim();
    if (state === "active") errors.push("colony application unit is active on the relay colony");
  } catch { /* inactive/nonexistent is required */ }
}

if (errors.length) {
  process.stderr.write(`colony-execution-boundary: REJECT ${errors.join("; ")}\n`);
  process.exit(1);
}
process.stdout.write(`colony-execution-boundary: ACCEPT ${expectHostname} is not VPS-origin execution\n`);

import { spawn } from "node:child_process";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RUNNER = resolve(dirname(fileURLToPath(import.meta.url)), "runner.mjs");
const sourceId = (source) => identifyJsonSemanticContent({ objectKind: "rsc-quiescent.strategy-program-source", value: source, witnessRoot: EMPTY_WITNESS_ROOT }).token;
function containsCredential(value, seen = new Set()) {
  if (!value || typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  return Object.entries(value).some(([key, child]) => /^(?:secret|password|private[_-]?key|api[_-]?key|authorization|credential|access[_-]?token|bearer[_-]?token)$/iu.test(key) || containsCredential(child, seen));
}

export function createBubblewrapStrategyReplay({ bubblewrap = "/usr/bin/bwrap", node = "/usr/bin/node" } = {}) {
  return async function replay({ source, staticAssay, input, maximumWallClockMs = 5_000 } = {}) {
    if (staticAssay?.type !== "StrategyProgramStaticAssay" || staticAssay.admitted !== true || typeof source !== "string" || !Number.isInteger(maximumWallClockMs) || maximumWallClockMs < 100 || maximumWallClockMs > 60_000) throw new TypeError("admitted-program-and-bound-required");
    if (staticAssay.source !== sourceId(source)) throw new TypeError("static-assay-source-binding-invalid");
    if (containsCredential(input)) throw new TypeError("credential-bearing-replay-input-refused");
    const inputBytes = JSON.stringify(input);
    if (Buffer.byteLength(inputBytes) > 1_000_000) throw new RangeError("replay-input-too-large");
    const root = await mkdtemp(join(tmpdir(), "strategy-replay-")), strategy = join(root, "strategy.mjs");
    try {
      await writeFile(strategy, source, { flag: "wx", mode: 0o400 });
      const args = ["--unshare-all", "--die-with-parent", "--new-session", "--ro-bind", "/usr", "/usr", "--ro-bind", "/lib", "/lib", "--ro-bind", "/lib64", "/lib64", "--proc", "/proc", "--dev", "/dev", "--tmpfs", "/tmp", "--dir", "/work", "--ro-bind", strategy, "/work/strategy.mjs", "--ro-bind", RUNNER, "/work/runner.mjs", "--chdir", "/work", node, "/work/runner.mjs"];
      const child = spawn(bubblewrap, args, { stdio: ["pipe", "pipe", "pipe"], env: {}, timeout: maximumWallClockMs, killSignal: "SIGKILL" });
      child.stdin.end(inputBytes);
      let stdout = "", stderr = "", exceeded = false;
      child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => { stdout += chunk; if (stdout.length > 1_000_000) { exceeded = true; child.kill("SIGKILL"); } });
      child.stderr.on("data", (chunk) => { stderr += chunk; if (stderr.length > 64_000) child.kill("SIGKILL"); });
      const status = await new Promise((accept, reject) => { child.once("error", reject); child.once("close", (code, signal) => accept({ code, signal })); });
      if (exceeded) return Object.freeze({ type: "StrategyProgramReplayRefusal", version: 1, source: staticAssay.source, reason: "sandbox-output-too-large", admitted: false });
      if (status.code !== 0) return Object.freeze({ type: "StrategyProgramReplayRefusal", version: 1, source: staticAssay.source, reason: status.signal ? `terminated:${status.signal}` : `sandbox-exit:${status.code}`, diagnostic: stderr.slice(0, 1_000), admitted: false });
      let output;
      try { output = JSON.parse(stdout); } catch { throw new TypeError("sandbox-output-invalid"); }
      return Object.freeze({ type: "DeterministicStrategyProgramReplay", version: 1, source: staticAssay.source, output, network: false, hostWrites: false, deterministicDoubleRun: true, maximumWallClockMs, executionEffect: "sandbox-only" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  };
}

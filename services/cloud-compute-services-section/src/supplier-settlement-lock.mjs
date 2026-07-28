import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export async function withSupplierSettlementLock(lockPath, action, { flock = "/usr/bin/flock", label = "supplier actuation" } = {}) {
  mkdirSync(dirname(lockPath), { recursive: true });
  const holder = spawn(flock, ["--exclusive", "--nonblock", "--conflict-exit-code", "75", lockPath, process.execPath, "-e", "process.stdout.write('acquired\\n'); process.stdin.resume();"], { stdio: ["pipe", "pipe", "pipe"] });
  let stderr = "";
  holder.stderr.setEncoding("utf8"); holder.stderr.on("data", (chunk) => { stderr += chunk; });
  await new Promise((accept, reject) => {
    let stdout = "";
    const fail = (code, signal) => {
      const error = new Error(code === 75 ? `${label} lock is already held` : `${label} lock failed: code=${code ?? "none"} signal=${signal ?? "none"}${stderr ? ` ${stderr.trim()}` : ""}`);
      if (code === 75) { error.code = "supplier-settlement-lock-held"; error.recoveryRequired = true; }
      reject(error);
    };
    holder.once("error", reject); holder.once("exit", fail); holder.stdout.setEncoding("utf8");
    holder.stdout.on("data", (chunk) => { stdout += chunk; if (stdout.includes("acquired\n")) { holder.off("exit", fail); accept(); } });
  });
  try { return await action(); }
  finally { const exited = new Promise((accept) => holder.once("exit", accept)); holder.stdin.end(); await exited; }
}

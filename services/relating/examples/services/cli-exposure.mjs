import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const cli = resolve("dist/services/cli/main.mjs");
if (!existsSync(cli)) {
  throw new Error("dist/services/cli/main.mjs missing; run pnpm build first");
}

const result = spawnSync(process.execPath, [cli, "canonicalize"], {
  input: '{"b":2,"a":1}',
  encoding: "utf8",
});

if (result.status !== 0) {
  throw new Error(result.stderr || `relate exited ${result.status}`);
}

console.log(JSON.stringify({
  command: "relate canonicalize",
  stdout: result.stdout.trim(),
}, null, 2));

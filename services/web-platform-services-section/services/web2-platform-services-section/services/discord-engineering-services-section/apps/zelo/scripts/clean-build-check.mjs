import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = await mkdtemp(path.join(os.tmpdir(), "zelo-clean-build-"));
const copyOptions = { recursive: true, filter: (source) => !["node_modules", "dist", ".git"].includes(path.basename(source)) };
try {
  await cp(app, tempRoot, copyOptions);
  const testDirectory = path.join(tempRoot, "test");
  const testFiles = (await readdir(testDirectory)).filter((name) => name.endsWith(".test.mjs")).map((name) => path.join(testDirectory, name));
  const result = spawnSync(process.execPath, ["--test", ...testFiles], { encoding: "utf8", env: process.env });
  if (result.status !== 0) throw new Error(`clean checkout tests failed in ${tempRoot}\n${result.stdout}\n${result.stderr}`);
  process.stdout.write("clean checkout ran without node_modules or a build step\n");
} finally {
  if (!tempRoot.startsWith(path.join(os.tmpdir(), "zelo-clean-build-"))) throw new Error("refusing to remove unexpected clean-build directory");
  await rm(tempRoot, { recursive: true, force: true });
}

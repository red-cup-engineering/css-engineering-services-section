import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const source = path.resolve(import.meta.dirname, "..");
const target = await mkdtemp(path.join(os.tmpdir(), "community-response-clean-"));
try {
  await cp(source, target, { recursive: true, filter: (entry) => !entry.includes(`${path.sep}node_modules`) && !entry.includes(`${path.sep}.tmp`) });
  const manifest = JSON.parse(await readFile(path.join(target, "package.json"), "utf8"));
  if (manifest.private === true) throw new Error("clean copy must be publishable");
  if (manifest.exports?.["."]?.import !== "./src/index.mjs") throw new Error("clean copy must export its public module entrypoint");
  const module = await import(path.join(target, "src", "index.mjs"));
  if (typeof module.planCommunityResponse !== "function") throw new Error("clean copy did not load source exports");
  process.stdout.write("clean source copy loaded without generated artifacts\n");
} finally {
  await rm(target, { recursive: true, force: true });
}

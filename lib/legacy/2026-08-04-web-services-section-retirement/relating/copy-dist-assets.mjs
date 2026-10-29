/**
 * copy-dist-assets - mirror non-TypeScript source assets into dist.
 *
 * `tsc` emits .mjs/.d.mts and maps. Any plain source assets still present under
 * `src/` are copied to the same relative path under `dist`. Carrier schemas are
 * not copied files; OpenAPI and MCP serialize them from carrier declarations.
 */
import { readdirSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const pkgDir = dirname(fileURLToPath(import.meta.url));
const sourceRoots = ["lib", "src", "services"].map((name) => join(pkgDir, name));
const distDir = join(pkgDir, "dist");

function* assetFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // A nested service is an Actor boundary, not an invitation to publish its
      // installed dependencies, build products, or private runtime state as
      // assets of @red-cup-engineering/relating.
      if (["node_modules", "dist", "data", ".git"].includes(entry.name)) continue;
      yield* assetFiles(full);
    }
    else if (
      !entry.name.endsWith(".mts")
      && !entry.name.endsWith(".mjs")
      && !entry.name.endsWith(".mjs.map")
      && !entry.name.endsWith(".d.mts")
      && !entry.name.endsWith(".d.mts.map")
    ) yield full;
  }
}

let copied = 0;
for (const root of sourceRoots) {
  for (const file of assetFiles(root)) {
    // Mirror under dist preserving the lib/ or src/ prefix (matches tsc rootDir ".").
    const dest = join(distDir, relative(pkgDir, file));
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(file, dest);
    copied += 1;
  }
}
process.stderr.write(`copy-dist-assets: ${copied} asset(s) -> dist/\n`);

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function filesUnder(dir) {
  const abs = resolve(root, dir);
  if (!existsSync(abs)) return [];
  const out = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && path.endsWith(".mts")) out.push(path);
    }
  };
  walk(abs);
  return out;
}

function importsOf(file) {
  const text = readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  const imports = [];
  const re = /(?:from\s+["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["'])/g;
  let match;
  while ((match = re.exec(text)) !== null) imports.push(match[1] ?? match[2] ?? match[3]);
  return imports;
}

function sourceRoot(file) {
  return relative(root, file).split(sep)[0];
}

function relativeTargetRoot(file, specifier) {
  if (!specifier.startsWith(".")) return undefined;
  const target = resolve(dirname(file), specifier);
  const rel = relative(root, target);
  if (rel.startsWith("..")) return "outside";
  return rel.split(sep)[0];
}

describe("derived import order", () => {
  it("keeps lower roots from importing higher realization modes", () => {
    const violations = [];
    for (const file of filesUnder("lib").concat(filesUnder("src"), filesUnder("services"), filesUnder("apps"))) {
      const origin = sourceRoot(file);
      for (const specifier of importsOf(file)) {
        const targetRoot = relativeTargetRoot(file, specifier);
        const label = `${relative(root, file)} -> ${specifier}`;
        if (origin === "lib" && specifier.startsWith("node:")) violations.push(`${label} (lib imports Node)`);
        if (origin === "lib" && specifier.startsWith("@red-cup-engineering/relating")) violations.push(`${label} (lib imports package self)`);
        if (origin === "lib" && ["src", "services", "apps"].includes(targetRoot)) violations.push(`${label} (lib imports ${targetRoot})`);
        if (origin === "src" && ["services", "apps"].includes(targetRoot)) violations.push(`${label} (src imports ${targetRoot})`);
        if (origin === "services" && targetRoot === "apps") violations.push(`${label} (services imports apps)`);
        if (origin === "apps" && targetRoot === "services") violations.push(`${label} (apps imports services source)`);
      }
    }
    assert.deepEqual(violations, []);
  });
});

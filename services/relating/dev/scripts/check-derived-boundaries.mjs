#!/usr/bin/env node
/**
 * Check the derived root import law for @red-cup-engineering/relating.
 *
 * This is intentionally conservative. It verifies the root-mode boundary:
 *
 *   services -> src -> lib
 *   apps     -> src -> lib
 *
 * and that pure lib modules do not import Node, package self-surfaces, or higher
 * roots. It does not try to classify every mathematical stratum inside lib.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const roots = ["lib", "src", "services", "apps", "scripts"];
const sourceRoots = roots
  .map((root) => ({ root, path: resolve(packageRoot, root) }))
  .filter(({ path }) => existsSync(path));

const importPattern =
  /\bimport\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?["']([^"']+)["']|\bexport\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?["']([^"']+)["']/g;

function* files(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) yield* files(full);
    else if (entry.isFile() && full.endsWith(".mts")) yield full;
  }
}

function rootOfPath(path) {
  const rel = relative(packageRoot, path);
  if (rel.startsWith("..")) return undefined;
  return rel.split(sep)[0];
}

function stripComments(source) {
  let out = "";
  let mode = "code";
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    if (mode === "line") {
      if (current === "\n") {
        mode = "code";
        out += current;
      }
      continue;
    }
    if (mode === "block") {
      if (current === "*" && next === "/") {
        mode = "code";
        index += 1;
      }
      continue;
    }
    if (mode === "single" || mode === "double" || mode === "template") {
      out += current;
      if (current === "\\") {
        index += 1;
        out += source[index] ?? "";
        continue;
      }
      if (
        (mode === "single" && current === "'")
        || (mode === "double" && current === "\"")
        || (mode === "template" && current === "`")
      ) mode = "code";
      continue;
    }
    if (current === "/" && next === "/") {
      mode = "line";
      index += 1;
      continue;
    }
    if (current === "/" && next === "*") {
      mode = "block";
      index += 1;
      continue;
    }
    if (current === "'") mode = "single";
    else if (current === "\"") mode = "double";
    else if (current === "`") mode = "template";
    out += current;
  }
  return out;
}

function resolveRelativeImport(fromFile, specifier) {
  if (!specifier.startsWith(".")) return undefined;
  return resolve(dirname(fromFile), specifier);
}

function classifyImport(fromFile, specifier) {
  if (specifier.startsWith("node:")) return { kind: "node" };
  if (specifier === "@red-cup-engineering/relating" || specifier.startsWith("@red-cup-engineering/relating/")) return { kind: "self" };
  const resolved = resolveRelativeImport(fromFile, specifier);
  if (resolved === undefined) return { kind: "external" };
  return { kind: "relative", root: rootOfPath(resolved) };
}

function violation(fromRoot, specifier, target) {
  if (fromRoot === "lib") {
    if (target.kind === "node") return "lib imports Node host API";
    if (target.kind === "self") return "lib imports package self-surface";
    if (target.kind === "relative" && target.root !== "lib") return `lib imports ${target.root ?? "outside package"}`;
  }
  if (fromRoot === "src") {
    if (target.kind === "relative" && ["services", "apps", "scripts"].includes(target.root ?? "")) {
      return `src imports ${target.root}`;
    }
  }
  if (fromRoot === "services") {
    if (target.kind === "relative" && ["apps", "scripts"].includes(target.root ?? "")) return `services imports ${target.root}`;
  }
  if (fromRoot === "apps") {
    if (target.kind === "relative" && ["services", "scripts"].includes(target.root ?? "")) return `apps imports ${target.root}`;
  }
  if (fromRoot === "scripts") {
    return "scripts is not a derived target root; move process entrypoints to services";
  }
  return undefined;
}

const problems = [];

for (const { root, path } of sourceRoots) {
  for (const file of files(path)) {
    if (root === "scripts") {
      problems.push({
        file: relative(packageRoot, file),
        specifier: "<root>",
        reason: "scripts is not a derived target root; move process entrypoints to services",
      });
      continue;
    }
    const text = stripComments(readFileSync(file, "utf8"));
    for (const match of text.matchAll(importPattern)) {
      const specifier = match[1] ?? match[2];
      if (specifier === undefined) continue;
      const target = classifyImport(file, specifier);
      const reason = violation(root, specifier, target);
      if (reason !== undefined) {
        problems.push({
          file: relative(packageRoot, file),
          specifier,
          reason,
        });
      }
    }
  }
}

if (problems.length > 0) {
  for (const problem of problems) {
    console.error(`${problem.file}: ${problem.reason}: ${problem.specifier}`);
  }
  process.exitCode = 1;
} else {
  console.log("derived boundary check passed");
}

// codecs - representation and environment boundaries for computing.

import { isAbsolute, join, resolve } from "node:path";

import { fileExists, readTextFileSync } from "./admission.mjs";

export type EnvironmentalConfigurationSource =
  | Readonly<{ kind: "stdin"; label: "stdin" }>
  | Readonly<{ kind: "explicit"; path: string }>
  | Readonly<{ kind: "file"; path: string }>
  | Readonly<{ kind: "package"; path: string }>;

export type EnvironmentalConfiguration<T> = Readonly<{
  document: T;
  source: EnvironmentalConfigurationSource;
}>;

export type EnvironmentalConfigurationOptions<T> = Readonly<{
  name: string;
  cwd?: string;
  explicitPath?: string;
  stdinText?: string;
  parse: (input: unknown) => T;
}>;

function readJson(path: string): unknown {
  return JSON.parse(readTextFileSync(path)) as unknown;
}

function resolveFrom(cwd: string, path: string): string {
  return isAbsolute(path) ? path : resolve(cwd, path);
}

function candidatePaths(cwd: string, name: string): readonly string[] {
  return Object.freeze([
    join(cwd, `${name}.config.json`),
    join(cwd, "config", `${name}.json`),
    join(cwd, "package.json"),
  ]);
}

export function loadEnvironmentalConfiguration<T>(options: EnvironmentalConfigurationOptions<T>): EnvironmentalConfiguration<T> {
  const cwd = options.cwd ?? process.cwd();
  if (options.stdinText !== undefined && options.stdinText.trim() !== "") {
    return Object.freeze({
      document: options.parse(JSON.parse(options.stdinText) as unknown),
      source: Object.freeze({ kind: "stdin" as const, label: "stdin" as const }),
    });
  }
  if (options.explicitPath !== undefined) {
    const path = resolveFrom(cwd, options.explicitPath);
    return Object.freeze({
      document: options.parse(readJson(path)),
      source: Object.freeze({ kind: "explicit" as const, path }),
    });
  }
  for (const path of candidatePaths(cwd, options.name)) {
    if (!fileExists(path)) continue;
    const document = readJson(path);
    return Object.freeze({
      document: options.parse(document),
      source: Object.freeze({ kind: path.endsWith("package.json") ? "package" as const : "file" as const, path }),
    });
  }
  throw new Error(`No ${options.name} configuration found in ${cwd}`);
}

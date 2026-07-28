import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function loadExtendedJson(path, seen = new Set()) {
  const absolute = resolve(path);
  if (seen.has(absolute) || seen.size >= 8) throw new Error(`extended JSON inheritance cycle or depth overflow: ${absolute}`);
  seen.add(absolute);
  const value = JSON.parse(readFileSync(absolute, "utf8"));
  if (!value.extends) return value;
  if (typeof value.extends !== "string" || !value.extends) throw new Error(`invalid extended JSON parent in ${absolute}`);
  const parent = loadExtendedJson(resolve(dirname(absolute), value.extends), seen);
  const { extends: _extends, ...overlay } = value;
  return { ...parent, ...overlay };
}

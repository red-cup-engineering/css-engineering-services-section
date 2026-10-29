function indexValue(value: unknown, key: string): unknown {
  if (value && typeof value === "object") return (value as Record<string, unknown>)[key];
  for (const pair of String(value ?? "").split(/[;&]/)) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    if (pair.slice(0, eq).trim() === key) return decodeURIComponent(pair.slice(eq + 1).trim());
  }
  return undefined;
}

export function substituteVars(text: unknown, vars: Record<string, unknown> = {}): string {
  let out = String(text ?? "");
  if (!out.includes("$")) return out;
  const sentinel = "\0ESI_DOLLAR\0";
  out = out.replace(/\$\$/g, sentinel);
  out = out.replace(/\$\(([A-Za-z0-9_]+)(?:\{([^}]*)\})?(?:\|([^)]*))?\)/g, (_all, name: string, key: string | undefined, fallback: string | undefined) => {
    let value = vars[name];
    if (key !== undefined) value = indexValue(value, key);
    if (value == null || value === "") return fallback ?? "";
    return String(value);
  });
  return out.split(sentinel).join("$");
}

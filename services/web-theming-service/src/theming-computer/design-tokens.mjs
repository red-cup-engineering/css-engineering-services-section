// Reading a Design Tokens Community Group document (Format Module 2025.10): one reader for every
// surface that takes its design from tokens (web themes, book stylesheets). Aliases `{a.b.c}`
// resolve; a missing or malformed token is an error naming it, never a guess.

const TOKEN_ALIAS = /^\{([A-Za-z0-9_.-]+)\}$/u;
const HEX = /^#[0-9A-Fa-f]{6}$/u;

function tokenAt(tokens, path) {
  let node = tokens;
  for (const key of path.split(".")) {
    if (node === null || typeof node !== "object" || !(key in node)) {
      throw new Error(`design tokens have no "${path}"`);
    }
    node = node[key];
  }
  return node;
}

/** Whether the document holds a token (or group) at a dotted path. */
export function hasDesignToken(tokens, path) {
  try { tokenAt(tokens, path); return true; } catch { return false; }
}

/** A token's value at a dotted path, following aliases. */
export function designTokenValue(tokens, path, seen = new Set()) {
  if (seen.has(path)) throw new Error(`design token alias cycle at "${path}"`);
  seen.add(path);
  const node = tokenAt(tokens, path);
  const value = node !== null && typeof node === "object" && "$value" in node ? node.$value : node;
  const alias = typeof value === "string" ? TOKEN_ALIAS.exec(value) : null;
  return alias ? designTokenValue(tokens, alias[1], seen) : value;
}

/** The font-family stack of a `type.<name>` typography composite, as an array of names. */
export function designTokenFontStack(tokens, typeToken) {
  const composite = designTokenValue(tokens, `type.${typeToken}`);
  const family = typeof composite?.fontFamily === "string" && TOKEN_ALIAS.test(composite.fontFamily)
    ? designTokenValue(tokens, TOKEN_ALIAS.exec(composite.fontFamily)[1])
    : composite?.fontFamily;
  const stack = Array.isArray(family) ? family : [family];
  if (stack.length === 0 || stack.some((name) => typeof name !== "string" || name === "")) {
    throw new Error(`design token type.${typeToken} names no font family stack`);
  }
  return Object.freeze([...stack]);
}

/** A color token as `#RRGGBB` (uppercase). With `mode`, the value in `$extensions.mode.<mode>`. */
export function designTokenColor(tokens, path, { mode } = {}) {
  let value;
  if (mode === undefined) value = designTokenValue(tokens, path);
  else {
    const node = tokenAt(tokens, path);
    value = node?.$extensions?.mode?.[mode];
    if (value === undefined) throw new Error(`design token ${path} has no ${mode} mode value`);
    const alias = typeof value === "string" ? TOKEN_ALIAS.exec(value) : null;
    if (alias) value = designTokenValue(tokens, alias[1]);
  }
  const hex = typeof value === "string" ? value : value?.hex;
  if (typeof hex !== "string" || !HEX.test(hex)) throw new Error(`design token ${path} carries no six-digit hex color`);
  return hex.toUpperCase();
}

/** A CSS font-family list from a stack: named families quoted, generic families bare. */
export function cssFontFamilyList(stack) {
  // CSS Fonts Level 4 generic family keywords (§ 2.1.1); quoting one makes it an unknown named family.
  const generic = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded", "math", "emoji", "fangsong"]);
  return stack.map((name) => (generic.has(name) ? name : `"${name}"`)).join(", ");
}

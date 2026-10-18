/**
 * codecs/text/css/theme-tokens — the theme design-token vocabulary.
 *
 * A palette is data, not an opaque CSS string: `ThemeTokens` names a fixed
 * 19-role vocabulary (colour roles ink/surface/accent/…, type/layout roles
 * sans/measure/…) with one canonical CSS custom-property mapping
 * (`tokenVar`) at this lower CSS owner. The colour math itself — `derivePalette`'s perceptual OKLCH
 * derivation from seed colours, `deriveDark`'s dark-scheme synthesis, and
 * the whole hex/OKLCH pipeline underneath them — lives once, in
 * `@red-cup-engineering/web-theming-service`; this codec adds only the
 * MetroPlat-specific projection of a `ThemePalette` into this package's own
 * cascade engine (`assignmentSetToStylesheet`/`CssAuthoredRule`) — no
 * separate CSS string emitter lives here.
 *
 * @packageDocumentation
 */
const TOKEN_VARS = Object.freeze({
    ink: "--ink",
    inkSoft: "--ink-soft",
    surface: "--surface",
    surfaceDeep: "--surface-deep",
    surfaceEdge: "--surface-edge",
    rule: "--rule",
    tint: "--tint",
    tintStrong: "--tint-strong",
    selection: "--selection",
    accent: "--accent",
    alarm: "--alarm",
    visited: "--visited",
    sans: "--sans",
    serif: "--serif",
    mono: "--mono",
    gutter: "--gutter",
    max: "--max",
    measure: "--measure",
    radius: "--radius"
});
export const THEME_TOKEN_ROLES = Object.freeze(Object.keys(TOKEN_VARS));
export function tokenVar(role) {
    return TOKEN_VARS[role];
}
import { assignmentSetToStylesheet } from "./css-cascade.mjs";


/** The canonical theme design-token vocabulary: every role a theme may declare. */

/** A palette: a default (`light`) token set, optional `dark` overrides, and named `variants`. */

/** The three-to-four seed colours `derivePalette`/`deriveDark` need. */

/** Merge palette layers left-to-right; a later layer's defined token wins. */
export function composeTokens(...layers) {
  const out = {};
  for (const layer of layers) {
    if (layer === undefined) continue;
    for (const role of THEME_TOKEN_ROLES) {
      const value = layer[role];
      if (value !== undefined) out[role] = value;
    }
  }
  return Object.freeze(out);
}

function tokenDeclarations(tokens) {
  const out = {};
  for (const role of THEME_TOKEN_ROLES) {
    const value = tokens[role];
    if (value !== undefined) out[tokenVar(role)] = value;
  }
  return out;
}

/** Project a `ThemePalette` into `CssAuthoredRule`s: base `:root`, dark `@media`, and `[data-theme]` switches. */
export function paletteToCssRules(palette) {
  const rules = [Object.freeze({ selector: ":root", declarations: Object.freeze(tokenDeclarations(palette.light)) })];
  if (palette.dark !== undefined) {
    const dark = composeTokens(palette.light, palette.dark);
    rules.push(Object.freeze({
      selector: ":root",
      declarations: Object.freeze(tokenDeclarations(dark)),
      condition: Object.freeze({ media: "(prefers-color-scheme: dark)" }),
    }));
    rules.push(Object.freeze({ selector: '[data-theme="light"]', declarations: Object.freeze(tokenDeclarations(palette.light)) }));
    rules.push(Object.freeze({ selector: '[data-theme="dark"]', declarations: Object.freeze(tokenDeclarations(dark)) }));
  }
  if (palette.variants !== undefined) {
    for (const [name, tokens] of Object.entries(palette.variants)) {
      rules.push(Object.freeze({
        selector: `[data-theme="${name}"]`,
        declarations: Object.freeze(tokenDeclarations(composeTokens(palette.light, tokens))),
      }));
    }
  }
  return Object.freeze(rules);
}

/** Render a `ThemePalette` to CSS text through this codec's own cascade engine. */
export function paletteCss(palette, profile) {
  const rules = paletteToCssRules(palette);
  return profile === undefined
    ? assignmentSetToStylesheet({ loci: [], fibers: [], rules })
    : assignmentSetToStylesheet({ loci: [], fibers: [], rules }, profile);
}

import { paletteCss } from './palette-css.mjs';
import {
  certifyContrast,
  contrastRatio as sharedContrastRatio,
  toGrayscale,
} from '../theming-computer/index.mjs';
import { cssFontFamilyList, designTokenColor, designTokenFontStack } from '../theming-computer/design-tokens.mjs';
export { hexToRgb, luminance, toGrayscale } from '../theming-computer/index.mjs';

// Themes are finished, validated data. A theme that fails contrast does not build.
// Ratios per the design rules: body text 7:1, non-text 3:1, checked in light,
// dark, and grayscale print.

export const DEFAULT_THEME = {
  name: 'victor-default',
  colors: {
    paper:  { light: '#FBFAF7', dark: '#131313' },
    ink:    { light: '#191919', dark: '#ECE9E3' },
    muted:  { light: '#3F3E3A', dark: '#C9C5BC' },
    line:   { light: '#6E6A63', dark: '#8A867E' },
    wash:   { light: '#F1EFE9', dark: '#1D1D1B' },
    jewel:  { light: '#6E1E3C', dark: '#E7A6BE' },
    signal: { light: '#1E3A5F', dark: '#9DB8D8' },
  },
  jewel: 'jewel',
  space: [4, 8, 12, 16, 24, 32, 48, 64],
  type: {
    families: ["'IBM Plex Serif', Georgia, serif", "'IBM Plex Sans', system-ui, sans-serif", "'IBM Plex Mono', ui-monospace, monospace"],
    sizes: [13, 15, 17, 20, 24, 30, 38],
    roles: { display: 6, heading: 4, body: 2, annotation: 0 },
  },
  geometry: 'standard',
  density: 'standard',
};

// ---------- a theme from design tokens ----------

// VICTOR's seven color roles, read from a DTCG document's `color.<role>` tokens (the jewel from
// `color.accent`); each color's light value is its `$value` and its dark value is
// `$extensions.mode.dark`. The three families are the reading, display and metadata stacks of
// the `type.body-1`, `type.display-1` and `type.metadata` composites. The result is an ordinary
// theme, so it is held to the same contrast floors as any other.
const TOKEN_COLOR_ROLES = Object.freeze({ paper: 'paper', ink: 'ink', muted: 'muted', line: 'line', wash: 'wash', jewel: 'accent', signal: 'signal' });

export function themeFromDesignTokens(tokens, { name = 'design-tokens' } = {}) {
  const colors = {};
  for (const [role, token] of Object.entries(TOKEN_COLOR_ROLES)) {
    colors[role] = {
      light: designTokenColor(tokens, `color.${token}`),
      dark: designTokenColor(tokens, `color.${token}`, { mode: 'dark' }),
    };
  }
  return {
    ...DEFAULT_THEME,
    name,
    colors,
    jewel: 'jewel',
    type: {
      ...DEFAULT_THEME.type,
      families: ['body-1', 'display-1', 'metadata'].map((role) => cssFontFamilyList(designTokenFontStack(tokens, role))),
    },
  };
}

// ---------- WCAG contrast math ----------

// Keep VICTOR's public API while using the shared WCAG implementation.
export const contrastRatio = sharedContrastRatio;

// ---------- validation ----------

const TEXT_PAIRS = [ // token on paper, body-size text: 7:1
  ['ink', 'paper'], ['muted', 'paper'], ['jewel', 'paper'], ['signal', 'paper'],
];
const SURFACE_PAIRS = [['ink', 'wash']]; // text on the wash fill: 7:1
const NONTEXT_PAIRS = [['line', 'paper']]; // meaningful non-text: 3:1

export function validateTheme(theme) {
  const refusals = [];
  const modes = ['light', 'dark'];
  const renditions = [
    { name: 'screen', map: (hex) => hex },
    { name: 'grayscale-print', map: toGrayscale },
  ];
  for (const mode of modes) {
    for (const rendition of renditions) {
      if (rendition.name === 'grayscale-print' && mode === 'dark') continue; // print renders light
      const color = (token) => rendition.map(theme.colors[token][mode]);
      const check = (a, b, floor) => {
        const certification = certifyContrast(
          { foreground: color(a), background: color(b) },
          [{
            fg: 'foreground', bg: 'background', pair: `${a} on ${b}`,
            level: floor === 7 ? 'AAA' : 'AA', large: floor === 3,
          }],
        )[0];
        if (!certification.passes) {
          refusals.push({
            code: 'R-07', subject: theme.name,
            reason: `${a} on ${b} (${mode}, ${rendition.name}) measures ${certification.ratio.toFixed(2)}:1; the floor is ${floor}:1`,
            data: { pair: [a, b], mode, rendition: rendition.name, ratio: certification.ratio, floor },
          });
        }
      };
      for (const [a, b] of TEXT_PAIRS) check(a, b, 7);
      for (const [a, b] of SURFACE_PAIRS) check(a, b, 7);
      for (const [a, b] of NONTEXT_PAIRS) check(a, b, 3);
    }
  }
  if (theme.colors[theme.jewel] === undefined) {
    refusals.push({ code: 'R-08', subject: theme.name, reason: `jewel token "${theme.jewel}" is not a color token` });
  }
  if (Object.keys(theme.colors).length !== 7) {
    refusals.push({ code: 'R-08', subject: theme.name, reason: `a theme defines exactly 7 color tokens; this one defines ${Object.keys(theme.colors).length}` });
  }
  return refusals;
}

// ---------- stylesheet generation ----------

export function generateStylesheet(theme) {
  const t = theme;
  const sz = t.type.sizes;
  const sp = t.space;
  const measure = { narrow: '58ch', standard: '68ch', wide: '78ch' }[t.geometry];
  const sharedPalette = {
    light: {
      ink: t.colors.ink.light,
      inkSoft: t.colors.muted.light,
      surface: t.colors.paper.light,
      surfaceDeep: t.colors.wash.light,
      surfaceEdge: t.colors.line.light,
      rule: t.colors.line.light,
      accent: t.colors[t.jewel].light,
      alarm: t.colors.signal.light,
      serif: t.type.families[0],
      sans: t.type.families[1],
      mono: t.type.families[2],
      measure,
    },
    dark: {
      ink: t.colors.ink.dark,
      inkSoft: t.colors.muted.dark,
      surface: t.colors.paper.dark,
      surfaceDeep: t.colors.wash.dark,
      surfaceEdge: t.colors.line.dark,
      rule: t.colors.line.dark,
      accent: t.colors[t.jewel].dark,
      alarm: t.colors.signal.dark,
      serif: t.type.families[0],
      sans: t.type.families[1],
      mono: t.type.families[2],
      measure,
    },
  };
  return `/* generated from theme "${t.name}" — do not hand-edit */
${paletteCss(sharedPalette)}
:root {
  --paper: var(--surface);
  --muted: var(--ink-soft);
  --line: var(--surface-edge);
  --wash: var(--surface-deep);
  --jewel: var(--accent);
  --signal: var(--alarm);
  --font-serif: var(--serif);
  --font-sans: var(--sans);
  --font-mono: var(--mono);
}
:root:not([data-theme="light"]) { }
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--paper); color: var(--ink);
  font-family: var(--font-serif); font-size: ${sz[t.type.roles.body]}px; line-height: 1.55;
}
a { color: var(--jewel); }
:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
.skip-link { position: absolute; left: -999px; }
.skip-link:focus { left: ${sp[1]}px; top: ${sp[1]}px; background: var(--paper); padding: ${sp[1]}px; }
.page { max-width: calc(${measure} + 22rem); margin: 0 auto; padding: 0 ${sp[3]}px; }
.masthead { display: flex; gap: ${sp[3]}px; align-items: baseline; padding: ${sp[3]}px 0; border-block-end: 1px solid var(--line); font-family: var(--font-sans); }
.masthead .site-name { font-weight: 600; color: var(--ink); text-decoration: none; }
.masthead nav a { margin-inline-start: ${sp[2]}px; color: var(--ink); }
.breadcrumb { font-family: var(--font-sans); font-size: ${sz[0]}px; padding: ${sp[1]}px 0; }
.breadcrumb ol { list-style: none; margin: 0; padding: 0; display: flex; gap: ${sp[0]}px; }
.breadcrumb li + li::before { content: "/"; margin-inline-end: ${sp[0]}px; color: var(--muted); }
.layout { display: grid; grid-template-columns: minmax(0, ${measure}) 18rem; gap: ${sp[5]}px; }
main .eyebrow { font-family: var(--font-sans); font-size: ${sz[0]}px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin: ${sp[4]}px 0 0; }
main h1 { font-size: ${sz[t.type.roles.display]}px; line-height: 1.15; margin: ${sp[1]}px 0 ${sp[3]}px; }
h2 { font-size: ${sz[t.type.roles.heading]}px; margin-block-start: ${sp[5]}px; }
h3 { font-size: ${sz[3]}px; }
.reservoir { font-family: var(--font-sans); font-size: ${sz[0]}px; color: var(--muted); border-inline-start: 1px solid var(--line); padding-inline-start: ${sp[3]}px; }
.reservoir h2 { font-size: ${sz[1]}px; margin-block-start: ${sp[3]}px; }
.reservoir ul { list-style: none; padding: 0; margin: 0; }
.reservoir li { margin-block-end: ${sp[1]}px; }
.colophon { border-block-start: 1px solid var(--line); margin-block-start: ${sp[6]}px; padding: ${sp[3]}px 0; font-family: var(--font-sans); font-size: ${sz[0]}px; color: var(--muted); }
.callout { border-inline-start: 3px solid var(--signal); background: var(--wash); padding: ${sp[2]}px ${sp[3]}px; margin: ${sp[3]}px 0; }
.callout-label { font-family: var(--font-sans); font-weight: 600; margin: 0 0 ${sp[0]}px; }
.listing { margin: ${sp[3]}px 0; }
.listing pre { overflow-x: auto; background: var(--wash); padding: ${sp[2]}px; margin: 0; }
.listing code, code { font-family: var(--font-mono); font-size: 0.92em; }
.listing-language { font-family: var(--font-sans); font-size: ${sz[0]}px; color: var(--muted); }
.inline-fields { background: var(--wash); padding: ${sp[2]}px ${sp[3]}px; margin: ${sp[3]}px 0; }
.inline-field { display: flex; gap: ${sp[1]}px; }
.inline-field dt { font-family: var(--font-sans); font-weight: 600; }
.inline-field dd { margin: 0; }
.potential-link { border-block-end: 1px dashed var(--muted); }
.sidenote-state { display: none; }
.sidenote-toggle sup { color: var(--jewel); cursor: pointer; }
.sidenote { display: block; font-family: var(--font-sans); font-size: ${sz[0]}px; color: var(--muted); margin: ${sp[1]}px 0; }
@media (min-width: 72rem) {
  .sidenote { float: right; clear: right; width: 16rem; margin-right: -20rem; }
}
@media (max-width: 71.99rem) {
  .layout { grid-template-columns: minmax(0, 1fr); }
  .reservoir { border: none; padding: 0; }
  .sidenote { display: none; }
  .sidenote-state:checked + .sidenote { display: block; }
}
.listing-order { font-size: ${sz[0]}px; font-family: var(--font-sans); color: var(--muted); }
@media print {
  .masthead nav, .breadcrumb, .skip-link { display: none; }
  body { background: #fff; color: #000; }
  a::after { content: " (" attr(href) ")"; font-size: 0.85em; }
}
`;
}

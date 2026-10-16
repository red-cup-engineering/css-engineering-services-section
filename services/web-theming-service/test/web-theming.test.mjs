import assert from "node:assert/strict";
import test from "node:test";
import {
  derivePalette,
  deriveDark,
  themePalette,
} from "../src/theming-computer/palette.mjs";
import { THEME_TOKEN_ROLES, tokenVar } from "../src/theming-computer/tokens.mjs";
import { certifyPalette, certifyContrast, scarcityReport } from "../src/theming-computer/lint.mjs";
import {
  tokenCss,
  composeTokens,
  paletteCss,
  assembleCss,
  BASE_CSS,
  COMPONENT_CSS,
  decodeTheme,
  render,
  isTheme,
  assertTheme,
  admitTheme,
  minimal,
  atelier,
  DEFAULT_THEME,
  validateTheme,
  generateStylesheet,
  contrastRatio,
} from "../src/theming/index.mjs";

// A fixed, real seed set (not tuned to make every check pass -- see the
// certification test below, which documents a genuine failure these seeds
// produce in the light scheme).
const SEEDS = { ink: "#1a1a1a", surface: "#fbfbf9", accent: "#2a6df4" };
const TYPE = { sans: "system-ui", serif: "Georgia", mono: "Menlo" };

test("the default finished theme passes its own validation", () => {
  assert.deepEqual(validateTheme(DEFAULT_THEME), []);
});

test("a low-contrast finished theme refuses with the measured ratio", () => {
  const bad = structuredClone(DEFAULT_THEME);
  bad.colors.muted.light = "#AAAAAA";
  const refusals = validateTheme(bad);
  assert.ok(refusals.some((refusal) => refusal.code === "R-07" && refusal.data.ratio < 7));
});

test("finished-theme contrast math uses the shared WCAG implementation", () => {
  assert.equal(contrastRatio("#000000", "#FFFFFF").toFixed(0), "21");
  assert.equal(contrastRatio("#777777", "#777777").toFixed(0), "1");
});

test("the finished-theme stylesheet carries shared tokens and compatibility aliases", () => {
  const css = generateStylesheet(DEFAULT_THEME);
  assert.match(css, /--surface: #FBFAF7;/);
  assert.match(css, /--ink-soft: #3F3E3A;/);
  assert.match(css, /--accent: #6E1E3C;/);
  assert.match(css, /\[data-theme="light"\]/);
  assert.match(css, /\[data-theme="dark"\]/);
  assert.match(css, /--paper: var\(--surface\);/);
  assert.match(css, /--jewel: var\(--accent\);/);
  assert.match(css, /background: var\(--paper\); color: var\(--ink\);/);
});

test("derivePalette/deriveDark produce distinct, populated light and dark colour sets from the same seeds", () => {
  const light = derivePalette(SEEDS);
  const dark = deriveDark(SEEDS);
  for (const role of ["ink", "surface", "accent", "inkSoft", "surfaceDeep", "surfaceEdge", "rule", "tint", "tintStrong", "selection", "visited"]) {
    assert.equal(typeof light[role], "string", `light.${role} must be derived`);
    assert.equal(typeof dark[role], "string", `dark.${role} must be derived`);
    assert.notEqual(light[role], dark[role], `${role} must differ between light and dark`);
  }
  // The seeds pass straight through as the light scheme's primaries.
  assert.equal(light.ink, SEEDS.ink);
  assert.equal(light.surface, SEEDS.surface);
  assert.equal(light.accent, SEEDS.accent);
  // Dark synthesis actually inverts polarity: ink lifts near-white, surface drops near-black.
  assert.equal(dark.surface, "#0d0d0c");
  assert.equal(dark.ink, "#e4e4e4");
});

test("themePalette merges type tokens into both schemes and is a valid ThemePalette shape", () => {
  const palette = themePalette(SEEDS, TYPE);
  assert.equal(palette.light.sans, "system-ui");
  assert.equal(palette.dark.sans, "system-ui");
  assert.equal(palette.light.ink, SEEDS.ink);
  assert.notEqual(palette.light.ink, palette.dark.ink);
});

test("tokenCss renders only defined roles, in canonical role order, as CSS custom properties", () => {
  const css = tokenCss({ ink: "#111", accent: "#f00" });
  assert.equal(css, ':root {\n  --ink: #111;\n  --accent: #f00;\n}');
  assert.doesNotMatch(css, /--surface/, "undefined roles must be omitted, not emitted as empty");
  const withSelector = tokenCss({ ink: "#111" }, { selector: '[data-theme="x"]', indent: "    " });
  assert.equal(withSelector, '[data-theme="x"] {\n    --ink: #111;\n}');
});

test("tokenVar maps each role to its canonical custom-property name", () => {
  assert.equal(tokenVar("ink"), "--ink");
  assert.equal(tokenVar("inkSoft"), "--ink-soft");
  assert.equal(tokenVar("surfaceDeep"), "--surface-deep");
  assert.deepEqual(THEME_TOKEN_ROLES.slice(0, 3), ["ink", "inkSoft", "surface"]);
});

test("composeTokens merges layers left-to-right with the later layer's defined token winning", () => {
  const merged = composeTokens({ ink: "#000", accent: "#111" }, { accent: "#222" }, null, { surface: "#fff" });
  assert.deepEqual(merged, { ink: "#000", accent: "#222", surface: "#fff" });
});

test("paletteCss emits base :root, a prefers-color-scheme dark block, and explicit [data-theme] switches derived from the same data", () => {
  const palette = themePalette(SEEDS, TYPE);
  const css = paletteCss(palette);
  assert.match(css, /^:root \{\n {2}--ink: #1a1a1a;/);
  assert.match(css, /@media \(prefers-color-scheme: dark\) \{\n:root \{\n {2}--ink: #e4e4e4;/);
  assert.match(css, /\[data-theme="light"\] \{\n {2}--ink: #1a1a1a;/);
  assert.match(css, /\[data-theme="dark"\] \{\n {2}--ink: #e4e4e4;/);
});

test("paletteCss renders named variants layered on top of the light base", () => {
  const palette = { light: { ink: "#111", accent: "#00f" }, variants: { punchy: { accent: "#f00" } } };
  const css = paletteCss(palette);
  assert.match(css, /\[data-theme="punchy"\] \{\n {2}--ink: #111;\n {2}--accent: #f00;\n\}/);
});

test("assembleCss concatenates the palette layer, the shared reset, the component library, and any chrome, in that order", () => {
  const palette = themePalette(SEEDS, TYPE);
  const css = assembleCss(palette, ".chrome{color:red}");
  const paletteIdx = css.indexOf(":root");
  const baseIdx = css.indexOf(BASE_CSS);
  const componentIdx = css.indexOf(COMPONENT_CSS);
  const chromeIdx = css.indexOf(".chrome{color:red}");
  assert.ok(paletteIdx === 0, "palette CSS must come first");
  assert.ok(baseIdx > paletteIdx && componentIdx > baseIdx && chromeIdx > componentIdx,
    "layers must appear in palette -> reset -> components -> chrome order");
  // empty chrome strings are dropped, not emitted as blank layers
  assert.doesNotMatch(assembleCss(palette, "", "   "), /\n\n\n/);
});

test("certifyPalette runs real WCAG/APCA arithmetic -- these exact seeds fail the light accent-on-surface link pair but the synthesised dark scheme passes it", () => {
  // certifyPalette/scarcityReport are typed against DerivedPalette (colour
  // roles only) -- derivePalette/deriveDark, not themePalette's merged
  // light/dark (see the dedicated gap test below for what happens if you do
  // pass the merged shape, which TS's structural typing does not prevent).
  const lightCert = certifyPalette(derivePalette(SEEDS));
  const darkCert = certifyPalette(deriveDark(SEEDS));

  const lightLink = lightCert.contrast.find((c) => c.pair === "link (accent on surface)");
  assert.equal(lightLink.passes, false, "light accent #2a6df4 on surface #fbfbf9 must fail AA 4.5:1 (documented reality, not tuned)");
  assert.ok(lightLink.ratio < 4.5 && lightLink.ratio > 4.3, `expected a near-miss ratio, got ${lightLink.ratio}`);
  assert.equal(lightCert.passes, false);

  const darkLink = darkCert.contrast.find((c) => c.pair === "link (accent on surface)");
  assert.equal(darkLink.passes, true, "the synthesised dark accent must clear AA on the dark ground");
  assert.equal(darkCert.passes, true);

  const bodyPair = lightCert.contrast.find((c) => c.pair === "body (ink on surface)");
  assert.ok(bodyPair.ratio > 15, "ink-on-surface body text must be near-maximum contrast for these seeds");
});

test("scarcityReport counts chromatic (non-neutral) tokens against a budget", () => {
  const report = scarcityReport(derivePalette(SEEDS));
  assert.ok(report.loud.includes("accent"));
  assert.ok(!report.loud.includes("ink"), "a near-neutral ink token must not be counted as loud");
  assert.equal(report.within, report.count <= report.budget);
});

test("certifyPalette/scarcityReport accept the full merged ThemeTokens palette that themePalette/decodeTheme actually hand back, judging colours only", () => {
  // themePalette(seeds, type).light is `DerivedPalette & TypeTokens`; type
  // tokens ("sans"/"serif"/"mono" family stacks) ride alongside colours.
  // Scarcity judges colours only, so non-colour tokens are skipped rather
  // than crashing the certifier on the palette shape its own decodeTheme
  // hands every caller.
  const merged = themePalette(SEEDS, TYPE).light;
  const report = scarcityReport(merged);
  assert.ok(!report.loud.includes("sans"));
  assert.ok(!report.loud.includes("serif"));
  assert.ok(!report.loud.includes("mono"));
  const certification = certifyPalette(merged);
  assert.equal(typeof certification.passes, "boolean");
  assert.ok(certification.contrast.length > 0);
});

test("decodeTheme derives a full stylesheet and a valid Theme from a compact spec, and render() assembles a complete HTML document containing the article body and the derived css", () => {
  const theme = decodeTheme({ name: "fixture-theme", seeds: SEEDS, type: TYPE, chrome: ".fixture-chrome{color:red}" });
  assert.equal(isTheme(theme), true);
  assertTheme(theme); // must not throw
  assert.match(theme.css, /--ink: #1a1a1a/);
  assert.match(theme.css, /\.fixture-chrome\{color:red\}$/);
  assert.equal(theme.palette.light.ink, SEEDS.ink);
  assert.notEqual(theme.palette.dark.ink, theme.palette.light.ink);

  const html = render(theme, "<p>Article body</p>", { title: "Fixture Title", siteName: "Fixture Site" });
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<title>Fixture Title<\/title>/);
  assert.match(html, /<body class="theme-fixture-theme">/);
  // the article body passes through verbatim
  assert.match(html, /<p>Article body<\/p>/);
  // the derived stylesheet (palette + reset + components + chrome) is inlined
  assert.match(html, /<style>[\s\S]*--ink: #1a1a1a[\s\S]*\.fixture-chrome\{color:red\}<\/style>/);
});

test("render() throws if a theme's wrap() drops or rewrites the article body instead of passing it through", () => {
  const theme = decodeTheme({
    name: "lossy",
    seeds: SEEDS,
    wrap: () => "<p>a different body entirely</p>",
  });
  assert.throws(() => render(theme, "<p>Article body</p>"), /wrap\(\) dropped or rewrote the article body/);
});

test("admitTheme judges a well-formed theme as satisfying the contract and a malformed one as violating it", () => {
  const good = decodeTheme({ name: "good", seeds: SEEDS });
  const goodAdmission = admitTheme(good);
  assert.equal(goodAdmission.admitted, true);
  assert.equal(goodAdmission.reading, "potential");

  const bad = { name: "", css: 42, head: null, header: null, footer: null, wrap: null };
  const badAdmission = admitTheme(bad);
  assert.equal(badAdmission.admitted, false);
  assert.ok(badAdmission.reasons.length >= 3);
});

test("assertTheme rejects a theme missing a required member", () => {
  assert.throws(() => assertTheme({ name: "x", css: "", head: () => "", header: () => "", footer: () => "" /* no wrap */ }),
    /theme\.wrap: expected a function/);
});

test("built-in minimal and atelier themes are valid themes and render distinct, complete documents", () => {
  for (const theme of [minimal, atelier]) {
    assert.equal(isTheme(theme), true);
    const html = render(theme, "<p>Body</p>", { title: "T", siteName: "S", year: 2026 });
    assert.match(html, /^<!DOCTYPE html>/);
    assert.match(html, new RegExp(`<body class="theme-${theme.name}">`));
    assert.match(html, /<p>Body<\/p>/);
  }
  assert.notEqual(minimal.css, atelier.css);
});

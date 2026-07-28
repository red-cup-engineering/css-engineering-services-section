import {
  type NormalizedThemeContext,
  type Theme,
  type ThemePalette,
  type ThemeSpec,
  decodeTheme,
  escapeHtml,
} from "@red-cup-engineering/organizing-with-the-web/theming";

// The 561 Group visual identity as a thin spec on the shared web-theming system:
// a handful of colour seeds + type tokens, from which web-theming derives the full
// light AND dark palettes (OKLCH; WCAG-certified), plus the chrome unique to this
// identity (folio bar, the giant "561" hero mark, the inked colophon). Bone ground,
// ink marks, one warm red and one witness blue — the Bauhaus/Brutalist register:
// scarce salience, hard hierarchy, type as mass.
//
// Fonts: Space Grotesk (sans), Roboto Slab (serif/slab), JetBrains Mono (mono) are
// the bible-specified families. No CDN requests (§ 09.7 no-third-party-on-web);
// self-hosting these three is recorded in dev/TODO/561-group-web-theme-fonts.md.
// Until that ships, the fallback stacks below are operative.

// Chrome unique to the 561 identity. The reset, token block, headings, and the
// content-component library all come from web-theming's shared layers; only the
// folio/hero/colophon furniture lives here.
const CHROME_CSS = `
html, body {
  background: var(--surface);
  font-family: var(--serif);
  font-size: 16px;
}
body {
  background-image: radial-gradient(rgba(10,10,10,.035) 1px, transparent 1px);
  background-size: 4px 4px;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

/* ── Header: folio bar + hero mark ───────────────────────────────────────── */

header[role=banner] {
  max-width: var(--max);
  width: 100%;
  margin: 0 auto;
  padding: 0 var(--gutter);
}

.folio-bar {
  border-top: 8px solid var(--ink);
  border-bottom: 1px solid var(--ink);
  padding: 10px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--mono);
  font-size: 11px;
  line-height: 1.4;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.hero {
  padding: 80px 0 56px;
  border-bottom: 1px solid var(--ink);
}

.hero-mark {
  font-family: var(--sans);
  font-weight: 700;
  font-size: clamp(72px, 14vw, 128px);
  line-height: .85;
  letter-spacing: -.04em;
}

.hero-desc {
  margin-top: 20px;
  font-family: var(--mono);
  font-size: 11px;
  line-height: 1.4;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

/* ── Main content ────────────────────────────────────────────────────────── */

main[role=main] {
  flex: 1;
  max-width: var(--max);
  width: 100%;
  margin: 0 auto;
  padding: 60px var(--gutter);
}

/* ── Footer colophon ─────────────────────────────────────────────────────── */

footer[role=contentinfo] {
  border-top: 8px solid var(--ink);
  background: var(--ink);
  color: var(--surface);
}

.colophon {
  max-width: var(--max);
  margin: 0 auto;
  padding: 32px var(--gutter);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--mono);
  font-size: 11px;
  line-height: 1.4;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--surface) 60%, transparent);
}

.colophon a { color: var(--surface); text-decoration: none; }
.colophon a:hover { color: var(--alarm); }

/* ── Responsive ──────────────────────────────────────────────────────────── */

@media (max-width: 880px) {
  :root { --gutter: 24px; }
  .hero { padding: 48px 0 36px; }
  main[role=main] { padding: 40px var(--gutter); }
  .colophon { flex-direction: column; gap: 12px; align-items: flex-start; }
}

@media print {
  body { background: none; background-image: none; }
  footer[role=contentinfo] { background: none; color: var(--ink); border-top-color: var(--ink); }
  .folio-bar, .hero-desc, .colophon { color: #333; }
}
`;

/** The 561 identity as a web-theming spec — seeds in, light+dark palette out. */
export const fiveSixOneSpec: ThemeSpec = {
  name: "five-six-one",
  seeds: {
    ink: "#0A0A0A",
    surface: "#F2EAD8",
    accent: "#3D5588",
    alarm: "#FF4530",
  },
  type: {
    sans: `"Space Grotesk", "Helvetica Neue", Arial, sans-serif`,
    serif: `"Roboto Slab", Rockwell, Georgia, serif`,
    mono: `"JetBrains Mono", ui-monospace, "Courier New", monospace`,
    gutter: "56px",
    max: "1200px",
    measure: "42rem",
    radius: "0",
  },
  chrome: CHROME_CSS,
  head(_ctx: NormalizedThemeContext): string {
    return `<link rel="alternate" type="application/json" href="/site.json">`;
  },
  header(ctx: NormalizedThemeContext): string {
    const name = escapeHtml(ctx.siteName || "The 561 Group");
    return [
      '<div class="folio-bar">',
      `<span>${name}</span>`,
      "<span>561.GROUP</span>",
      "</div>",
      '<div class="hero">',
      '<p class="hero-mark">561</p>',
      '<p class="hero-desc">Autonomous Confederacy</p>',
      "</div>",
    ].join("");
  },
  footer(ctx: NormalizedThemeContext): string {
    const year = escapeHtml(String(ctx.year ?? ""));
    const credit = year ? `${year} · The 561 Group` : "The 561 Group";
    return [
      '<div class="colophon">',
      `<span>${credit}</span>`,
      "</div>",
    ].join("");
  },
  wrap(articleHtml: string, _ctx: NormalizedThemeContext): string {
    return articleHtml;
  },
};

const decoded = decodeTheme(fiveSixOneSpec);

/** The 561 Group theme: light+dark palette derived from the seeds, plus chrome. */
export const fiveSixOneTheme: Theme = decoded;

/** The derived light+dark palette, for surfaces that compose it directly. */
export const fiveSixOnePalette: ThemePalette = decoded.palette;

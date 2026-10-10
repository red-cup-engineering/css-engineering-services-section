/**
 * projections/themed-page - composed Article page projection.
 *
 * The semantic document comes from article-html. The visual surface is derived
 * as CSS assignment material and closed by T2; this module does not concatenate a
 * handwritten stylesheet.
 */

import { escapeAttr } from "@red-cup-engineering/html-structural-projection-service";
import { assignmentSetToStylesheet, livingWebIndieWebProfile } from "@red-cup-engineering/css-services-section/css-cascade";
import { quadraticToNumber } from "@red-cup-engineering/computer-data-engineering-services-section/number/quadratic";
import { articleToHtmlPage } from "@red-cup-engineering/html-engineering-services-section/article-html";
import { pageToHtmlPage } from "@red-cup-engineering/html-engineering-services-section/page-html";
import { staticWebsiteBodyAttributes } from "@red-cup-engineering/html-engineering-services-section/static-page";
import { layout } from "@red-cup-engineering/xml-document-rendering-service/svg/layout";
import { fiberToType, typographyFiber, typographyLocus } from "@red-cup-engineering/css-services-section/typography";
import { claim, mark, token } from "@red-cup-engineering/signcell/utterance";
import { cell, predicateOfClaim } from "@red-cup-engineering/signcell/predication";

/** A consumer-supplied visual claim over one semantic themed-page locus. */

const entrySelector = ".metroplat-themed-page [data-metroplat-locus=\"entry\"]";
const headerSelector = ".metroplat-themed-page [data-metroplat-locus=\"entry\"] > [data-metroplat-locus=\"header\"]";
const titleSelector = ".metroplat-themed-page [data-metroplat-locus=\"title\"]";

const semanticLoci = Object.freeze([
  { id: "page", selector: "body.metroplat-themed-page", role: "object", label: "Page" },
  { id: "adHeader", selector: ".metroplat-themed-page :is([data-metroplat-locus=\"adHeader\"], [data-metroplat-ad-slot=\"header\"])", parent: "page", role: "object", label: "Header ad" },
  { id: "main", selector: "body.metroplat-themed-page > main", parent: "page", role: "object", label: "Main" },
  { id: "entry", selector: entrySelector, parent: "main", role: "predicate", label: "Entry" },
  { id: "header", selector: headerSelector, parent: "entry", role: "predicate", label: "Header" },
  { id: "title", selector: titleSelector, parent: "header", role: "subject", label: "Title" },
  { id: "byline", selector: ".metroplat-themed-page .byline", parent: "header", role: "object", label: "Byline" },
  { id: "published", selector: ".metroplat-themed-page .dt-published", parent: "header", role: "object", label: "Published" },
  { id: "content", selector: ".metroplat-themed-page .e-content", parent: "entry", role: "object", label: "Content" },
  { id: "adInArticle", selector: ".metroplat-themed-page :is([data-metroplat-locus=\"adInArticle\"], [data-metroplat-ad-slot=\"inArticle\"])", parent: "main", role: "object", label: "In-article ad" },
  { id: "license", selector: ".metroplat-themed-page .article-license", parent: "entry", role: "object", label: "License" },
  { id: "sources", selector: ".metroplat-themed-page .article-sources", parent: "entry", role: "predicate", label: "Sources" },
  { id: "adFooter", selector: ".metroplat-themed-page :is([data-metroplat-locus=\"adFooter\"], [data-metroplat-ad-slot=\"footer\"])", parent: "page", role: "object", label: "Footer ad" },
]);

/** Each locus's default reading, in the extremal family. */
const defaultReadings = Object.freeze({
  page: "contested",
  adHeader: "contested",
  main: "unknown",
  entry: "denied",
  header: "unknown",
  title: "denied",
  byline: "held",
  published: "contested",
  content: "unknown",
  adInArticle: "unknown",
  license: "contested",
  sources: "unknown",
  adFooter: "contested",
});

/** Each locus's default typographic reading, in the extremal family. */
const defaultTypographyReadings = Object.freeze({
  page: "contested",
  adHeader: "contested",
  main: "contested",
  entry: "contested",
  header: "unknown",
  title: "denied",
  byline: "contested",
  published: "contested",
  content: "contested",
  adInArticle: "contested",
  license: "contested",
  sources: "unknown",
  adFooter: "contested",
});

export const livingWebIndieWebPageProfile = Object.freeze({
  kind: "metroplat.projections.themed-page.profile",
  lang: "en",
  feeling: Object.freeze({
    regime: "living-Web/IndieWeb",
    background: "#fbfaf7",
    foreground: "#202124",
    muted: "#59616d",
    surface: "#ffffff",
    accent: "#1f6f5b",
    border: "#d8d3c8",
    fontFamily: "ui-serif, Georgia, Cambria, Times New Roman, serif",
    monoFontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    baseFontSize: "18px",
    measure: "68ch",
  }),
  stylesheet: "inline",
  documentFlow: Object.freeze({
    width: 760,
    margin: 24,
    ordinalGap: 18,
    segmentGap: 10,
    indent: 26,
  }),
});

/** Opt-in parameters for a hard-edged news surface: paper, ink, blocks, and rules. */
export const brutalistCubistNewsThemeTokens = Object.freeze({
  paper: "#f8f3e5",
  ground: "#f4efe1",
  surface: "#fffdf6",
  ink: "#1a1a1a",
  muted: "#4d463d",
  accent: "#204f7a",
  signal: "#7a271a",
  block: "#d0b72f",
  border: "#1a1a1a",
  shadow: "0.45rem 0.45rem 0 #1a1a1a",
  serif: "Georgia, Cambria, Times New Roman, serif",
  sans: "Arial Black, Impact, ui-sans-serif, system-ui, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
});

export const brutalistCubistNewsStyleClaims = Object.freeze([
  Object.freeze({
    id: "brutalist-cubist-news-page-field",
    locus: "page",
    declarations: Object.freeze({
      "background-image": "linear-gradient(135deg, rgba(32, 79, 122, 0.08) 0 22%, transparent 22% 48%, rgba(122, 39, 26, 0.08) 48% 63%, transparent 63%)",
      "background-size": "32rem 32rem",
    }),
  }),
  Object.freeze({
    id: "brutalist-cubist-news-entry-block",
    locus: "entry",
    declarations: Object.freeze({
      border: `4px solid ${brutalistCubistNewsThemeTokens.border}`,
      "border-inline-start": `1rem solid ${brutalistCubistNewsThemeTokens.accent}`,
      "box-shadow": brutalistCubistNewsThemeTokens.shadow,
    }),
  }),
  Object.freeze({
    id: "brutalist-cubist-news-header-block",
    locus: "header",
    declarations: Object.freeze({
      "background-color": brutalistCubistNewsThemeTokens.ink,
      color: brutalistCubistNewsThemeTokens.paper,
      "border-block-end": `4px solid ${brutalistCubistNewsThemeTokens.block}`,
      "margin-inline": "-0.65rem",
      padding: "0.75rem 0.85rem",
    }),
  }),
  Object.freeze({
    id: "brutalist-cubist-news-title-block",
    locus: "title",
    declarations: Object.freeze({
      "font-family": brutalistCubistNewsThemeTokens.sans,
      "line-height": "0.98",
      "text-transform": "uppercase",
    }),
  }),
  Object.freeze({
    id: "brutalist-cubist-news-content-block",
    locus: "content",
    declarations: Object.freeze({
      "border-inline-start": `0.45rem solid ${brutalistCubistNewsThemeTokens.signal}`,
      "padding-inline-start": "1rem",
    }),
  }),
  Object.freeze({
    id: "brutalist-cubist-news-sources-block",
    locus: "sources",
    declarations: Object.freeze({
      border: `3px solid ${brutalistCubistNewsThemeTokens.border}`,
      "background-color": brutalistCubistNewsThemeTokens.paper,
      padding: "1rem",
    }),
  }),
]);

export const brutalistCubistNewsFeeling = Object.freeze({
  regime: "metroplat/brutalist-cubist-news",
  background: brutalistCubistNewsThemeTokens.ground,
  foreground: brutalistCubistNewsThemeTokens.ink,
  muted: brutalistCubistNewsThemeTokens.muted,
  surface: brutalistCubistNewsThemeTokens.surface,
  accent: brutalistCubistNewsThemeTokens.accent,
  border: brutalistCubistNewsThemeTokens.border,
  fontFamily: brutalistCubistNewsThemeTokens.serif,
  monoFontFamily: brutalistCubistNewsThemeTokens.mono,
  baseFontSize: "18px",
  measure: "76ch",
  customProperties: Object.freeze({
    "--metroplat-news-paper": brutalistCubistNewsThemeTokens.paper,
    "--metroplat-news-ink": brutalistCubistNewsThemeTokens.ink,
    "--metroplat-news-accent": brutalistCubistNewsThemeTokens.accent,
    "--metroplat-news-signal": brutalistCubistNewsThemeTokens.signal,
    "--metroplat-news-shadow": brutalistCubistNewsThemeTokens.shadow,
  }),
  claims: brutalistCubistNewsStyleClaims,
});

export const brutalistCubistNewsPageProfile = Object.freeze({
  ...livingWebIndieWebPageProfile,
  feeling: brutalistCubistNewsFeeling,
});

/** Koios.News' recovered emsalpha news surface, ported from cd8beb7:src/theme.ts. */
export const emsalphaNewsThemeTokens = Object.freeze({
  light: Object.freeze({
    text: "rgba(38,38,38,1)",
    bg: "rgba(245,245,243,1)",
    surface: "rgba(255,255,255,1)",
    mid: "rgba(110,110,110,1)",
    midLight: "rgba(110,110,110,0.15)",
    midFaint: "rgba(110,110,110,0.07)",
    midBorder: "rgba(110,110,110,0.25)",
    midSelected: "rgba(110,110,110,0.4)",
    midTable: "rgba(110,110,110,0.35)",
    visited: "rgba(80,80,80,1)",
    accent: "rgba(80,55,65,1)",
    rule: "rgba(38,38,38,0.12)",
  }),
  dark: Object.freeze({
    text: "rgba(210,210,208,1)",
    bg: "rgba(22,22,22,1)",
    surface: "rgba(32,32,32,1)",
    mid: "rgba(140,140,140,1)",
    midLight: "rgba(140,140,140,0.15)",
    midFaint: "rgba(140,140,140,0.07)",
    midBorder: "rgba(140,140,140,0.25)",
    midSelected: "rgba(140,140,140,0.35)",
    midTable: "rgba(140,140,140,0.35)",
    visited: "rgba(170,170,170,1)",
    accent: "rgba(160,135,148,1)",
    rule: "rgba(210,210,208,0.1)",
  }),
  mono: "\"IBM Plex Mono\", ui-monospace, SFMono-Regular, monospace",
  sans: "\"IBM Plex Sans\", \"Source Sans Pro\", system-ui, sans-serif",
  serif: "\"IBM Plex Serif\", \"Source Serif Pro\", Georgia, serif",
});

const emsalphaNewsCustomProperties = (scheme) => Object.freeze({
  "--emsalpha-text": scheme.text,
  "--emsalpha-bg": scheme.bg,
  "--emsalpha-surface": scheme.surface,
  "--emsalpha-mid": scheme.mid,
  "--emsalpha-mid-light": scheme.midLight,
  "--emsalpha-mid-faint": scheme.midFaint,
  "--emsalpha-mid-border": scheme.midBorder,
  "--emsalpha-mid-sel": scheme.midSelected,
  "--emsalpha-mid-table": scheme.midTable,
  "--emsalpha-visited": scheme.visited,
  "--emsalpha-accent": scheme.accent,
  "--emsalpha-rule": scheme.rule,
  "--emsalpha-mono": emsalphaNewsThemeTokens.mono,
  "--emsalpha-sans": emsalphaNewsThemeTokens.sans,
  "--emsalpha-serif": emsalphaNewsThemeTokens.serif,
});

export const emsalphaNewsStyleClaims = Object.freeze([
  Object.freeze({
    id: "emsalpha-news-page-light",
    locus: "page",
    declarations: Object.freeze({
      ...emsalphaNewsCustomProperties(emsalphaNewsThemeTokens.light),
      "color-scheme": "light dark",
      hyphens: "auto",
      "letter-spacing": "0.025em",
      "word-spacing": "0.045em",
    }),
  }),
  Object.freeze({
    id: "emsalpha-news-page-dark",
    locus: "page",
    condition: Object.freeze({ media: "(prefers-color-scheme: dark)" }),
    declarations: emsalphaNewsCustomProperties(emsalphaNewsThemeTokens.dark),
  }),
  Object.freeze({
    id: "emsalpha-news-main-spacing",
    locus: "main",
    declarations: Object.freeze({
      "padding-bottom": "1.5em",
    }),
  }),
  Object.freeze({
    id: "emsalpha-news-entry-surface",
    locus: "entry",
    declarations: Object.freeze({
      "background-color": "var(--emsalpha-surface)",
      "border-inline-start": "3px solid var(--emsalpha-text)",
      "box-shadow": "none",
      padding: "2em 2.2em 1.8em",
    }),
  }),
  Object.freeze({
    id: "emsalpha-news-header-rule",
    locus: "header",
    declarations: Object.freeze({
      "border-block-end": "1px solid var(--emsalpha-mid-border)",
      "margin-block-end": "1.4rem",
      "padding-block-end": "1rem",
    }),
  }),
  Object.freeze({
    id: "emsalpha-news-title-mono",
    locus: "title",
    declarations: Object.freeze({
      color: "var(--emsalpha-text)",
      "font-family": "var(--emsalpha-mono)",
      "font-weight": "500",
      "letter-spacing": "-0.01em",
      "line-height": "1.15",
      "text-transform": "none",
    }),
  }),
  Object.freeze({
    id: "emsalpha-news-meta",
    locus: "byline",
    declarations: Object.freeze({
      color: "var(--emsalpha-mid)",
      "font-family": "var(--emsalpha-mono)",
      "font-size": "0.75em",
      "letter-spacing": "0.03em",
    }),
  }),
  Object.freeze({
    id: "emsalpha-news-published",
    locus: "published",
    declarations: Object.freeze({
      color: "var(--emsalpha-mid)",
      "font-family": "var(--emsalpha-mono)",
      "font-size": "0.75em",
      "letter-spacing": "0.03em",
    }),
  }),
  Object.freeze({
    id: "emsalpha-news-content-links",
    locus: "content",
    selector: ".metroplat-themed-page .e-content a",
    declarations: Object.freeze({
      color: "var(--emsalpha-mid)",
      display: "inline-block",
      position: "relative",
      "text-decoration": "underline",
      "text-underline-offset": "0.18em",
      "background-image": "linear-gradient(to left, transparent 50%, var(--emsalpha-mid-light) 50%)",
      "background-size": "200% 100%",
      "background-position": "right bottom",
      transition: "background 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)",
    }),
  }),
  Object.freeze({
    id: "emsalpha-news-content-link-rule",
    locus: "content",
    selector: ".metroplat-themed-page .e-content a::before",
    declarations: Object.freeze({
      background: "var(--emsalpha-mid)",
      content: "\"\"",
      display: "block",
      position: "absolute",
      bottom: "-0.1em",
      height: "0.1em",
      width: "100%",
      transition: "all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)",
    }),
  }),
  Object.freeze({
    id: "emsalpha-news-content-link-hover",
    locus: "content",
    selector: ".metroplat-themed-page .e-content a:hover",
    declarations: Object.freeze({
      "background-position": "left bottom",
      "outline-style": "none",
    }),
  }),
  Object.freeze({
    id: "emsalpha-news-content-link-focus",
    locus: "content",
    selector: ".metroplat-themed-page .e-content a:focus",
    declarations: Object.freeze({
      background: "none",
    }),
  }),
  Object.freeze({
    id: "emsalpha-news-content-link-rule-hide",
    locus: "content",
    selector: ".metroplat-themed-page .e-content a:is(:hover, :focus)::before",
    declarations: Object.freeze({ width: "0" }),
  }),
  Object.freeze({
    id: "emsalpha-news-content-headings",
    locus: "content",
    selector: ".metroplat-themed-page .e-content :is(h2,h3,h4,h5,h6)",
    declarations: Object.freeze({
      "font-family": "var(--emsalpha-mono)",
      "font-weight": "500",
      "letter-spacing": "-0.01em",
    }),
  }),
  Object.freeze({
    id: "emsalpha-news-content-h2",
    locus: "content",
    selector: ".metroplat-themed-page .e-content h2",
    declarations: Object.freeze({
      "border-top": "1px solid var(--emsalpha-rule)",
      "font-size": "1.1em",
      "margin-top": "2em",
      "padding-top": "0.8em",
      "text-align": "left",
    }),
  }),
  Object.freeze({
    id: "emsalpha-news-blockquote",
    locus: "content",
    selector: ".metroplat-themed-page blockquote",
    declarations: Object.freeze({
      "background-color": "var(--emsalpha-mid-faint)",
      "border-inline-start": "3px solid var(--emsalpha-accent)",
      "font-size": "0.85em",
      margin: "1.2em 0 1.2em 1.5em",
      padding: "0.8em 1em",
    }),
  }),
  Object.freeze({
    id: "emsalpha-news-code",
    locus: "content",
    selector: ".metroplat-themed-page :is(pre, code)",
    declarations: Object.freeze({
      "font-family": "var(--emsalpha-mono)",
      "font-size": "0.88em",
    }),
  }),
  Object.freeze({
    id: "emsalpha-news-pre",
    locus: "content",
    selector: ".metroplat-themed-page pre",
    declarations: Object.freeze({
      "background-color": "var(--emsalpha-bg)",
      border: "1px solid var(--emsalpha-mid-border)",
      overflow: "auto",
      padding: "1em",
      "white-space": "pre-wrap",
    }),
  }),
  Object.freeze({
    id: "emsalpha-news-sources",
    locus: "sources",
    declarations: Object.freeze({
      "border-block-start": "1px solid var(--emsalpha-rule)",
      color: "var(--emsalpha-mid)",
      "font-family": "var(--emsalpha-mono)",
      "font-size": "0.82em",
      "margin-block-start": "2rem",
      "padding-block-start": "1rem",
    }),
  }),
  Object.freeze({
    id: "emsalpha-news-reduced-motion",
    locus: "page",
    selector: ".metroplat-themed-page :is(main, a, a::before)",
    condition: Object.freeze({ media: "(prefers-reduced-motion: reduce)" }),
    declarations: Object.freeze({
      animation: "none",
      transition: "none",
    }),
  }),
]);

export const emsalphaNewsFeeling = Object.freeze({
  regime: "koios.news/emsalpha",
  background: "var(--emsalpha-bg)",
  foreground: "var(--emsalpha-text)",
  muted: "var(--emsalpha-mid)",
  surface: "var(--emsalpha-surface)",
  accent: "var(--emsalpha-accent)",
  border: "var(--emsalpha-mid-border)",
  fontFamily: "var(--emsalpha-sans)",
  monoFontFamily: "var(--emsalpha-mono)",
  baseFontSize: "18px",
  measure: "42rem",
  customProperties: emsalphaNewsCustomProperties(emsalphaNewsThemeTokens.light),
  claims: emsalphaNewsStyleClaims,
});

export const emsalphaNewsPageProfile = Object.freeze({
  ...livingWebIndieWebPageProfile,
  feeling: emsalphaNewsFeeling,
});

const mergeFeeling = (profile) =>
  Object.freeze({
    regime: profile.feeling?.regime ?? livingWebIndieWebPageProfile.feeling?.regime ?? "living-Web/IndieWeb",
    background: profile.feeling?.background ?? livingWebIndieWebPageProfile.feeling?.background ?? "#ffffff",
    foreground: profile.feeling?.foreground ?? livingWebIndieWebPageProfile.feeling?.foreground ?? "#111111",
    muted: profile.feeling?.muted ?? livingWebIndieWebPageProfile.feeling?.muted ?? "#666666",
    surface: profile.feeling?.surface ?? livingWebIndieWebPageProfile.feeling?.surface ?? "#ffffff",
    accent: profile.feeling?.accent ?? livingWebIndieWebPageProfile.feeling?.accent ?? "#245f73",
    border: profile.feeling?.border ?? livingWebIndieWebPageProfile.feeling?.border ?? "#d7d7d7",
    fontFamily: profile.feeling?.fontFamily ?? livingWebIndieWebPageProfile.feeling?.fontFamily ?? "serif",
    monoFontFamily: profile.feeling?.monoFontFamily ?? livingWebIndieWebPageProfile.feeling?.monoFontFamily ?? "monospace",
    baseFontSize: profile.feeling?.baseFontSize ?? livingWebIndieWebPageProfile.feeling?.baseFontSize ?? "18px",
    measure: profile.feeling?.measure ?? livingWebIndieWebPageProfile.feeling?.measure ?? "68ch",
    ...(profile.feeling?.readings === undefined ? {} : { readings: profile.feeling.readings }),
    ...(profile.feeling?.typographyReadings === undefined ? {} : { typographyReadings: profile.feeling.typographyReadings }),
    ...(profile.feeling?.customProperties === undefined ? {} : { customProperties: profile.feeling.customProperties }),
    ...(profile.feeling?.claims === undefined ? {} : { claims: profile.feeling.claims }),
  });

const readingFor = (
  locus,
  profile,
  table,
) => {
  const feeling = mergeFeeling(profile);
  const defaults = table === "readings" ? defaultReadings : defaultTypographyReadings;
  return feeling[table]?.[locus] ?? defaults[locus];
};

const descriptionOf = (document) => {
  const direct = document.description ?? document.summary ?? document.excerpt;
  if (direct !== undefined) return direct;
  const frontMatter = document.frontMatter;
  for (const key of ["metaDescription", "meta_description", "description", "summary", "excerpt"]) {
    const value = frontMatter?.[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return undefined;
};

const dataformForDocument = (document, profile) => {
  const desc = descriptionOf(document);
  const size = profile.documentFlow?.width ?? livingWebIndieWebPageProfile.documentFlow?.width;
  return Object.freeze({
    title: document.title,
    ...(desc === undefined ? {} : { desc }),
    ...(size === undefined ? {} : { size }),
    rings: Object.freeze([
      Object.freeze({
        ordinal: 0,
        label: "document",
        segments: Object.freeze(["page", "main", "entry", "header"].map((id) => segment(id, document, profile))),
      }),
      Object.freeze({
        ordinal: 1,
        label: "identity",
        segments: Object.freeze(["title", "byline", "published"].map((id) => segment(id, document, profile))),
      }),
      Object.freeze({
        ordinal: 2,
        label: "reading",
        segments: Object.freeze(["content", "adInArticle", "license", "sources"].map((id) => segment(id, document, profile))),
      }),
    ]),
  });
};

const segment = (id, document, profile) => {
  const spec = semanticLoci.find((candidate) => candidate.id === id);
  return Object.freeze({
    e: `${document.kind}:${document.slug}`,
    a: "renders",
    v: id,
    label: id,
    title: spec.label,
    orbit: id === "entry" || id === "title" || id === "content" ? "diagonal" : "off-diagonal",
    reading: readingFor(id, profile, "readings"),
  });
};

const cssLoci = () =>
  Object.freeze(semanticLoci.map((locus) => Object.freeze({
    id: locus.id,
    selector: locus.selector,
    ...(locus.parent === undefined ? {} : { parent: locus.parent }),
  })));

const baseRules = (feeling) => Object.freeze([
  rule("page-base", "page", "body.metroplat-themed-page", {
    ...(feeling.customProperties ?? {}),
    "accent-color": feeling.accent,
    "background-color": feeling.background,
    color: feeling.foreground,
    "font-family": feeling.fontFamily,
    "font-size": feeling.baseFontSize,
    "line-height": "1.68",
    margin: "0",
    "text-rendering": "optimizeLegibility",
  }, 100),
  rule("main-measure", "main", "body.metroplat-themed-page > main", {
    "max-width": feeling.measure,
    margin: "0 auto",
    padding: "clamp(1rem, 4vw, 3.5rem)",
  }, 110),
  rule("entry-surface", "entry", entrySelector, {
    "background-color": feeling.surface,
    "border-inline-start": `0.35rem solid ${feeling.accent}`,
    "box-shadow": "0 1px 0 rgba(32, 33, 36, 0.08)",
    padding: "clamp(1.1rem, 3vw, 2rem)",
  }, 120),
  rule("header-spacing", "header", headerSelector, {
    "border-block-end": `1px solid ${feeling.border}`,
    "margin-block-end": "1.4rem",
    "padding-block-end": "1rem",
  }, 130),
  rule("byline-muted", "byline", ".metroplat-themed-page .byline", {
    color: feeling.muted,
    "margin-block": "0.35rem",
  }, 140),
  rule("time-muted", "published", ".metroplat-themed-page .dt-published", {
    color: feeling.muted,
    display: "inline-block",
    "font-size": "0.92em",
  }, 150),
  rule("content-readable", "content", ".metroplat-themed-page .e-content", {
    "line-height": "1.72",
  }, 160),
  rule("content-rhythm", "content", ".metroplat-themed-page .e-content > * + *", {
    "margin-block-start": "1em",
  }, 170),
  rule("content-links", "content", ".metroplat-themed-page .e-content a", {
    color: feeling.accent,
    "text-decoration-line": "underline",
    "text-decoration-thickness": "0.08em",
    "text-underline-offset": "0.18em",
  }, 180),
  rule("code-readable", "content", ".metroplat-themed-page code", {
    "font-family": feeling.monoFontFamily,
    "font-size": "0.92em",
  }, 190),
  rule("evidence-blocks", "sources", ".metroplat-themed-page .article-sources", {
    "border-block-start": `1px solid ${feeling.border}`,
    "margin-block-start": "2rem",
    "padding-block-start": "1rem",
  }, 200),
  rule("media-responsive", "content", ".metroplat-themed-page :is(img, svg, video, canvas)", {
    "block-size": "auto",
    "max-inline-size": "100%",
  }, 210),
  rule("ad-header-slot", "adHeader", ".metroplat-themed-page :is([data-metroplat-locus=\"adHeader\"], [data-metroplat-ad-slot=\"header\"])", {
    "border-block": `1px solid ${feeling.border}`,
    color: feeling.muted,
    margin: "1.5rem auto",
    padding: "0.75rem 0",
    "text-align": "center",
  }, 212),
  rule("ad-in-article-slot", "adInArticle", ".metroplat-themed-page :is([data-metroplat-locus=\"adInArticle\"], [data-metroplat-ad-slot=\"inArticle\"])", {
    "border-block": `1px solid ${feeling.border}`,
    color: feeling.muted,
    margin: "1.75rem auto",
    padding: "0.75rem 0",
    "text-align": "center",
  }, 214),
  rule("ad-footer-slot", "adFooter", ".metroplat-themed-page :is([data-metroplat-locus=\"adFooter\"], [data-metroplat-ad-slot=\"footer\"])", {
    "border-block": `1px solid ${feeling.border}`,
    color: feeling.muted,
    margin: "1.5rem auto",
    padding: "0.75rem 0",
    "text-align": "center",
  }, 216),
  rule("ad-header-frame", "adHeader", ".metroplat-themed-page :is([data-metroplat-locus=\"adHeader\"], [data-metroplat-ad-slot=\"header\"]) :is(iframe, ins)", {
    border: "0",
    display: "block",
    margin: "0 auto",
    "max-inline-size": "100%",
    "min-block-size": "90px",
  }, 218),
  rule("ad-in-article-frame", "adInArticle", ".metroplat-themed-page :is([data-metroplat-locus=\"adInArticle\"], [data-metroplat-ad-slot=\"inArticle\"]) :is(iframe, ins)", {
    border: "0",
    display: "block",
    margin: "0 auto",
    "max-inline-size": "100%",
    "min-block-size": "90px",
  }, 219),
  rule("ad-footer-frame", "adFooter", ".metroplat-themed-page :is([data-metroplat-locus=\"adFooter\"], [data-metroplat-ad-slot=\"footer\"]) :is(iframe, ins)", {
    border: "0",
    display: "block",
    margin: "0 auto",
    "max-inline-size": "100%",
    "min-block-size": "90px",
  }, 220),
  rule("selection-readable", "page", ".metroplat-themed-page ::selection", {
    "background-color": feeling.foreground,
    color: feeling.background,
  }, 221),
  rule("skip-link", "page", ".metroplat-themed-page .skip-to-content", {
    position: "absolute",
    inset: "0 auto auto 0",
    transform: "translateY(-120%)",
    "z-index": "1000",
  }, 230),
  rule("skip-link-focus", "page", ".metroplat-themed-page .skip-to-content:focus-visible", {
    "background-color": feeling.surface,
    color: feeling.foreground,
    outline: `0.2rem solid ${feeling.accent}`,
    padding: "0.5rem 0.75rem",
    transform: "translateY(0)",
  }, 240),
  rule("focus-visible", "page", ".metroplat-themed-page :is(a, button, input, textarea, select, summary, [tabindex]):focus-visible", {
    "outline-color": feeling.accent,
    "outline-offset": "0.18em",
    "outline-style": "solid",
    "outline-width": "0.18em",
  }, 250),
  rule("reduced-motion", "page", ".metroplat-themed-page *, .metroplat-themed-page *::before, .metroplat-themed-page *::after", {
    "animation-duration": "0.01ms",
    "animation-iteration-count": "1",
    "scroll-behavior": "auto",
    "transition-duration": "0.01ms",
  }, 260, { condition: Object.freeze({ media: "(prefers-reduced-motion: reduce)" }) }),
  rule("forced-colors", "page", "body.metroplat-themed-page", {
    "forced-color-adjust": "auto",
  }, 270, { condition: Object.freeze({ media: "(forced-colors: active)" }) }),
  rule("print-page", "page", "body.metroplat-themed-page", {
    "background-color": "#ffffff",
    color: "#111111",
  }, 280, { condition: Object.freeze({ media: "print" }) }),
  rule("print-entry", "entry", entrySelector, {
    "background-color": "transparent",
    "box-shadow": "none",
  }, 290, { condition: Object.freeze({ media: "print" }) }),
]);

const styleClaimRules = (profile) => Object.freeze(
  (mergeFeeling(profile).claims ?? []).map((styleClaim, index) => {
    const spec = semanticLoci.find((candidate) => candidate.id === styleClaim.locus);
    const {
      selector,
      sourceOrder,
      declarations,
      ...rest
    } = styleClaim;
    return Object.freeze({
      ...rest,
      id: styleClaim.id ?? `style-claim:${styleClaim.locus}:${index}`,
      selector: selector ?? spec.selector,
      sourceOrder: sourceOrder ?? 700 + index,
      declarations: Object.freeze(declarations),
    });
  }),
);

const rule = (
  id,
  locus,
  selector,
  declarations,
  sourceOrder,
  placement = {},
) => Object.freeze({
  ...placement,
  id,
  locus,
  selector,
  sourceOrder,
  declarations: Object.freeze(declarations),
});

function textTransformForCase(caseProjection) {
  if (caseProjection === "preserve") return undefined;
  return caseProjection === "titlecase" ? "capitalize" : caseProjection;
}

const typographyRules = (document, profile) =>
  Object.freeze(semanticLoci.map((spec, index) => {
    const typographyReading = readingFor(spec.id, profile, "typographyReadings");
    const predication = cell(
      token(mark(`${document.kind}:${document.slug}`)),
      predicateOfClaim(claim(mark(`typography:${spec.id}`))),
      token(mark(spec.label)),
    );
    const reading = fiberToType(typographyFiber(typographyLocus(predication, spec.role), typographyReading, "knowledge"));
    const scale = quadraticToNumber(reading.scaleStep);
    const fontSize = `${Number(scale.toFixed(4))}em`;
    const textTransform = textTransformForCase(reading.case);
    return rule(`typography:${spec.id}`, spec.id, spec.selector, {
      "font-size": fontSize,
      "font-style": reading.style === "roman" ? "normal" : "italic",
      "font-weight": String(reading.weight),
      ...(textTransform === undefined ? {} : { "text-transform": textTransform }),
    }, 300 + index);
  }));

const flowRules = (flow) => Object.freeze(
  flow.placements
    .filter((placement) => placement.kind === "segment" && placement.segment?.label !== undefined)
    .map((placement, index) => {
      const locus = placement.segment.label;
      const spec = semanticLoci.find((candidate) => candidate.id === locus);
      const indentRem = Number((placement.depth * 0.65).toFixed(2));
      return rule(`document-flow:${locus}`, locus, spec.selector, {
        "--metroplat-flow-ordinal": String(placement.ordinal),
        "--metroplat-flow-order": String(placement.order),
        "--metroplat-flow-depth": String(placement.depth),
        "--metroplat-flow-x": `${Number(placement.box.x.toFixed(2))}px`,
        "--metroplat-flow-y": `${Number(placement.box.y.toFixed(2))}px`,
        "--metroplat-flow-width": `${Number(placement.box.w.toFixed(2))}px`,
        "scroll-margin-block-start": "2rem",
        ...(indentRem === 0 ? {} : { "padding-inline-start": `${indentRem}rem` }),
      }, 500 + index);
    }),
);

/** Return document-flow placements for the Article page, including the in-article ad slot in the reading ring. */
export function articleThemedPageFlow(article, profile = livingWebIndieWebPageProfile) {
  const width = profile.documentFlow?.width ?? livingWebIndieWebPageProfile.documentFlow?.width;
  const margin = profile.documentFlow?.margin ?? livingWebIndieWebPageProfile.documentFlow?.margin;
  const ordinalGap = profile.documentFlow?.ordinalGap ?? livingWebIndieWebPageProfile.documentFlow?.ordinalGap;
  const segmentGap = profile.documentFlow?.segmentGap ?? livingWebIndieWebPageProfile.documentFlow?.segmentGap;
  const indent = profile.documentFlow?.indent ?? livingWebIndieWebPageProfile.documentFlow?.indent;
  return layout(dataformForDocument({ ...article, kind: "article" }, profile), {
    kind: "document-flow",
    ...(width === undefined ? {} : { width }),
    ...(margin === undefined ? {} : { margin }),
    ...(ordinalGap === undefined ? {} : { ordinalGap }),
    ...(segmentGap === undefined ? {} : { segmentGap }),
    ...(indent === undefined ? {} : { indent }),
  });
}

/** Return document-flow placements for a Page using the same static document loci as Article pages. */
export function pageThemedPageFlow(page, profile = livingWebIndieWebPageProfile) {
  const width = profile.documentFlow?.width ?? livingWebIndieWebPageProfile.documentFlow?.width;
  const margin = profile.documentFlow?.margin ?? livingWebIndieWebPageProfile.documentFlow?.margin;
  const ordinalGap = profile.documentFlow?.ordinalGap ?? livingWebIndieWebPageProfile.documentFlow?.ordinalGap;
  const segmentGap = profile.documentFlow?.segmentGap ?? livingWebIndieWebPageProfile.documentFlow?.segmentGap;
  const indent = profile.documentFlow?.indent ?? livingWebIndieWebPageProfile.documentFlow?.indent;
  return layout(dataformForDocument({ ...page, kind: "page" }, profile), {
    kind: "document-flow",
    ...(width === undefined ? {} : { width }),
    ...(margin === undefined ? {} : { margin }),
    ...(ordinalGap === undefined ? {} : { ordinalGap }),
    ...(segmentGap === undefined ? {} : { segmentGap }),
    ...(indent === undefined ? {} : { indent }),
  });
}

/** Return the CSS assignment set for an Article page, including loci for caller-supplied ad slot elements. */
export function articleThemedPageAssignmentSet(article, profile = livingWebIndieWebPageProfile) {
  const feeling = mergeFeeling(profile);
  const flow = articleThemedPageFlow(article, profile);
  return themedPageAssignmentSet({ ...article, kind: "article" }, profile, feeling, flow);
}

/** Return the CSS assignment set for a Page using the same static document loci as Article pages. */
export function pageThemedPageAssignmentSet(page, profile = livingWebIndieWebPageProfile) {
  const feeling = mergeFeeling(profile);
  const flow = pageThemedPageFlow(page, profile);
  return themedPageAssignmentSet({ ...page, kind: "page" }, profile, feeling, flow);
}

function themedPageAssignmentSet(
  document,
  profile,
  feeling,
  flow,
) {
  return Object.freeze({
    kind: "rendering.css.assignmentSet",
    loci: cssLoci(),
    fibers: Object.freeze([
      Object.freeze({
        id: "static-document-semantic-feeling",
        assignments: Object.freeze(semanticLoci.map((spec, index) => Object.freeze({
          id: `feeling:${spec.id}`,
          locus: spec.id,
          reading: readingFor(spec.id, profile, "readings"),
          sourceOrder: index,
        }))),
      }),
    ]),
    rules: Object.freeze([
      ...baseRules(feeling),
      ...typographyRules(document, profile),
      ...flowRules(flow),
      ...styleClaimRules(profile),
    ]),
  });
}

export function themedPageCssProjectionProfile(profile = livingWebIndieWebPageProfile) {
  const feeling = mergeFeeling(profile);
  return Object.freeze({
    ...livingWebIndieWebProfile,
    ...(profile.css ?? {}),
    regime: profile.css?.regime ?? feeling.regime,
  });
}

/** Return a stylesheet for an Article page and any caller-supplied themed-page ad slot elements. */
export function articleToThemedPageStylesheet(article, profile = livingWebIndieWebPageProfile) {
  return assignmentSetToStylesheet(articleThemedPageAssignmentSet(article, profile), themedPageCssProjectionProfile(profile));
}

/** Return a stylesheet for a Page using the same static document loci as Article pages. */
export function pageToThemedPageStylesheet(page, profile = livingWebIndieWebPageProfile) {
  return assignmentSetToStylesheet(pageThemedPageAssignmentSet(page, profile), themedPageCssProjectionProfile(profile));
}

const stylesheetFixturePage = Object.freeze({
  title: "Static document",
  slug: "static-document",
  path: "static-document.md",
  frontMatter: Object.freeze({}),
  body: "",
});

/** Return route-invariant themed-page body attributes for semantic static documents. */
export function themedPageBodyAttributes(profile = livingWebIndieWebPageProfile) {
  const feeling = mergeFeeling(profile);
  return staticWebsiteBodyAttributes({
    lens: "themed-page",
    profile: feeling.regime,
  });
}

/** Return the route-invariant stylesheet for static documents using this themed-page profile. */
export function staticDocumentToThemedPageStylesheet(profile = livingWebIndieWebPageProfile) {
  return pageToThemedPageStylesheet(stylesheetFixturePage, profile);
}

export function themedPageStyleTag(
  profile = livingWebIndieWebPageProfile,
  stylesheet = staticDocumentToThemedPageStylesheet(profile),
) {
  const mode = profile.stylesheet ?? livingWebIndieWebPageProfile.stylesheet ?? "inline";
  return mode === "inline"
    ? `<style data-metroplat-projection="themed-page">\n${styleElementContent(stylesheet)}</style>`
    : `<link rel="stylesheet" href="${escapeAttr(mode.href)}" data-metroplat-projection="themed-page">`;
}

/** Project an Article to a complete semantic h-entry document with derived page styling and no inserted ad slot elements. */
export function articleToThemedPage(article, profile = livingWebIndieWebPageProfile) {
  const semantic = articleToHtmlPage(article, {
    ...profile,
    bodyAttributes: themedPageBodyAttributes(profile),
  });
  const stylesheet = articleToThemedPageStylesheet(article, profile);
  return semantic.replace("</head>", `  ${themedPageStyleTag(profile, stylesheet)}\n</head>`);
}

/** Project a Page to a complete WebPage document with derived page styling. */
export function pageToThemedPage(page, profile = livingWebIndieWebPageProfile) {
  const semantic = pageToHtmlPage(page, {
    ...profile,
    bodyAttributes: themedPageBodyAttributes(profile),
  });
  const stylesheet = pageToThemedPageStylesheet(page, profile);
  return semantic.replace("</head>", `  ${themedPageStyleTag(profile, stylesheet)}\n</head>`);
}

const styleElementContent = (css) =>
  css.replace(/<\/style/giu, "<\\/style").replace(/<!--/gu, "<\\!--");

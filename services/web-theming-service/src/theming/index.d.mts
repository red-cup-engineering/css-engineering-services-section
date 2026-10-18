// Rendering signatures emitted by TypeScript 5.9.3 from the received Web API.
// Data admission below describes its existing SignCell 0.2 reading/contract.
import type { PaletteSeeds, TypeTokens, ThemeTokens, ThemePalette } from "../theming-computer/index.mjs";
export declare function escapeHtml(value: unknown): string;
export type NavItem = {
    href: string;
    label: string;
    current?: boolean;
};
export type HeadLink = {
    rel: string;
    href: string;
    type?: string;
    title?: string;
};
export type ThemeContext = {
    title?: string;
    lang?: string;
    description?: string;
    author?: string;
    siteName?: string;
    canonical?: string;
    stylesheets?: readonly string[];
    links?: readonly HeadLink[];
    nav?: readonly NavItem[];
    year?: number | string | null;
    nonce?: string;
    [key: string]: unknown;
};
export type NormalizedThemeContext = ThemeContext & {
    title: string;
    lang: string;
    description: string;
    author: string;
    siteName: string;
    canonical: string;
    stylesheets: readonly string[];
    links: readonly HeadLink[];
    nav: readonly NavItem[];
    year: number | string | null;
    nonce: string;
};
export type Theme = {
    name: string;
    head(ctx: NormalizedThemeContext): string;
    header(ctx: NormalizedThemeContext): string;
    footer(ctx: NormalizedThemeContext): string;
    wrap(articleHtml: string, ctx: NormalizedThemeContext): string;
    css: string;
};
export declare const THEME_MEMBERS: readonly ["name", "head", "header", "footer", "wrap", "css"];
export declare function attrs(map?: Readonly<Record<string, unknown>> | null): string;
export declare function el(tag: string, attributes?: Readonly<Record<string, unknown>> | null, children?: string | readonly string[]): string;
export declare function meta(name: string, content: unknown): string;
export declare function viewportMeta(): string;
export declare function charsetMeta(): string;
export { THEME_TOKEN_ROLES, tokenVar } from "../theming-computer/index.mjs";
export type { ThemeTokens, ThemePalette } from "../theming-computer/index.mjs";
export type TokenCssOptions = {
    /** Selector to attach the variables to (default `:root`). */
    selector?: string;
    /** Indent for each declaration (default two spaces). */
    indent?: string;
};
/** Render a palette to a CSS rule declaring each defined token as a custom property. */
export declare function tokenCss(tokens: ThemeTokens, options?: TokenCssOptions): string;
/** Merge palette layers left-to-right; a later layer's defined token wins. */
export declare function composeTokens(...layers: readonly (ThemeTokens | null | undefined)[]): ThemeTokens;
/** Render a palette to CSS: base `:root`, dark `@media`, and `[data-theme]` switches. */
export declare function paletteCss(palette: ThemePalette): string;
export declare const BASE_CSS = "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}\nhtml{color-scheme:light dark;-webkit-text-size-adjust:100%;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}\nbody{background:var(--surface);color:var(--ink);line-height:1.55;overflow-wrap:break-word;hyphens:auto}\nimg{max-width:100%;height:auto;display:block}\na{color:var(--accent)}\na:visited{color:var(--visited,var(--accent))}\n::selection{background:var(--selection,var(--accent));color:var(--surface)}";
export declare const COMPONENT_CSS = "/* Headings \u2014 type as mass: display face, tight, load-bearing. */\nh1,h2,h3,h4,h5,h6{font-family:var(--sans);font-weight:700;line-height:1.1;letter-spacing:-.02em;text-wrap:balance;overflow-wrap:break-word}\nh1{font-size:clamp(1.9rem,5vw,2.8rem);margin:0 0 .5rem}\nh2{font-size:clamp(1.35rem,3vw,1.8rem);margin:2rem 0 .6rem;padding-top:.6rem;border-top:1px solid var(--rule)}\nh3{font-size:1.2rem;margin:1.5rem 0 .4rem}\nh4{font-size:1rem;margin:1.2rem 0 .3rem}\np{text-wrap:pretty}\n\n/* Prose \u2014 the default styled content block. */\n.prose{font-family:var(--serif);font-size:1.0625rem;line-height:1.6;max-width:var(--measure,42rem)}\n.prose>*+*{margin-top:1.1rem}\n.prose a{color:var(--accent);text-underline-offset:2px}\n.prose strong{font-weight:700}\n.prose em{font-style:italic}\n.prose ul,.prose ol{padding-left:1.4rem}\n.prose li+li{margin-top:.3rem}\n.prose hr{border:0;border-top:2px solid var(--rule);margin:2rem 0}\n\n/* Lede \u2014 opening paragraph. */\n.lede{font-family:var(--serif);font-size:clamp(1.1rem,1.6vw,1.3rem);line-height:1.45;color:var(--ink)}\n\n/* Figures. */\nfigure{margin:1.6rem 0}\nfigcaption{font-family:var(--mono);font-size:.78rem;color:var(--ink-soft);margin-top:.4rem}\n\n/* Code. */\ncode{font-family:var(--mono);font-size:.88em;background:var(--surface-deep);padding:.1em .35em;border-radius:var(--radius,.25rem)}\npre{font-family:var(--mono);font-size:.85rem;background:var(--surface-deep);border:1px solid var(--surface-edge);padding:1rem;overflow-x:auto;border-radius:var(--radius,.25rem)}\npre code{background:none;padding:0}\n\n/* Blockquote + callout. */\nblockquote{margin:1.4rem 0;padding:.5rem 0 .5rem 1.2rem;border-left:3px solid var(--accent);font-style:italic;color:var(--ink-soft)}\n.callout{background:var(--tint,var(--surface-deep));border-left:3px solid var(--accent);padding:.9rem 1.1rem;margin:1.4rem 0}\n\n/* Held contradiction \u2014 the display state mainstream theming kits structurally\n   lack, because none sit on a paraconsistent substrate. A cell our logic holds\n   as both-witnessed-and-obstructed is SHOWN, never silently resolved (Cubist\n   anti-closure: sustain the reading rather than collapse it). Anti-closure with\n   rails: it is always visible (Tuftean integrity \u2014 contradiction is never\n   hidden) yet restrained by default (Brutalist salience scarcity \u2014 not every\n   mark shouts). [data-mode=audit] amplifies it into a salient block; calm mode\n   keeps it a quiet underline. Themeable via --alarm; no new token names. */\n[data-contested=true]{text-decoration:underline dotted var(--alarm,#c33);text-decoration-thickness:2px;text-underline-offset:2px;cursor:help}\n[data-mode=calm] [data-contested=true]{text-decoration-style:dotted}\n[data-mode=audit] [data-contested=true]{background:color-mix(in oklab,var(--alarm,#c33) 12%,transparent);outline:1px solid var(--alarm,#c33);padding:0 .15em;border-radius:var(--radius,0)}\n.contested-strip{font-family:var(--mono);font-size:.8rem;color:var(--alarm,#c33);background:color-mix(in oklab,var(--alarm,#c33) 8%,transparent);border:1px solid var(--alarm,#c33);padding:.5rem .7rem;margin:.6rem 0;border-radius:var(--radius,0);white-space:pre-line}\n/* Honest absence \u2014 a gap is rendered, not left blank (Tuftean integrity). */\n.gap,[data-gap=true]{font-family:var(--mono);font-size:.85em;font-style:italic;color:var(--ink-soft)}\n\n/* Card grid + cards. */\n.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr));gap:1rem;margin:1.4rem 0}\n.card{background:var(--surface-deep);border:1px solid var(--surface-edge);padding:1.1rem 1.2rem;border-radius:var(--radius,0)}\na.card{display:block;text-decoration:none;color:inherit;transition:border-color .12s}\na.card:hover{border-color:var(--accent)}\n.card__title{font-family:var(--sans);font-weight:700;font-size:1.15rem;letter-spacing:-.02em}\n.card__meta{font-family:var(--mono);font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-soft)}\n\n/* Feed / list of entries (h-feed). */\n.h-feed,.feed{list-style:none;padding:0;margin:0}\n.h-feed>li,.feed>li{padding:1rem 0;border-bottom:1px solid var(--rule)}\n.feed__title{font-family:var(--sans);font-weight:700;font-size:1.2rem}\n.feed__sum{color:var(--ink-soft);margin-top:.3rem;max-width:60ch}\n\n/* Breadcrumbs. */\n.breadcrumbs{font-family:var(--mono);font-size:.72rem;letter-spacing:.04em;color:var(--ink-soft);margin-bottom:.6rem}\n.breadcrumbs a{color:var(--ink-soft)}\n.breadcrumb-sep{margin:0 .35em;color:var(--surface-edge)}\n\n/* Table of contents. */\n.toc{border:1px solid var(--surface-edge);background:var(--surface-deep);padding:.8rem 1rem;margin:1.4rem 0}\n.toc summary{font-family:var(--mono);font-size:.74rem;text-transform:uppercase;letter-spacing:.1em;color:var(--ink-soft);cursor:pointer}\n.toc ul{list-style:none;padding-left:1rem;margin:.4rem 0 0}\n.toc a{font-family:var(--mono);font-size:.82rem;color:var(--ink-soft)}\n.toc a:hover{color:var(--ink)}\n\n/* Tags. */\n.tags{display:flex;flex-wrap:wrap;gap:.35rem;margin:1rem 0}\n.tag,.tags a,.p-category{display:inline-block;font-family:var(--mono);font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;text-decoration:none;border:1px solid var(--surface-edge);padding:.15em .5em;color:var(--ink-soft)}\n.tag:hover,.tags a:hover,a.p-category:hover{background:var(--ink);color:var(--surface)}\n\n/* Tables. */\ntable{border-collapse:collapse;width:100%;margin:1.4rem 0;font-size:.95em}\nth,td{padding:.4em .7em;border:1px solid var(--rule);text-align:left}\nthead th{font-family:var(--mono);font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;background:var(--surface-deep)}\n\n/* Pagination. */\n.pagination{display:flex;gap:1rem;justify-content:space-between;font-family:var(--mono);font-size:.8rem;margin:2rem 0;padding-top:1rem;border-top:1px solid var(--rule)}\n\n/* Forms. */\ninput,button,textarea,select{font-family:var(--sans);font-size:.9rem;color:var(--ink);background:var(--surface);border:1.5px solid var(--surface-edge);padding:.4rem .6rem;border-radius:var(--radius,0)}\nbutton{font-weight:700;cursor:pointer}\nbutton:hover{background:var(--ink);color:var(--surface)}\n\n/* Accessibility. */\n.skip-to-content{position:absolute;left:-9999px}\n.skip-to-content:focus{position:static}";
/** Assemble a theme's full stylesheet: palette + reset + components + chrome layers. */
export declare function assembleCss(palette: ThemePalette, ...chrome: readonly string[]): string;
/** Palette derivation, re-exported so web-theming is the single import site. */
export { derivePalette, deriveDark, themePalette } from "../theming-computer/index.mjs";
export type { PaletteSeeds, TypeTokens } from "../theming-computer/index.mjs";
export type ThemeSpec = {
    /** Theme name; sets `<body class="theme-NAME">`. */
    name: string;
    /** Colour seeds: light shades derived in OKLCH, dark synthesised from them. */
    seeds: PaletteSeeds;
    /** Type stacks + layout tokens, merged into both schemes. */
    type?: TypeTokens;
    /** Pin specific derived tokens (escape hatch), per scheme. */
    overrides?: {
        light?: Partial<ThemeTokens>;
        dark?: Partial<ThemeTokens>;
    };
    /** App- or identity-specific CSS appended after the reset + component library. */
    chrome?: string;
    /** Chrome hooks; default to empty head/header/footer and a pass-through wrap. */
    head?: Theme["head"];
    header?: Theme["header"];
    footer?: Theme["footer"];
    wrap?: Theme["wrap"];
};
/**
 * Decode a ThemeSpec into a full Theme plus its derived light+dark palette. The
 * result is a valid `Theme` (so it passes straight to `render`) with an extra
 * `palette` field for consumers that compose the palette directly — e.g.
 * `assembleCss(theme.palette, moreChrome)` for a sibling surface.
 */
export declare function decodeTheme(spec: ThemeSpec): Theme & {
    palette: ThemePalette;
};
export declare function isTheme(value: unknown): value is Theme;
export declare function assertTheme(value: unknown): asserts value is Theme;
export declare function normalizeContext(ctx?: ThemeContext): NormalizedThemeContext;
export declare function render(theme: Theme, articleHtml: string, context?: ThemeContext): string;
export declare function renderNav(items: readonly NavItem[] | null | undefined, ariaLabel?: string): string;
export declare const minimal: Theme;
export declare const atelier: Theme;

export type ThemeJudgment = { value: "potential" | "active"; reason: string; path: string };
export type ThemeEntry = { subject: string; predicate: string; object: string; provenance: string };
export type ThemeUtterance = Readonly<{
    kind: "utterance.carrier";
    token: Readonly<{ kind: "utterance.token"; hand: "left"; mark: Readonly<{ kind: "utterance.mark"; value: Readonly<{ subject: string; object: string }> }> }>;
    claim: Readonly<{ kind: "utterance.claim"; hand: "right"; mark: Readonly<{ kind: "utterance.mark"; value: string }> }>;
}>;
export type ThemeAdmission = {
    themeName: string; admitted: boolean; reading: "potential" | "active";
    judgments: readonly ThemeJudgment[]; entries: readonly ThemeEntry[];
    utterances: readonly ThemeUtterance[];
    contract: Readonly<{ subject: string; predicate: string; object: string; for: readonly string[]; against: readonly string[] }>;
    reasons: string[];
};
export declare function admitTheme(value: unknown): ThemeAdmission;
export type FinishedTheme = {
    name: string;
    colors: Record<string, { light: string; dark: string }>;
    jewel: string; space: readonly number[];
    type: { families: readonly string[]; sizes: readonly number[]; roles: { display: number; heading: number; body: number; annotation: number } };
    geometry: string; density: string;
};
export declare const DEFAULT_THEME: FinishedTheme;
export declare function themeFromDesignTokens(tokens: unknown, options?: { name?: string }): FinishedTheme;
export { hexToRgb, luminance, contrastRatio, toGrayscale } from "../theming-computer/index.mjs";
export declare function validateTheme(theme: FinishedTheme): { code: string; subject: string; reason: string; data?: { pair: string[]; mode: string; rendition: string; ratio: number; floor: number } }[];
export declare function generateStylesheet(theme: FinishedTheme): string;

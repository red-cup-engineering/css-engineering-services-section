/** Colour roles — derived perceptually in OKLCH from ink/surface/accent seeds. */
export type ColorTokens = {
    /** Primary text / marks. */
    ink?: string;
    /** Recessive text: captions, metadata, secondary marks. */
    inkSoft?: string;
    /** Page ground. */
    surface?: string;
    /** Raised or inset ground: cards, panels, code blocks. */
    surfaceDeep?: string;
    /** Borders and edges drawn on a surface. */
    surfaceEdge?: string;
    /** Hairline rules between content. */
    rule?: string;
    /** Faint wash fill: tag/quote/meta backgrounds. */
    tint?: string;
    /** Stronger wash fill: hover/active backgrounds. */
    tintStrong?: string;
    /** ::selection background. */
    selection?: string;
    /** Primary accent: links, citations, emphasis. */
    accent?: string;
    /** Alert accent: hazard, urgency. */
    alarm?: string;
    /** Visited-link colour. */
    visited?: string;
};
/** Non-colour token roles a full palette also carries (type stacks, layout). */
export type TypeTokens = {
    /** Sans / display family stack. */
    sans?: string;
    /** Serif / slab body family stack. */
    serif?: string;
    /** Monospace family stack. */
    mono?: string;
    /** Page side gutter. */
    gutter?: string;
    /** Maximum content width. */
    max?: string;
    /** Optimal reading measure. */
    measure?: string;
    /** Corner radius (0 for the hard-edged brutalist register). */
    radius?: string;
};
/** The canonical design-token vocabulary: every role a theme can declare. */
export type ThemeTokens = ColorTokens & TypeTokens;
/** The canonical token roles, in render order. */
export declare const THEME_TOKEN_ROLES: readonly (keyof ColorTokens | keyof TypeTokens)[];
/** The canonical CSS custom-property name for a token role (e.g. `inkSoft` → `--ink-soft`). */
export declare function tokenVar(role: keyof ThemeTokens): string;
/**
 * A palette is a `light` base plus optional `dark` overrides and named
 * `variants`; dark mode and theme switches fall out of this data when rendered.
 */
export type ThemePalette = {
    /** The default palette (also the light scheme). */
    light: ThemeTokens;
    /** Overrides applied under dark color-scheme and `[data-theme="dark"]`. */
    dark?: ThemeTokens;
    /** Named alternates, opt-in via `[data-theme="<name>"]`. */
    variants?: Readonly<Record<string, ThemeTokens>>;
};

/** Existing CSS palette projection operations. */
export declare function composeTokens(...layers: (ThemeTokens | undefined)[]): Readonly<ThemeTokens>;
export declare function paletteToCssRules(palette: ThemePalette): readonly Readonly<{selector: string; declarations: Readonly<Record<string, string>>; condition?: Readonly<{media: string}>}>[];
export declare function paletteCss(palette: ThemePalette, profile?: unknown): string;

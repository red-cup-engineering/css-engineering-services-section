import type { ColorTokens, TypeTokens } from "./tokens.mjs";
export type { TypeTokens } from "./tokens.mjs";
/**
 * The colour roles `derivePalette` always populates: the shared `ColorTokens`
 * vocabulary with the derived roles made required (only `alarm` stays optional,
 * since it is only present when an alarm seed is given).
 */
export type DerivedPalette = Required<Omit<ColorTokens, "alarm">> & Pick<ColorTokens, "alarm">;
export type PaletteSeeds = {
    /** Primary text / marks. */
    ink: string;
    /** Page ground. */
    surface: string;
    /** Primary accent (links, citations). */
    accent: string;
    /** Optional alert accent. */
    alarm?: string;
};
/** Derive a full colour palette from ink/surface/accent seeds, in OKLCH. */
export declare function derivePalette(seeds: PaletteSeeds): DerivedPalette;
/** A complete light+dark palette, structurally a web-theming `ThemePalette`. */
export type FullPalette = {
    light: DerivedPalette & TypeTokens;
    dark: DerivedPalette & TypeTokens;
};
/**
 * Build a complete light+dark palette from seeds plus type/layout tokens — the
 * one call a theme needs: colours derived in OKLCH (light) and synthesised
 * (dark), with the shared type stacks merged in. Assignable directly to
 * web-theming's `ThemePalette`.
 */
export declare function themePalette(seeds: PaletteSeeds, type?: TypeTokens): FullPalette;
/**
 * Synthesise a dark palette from a light one's seeds: pull the surface down to a
 * near-black ground, lift the ink to a near-white, and raise a too-dark accent
 * so it reads on the dark ground — then re-derive the rest.
 */
export declare function deriveDark(seeds: PaletteSeeds): DerivedPalette;

/** Named musical/typographic ratios. */
export declare const RATIOS: Readonly<{
    minorSecond: 1.067;
    majorSecond: 1.125;
    minorThird: 1.2;
    majorThird: 1.25;
    perfectFourth: 1.333;
    augmentedFourth: 1.414;
    perfectFifth: 1.5;
    goldenSection: 1.618;
}>;
/** A size on a modular scale: base × ratio^step (step may be negative). */
export declare function modularScale(base: number, ratio: number, step: number): number;
/**
 * Build a `clamp(min, preferred, max)` declaration that scales `minPx`→`maxPx`
 * as the viewport goes `minVw`→`maxVw`. The preferred term is the line through
 * those two points, expressed in rem + vw so it honours user zoom.
 */
export declare function fluidClamp(opts: {
    minPx: number;
    maxPx: number;
    minVw?: number;
    maxVw?: number;
    rootPx?: number;
}): string;
export type FluidStep = {
    /** Step index relative to the base (0 = base). */
    step: number;
    /** The `clamp()` declaration. */
    value: string;
    /** Floor / ceiling in px, for reference. */
    minPx: number;
    maxPx: number;
};
/**
 * Generate a fluid modular type scale: each step's floor uses `minRatio` and its
 * ceiling uses `maxRatio` (a larger ceiling ratio makes display sizes scale up
 * harder on wide screens). Returns steps from `down` below the base to `up`
 * above it.
 */
export declare function fluidTypeScale(opts: {
    basePx?: number;
    minRatio?: number;
    maxRatio?: number;
    up?: number;
    down?: number;
    minVw?: number;
    maxVw?: number;
    rootPx?: number;
}): FluidStep[];

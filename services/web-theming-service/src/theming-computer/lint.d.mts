import { type WcagLevel } from "./contrast.mjs";
import type { DerivedPalette } from "./palette.mjs";
export type ContrastCheck = {
    /** Human label, e.g. "body (ink on surface)". */
    pair: string;
    fg: string;
    bg: string;
    ratio: number;
    apca: number;
    level: WcagLevel;
    large: boolean;
    required: number;
    passes: boolean;
};
type Required = {
    fg: keyof DerivedPalette;
    bg: keyof DerivedPalette;
    pair: string;
    level: WcagLevel;
    large: boolean;
};
/** Certify the legibility pairs of a palette against WCAG (with APCA reported). */
export declare function certifyContrast(palette: DerivedPalette, pairs?: readonly Required[]): ContrastCheck[];
export type ScarcityReport = {
    /** Tokens whose chroma exceeds the loud threshold. */
    loud: string[];
    count: number;
    budget: number;
    within: boolean;
};
/**
 * Scarcity test: count the chromatic ("loud") colours in a palette. Grounds and
 * marks (ink/surface/edges/rules) are near-neutral; accents and alerts carry
 * chroma. Holding the loud count to a small budget keeps salience scarce.
 */
export declare function scarcityReport(palette: DerivedPalette, opts?: {
    chromaThreshold?: number;
    budget?: number;
}): ScarcityReport;
export type PaletteCertification = {
    passes: boolean;
    contrast: ContrastCheck[];
    scarcity: ScarcityReport;
};
/** Custom numerical report: specified contrast pairs pass and color scarcity is within budget; not whole-site accessibility certification. */
export declare function certifyPalette(palette: DerivedPalette, opts?: {
    pairs?: readonly Required[];
    chromaThreshold?: number;
    budget?: number;
}): PaletteCertification;
export {};

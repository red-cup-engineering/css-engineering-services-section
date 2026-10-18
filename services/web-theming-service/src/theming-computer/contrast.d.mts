import { type Rgb } from "./color.mjs";
/** WCAG 2.1 relative luminance of an sRGB colour (0–1). */
export declare function relativeLuminance(rgb: Rgb): number;
/** WCAG 2.1 contrast ratio between two colour strings (1–21). */
export declare function contrastRatio(a: string, b: string): number;
export type WcagLevel = "AA" | "AAA";
/** Does fg-on-bg meet a WCAG 2.1 level? `large` = ≥18pt or ≥14pt bold. */
export declare function meetsWcag(fg: string, bg: string, options?: {
    level?: WcagLevel;
    large?: boolean;
}): boolean;
/**
 * APCA lightness contrast (Lc), signed: positive for dark-text-on-light,
 * negative for light-text-on-dark. The magnitude is the perceptual contrast;
 * common guidance: |Lc| ≥ 75 for body text, ≥ 60 for larger/heavier, ≥ 45 for
 * large headings, ≥ 30 for non-text/disabled.
 */
export declare function apcaLc(text: string, background: string): number;
/** Absolute APCA Lc (perceptual contrast magnitude). */
export declare function apcaContrast(text: string, background: string): number;

export declare function luminance(input: string): number;

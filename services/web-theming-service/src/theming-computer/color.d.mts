export type Rgb = {
    /** sRGB channels, gamma-encoded, 0–1. */
    r: number;
    g: number;
    b: number;
    /** Alpha 0–1 (default 1). */
    a: number;
};
export type Oklch = {
    /** Perceptual lightness, 0–1. */
    l: number;
    /** Chroma, ≥0 (typically 0–0.4). */
    c: number;
    /** Hue in degrees, 0–360. */
    h: number;
    /** Alpha 0–1. */
    a: number;
};
/** Parse `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()/rgba()` into sRGB 0–1. */
export declare function parseColor(input: string): Rgb;
/** Format sRGB as `#rrggbb` (or `#rrggbbaa` when alpha < 1). */
export declare function toHex(rgb: Rgb): string;
export declare function rgbToOklch(rgb: Rgb): Oklch;
export declare function oklchToRgb(o: Oklch): Rgb;
/** Parse any sRGB colour string into OKLCH. */
export declare function toOklch(input: string): Oklch;
/** Format OKLCH as a CSS `oklch()` string (gamut-clamped on the sRGB round-trip). */
export declare function formatOklch(o: Oklch, places?: number): string;
/** Set lightness (0–1), keeping chroma, hue, alpha. */
export declare function withLightness(o: Oklch, l: number): Oklch;
/** Set chroma (≥0). */
export declare function withChroma(o: Oklch, c: number): Oklch;
/** Rotate hue by degrees. */
export declare function rotateHue(o: Oklch, deg: number): Oklch;
/** Lighten toward white by a fraction of the remaining headroom. */
export declare function lighten(o: Oklch, amount: number): Oklch;
/** Darken toward black by a fraction of the current lightness. */
export declare function darken(o: Oklch, amount: number): Oklch;
/** Mute: scale chroma toward grey by a fraction. */
export declare function mute(o: Oklch, amount: number): Oklch;
/** Perceptual mix of two colours in OKLab, t in 0–1 (0 = a, 1 = b). */
export declare function mix(a: Oklch, b: Oklch, t: number): Oklch;
/** Convenience: apply an OKLCH op to a hex/rgb string, return hex. */
export declare function adjust(input: string, op: (o: Oklch) => Oklch): string;

/** Existing JavaScript colour helpers, also part of this native owner. */
export declare function hexToRgb(input: string): number[];
export declare function toGrayscale(input: string): string;
export declare function isColor(input: unknown): boolean;

import { parseColor } from "./color.mjs";
function wcagLinear(c) {
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
export function relativeLuminance(rgb) {
    return 0.2126 * wcagLinear(rgb.r) + 0.7152 * wcagLinear(rgb.g) + 0.0722 * wcagLinear(rgb.b);
}
export function luminance(input) {
    return relativeLuminance(parseColor(input));
}
export function contrastRatio(a, b) {
    const la = relativeLuminance(parseColor(a));
    const lb = relativeLuminance(parseColor(b));
    const hi = Math.max(la, lb);
    const lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
}
export function meetsWcag(fg, bg, options = {}) {
    const ratio = contrastRatio(fg, bg);
    const level = options.level ?? "AA";
    const large = options.large ?? false;
    const threshold = level === "AAA" ? large ? 4.5 : 7 : large ? 3 : 4.5;
    return ratio >= threshold;
}
const APCA = {
    trc: 2.4,
    R: 0.2126729,
    G: 0.7151522,
    B: 0.072175,
    normBG: 0.56,
    normTXT: 0.57,
    revTXT: 0.62,
    revBG: 0.65,
    blkThrs: 0.022,
    blkClmp: 1.414,
    scale: 1.14,
    loOffset: 0.027,
    loClip: 0.1,
    deltaYmin: 0.0005
};
function apcaY(rgb) {
    const lin = (c)=>c ** APCA.trc;
    let y = APCA.R * lin(rgb.r) + APCA.G * lin(rgb.g) + APCA.B * lin(rgb.b);
    if (y < APCA.blkThrs) y += (APCA.blkThrs - y) ** APCA.blkClmp;
    return y;
}
export function apcaLc(text, background) {
    const txtY = apcaY(parseColor(text));
    const bgY = apcaY(parseColor(background));
    if (Math.abs(bgY - txtY) < APCA.deltaYmin) return 0;
    let sapc;
    let output;
    if (bgY > txtY) {
        sapc = (bgY ** APCA.normBG - txtY ** APCA.normTXT) * APCA.scale;
        output = sapc < APCA.loClip ? 0 : sapc - APCA.loOffset;
    } else {
        sapc = (bgY ** APCA.revBG - txtY ** APCA.revTXT) * APCA.scale;
        output = sapc > -APCA.loClip ? 0 : sapc + APCA.loOffset;
    }
    return output * 100;
}
export function apcaContrast(text, background) {
    return Math.abs(apcaLc(text, background));
}

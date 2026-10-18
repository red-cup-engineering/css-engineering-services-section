const clamp01 = (x)=>x < 0 ? 0 : x > 1 ? 1 : x;
function srgbToLinear(c) {
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function linearToSrgb(c) {
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}
export function parseColor(input) {
    const s = input.trim().toLowerCase();
    if (s.startsWith("#")) {
        const hex = s.slice(1);
        if (!/^(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(hex)) {
            throw new Error(`unrecognised hex colour: ${input}`);
        }
        const expand = (h)=>parseInt(h.length === 1 ? h + h : h, 16);
        if (hex.length === 3 || hex.length === 4) {
            return {
                r: expand(hex[0]) / 255,
                g: expand(hex[1]) / 255,
                b: expand(hex[2]) / 255,
                a: hex.length === 4 ? expand(hex[3]) / 255 : 1
            };
        }
        if (hex.length === 6 || hex.length === 8) {
            return {
                r: parseInt(hex.slice(0, 2), 16) / 255,
                g: parseInt(hex.slice(2, 4), 16) / 255,
                b: parseInt(hex.slice(4, 6), 16) / 255,
                a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
            };
        }
        throw new Error(`unrecognised hex colour: ${input}`);
    }
    const m = s.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
        const parts = m[1].split(/[,/]/).map((p)=>p.trim());
        const numeric = /^[+-]?(?:\d*\.\d+|\d+)(?:e[+-]?\d+)?%?$/;
        if ((parts.length !== 3 && parts.length !== 4)
            || parts.some((part)=>!numeric.test(part) || !Number.isFinite(parseFloat(part)))) {
            throw new Error(`unrecognised colour: ${input}`);
        }
        const chan = (p)=>p.endsWith("%") ? parseFloat(p) / 100 : parseFloat(p) / 255;
        return {
            r: clamp01(chan(parts[0])),
            g: clamp01(chan(parts[1])),
            b: clamp01(chan(parts[2])),
            a: parts[3] !== undefined ? clamp01(parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])) : 1
        };
    }
    throw new Error(`unrecognised colour: ${input}`);
}
export function hexToRgb(input) {
    const { r, g, b } = parseColor(input);
    return [
        r,
        g,
        b
    ].map((channel)=>Math.round(channel * 255));
}
export function toGrayscale(input) {
    const [r, g, b] = hexToRgb(input);
    const gray = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b).toString(16).padStart(2, "0");
    return `#${gray}${gray}${gray}`;
}
const hex2 = (x)=>Math.round(clamp01(x) * 255).toString(16).padStart(2, "0");
export function toHex(rgb) {
    const base = `#${hex2(rgb.r)}${hex2(rgb.g)}${hex2(rgb.b)}`;
    return rgb.a < 1 ? `${base}${hex2(rgb.a)}` : base;
}
export function rgbToOklch(rgb) {
    const r = srgbToLinear(rgb.r);
    const g = srgbToLinear(rgb.g);
    const b = srgbToLinear(rgb.b);
    const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
    const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
    const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
    const c = Math.hypot(A, B);
    let h = Math.atan2(B, A) * 180 / Math.PI;
    if (h < 0) h += 360;
    return {
        l: L,
        c,
        h,
        a: rgb.a
    };
}
export function oklchToRgb(o) {
    const hr = o.h * Math.PI / 180;
    const A = o.c * Math.cos(hr);
    const B = o.c * Math.sin(hr);
    const l_ = o.l + 0.3963377774 * A + 0.2158037573 * B;
    const m_ = o.l - 0.1055613458 * A - 0.0638541728 * B;
    const s_ = o.l - 0.0894841775 * A - 1.291485548 * B;
    const l = l_ ** 3;
    const m = m_ ** 3;
    const s = s_ ** 3;
    const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
    return {
        r: clamp01(linearToSrgb(r)),
        g: clamp01(linearToSrgb(g)),
        b: clamp01(linearToSrgb(b)),
        a: o.a
    };
}
export function toOklch(input) {
    return rgbToOklch(parseColor(input));
}
export function isColor(input) {
    try {
        parseColor(input);
        return true;
    } catch  {
        return false;
    }
}
export function formatOklch(o, places = 4) {
    const L = (o.l * 100).toFixed(2);
    const C = o.c.toFixed(places);
    const H = o.h.toFixed(2);
    return o.a < 1 ? `oklch(${L}% ${C} ${H} / ${o.a})` : `oklch(${L}% ${C} ${H})`;
}
const wrapHue = (h)=>(h % 360 + 360) % 360;
export function withLightness(o, l) {
    return {
        ...o,
        l: clamp01(l)
    };
}
export function withChroma(o, c) {
    return {
        ...o,
        c: Math.max(0, c)
    };
}
export function rotateHue(o, deg) {
    return {
        ...o,
        h: wrapHue(o.h + deg)
    };
}
export function lighten(o, amount) {
    return withLightness(o, o.l + (1 - o.l) * amount);
}
export function darken(o, amount) {
    return withLightness(o, o.l * (1 - amount));
}
export function mute(o, amount) {
    return withChroma(o, o.c * (1 - amount));
}
export function mix(a, b, t) {
    const k = clamp01(t);
    const ar = oklchToRgb(a);
    const br = oklchToRgb(b);
    const A = rgbToOklch(ar);
    const B = rgbToOklch(br);
    const aA = A.c * Math.cos(A.h * Math.PI / 180);
    const aB = A.c * Math.sin(A.h * Math.PI / 180);
    const bA = B.c * Math.cos(B.h * Math.PI / 180);
    const bB = B.c * Math.sin(B.h * Math.PI / 180);
    const L = A.l + (B.l - A.l) * k;
    const mA = aA + (bA - aA) * k;
    const mB = aB + (bB - aB) * k;
    let h = Math.atan2(mB, mA) * 180 / Math.PI;
    if (h < 0) h += 360;
    return {
        l: L,
        c: Math.hypot(mA, mB),
        h,
        a: a.a + (b.a - a.a) * k
    };
}
export function adjust(input, op) {
    return toHex(oklchToRgb(op(toOklch(input))));
}

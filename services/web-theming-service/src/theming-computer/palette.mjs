import { mix, oklchToRgb, toHex, toOklch } from "./color.mjs";
const toward = (a, b, t)=>toHex(oklchToRgb(mix(toOklch(a), toOklch(b), t)));
export function derivePalette(seeds) {
    const { ink, surface, accent } = seeds;
    const palette = {
        ink,
        surface,
        accent,
        inkSoft: toward(ink, surface, 0.32),
        surfaceDeep: toward(surface, ink, 0.06),
        surfaceEdge: toward(surface, ink, 0.16),
        rule: toward(surface, ink, 0.14),
        tint: toward(surface, ink, 0.05),
        tintStrong: toward(surface, ink, 0.11),
        selection: toward(accent, surface, 0.55),
        visited: toward(accent, ink, 0.35)
    };
    if (seeds.alarm !== undefined) palette.alarm = seeds.alarm;
    return palette;
}
export function themePalette(seeds, type = {}) {
    return {
        light: {
            ...derivePalette(seeds),
            ...type
        },
        dark: {
            ...deriveDark(seeds),
            ...type
        }
    };
}
const setL = (o, l, maxC)=>({
        ...o,
        l,
        c: maxC === undefined ? o.c : Math.min(o.c, maxC)
    });
export function deriveDark(seeds) {
    const surfaceO = toOklch(seeds.surface);
    const inkO = toOklch(seeds.ink);
    const accentO = toOklch(seeds.accent);
    const darkSurface = toHex(oklchToRgb(setL(surfaceO, 0.16, 0.03)));
    const darkInk = toHex(oklchToRgb(setL(inkO, 0.92, 0.02)));
    const darkAccent = toHex(oklchToRgb(accentO.l < 0.62 ? setL(accentO, 0.72) : accentO));
    const darkSeeds = {
        ink: darkInk,
        surface: darkSurface,
        accent: darkAccent
    };
    if (seeds.alarm !== undefined) {
        const alarmO = toOklch(seeds.alarm);
        darkSeeds.alarm = toHex(oklchToRgb(alarmO.l < 0.62 ? setL(alarmO, 0.72) : alarmO));
    }
    return derivePalette(darkSeeds);
}

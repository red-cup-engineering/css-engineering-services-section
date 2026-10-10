import { contrastRatio, apcaLc, meetsWcag } from "./contrast.mjs";
import { isColor, toOklch } from "./color.mjs";
const DEFAULT_PAIRS = Object.freeze([
    {
        fg: "ink",
        bg: "surface",
        pair: "body (ink on surface)",
        level: "AA",
        large: false
    },
    {
        fg: "ink",
        bg: "surfaceDeep",
        pair: "text on raised (ink on surfaceDeep)",
        level: "AA",
        large: false
    },
    {
        fg: "inkSoft",
        bg: "surface",
        pair: "secondary (inkSoft on surface)",
        level: "AA",
        large: true
    },
    {
        fg: "accent",
        bg: "surface",
        pair: "link (accent on surface)",
        level: "AA",
        large: false
    }
]);
const threshold = (level, large)=>level === "AAA" ? large ? 4.5 : 7 : large ? 3 : 4.5;
export function certifyContrast(palette, pairs = DEFAULT_PAIRS) {
    const out = [];
    for (const p of pairs){
        const fg = palette[p.fg];
        const bg = palette[p.bg];
        if (fg === undefined || bg === undefined) continue;
        out.push({
            pair: p.pair,
            fg,
            bg,
            ratio: Math.round(contrastRatio(fg, bg) * 100) / 100,
            apca: Math.round(apcaLc(fg, bg) * 10) / 10,
            level: p.level,
            large: p.large,
            required: threshold(p.level, p.large),
            passes: meetsWcag(fg, bg, {
                level: p.level,
                large: p.large
            })
        });
    }
    return out;
}
export function scarcityReport(palette, opts = {}) {
    const chromaThreshold = opts.chromaThreshold ?? 0.04;
    const budget = opts.budget ?? 3;
    const loud = [];
    for (const [role, value] of Object.entries(palette)){
        if (value === undefined) continue;
        if (typeof value !== "string" || !isColor(value)) continue;
        if (toOklch(value).c > chromaThreshold) loud.push(role);
    }
    return {
        loud,
        count: loud.length,
        budget,
        within: loud.length <= budget
    };
}
export function certifyPalette(palette, opts = {}) {
    const contrast = certifyContrast(palette, opts.pairs);
    const scarcity = scarcityReport(palette, opts);
    return {
        contrast,
        scarcity,
        passes: contrast.every((c)=>c.passes) && scarcity.within
    };
}

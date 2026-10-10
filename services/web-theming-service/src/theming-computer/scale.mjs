export const RATIOS = Object.freeze({
    minorSecond: 1.067,
    majorSecond: 1.125,
    minorThird: 1.2,
    majorThird: 1.25,
    perfectFourth: 1.333,
    augmentedFourth: 1.414,
    perfectFifth: 1.5,
    goldenSection: 1.618
});
export function modularScale(base, ratio, step) {
    return base * ratio ** step;
}
export function fluidClamp(opts) {
    const { minPx, maxPx } = opts;
    const minVw = opts.minVw ?? 360;
    const maxVw = opts.maxVw ?? 1240;
    const root = opts.rootPx ?? 16;
    const slope = (maxPx - minPx) / (maxVw - minVw);
    const interceptPx = minPx - slope * minVw;
    const interceptRem = interceptPx / root;
    const slopeVw = slope * 100;
    const minRem = minPx / root;
    const maxRem = maxPx / root;
    const lo = Math.min(minRem, maxRem);
    const hi = Math.max(minRem, maxRem);
    return `clamp(${round(lo)}rem, ${round(interceptRem)}rem + ${round(slopeVw)}vw, ${round(hi)}rem)`;
}
const round = (n)=>Math.round(n * 10000) / 10000;
export function fluidTypeScale(opts) {
    const basePx = opts.basePx ?? 16;
    const minRatio = opts.minRatio ?? RATIOS.minorThird;
    const maxRatio = opts.maxRatio ?? RATIOS.perfectFourth;
    const up = opts.up ?? 5;
    const down = opts.down ?? 2;
    const minVw = opts.minVw ?? 360;
    const maxVw = opts.maxVw ?? 1240;
    const rootPx = opts.rootPx ?? 16;
    const steps = [];
    for(let step = -down; step <= up; step++){
        const minPx = round(modularScale(basePx, minRatio, step));
        const maxPx = round(modularScale(basePx, maxRatio, step));
        steps.push({
            step,
            minPx,
            maxPx,
            value: fluidClamp({
                minPx,
                maxPx,
                minVw,
                maxVw,
                rootPx
            })
        });
    }
    return steps;
}

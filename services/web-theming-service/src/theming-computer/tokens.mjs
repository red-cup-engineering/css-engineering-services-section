const TOKEN_VARS = Object.freeze({
    ink: "--ink",
    inkSoft: "--ink-soft",
    surface: "--surface",
    surfaceDeep: "--surface-deep",
    surfaceEdge: "--surface-edge",
    rule: "--rule",
    tint: "--tint",
    tintStrong: "--tint-strong",
    selection: "--selection",
    accent: "--accent",
    alarm: "--alarm",
    visited: "--visited",
    sans: "--sans",
    serif: "--serif",
    mono: "--mono",
    gutter: "--gutter",
    max: "--max",
    measure: "--measure",
    radius: "--radius"
});
export const THEME_TOKEN_ROLES = Object.freeze(Object.keys(TOKEN_VARS));
export function tokenVar(role) {
    return TOKEN_VARS[role];
}

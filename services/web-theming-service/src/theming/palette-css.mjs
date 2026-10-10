import { THEME_TOKEN_ROLES, tokenVar } from "../theming-computer/index.mjs";

export function tokenCss(tokens, options = {}) {
    const selector = options.selector ?? ":root";
    const indent = options.indent ?? "  ";
    const lines = [];
    for (const role of THEME_TOKEN_ROLES){
        const value = tokens[role];
        if (value === undefined || value === null) continue;
        lines.push(`${indent}${tokenVar(role)}: ${value};`);
    }
    return `${selector} {\n${lines.join("\n")}\n}`;
}

export function composeTokens(...layers) {
    const out = {};
    for (const layer of layers){
        if (!layer) continue;
        for (const role of THEME_TOKEN_ROLES){
            const value = layer[role];
            if (value !== undefined && value !== null) out[role] = value;
        }
    }
    return out;
}

export function paletteCss(palette) {
    const blocks = [
        tokenCss(palette.light)
    ];
    if (palette.dark) {
        const dark = composeTokens(palette.light, palette.dark);
        blocks.push(`@media (prefers-color-scheme: dark) {\n${tokenCss(dark)}\n}`);
        blocks.push(tokenCss(palette.light, {
            selector: '[data-theme="light"]'
        }));
        blocks.push(tokenCss(dark, {
            selector: '[data-theme="dark"]'
        }));
    }
    if (palette.variants) {
        for (const [name, tokens] of Object.entries(palette.variants)){
            blocks.push(tokenCss(composeTokens(palette.light, tokens), {
                selector: `[data-theme="${name}"]`
            }));
        }
    }
    return blocks.join("\n");
}

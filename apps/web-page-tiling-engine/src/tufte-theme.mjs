/**
 * Domain-neutral document themes for TUFTE's existing semantic markup.
 * A theme changes presentation only; it never supplies tiles, interactions,
 * or application vocabulary.
 */
export const EARLY_MAC_THEME_STYLES = String.raw`
body[data-tufte-theme=early-mac]{color-scheme:light;min-height:100vh;min-height:100dvh;--tufte-bg:#c8c8c4;--tufte-surface:#f5f3ed;--tufte-ink:#151515;--tufte-muted:#4b4b47;--tufte-line:#151515;--tufte-accent:#151515;--tufte-warn:#565647;--tufte-danger:#49211c;--tufte-radius:0;--tufte-gap:.75rem;background-color:var(--tufte-bg);background-image:repeating-conic-gradient(#c8c8c4 0 25%,#b8b8b5 0 50%);background-size:4px 4px;font-family:Chicago,Charcoal,Geneva,"Lucida Grande","Noto Sans","Arial Unicode MS",sans-serif;font-size:17px;line-height:1.5;letter-spacing:.01em}
body[data-tufte-theme=early-mac] .tufte-shell{width:min(1080px,100%);padding:clamp(.7rem,2.5vw,1.5rem);}
body[data-tufte-theme=early-mac] .tufte-masthead{display:block;margin-bottom:.75rem;padding:.55rem .75rem .65rem;border:1px solid var(--tufte-line);background-color:#c8c8c4;background-image:repeating-linear-gradient(0deg,#151515 0 1px,transparent 1px 4px);box-shadow:2px 2px 0 rgba(21,21,21,.7)}
body[data-tufte-theme=early-mac] .tufte-masthead>div{padding:.35rem .5rem;background:var(--tufte-surface);border:1px solid var(--tufte-line)}
body[data-tufte-theme=early-mac] .tufte-masthead h1{margin:.1rem auto;padding:.2rem .75rem;width:fit-content;max-width:100%;background:var(--tufte-surface);font-family:Chicago,Charcoal,Geneva,"Lucida Grande","Noto Sans","Arial Unicode MS",sans-serif;font-size:clamp(1.35rem,3vw,2rem);font-weight:700;letter-spacing:.015em;text-align:center}
body[data-tufte-theme=early-mac] .tufte-subtitle{max-width:62ch;font-size:1rem;color:var(--tufte-muted)}
body[data-tufte-theme=early-mac] .tufte-eyebrow,body[data-tufte-theme=early-mac] .tufte-tile h2{color:var(--tufte-ink);font-family:Chicago,Charcoal,Geneva,"Lucida Grande","Noto Sans","Arial Unicode MS",sans-serif;font-weight:700;letter-spacing:.08em}
body[data-tufte-theme=early-mac] .tufte-grid{gap:.75rem}
body[data-tufte-theme=early-mac] .tufte-tile{padding:.75rem 1rem;border:1px solid var(--tufte-line);border-radius:0;background:var(--tufte-surface);box-shadow:2px 2px 0 rgba(23,20,12,.55)}
body[data-tufte-theme=early-mac] .tufte-tile header{padding:.25rem .35rem .4rem;margin:0 0 .65rem;border:1px solid var(--tufte-line);background:#deded9;background-image:repeating-linear-gradient(0deg,rgba(21,21,21,.5) 0 1px,transparent 1px 4px)}
body[data-tufte-theme=early-mac] .tufte-tile h2{display:table;margin:.05rem auto;padding:.08rem .45rem;max-width:100%;background:var(--tufte-surface);font-size:.8rem;line-height:1.35;text-align:center}
body[data-tufte-theme=early-mac] .tufte-tile-body{font-size:1rem;line-height:1.6;overflow-wrap:anywhere}
body[data-tufte-theme=early-mac] a{color:var(--tufte-ink);text-decoration-thickness:2px;text-underline-offset:.13em}
body[data-tufte-theme=early-mac] button,body[data-tufte-theme=early-mac] input,body[data-tufte-theme=early-mac] select,body[data-tufte-theme=early-mac] textarea{border:1px solid #151515;border-radius:0;background:#fffefa;box-shadow:inset 1px 1px #fff,inset -1px -1px #777773;font:inherit}
body[data-tufte-theme=early-mac] button{min-height:2.35rem;padding:.35rem .8rem;box-shadow:inset 1px 1px #fff,inset -1px -1px #777773,1px 1px 0 #151515;font-weight:700}
body[data-tufte-theme=early-mac] button:active{transform:translate(1px,1px);box-shadow:inset 1px 1px #777773,inset -1px -1px #fff}
body[data-tufte-theme=early-mac] input,body[data-tufte-theme=early-mac] select,body[data-tufte-theme=early-mac] textarea{min-height:2.35rem;padding:.42rem .55rem}
body[data-tufte-theme=early-mac] input:focus-visible,body[data-tufte-theme=early-mac] select:focus-visible,body[data-tufte-theme=early-mac] textarea:focus-visible,body[data-tufte-theme=early-mac] button:focus-visible,body[data-tufte-theme=early-mac] a:focus-visible{outline:3px double #17140c;outline-offset:3px}
body[data-tufte-theme=early-mac] .tufte-skip{border-color:#151515;border-radius:0;background:#fffefa;box-shadow:2px 2px 0 #151515}
body[data-tufte-theme=early-mac] .tufte-footer{padding:.55rem .7rem;border-top:1px solid var(--tufte-line);color:var(--tufte-ink)}
body[data-tufte-theme=early-mac] .tufte-splitter:hover::after,body[data-tufte-theme=early-mac] .tufte-splitter:focus-visible::after{background:#17140c}
@media(max-width:760px){body[data-tufte-theme=early-mac]{font-size:16px}body[data-tufte-theme=early-mac] .tufte-shell{padding:.65rem}body[data-tufte-theme=early-mac] .tufte-tile{box-shadow:1px 1px 0 rgba(23,20,12,.55)}body[data-tufte-theme=early-mac] .tufte-masthead{box-shadow:1px 1px 0 rgba(23,20,12,.55)}}
@media(prefers-reduced-motion:reduce){body[data-tufte-theme=early-mac] button:active{transform:none}}
`;

export const EARLY_MAC_THEME = Object.freeze({
  name: "early-mac",
  styles: EARLY_MAC_THEME_STYLES,
  themeColor: "#c8c8c4",
});

/**
 * Resolve a theme without introducing application policy: a built-in name, or a theme a site
 * supplies as a value, `{ name, styles, themeColor? }`. The theme's `styles` should scope every rule
 * under `body[data-tufte-theme=<name>]`, as the built-in one does, so themes never leak into each other.
 */
export function resolveTufteTheme(theme) {
  if (theme === EARLY_MAC_THEME.name) return EARLY_MAC_THEME;
  if (!theme || typeof theme !== "object") return null;
  const { name, styles, themeColor } = theme;
  if (typeof name !== "string" || !/^[a-z][a-z0-9-]*$/iu.test(name) || typeof styles !== "string") return null;
  return Object.freeze({ name, styles, ...(typeof themeColor === "string" ? { themeColor } : {}) });
}

/** Map a validated shared web theme onto TUFTE's presentation properties. */
export function tufteThemeStyles(theme) {
  const vars = (mode) => [
    ["--tufte-bg", theme.colors.wash[mode]],
    ["--tufte-surface", theme.colors.paper[mode]],
    ["--tufte-ink", theme.colors.ink[mode]],
    ["--tufte-muted", theme.colors.muted[mode]],
    ["--tufte-line", theme.colors.line[mode]],
    ["--tufte-accent", theme.colors[theme.jewel][mode]],
    ["--tufte-danger", theme.colors.signal[mode]],
  ].map(([name, value]) => `${name}:${value}`).join(";");
  const [reading, display, mono] = theme.type.families;
  const bodySize = theme.type.sizes?.[theme.type.roles?.body];
  return `:root{${vars("light")};font-family:${reading}${bodySize ? `;font-size:${bodySize}px` : ""}}
@media(prefers-color-scheme:dark){:root{${vars("dark")}}}
body{font-family:${reading}}
h1,h2,h3,h4{font-family:${display}}
code,pre,kbd,samp{font-family:${mono}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.01ms!important}}
`;
}

const token = (value, fallback) => /^[a-z][a-z0-9-]*$/i.test(String(value ?? ""))
  ? String(value)
  : fallback;

const record = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const trustedText = (value) => typeof value === "string" ? value : "";

import { normalizeTufteModel, liveToken, escapeHtml, renderTufteForm, renderTufteTileBody, admitTufteUrl, renderTufteMetadata, normalizeTufteMetadata, renderTufteNavigation } from "./tufte-browser.mjs";
import { computeTufteWorkspaceGeometry } from "./tufte-topology.mjs";
import { resolveTufteTheme } from "./tufte-theme.mjs";

export { renderTufteForm };

// The visual base is deliberately calm: flat surfaces, hairline borders, a
// quiet serif masthead over a system-stack body, honest light and dark from
// one token set -- no gradients, no blur, no chrome for chrome's sake.
const BASE_STYLES = String.raw`
:root{color-scheme:light dark;--tufte-bg:#f0efeb;--tufte-surface:#fbfaf7;--tufte-ink:#24292a;--tufte-muted:#626a68;--tufte-line:#d6d3ca;--tufte-accent:#3e6377;--tufte-warn:#96731f;--tufte-danger:#a04b32;--tufte-radius:.25rem;--tufte-gap:.5rem;--accent:var(--tufte-accent);--ink:var(--tufte-ink);--ink-dim:var(--tufte-muted);--border:var(--tufte-line);--bg:var(--tufte-bg);--surface:var(--tufte-surface);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:15px;background:var(--tufte-bg);color:var(--tufte-ink)}
@media(prefers-color-scheme:dark){:root{--tufte-bg:#15181a;--tufte-surface:#1e2224;--tufte-ink:#dfdfd7;--tufte-muted:#949c98;--tufte-line:#363c3e;--tufte-accent:#86aec2;--tufte-warn:#cfa64e;--tufte-danger:#cf7d5f}}
*{box-sizing:border-box}html{min-height:100%;background:var(--tufte-bg)}body{margin:0;min-height:100%;background:var(--tufte-bg);color:var(--tufte-ink);line-height:1.55}
a{color:var(--tufte-accent)}button,input,select,textarea{font:inherit;color:inherit}
input,select,textarea{padding:.4rem .55rem;border:1px solid var(--tufte-line);border-radius:var(--tufte-radius);background:var(--tufte-surface)}
input:focus-visible,select:focus-visible,textarea:focus-visible,button:focus-visible,a:focus-visible{outline:2px solid var(--tufte-accent);outline-offset:1px}
button{padding:.4rem .8rem;border:1px solid var(--tufte-line);border-radius:var(--tufte-radius);background:var(--tufte-surface);cursor:pointer}
button:hover{border-color:var(--tufte-accent)}
.tufte-shell{width:min(1280px,100%);margin:auto;padding:max(.75rem,env(safe-area-inset-top)) max(.75rem,env(safe-area-inset-right)) max(1.25rem,env(safe-area-inset-bottom)) max(.75rem,env(safe-area-inset-left))}
.tufte-masthead{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;padding:.35rem 0 .6rem;margin-bottom:var(--tufte-gap);border-bottom:1px solid var(--tufte-line)}
.tufte-eyebrow{margin:0 0 .15rem;color:var(--tufte-muted);font-size:.68rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.tufte-masthead h1{margin:0;font-family:ui-serif,Georgia,serif;font-size:1.35rem;font-weight:600;line-height:1.2;letter-spacing:.01em}
.tufte-subtitle{max-width:45rem;margin:.2rem 0 0;color:var(--tufte-muted);font-size:.85rem;line-height:1.45}
[data-tufte-navigation]{display:flex;flex-wrap:wrap;gap:1rem}[data-tufte-navigation] a{padding:.4rem 0}[data-tufte-navigation] [aria-current=page]{font-weight:700}
.tufte-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));grid-auto-flow:dense;gap:var(--tufte-gap);align-items:start}
.tufte-tile{grid-column:span var(--tile-span,4);min-width:0;padding:.7rem .85rem;border:1px solid var(--tufte-line);border-radius:var(--tufte-radius);background:var(--tufte-surface)}
.tufte-tile[data-role=now]{grid-column:span 8}.tufte-tile[data-role=rail]{grid-column:span 12}.tufte-tile[data-role=aside]{grid-column:span 4}
.tufte-tile[data-side=lake]{border-right:2px solid var(--tufte-accent)}.tufte-tile[data-side=land]{border-left:2px solid var(--tufte-accent)}
.tufte-tile[data-lifecycle=imminent]{border-color:var(--tufte-warn)}
.tufte-tile[data-confidence=low],.tufte-tile[data-lifecycle=pending]{opacity:.75;border-style:dashed}
.tufte-tile header{margin-bottom:.45rem;padding-bottom:.35rem;border-bottom:1px solid var(--tufte-line)}
.tufte-tile h2{margin:0;color:var(--tufte-muted);font-size:.7rem;font-weight:650;line-height:1.3;letter-spacing:.1em;text-transform:uppercase}
.tufte-tile-body{line-height:1.5}.tufte-tile-body :is(img,svg,video,canvas,iframe){max-width:100%;height:auto}.tufte-tile-body>:first-child{margin-top:0}.tufte-tile-body>:last-child{margin-bottom:0}
.tufte-form-field{margin-bottom:.6rem}.tufte-form-field label{display:block;margin-bottom:.2rem;font-size:.8rem;font-weight:600}
.tufte-field-description{margin:.2rem 0 0;color:var(--tufte-muted);font-size:.78rem}
.tufte-field-error{margin:.2rem 0 0;color:var(--tufte-danger);font-size:.78rem}
.tufte-table-scroll{overflow-x:auto}.tufte-table-scroll table{width:100%;border-collapse:collapse}.tufte-table-scroll caption{text-align:left;font-weight:600;margin-bottom:.35rem}.tufte-table-scroll th,.tufte-table-scroll td{padding:.35rem .45rem;border-bottom:1px solid var(--tufte-line);vertical-align:top}.tufte-align-end{text-align:end}.tufte-align-start{text-align:start}.tufte-table-empty{color:var(--tufte-muted)}
.tufte-skip{position:fixed;left:.5rem;top:.5rem;z-index:99;padding:.6rem;background:var(--tufte-surface);color:var(--tufte-ink);border:1px solid var(--tufte-line);transform:translateY(-180%)}.tufte-skip:focus{transform:none}
.tufte-footer{margin-top:.75rem;color:var(--tufte-muted);font-size:.78rem;line-height:1.5;overflow-wrap:anywhere}
.tufte-workspace{position:relative;grid-auto-flow:row}
.tufte-workspace>.tufte-tile{display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden}
.tufte-workspace>.tufte-tile[hidden]{display:none}
.tufte-workspace>.tufte-tile>.tufte-tile-body{flex:1 1 auto;min-height:0;overflow:auto}
.tufte-splitter{position:absolute;z-index:5;touch-action:none;background:transparent}
.tufte-splitter[aria-orientation=vertical]{cursor:col-resize;width:11px;transform:translateX(-50%)}
.tufte-splitter[aria-orientation=horizontal]{cursor:row-resize;height:11px;transform:translateY(-50%)}
.tufte-splitter::after{content:"";position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border-radius:2px;background:transparent}
.tufte-splitter[aria-orientation=vertical]::after{width:3px;height:2.5rem}
.tufte-splitter[aria-orientation=horizontal]::after{width:2.5rem;height:3px}
.tufte-splitter:hover::after,.tufte-splitter:focus-visible::after{background:var(--tufte-accent)}
.tufte-splitter:focus-visible{outline:2px solid var(--tufte-accent);outline-offset:-1px}
@media(max-width:760px){.tufte-grid{grid-template-columns:repeat(6,minmax(0,1fr))}.tufte-tile,.tufte-tile[data-role=now],.tufte-tile[data-role=aside]{grid-column:span 6}.tufte-tile[data-role=rail]{grid-column:span 6}.tufte-masthead{display:block}.tufte-workspace{display:flex;flex-direction:column}.tufte-workspace>.tufte-tile{min-height:0}.tufte-splitter{display:none}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}}`;

/**
 * Render just the tile grid -- `<div class="tufte-grid">...</div>`, no
 * `<html>`/`<head>`/masthead -- as its own export. A pure refactor of markup
 * that already lived inside renderTufteDocument, not a new primitive: lets a
 * caller compose a nested grid into one tile's own `html` field in their own
 * code (ordinary string interpolation, the same trust boundary `tile.html`
 * already documents), without TUFTE growing a nested-document schema.
 */
export function renderTufteFragment(model = {}) {
  const input = record(model);
  const projection = normalizeTufteModel(input);
  // A workspace turns the grid into an actual tiling: the flat DOM order is
  // untouched (reading and tab order still govern); only the grid tracks and
  // per-tile areas realize the split tree, and splitters mark real edges.
  const geometry = input.workspace ? computeTufteWorkspaceGeometry(input.workspace, projection) : null;
  const areaFor = geometry ? new Map(geometry.panes.map((pane) => [pane.tile, pane.area])) : null;
  const hiddenTiles = geometry ? new Set(geometry.hidden) : null;
  const renderedTiles = projection.tiles.map((tile, index) => {
    const id = token(tile?.id, `tile-${index + 1}`);
    const role = token(tile?.role, "standard");
    const lifecycle = token(tile?.lifecycle, "present");
    const confidence = token(tile?.confidence, "high");
    const side = token(tile?.side, "center");
    const span = Math.max(2, Math.min(12, Number(tile?.span) || 4));
    const live = liveToken(tile?.live);
    const area = areaFor?.get(id);
    const areaStyle = area ? `;grid-area:${area.row[0]} / ${area.column[0]} / ${area.row[1]} / ${area.column[1]}` : "";
    const body = renderTufteTileBody(tile);
    return `<section class="tufte-tile" id="${id}"${hiddenTiles?.has(id) ? " hidden" : ""} data-role="${role}" data-lifecycle="${lifecycle}" data-confidence="${confidence}" data-side="${side}" style="--tile-span:${span}${areaStyle}" aria-labelledby="${id}-title"><header>${tile?.eyebrow ? `<p class="tufte-eyebrow">${escapeHtml(tile.eyebrow)}</p>` : ""}<h2 id="${id}-title">${escapeHtml(tile?.title || "Untitled")}</h2></header><div class="tufte-tile-body"${live ? ` aria-live="${live}" aria-atomic="true"` : ""}>${body}</div></section>`;
  }).join("");
  if (!geometry) return `<div class="tufte-grid">${renderedTiles}</div>`;
  const pct = (value) => `${Math.round(value * 10000) / 100}%`;
  const splitters = geometry.splitters.map((splitter) => {
    const vertical = splitter.axis === "row";
    const position = vertical
      ? `left:${pct(splitter.rect.x)};top:${pct(splitter.rect.y)};height:${pct(splitter.rect.height)}`
      : `top:${pct(splitter.rect.y)};left:${pct(splitter.rect.x)};width:${pct(splitter.rect.width)}`;
    return `<div class="tufte-splitter" role="separator" tabindex="0" aria-orientation="${vertical ? "vertical" : "horizontal"}" aria-label="Resize panes" aria-valuemin="${Math.round(splitter.min * 100)}" aria-valuemax="${Math.round(splitter.max * 100)}" aria-valuenow="${Math.round(splitter.boundary * 100)}" data-tufte-splitter="${escapeHtml(splitter.id)}" style="${position}"></div>`;
  }).join("");
  const template = `grid-template-columns:${geometry.columns.map((size) => `${Math.round(size * 10000) / 10000}fr`).join(" ")};grid-template-rows:${geometry.rows.map((size) => `${Math.round(size * 10000) / 10000}fr`).join(" ")}`;
  return `<div class="tufte-grid tufte-workspace"${geometry.fullscreen ? ` data-tufte-fullscreen="${escapeHtml(geometry.fullscreen)}"` : ""} data-tufte-workspace="${escapeHtml(JSON.stringify(geometry.workspace))}" style="${template}">${renderedTiles}${splitters}</div>`;
}

/** Shared theme CSS for an external stylesheet response or a nonce-authorized style element. */
export function renderTufteStyles(options = {}) {
  return `${BASE_STYLES}${resolveTufteTheme(options.theme)?.styles ?? ""}${trustedText(options.styles)}`;
}

/** Render one accessible living-interface document from ordinary tile data. */
export function renderTufteDocument(model = {}, options = {}) {
  const input = record(model);
  const settings = record(options);
  const projection = normalizeTufteModel(input);
  const theme = resolveTufteTheme(settings.theme);
  const metadata = normalizeTufteMetadata({ ...projection.metadata, ...(settings.documentTitle ? { title: settings.documentTitle } : {}), ...(settings.language ? { language: settings.language } : {}), themeColor: settings.themeColor ?? projection.metadata.themeColor ?? theme?.themeColor ?? "#071513" });
  const documentTitle = escapeHtml(metadata.title ?? projection.title);
  const nonce = settings.nonce ? ` nonce="${escapeHtml(settings.nonce)}"` : "";
  const layoutRules = [];
  const fragment = renderTufteFragment(input);
  const grid = settings.nonce ? fragment.replace(/ style="([^"]*)"/g, (_, style) => {
    const id = `layout-${layoutRules.length}`;
    layoutRules.push(`[data-tufte-layout="${id}"]{${style}}`);
    return ` data-tufte-layout="${id}"`;
  }) : fragment;
  const styles = `${renderTufteStyles(settings)}${layoutRules.join("")}`;
  if (/<\/style/i.test(styles) || /<\/script/i.test(settings.clientScript ?? "")) throw new TypeError("Raw text assets must not contain closing HTML tags");
  // An import map must precede every module script it resolves for.
  const importMap = settings.importMap ? `<script type="importmap"${nonce}>${JSON.stringify({ imports: Object.fromEntries(Object.entries(settings.importMap.imports ?? {}).map(([specifier, href]) => [specifier, admitTufteUrl(href)])) }).replace(/</gu, "\\u003c")}</script>` : "";
  const assets = importMap + (settings.stylesheets ?? []).map((asset) => `<link rel="stylesheet" href="${escapeHtml(admitTufteUrl(asset.href))}"${asset.integrity ? ` integrity="${escapeHtml(asset.integrity)}" crossorigin="anonymous"` : ""}>`).join("")
    + (settings.scripts ?? []).map((asset) => `<script type="module" src="${escapeHtml(admitTufteUrl(asset.src))}"${nonce}${asset.integrity ? ` integrity="${escapeHtml(asset.integrity)}" crossorigin="anonymous"` : ""}></script>`).join("");

  return `<!doctype html><html lang="${escapeHtml(metadata.language ?? "en")}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">${renderTufteMetadata({ ...metadata, title: metadata.title ?? projection.title })}<title>${documentTitle}</title><style${nonce}>${styles}</style>${assets}${trustedText(settings.headHtml)}</head><body${theme ? ` data-tufte-theme="${theme.name}"` : ""}><a class="tufte-skip" href="#tufte-content">Skip to content</a><main class="tufte-shell" tabindex="-1" id="tufte-content" data-tufte${theme ? ` data-tufte-theme="${theme.name}"` : ""} ${settings.bootstrapData ? `data-tufte-bootstrap="${escapeHtml(JSON.stringify(settings.bootstrapData))}" ` : ""}data-revision="${escapeHtml(projection.revision)}" data-source="${escapeHtml(settings.source || "")}" data-action-endpoint="${escapeHtml(settings.actionEndpoint || "")}"><header class="tufte-masthead"><div>${projection.eyebrow ? `<p class="tufte-eyebrow">${escapeHtml(projection.eyebrow)}</p>` : ""}<h1>${escapeHtml(projection.title)}</h1>${projection.subtitle ? `<p class="tufte-subtitle">${escapeHtml(projection.subtitle)}</p>` : ""}</div>${renderTufteNavigation(projection.navigation)}${trustedText(input.mastheadHtml)}</header>${grid}${typeof input.footerHtml === "string" && input.footerHtml ? `<footer class="tufte-footer">${input.footerHtml}</footer>` : ""}</main>${typeof settings.clientScript === "string" && settings.clientScript ? `<script type="module"${nonce}>${settings.clientScript}</script>` : ""}</body></html>`;
}

/**
 * Tile-shape helper: a pure function returning a ready-to-use tile object
 * (its `html` field is an ordinary HTML string) for the confidence-badge
 * pattern that was previously copy-pasted per consumer. Optional composition
 * sugar, not a new primitive -- delete the call and hand-write the tile
 * again, nothing to migrate off.
 */
export function confidenceBadgeTile({ id, title = "Confidence", label, confidence = "high", detail } = {}) {
  const html = `<p class="tufte-badge" data-confidence="${escapeHtml(token(confidence, "high"))}">${escapeHtml(label ?? confidence ?? "")}</p>${detail ? `<p>${escapeHtml(detail)}</p>` : ""}`;
  return { id, title, confidence, html };
}

/**
 * Tile-shape helper: a pure function returning a ready-to-use tile object
 * wrapping its body in a native `<details>` disclosure when `summary` is
 * given. Same status as confidenceBadgeTile -- optional, deletable sugar.
 */
export function disclosurePanelTile({ id, title = "Details", summary, html, content, role, lifecycle, confidence, side, span } = {}) {
  const body = html ?? `<p>${escapeHtml(content ?? "")}</p>`;
  return { id, title, role, lifecycle, confidence, side, span, html: summary ? `<details><summary>${escapeHtml(summary)}</summary>${body}</details>` : body };
}

// Only the DOM-free seams re-export from the main entry point; the
// DOM-touching ones (applyTufteProjectionPatch, applyTufteReceipt,
// connectTufteDocument) stay exclusive to `./browser`, same boundary the
// package already drew between a Node/CLI-safe entry and a browser one.
export { normalizeTufteModel, normalizeTufteForm, normalizeTufteTable, renderTufteTable, diffTufteProjection } from "./tufte-browser.mjs";
export { EARLY_MAC_THEME, EARLY_MAC_THEME_STYLES, resolveTufteTheme } from "./tufte-theme.mjs";
export {
  normalizeTufteWorkspace,
  computeTufteWorkspaceGeometry,
  describeTufteWorkspace,
  reduceTufteWorkspace,
  TUFTE_WORKSPACE_MIN_SHARE,
} from "./tufte-topology.mjs";

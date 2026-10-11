// game-styles — the look of qwzspace's game client (game-client.mjs), as one stylesheet a server
// page inlines, so the shell stands before the script runs, and the client injects where the page
// did not. A game themes it with custom properties on `.qz-game`, never by restyling a panel:
//   --qz-bg      the window behind the world, before it is drawn
//   --qz-ink     text on the glass
//   --qz-glass   the panels' fill
//   --qz-edge    the panels' border
//   --qz-accent  what is one's own: the said line, focus, the map's "you"
//   --qz-call    the call to act (a card's enter button)
//   --qz-font    the shell's type; the chat is monospaced always
//
// The canvas fills the window and the heads-up panels stand over it, glass over the world: where one
// is at the top left, the menu at the top right with what one follows under it, and one flex row
// along the bottom that stacks on a narrow screen. In the text tier (`[data-tier=text]`) the chat is
// the window.

/** The game client's stylesheet, for a `<style id="qz-game-styles">` of the page's own. */
export const GAME_STYLES = `.qz-game{--qz-bg:#0b1020;--qz-ink:#eef2f8;--qz-glass:rgb(10 14 28/.74);--qz-edge:rgb(255 255 255/.13);--qz-accent:#6ea0ff;--qz-call:#f2d27a;--qz-font:system-ui,-apple-system,"Segoe UI",sans-serif;position:fixed;inset:0;z-index:50;overflow:hidden;background:var(--qz-bg);color:var(--qz-ink);font:14px/1.4 var(--qz-font);-webkit-font-smoothing:antialiased}
html.qz-playing,html.qz-playing body{overflow:hidden}
.qz-game *{box-sizing:border-box}
.qz-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab;outline:none}
.qz-canvas:active{cursor:grabbing}
.qz-labels{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.qz-label{position:absolute;left:0;top:0;pointer-events:auto;max-width:13rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 12px/1.2 var(--qz-font);color:#fff;background:rgb(8 12 24/.62);border:1px solid rgb(255 255 255/.2);border-radius:999px;padding:3px 9px;cursor:pointer;backdrop-filter:blur(4px)}
.qz-label[hidden]{display:none}
.qz-label:hover,.qz-label:focus-visible{background:rgb(8 12 24/.92);border-color:#fff;outline:none}
.qz-label.qz-figure{cursor:default;pointer-events:none;background:rgb(8 12 24/.45);border-color:transparent;font-weight:550}
.qz-tip{position:absolute;left:0;top:0;z-index:3;pointer-events:none;max-width:22rem;font-size:12px;color:#fff;background:rgb(0 0 0/.82);border-radius:6px;padding:5px 8px}
.qz-tip[hidden]{display:none}
.qz-panel{background:var(--qz-glass);border:1px solid var(--qz-edge);border-radius:12px;backdrop-filter:blur(10px);box-shadow:0 10px 30px rgb(0 0 0/.35)}
.qz-chip{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.qz-here{position:absolute;top:16px;left:16px;max-width:min(28rem,calc(100% - 32px - 3.5rem));padding:10px 14px}
.qz-here:empty{display:none}
.qz-here h1{margin:0;font-size:20px;line-height:1.2;letter-spacing:-.01em}
.qz-here p{margin:4px 0 0}
.qz-meta{opacity:.85}
.qz-crumbs{display:flex;flex-wrap:wrap;gap:2px 6px;margin:0 0 3px;font-size:12px;opacity:.72}
.qz-crumbs button{all:unset;cursor:pointer}.qz-crumbs button:hover,.qz-crumbs button:focus-visible{text-decoration:underline}
.qz-menu{position:absolute;top:16px;right:16px;max-width:min(24rem,calc(100% - 32px));max-height:calc(100% - 32px);overflow:auto}
.qz-menu summary{list-style:none;cursor:pointer;padding:9px 14px;font-weight:650;white-space:nowrap}
.qz-menu summary::-webkit-details-marker{display:none}
.qz-menu nav{display:grid;padding:0 14px 8px}
.qz-menu a{color:#cfe0ff;text-decoration:none;padding:4px 0}.qz-menu a:hover{text-decoration:underline}
.qz-about{padding:0 14px 8px;font-size:13px;line-height:1.5}.qz-about:empty{display:none}.qz-about p{margin:0 0 8px}
.qz-about a{color:#cfe0ff}.qz-about input{display:block;width:100%;margin:0 0 6px;font:inherit;color:inherit;background:rgb(255 255 255/.08);border:1px solid rgb(255 255 255/.16);border-radius:8px;padding:6px 9px}
.qz-about button,.qz-here button{font:inherit;color:#fff;background:rgb(255 255 255/.1);border:1px solid rgb(255 255 255/.18);border-radius:8px;padding:6px 11px;cursor:pointer}.qz-here .qz-enter{color:var(--qz-bg);background:var(--qz-call);border:0}
.qz-tracker{position:absolute;top:62px;right:16px;max-width:calc(100% - 32px);max-height:calc(100% - 300px);min-height:2.4rem;overflow:auto}
.qz-tracker[open]{width:min(22rem,calc(100% - 32px))}
.qz-tracker[hidden]{display:none}
.qz-tracker summary{list-style:none;cursor:pointer;padding:8px 12px;font-weight:650;font-size:13px;white-space:nowrap}
.qz-tracker summary::-webkit-details-marker{display:none}
.qz-tracker summary::before{content:"▸ ";opacity:.7}.qz-tracker[open] summary::before{content:"▾ "}
.qz-tracked{display:grid;gap:6px;padding:0 10px 10px}
.qz-tracked>p{margin:0 2px;font-size:12.5px}
.qz-track{display:grid;gap:3px;padding:6px 8px;border-radius:8px;background:rgb(255 255 255/.05)}
.qz-track p{margin:0;font-size:12.5px;line-height:1.35;overflow-wrap:anywhere}
.qz-track .qz-meta{font-size:11.5px;opacity:.72}
.qz-acts{display:flex;flex-wrap:wrap;gap:4px}
.qz-tracker button{font:inherit;font-size:12px;color:#fff;background:rgb(255 255 255/.1);border:1px solid rgb(255 255 255/.18);border-radius:6px;padding:2px 8px;cursor:pointer}
.qz-tracker button:hover,.qz-tracker button:focus-visible{border-color:#fff;outline:none}
.qz-tracker .qz-handle{font:600 11px/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--qz-call);margin-right:4px}
.qz-legend{display:grid;gap:3px;padding:8px 14px;border-top:1px solid rgb(255 255 255/.1);font-size:12px;text-transform:capitalize}
.qz-legend:empty{display:none}
.qz-status{margin:0;padding:4px 14px 10px;font-size:11px;opacity:.6}
.qz-bottom{position:absolute;left:16px;right:16px;bottom:16px;display:flex;align-items:flex-end;gap:12px;pointer-events:none}
.qz-bottom>*{pointer-events:auto}
.qz-chat{flex:0 1 32rem;min-width:0;display:grid}
.qz-log{max-height:min(32vh,20rem);overflow-y:auto;padding:10px 12px 4px;font:12.5px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}
.qz-log .qz-said{color:#9fc3ff}.qz-log .qz-fail{color:#ff9b9b}.qz-log .qz-system{opacity:.65}.qz-log .qz-heading{font-weight:700;color:#fff}
.qz-say{display:flex;gap:6px;padding:8px;border-top:1px solid rgb(255 255 255/.1)}
.qz-say input{flex:1;min-width:0;font:inherit;color:inherit;background:rgb(255 255 255/.08);border:1px solid rgb(255 255 255/.16);border-radius:8px;padding:7px 10px}
.qz-say input:focus{outline:2px solid var(--qz-accent);outline-offset:0}
.qz-say button,.qz-hotbar button{font:inherit;color:#fff;background:rgb(255 255 255/.1);border:1px solid rgb(255 255 255/.18);border-radius:8px;padding:7px 12px;cursor:pointer}
.qz-hotbar{flex:1 1 0;min-width:0;display:flex;flex-wrap:wrap;justify-content:center;gap:6px;pointer-events:none}
.qz-hotbar button{pointer-events:auto;display:flex;align-items:center;gap:7px;max-width:15rem;background:var(--qz-glass);backdrop-filter:blur(10px)}
.qz-say button:hover,.qz-hotbar button:hover,.qz-hotbar button:focus-visible{border-color:#fff;outline:none}
.qz-hotbar kbd{font:600 11px/1 ui-monospace,monospace;background:rgb(255 255 255/.16);border-radius:4px;padding:3px 5px}
.qz-hotbar span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.qz-rumours{flex:0 1 22rem;min-width:0;margin-left:auto;display:grid;gap:3px;align-content:end;justify-items:end;pointer-events:none;font-size:12.5px;line-height:1.35;text-align:right}
.qz-rumours p{margin:0;max-width:100%;padding:3px 9px;border-radius:8px;background:rgb(8 12 24/.5);text-shadow:0 1px 2px rgb(0 0 0/.8);animation:qz-rumour 14s linear forwards}
@keyframes qz-rumour{0%{opacity:0;transform:translateY(6px)}4%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}
.qz-log .qz-rumour{color:#f2c98a;font-style:italic}
.qz-minimap{position:relative;flex:none;width:184px;height:184px;margin-left:auto;overflow:hidden}
.qz-rumours+.qz-minimap{margin-left:0}
.qz-map-canvas{display:block;width:100%;height:100%;cursor:pointer}
.qz-you{position:absolute;left:0;top:0;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px var(--qz-accent);pointer-events:none}
.qz-you[hidden]{display:none}
.qz-card{position:absolute;z-index:2;left:clamp(16px,6vw,96px);top:50%;transform:translateY(-50%);max-width:min(30rem,calc(100% - 32px));padding:28px 30px}
.qz-kicker{margin:0 0 8px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#9fc3ff}
.qz-card h1{margin:0 0 14px;font-size:clamp(34px,5vw,54px);line-height:1.04;letter-spacing:-.015em}
.qz-card p{margin:0 0 20px;font-size:15px;line-height:1.55;opacity:.92}
.qz-enter{display:inline-block;font-weight:700;color:var(--qz-bg);background:var(--qz-call);border:0;border-radius:10px;padding:12px 22px;text-decoration:none;font-size:15px;cursor:pointer}
.qz-enter:hover,.qz-enter:focus-visible{filter:brightness(1.12);outline:none}
.qz-card .qz-hint{margin:16px 0 0;font-size:12px;opacity:.6}
.qz-game[data-tier=text] .qz-bottom{top:16px}
.qz-game[data-tier=text] .qz-here,.qz-game[data-tier=text] .qz-tracker{display:none}
.qz-game[data-tier=text] .qz-chat{flex:1 1 auto;align-self:stretch;grid-template-rows:1fr auto;max-width:56rem;margin:0 auto}
.qz-game[data-tier=text] .qz-log{max-height:none}
.qz-game[data-tier=text] .qz-minimap{display:none}
.qz-game[data-tier=text] .qz-menu{position:static;margin:16px}
@media (max-width:760px){.qz-bottom{flex-direction:column-reverse;align-items:stretch}.qz-chat{flex:none}.qz-log{max-height:22vh}.qz-minimap{display:none}.qz-rumours{display:none}.qz-hotbar{flex:none;justify-content:flex-start;flex-wrap:nowrap;overflow-x:auto}.qz-card{top:auto;bottom:16px;transform:none;left:16px;right:16px;padding:20px}.qz-menu summary{padding:8px 12px}.qz-tracker{top:58px;max-height:38vh}}
@media (prefers-reduced-motion:reduce){.qz-label{backdrop-filter:none}}`;

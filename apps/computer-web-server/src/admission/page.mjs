// The one page every admission step is drawn on: a card on the night the instance's city stands
// in, so signing in reads as the threshold of the place one asked for and not a stray form.
// Self-contained (no script, no fetched style) because it is served before anyone is admitted.

export const escapeHtml = (value) => String(value).replace(/[&<>"']/gu, (character) => `&#${character.charCodeAt(0)};`);

const STYLES = `:root{color-scheme:dark;--ink:#eef2f8;--muted:#a9b4c8;--accent:#f2d27a;--accent-hover:#ffe39a;--link:#9fc3ff;--card:rgb(16 22 40/.86);--line:rgb(255 255 255/.14);--field:rgb(255 255 255/.07)}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%}
body{min-height:100vh;display:grid;place-items:center;padding:16px;color:var(--ink);font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;background:radial-gradient(120% 90% at 50% 110%,#25406b 0%,#101a33 45%,#070b16 100%) fixed}
main{width:min(26rem,100%);padding:30px 28px;background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:0 20px 60px rgb(0 0 0/.45)}
.kicker{margin:0 0 6px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--link)}
h1{margin:0 0 18px;font-size:26px;line-height:1.15;letter-spacing:-.01em}
p{margin:0 0 14px}
a{color:var(--link)}
ul.choices{list-style:none;margin:0 0 6px;padding:0;display:grid;gap:10px}
ul.choices a,button{display:block;width:100%;font:inherit;font-weight:650;text-align:center;text-decoration:none;color:#0b1020;background:var(--accent);border:0;border-radius:10px;padding:11px 16px;cursor:pointer}
ul.choices li+li a{color:var(--ink);background:var(--field);border:1px solid var(--line)}
ul.choices a:hover,ul.choices a:focus-visible,button:hover,button:focus-visible{background:var(--accent-hover);color:#0b1020;outline:none}
label{display:block;margin:0 0 12px;color:var(--muted);font-size:13px}
input{display:block;width:100%;margin-top:4px;font:inherit;color:var(--ink);background:var(--field);border:1px solid var(--line);border-radius:8px;padding:9px 11px}
input:focus{outline:2px solid var(--link);outline-offset:0}
button{margin-top:6px}
[role=alert]{color:#ffb0b0}
.aside{margin:18px 0 0;font-size:13px;color:var(--muted)}`;

/** A full admission page: its title, what it is the threshold of, and its body (trusted HTML). */
export function admissionPage({ title, place, body }) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><title>${escapeHtml(title)}</title><style>${STYLES}</style></head><body><main>${place ? `<p class="kicker">${escapeHtml(place)}</p>` : ''}${body}</main></body></html>`;
}

import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTufteModel, renderTufteDocument, renderTufteFragment, confidenceBadgeTile, disclosurePanelTile } from "../src/render-tufte-document.mjs";
import { EARLY_MAC_THEME, resolveTufteTheme, tufteThemeStyles } from "../src/tufte-theme.mjs";

test("renders semantic tiles in input order while exposing topology data", () => {
  const html = renderTufteDocument({
    title: "Window <line>",
    tiles: [
      { id: "now", role: "now", title: "Now", content: "Here" },
      { id: "next", lifecycle: "imminent", confidence: "low", side: "lake", title: "Next", html: "<strong>Trusted</strong>" }
    ]
  });
  assert.match(html, /Window &lt;line&gt;/);
  assert.ok(html.indexOf('id="now"') < html.indexOf('id="next"'));
  assert.match(html, /data-lifecycle="imminent"/);
  assert.match(html, /data-confidence="low"/);
  assert.match(html, /<strong>Trusted<\/strong>/);
  assert.match(html, /prefers-reduced-motion/);
});

test("an explicitly empty trusted html body does not fall back to content", () => {
  const html = renderTufteFragment({ tiles: [{ id: "empty", html: "", content: "must not render" }] });
  assert.match(html, /<div class="tufte-tile-body"><\/div>/);
  assert.doesNotMatch(html, /must not render/);
});

test("form tiles SSR as native, labelled forms without trusting application markup", () => {
  const html = renderTufteFragment({ tiles: [{ id: "editor", form: {
    id: "note", action: "opal.note.commit", revision: "digest-7",
    fields: [{ id: "source", name: "source", kind: "textarea", label: "Markdown source", value: "# hello", required: true, description: "Portable Markdown." }],
    submitters: [{ id: "save", label: "Save note", action: "opal.note.commit" }],
  } }] });
  assert.match(html, /<form id="note" data-tufte-action="opal.note.commit" action="opal.note.commit" method="post" data-tufte-revision="digest-7">/);
  assert.match(html, /<label for="source">Markdown source<\/label><textarea id="source" name="source" required aria-describedby="source-description"># hello<\/textarea>/);
  assert.match(html, /data-tufte-submitter="save" data-tufte-action="opal.note.commit"/);
  assert.doesNotMatch(html, /<script/);
});

test("a select form field with no supplied options renders as an empty native select", () => {
  const html = renderTufteFragment({ tiles: [{ id: "filters", form: {
    fields: [{ name: "owner", kind: "select", label: "Owner" }],
  } }] });
  assert.match(html, /<select id="filters-form-field-1" name="owner"><\/select>/);
});

test("renderTufteDocument canonicalizes null and array inputs to the default document", () => {
  for (const [model, options] of [[null, null], [[], []]]) {
    const html = renderTufteDocument(model, options);
    assert.match(html, /^<!doctype html>/);
    assert.match(html, /<h1>TUFTE<\/h1>/);
    assert.match(html, /<div class="tufte-grid"><\/div>/);
  }
});

test("normalizes duplicate identities without importing semiotic vocabulary", () => {
  const model = normalizeTufteModel({ revision: "route-7", tiles: [{ id: "now", title: "First" }, { id: "now", title: "Second" }] });
  assert.equal(model.kind, "tufte.projection");
  assert.deepEqual(model.tiles.map((tile) => tile.id), ["now", "now-2"]);
  assert.equal(model.revision, "route-7");
  assert.doesNotMatch(JSON.stringify(model), /witness|charge|faculty|contradiction/i);
});

test("browser seam is valid, domain-neutral JavaScript", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../src/tufte-browser.mjs", import.meta.url), "utf8"));
  assert.doesNotThrow(() => new Function(source.replace(/^export /gm, "")));
  assert.match(source, /tufte:action/);
  assert.match(source, /tufte:projection/);
});

// ---- item 4: renderTufteFragment is a pure refactor, byte-identical grid markup ----

test("renderTufteFragment produces exactly the <div class=tufte-grid> renderTufteDocument embeds, nothing more", () => {
  const model = { title: "Panel", tiles: [{ id: "a", title: "A", content: "one" }, { id: "b", title: "B", content: "two" }] };
  const fragment = renderTufteFragment(model);
  assert.match(fragment, /^<div class="tufte-grid">.*<\/div>$/);
  assert.doesNotMatch(fragment, /<!doctype|<html|<body|tufte-masthead/);
  const document_ = renderTufteDocument(model);
  assert.ok(document_.includes(fragment), "the full document must embed the exact same fragment markup");
});

test("renderTufteFragment composes: a caller can nest one grid inside a tile's own html field", () => {
  const inner = renderTufteFragment({ tiles: [{ id: "inner-a", title: "Inner" }] });
  const outer = renderTufteDocument({ tiles: [{ id: "outer-a", title: "Outer", html: `<p>wrap</p>${inner}` }] });
  assert.ok(outer.indexOf('id="outer-a"') < outer.indexOf('id="inner-a"'), "nested grid stays in authored reading order");
});

// ---- item 4: tile-shape helpers are optional, deletable sugar ----

test("confidenceBadgeTile returns a ready-to-use tile whose html is a plain string", () => {
  const tile = confidenceBadgeTile({ id: "conf", label: "Likely on time", confidence: "low", detail: "signal delayed" });
  assert.equal(tile.id, "conf");
  assert.equal(tile.confidence, "low");
  assert.match(tile.html, /data-confidence="low"/);
  assert.match(tile.html, /Likely on time/);
  const html = renderTufteDocument({ tiles: [tile] });
  assert.match(html, /data-confidence="low"/);
});

test("disclosurePanelTile wraps its body in <details> only when a summary is given", () => {
  const withSummary = disclosurePanelTile({ id: "d1", summary: "Show more", content: "the detail" });
  assert.match(withSummary.html, /<details><summary>Show more<\/summary>/);
  const withoutSummary = disclosurePanelTile({ id: "d2", content: "plain" });
  assert.doesNotMatch(withoutSummary.html, /<details>/);
});

// ---- item 5: shelf-chrome-compatible theming aliases ----

test("BASE_STYLES aliases the five shelf-chrome token names onto TUFTE's own palette", () => {
  const html = renderTufteDocument({});
  for (const [alias, real] of [["--accent", "--tufte-accent"], ["--ink", "--tufte-ink"], ["--ink-dim", "--tufte-muted"], ["--border", "--tufte-line"], ["--bg", "--tufte-bg"]]) {
    assert.match(html, new RegExp(`${alias}:var\\(${real}\\)`), `${alias} must alias ${real}`);
  }
});

test("early-mac is a renderer-owned, domain-neutral document theme", () => {
  const html = renderTufteDocument({ title: "Lakhóta", tiles: [{ id: "words", title: "Čhaŋté", content: "Wašté" }] }, { theme: "early-mac" });
  assert.match(html, /<body data-tufte-theme="early-mac">/);
  assert.match(html, /<main class="tufte-shell" tabindex="-1" id="tufte-content" data-tufte data-tufte-theme="early-mac"/);
  assert.match(html, /<meta data-tufte-meta="themeColor" name="theme-color" content="#c8c8c4">/);
  assert.match(html, /repeating-conic-gradient/);
  assert.match(html, /background-size:4px 4px/);
  assert.match(html, /min-height:100dvh/);
  assert.match(html, /\.tufte-tile h2\{display:table/);
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /"Noto Sans"/);
  assert.match(html, /Lakhóta/);
  assert.match(html, /Čhaŋté/);
  assert.equal(resolveTufteTheme("early-mac"), EARLY_MAC_THEME);
  assert.equal(resolveTufteTheme("unknown"), null);
});

test("tufteThemeStyles maps a shared finished theme onto TUFTE properties", () => {
  const theme = {
    colors: {
      wash: { light: "#f1f1f1", dark: "#111111" },
      paper: { light: "#ffffff", dark: "#181818" },
      ink: { light: "#111111", dark: "#eeeeee" },
      muted: { light: "#333333", dark: "#cccccc" },
      line: { light: "#666666", dark: "#999999" },
      jewel: { light: "#660033", dark: "#ee99bb" },
      signal: { light: "#003366", dark: "#99bbee" },
    },
    jewel: "jewel",
    type: { families: ["Georgia, serif", "system-ui, sans-serif", "monospace"] },
  };
  const css = tufteThemeStyles(theme);
  assert.match(css, /--tufte-bg:#f1f1f1/);
  assert.match(css, /prefers-color-scheme:dark[^]*--tufte-bg:#111111/);
  assert.match(css, /h1,h2,h3,h4\{font-family:system-ui, sans-serif\}/);
});

// ---- Wave1 item 3: [data-lifecycle=pending] reuses [data-confidence=low]'s CSS ----

test("BASE_STYLES styles data-lifecycle=pending with the exact same declaration as data-confidence=low", () => {
  const html = renderTufteDocument({});
  assert.ok(html.includes(".tufte-tile[data-confidence=low],.tufte-tile[data-lifecycle=pending]{opacity:.75;border-style:dashed}"));
});

test("lifecycle=pending renders on a tile like any other token -- no dedicated markup, CSS does the work", () => {
  const html = renderTufteFragment({ tiles: [{ id: "loading", lifecycle: "pending", title: "Loading" }] });
  assert.match(html, /data-lifecycle="pending"/);
});

// ---- Wave1 item 5: opt-in aria-live on the tile body, SSR side ----

test("renderTufteFragment: live renders aria-live+aria-atomic on .tufte-tile-body only for the two valid tokens", () => {
  const polite = renderTufteFragment({ tiles: [{ id: "a", live: "polite", content: "x" }] });
  assert.match(polite, /<div class="tufte-tile-body" aria-live="polite" aria-atomic="true">/);

  const assertive = renderTufteFragment({ tiles: [{ id: "a", live: "assertive", content: "x" }] });
  assert.match(assertive, /aria-live="assertive"/);

  const absent = renderTufteFragment({ tiles: [{ id: "a", content: "x" }] });
  assert.doesNotMatch(absent, /aria-live/);

  const invalid = renderTufteFragment({ tiles: [{ id: "a", live: "shout", content: "x" }] });
  assert.doesNotMatch(invalid, /aria-live/);
});

test("renderTufteDocument embeds the same live-aware tufte-tile-body markup renderTufteFragment produces", () => {
  const fragment = renderTufteFragment({ tiles: [{ id: "a", live: "polite", content: "x" }] });
  const document_ = renderTufteDocument({ tiles: [{ id: "a", live: "polite", content: "x" }] });
  assert.ok(document_.includes(fragment));
});

// ---- workspace SSR: the tiling layout is server-first ----

test("renderTufteFragment with a workspace renders the flat grid as an actual tiling with splitters", () => {
  const model = {
    tiles: [
      { id: "log", title: "Log" },
      { id: "prompt", title: "Prompt" },
      { id: "side", title: "Side" },
    ],
    workspace: {
      split: "row",
      sizes: [0.7, 0.3],
      children: [{ split: "column", sizes: [0.8, 0.2], children: ["log", "prompt"] }, "side"],
    },
  };
  const html = renderTufteFragment(model);
  assert.match(html, /class="tufte-grid tufte-workspace"/);
  assert.match(html, /data-tufte-workspace="/);
  assert.match(html, /grid-template-columns:0\.7fr 0\.3fr/);
  assert.match(html, /grid-template-rows:0\.8fr 0\.2fr/);
  // Tiles keep authored DOM order; placement is grid-area only.
  assert.ok(html.indexOf('id="log"') < html.indexOf('id="prompt"'));
  assert.match(html, /id="log"[^>]*grid-area:1 \/ 1 \/ 2 \/ 2/);
  assert.match(html, /id="side"[^>]*grid-area:1 \/ 2 \/ 3 \/ 3/);
  // Real edges: separators with the WAI-ARIA window-splitter contract.
  const splitters = html.match(/role="separator"/g) ?? [];
  assert.equal(splitters.length, 2);
  assert.match(html, /aria-orientation="vertical"/);
  assert.match(html, /aria-orientation="horizontal"/);
  assert.match(html, /data-tufte-splitter="root:0"/);
});

test("renderTufteFragment without a workspace is byte-identical to the pre-workspace grid", () => {
  const model = { tiles: [{ id: "a", title: "A", content: "one" }] };
  const html = renderTufteFragment(model);
  assert.doesNotMatch(html, /tufte-workspace|tufte-splitter/);
  assert.match(html, /^<div class="tufte-grid">/);
});

test("a typed page renders Open Graph, card and schema.org metadata that cannot break out of the head", async () => {
  const { renderTufteDocument } = await import("../src/tufte-rendering.mjs");
  const html = renderTufteDocument({ title: "A <book>", tiles: [], metadata: {
    description: "About it", type: "book", canonical: "https://shop.test/goods/a", image: "https://shop.test/covers/a.png", siteName: "Shop",
    structuredData: { "@context": "https://schema.org", "@type": "Book", name: "</script><script>alert(1)</script>" },
  } });
  const head = html.slice(0, html.indexOf("</head>"));
  assert.match(head, /property="og:type" content="book"/);
  assert.match(head, /property="og:title" content="A &lt;book&gt;"/);
  assert.match(head, /property="og:image" content="https:\/\/shop.test\/covers\/a.png"/);
  assert.match(head, /name="twitter:card" content="summary_large_image"/);
  assert.match(head, /<script data-tufte-meta="structuredData" type="application\/ld\+json">\{"@context":"https:\/\/schema.org","@type":"Book","name":"\\u003c\/script>\\u003cscript>alert\(1\)\\u003c\/script>"\}<\/script>/);
  assert.equal(head.match(/<script/g).length, 1);
  const plain = renderTufteDocument({ title: "Plain", tiles: [], metadata: { description: "x" } });
  assert.doesNotMatch(plain, /og:|twitter:|ld\+json/);
  assert.throws(() => renderTufteDocument({ title: "Bad", tiles: [], metadata: { image: "javascript:alert(1)" } }), /Unsupported link target/);
});

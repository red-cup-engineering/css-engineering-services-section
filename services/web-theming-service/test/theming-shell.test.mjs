// Original rendering cases from emsenn/web-theming@376697f6667f1f5ca18c37fa8757e1f65537cf52 src/index.test.mts
// blob 0d504b9f7515ae5972edc9e1bf5c83946fb67f36, received through the existing Web suite. Its distinct Web
// evidence-admission case remains with that consumer.
import test from "node:test";
import assert from "node:assert/strict";
import { atelier, attrs, charsetMeta, el, escapeHtml, meta, minimal, normalizeContext, render, renderNav, viewportMeta, tokenCss, tokenVar, composeTokens, paletteCss, assembleCss, BASE_CSS, COMPONENT_CSS, THEME_TOKEN_ROLES, } from "../src/theming/index.mjs";
const engineArticle = `  <article class="semantic-hypertext-packet" data-subject="alice" data-cells="2" data-mode="calm">
    <section class="subject" data-e="alice">
      <span class="knows" data-e="alice" data-a="knows" data-v="bob" data-positive="true" data-negative="false" data-value="t">knows bob</span>
      <span class="likes" data-e="alice" data-a="likes" data-v="tea" data-positive="true" data-negative="true" data-value="&#x22A4;" data-contested="true">likes tea<details class="why" data-held="&#x22A4;"><summary>why &#x22A4;</summary><ul class="witnesses-positive" data-side="positive"><li>survey</li></ul><ul class="witnesses-negative" data-side="negative"><li>interview</li></ul></details></span>
    </section>
  </article>`;
const context = {
    title: "Alice <profile> & friends",
    siteName: "The Atelier",
    author: "Em",
    description: "a test page",
    lang: "en-US",
    canonical: "https://example.org/alice",
    year: 2026,
    nav: [
        { href: "/", label: "Home", current: true },
        { href: "/about", label: "About & info" },
    ],
};
test("HTML primitives escape shell values and serialize void/non-void elements", () => {
    assert.equal(escapeHtml(`<a href="x" & 'y'>`), "&lt;a href=&quot;x&quot; &amp; &#39;y&#39;&gt;");
    assert.equal(escapeHtml(`"&"`), "&quot;&amp;&quot;");
    assert.equal(attrs({ hidden: true, nope: false, title: "A&B" }), ' hidden title="A&amp;B"');
    assert.equal(el("meta", { charset: "utf-8" }), '<meta charset="utf-8" />');
    assert.equal(el("h1", null, "hi"), "<h1>hi</h1>");
    assert.equal(el("br"), "<br />");
    assert.equal(meta("description", ""), "");
    assert.equal(charsetMeta(), '<meta charset="utf-8" />');
    assert.equal(viewportMeta(), '<meta name="viewport" content="width=device-width, initial-scale=1" />');
});
test("normalizeContext fills deterministic defaults without mutating input", () => {
    const input = { siteName: "S" };
    const normalized = normalizeContext(input);
    assert.equal(normalized.title, "S");
    assert.equal(normalized.lang, "en");
    assert.deepEqual(normalized.nav, []);
    assert.deepEqual(input, { siteName: "S" });
    assert.equal(normalizeContext().title, "Untitled");
});
test("render preserves the engine article byte-for-byte through reference themes", () => {
    for (const theme of [minimal, atelier]) {
        const document = render(theme, engineArticle, context);
        assert.ok(document.includes(engineArticle), `${theme.name}: article not present verbatim`);
        for (const carrier of [
            'class="semantic-hypertext-packet"',
            'data-subject="alice"',
            'data-a="knows"',
            'data-value="t"',
            'data-contested="true"',
            'data-value="&#x22A4;"',
            '<details class="why"',
        ]) {
            assert.ok(document.includes(carrier), `${theme.name}: dropped carrier ${carrier}`);
        }
        assert.ok(!document.includes("&amp;#x22A4;"), `${theme.name}: article entity was double-escaped`);
    }
});
test("trusted article and theme hooks retain their own headings and landmarks", () => {
    const article = '<article><h1>Article heading</h1><main hidden>Archive</main></article>';
    const theme = { ...minimal, head: () => '<meta name="custom" content="kept" />' };
    const document = render(theme, article, { title: "Shell heading" });
    assert.ok(document.includes(article));
    assert.ok(document.includes('<meta name="custom" content="kept" />'));
    assert.equal((document.match(/<h1>/g) ?? []).length, 2);
    assert.equal((document.match(/<main\b/g) ?? []).length, 2);
});

test("render refuses a theme whose wrap drops or rewrites the article", () => {
    const sabotage = { ...minimal, name: "sabotage", wrap: () => "<p>nothing</p>" };
    assert.throws(() => render(sabotage, engineArticle, context), /dropped or rewrote the article/);
});
test("render emits the declared shell landmarks and metadata around this article fixture", () => {
    const document = render(minimal, engineArticle, context);
    assert.ok(document.startsWith("<!DOCTYPE html>\n"));
    assert.match(document, /<html lang="en-US">/);
    const head = document.slice(document.indexOf("<head>"), document.indexOf("</head>"));
    assert.match(head, /<head>\s*<meta charset="utf-8" \/>/);
    assert.ok(head.indexOf("<meta charset") < head.indexOf('<meta name="viewport"'));
    assert.match(head, /<title>Alice &lt;profile&gt; &amp; friends<\/title>/);
    assert.ok(head.includes('<link rel="canonical" href="https://example.org/alice" />'));
    assert.equal((document.match(/<h1>/g) ?? []).length, 1);
    assert.equal((document.match(/<main\b/g) ?? []).length, 1);
    assert.match(document, /<header role="banner">/);
    assert.match(document, /<nav role="navigation" aria-label="Primary">/);
    assert.match(document, /<main id="main-content" role="main">/);
    assert.match(document, /<footer role="contentinfo">/);
});
test("shell escapes caller values and render is deterministic", () => {
    const first = render(atelier, engineArticle, context);
    const second = render(atelier, engineArticle, context);
    assert.equal(first, second);
    assert.notEqual(render(minimal, engineArticle, context), first);
    assert.ok(first.includes("About &amp; info"));
    assert.ok(!first.includes("About & info"));
    assert.match(first, /<a href="\/" aria-current="page">Home<\/a>/);
    assert.match(first, /<meta name="theme-color" content="#7a4" \/>/);
});
test("renderNav handles empty lists and labelled navigation", () => {
    assert.equal(renderNav([]), "");
    assert.equal(renderNav(null), "");
    assert.equal(renderNav([null, {}, { href: 1, label: "invalid" }]), "");
    assert.equal(renderNav([null, { href: "/mixed", label: "A&B", current: true }]), '<nav role="navigation" aria-label="Primary"><ul><li><a href="/mixed" aria-current="page">A&amp;B</a></li></ul></nav>');
    const nav = renderNav([{ href: "/x", label: "X" }], "Footer");
    assert.match(nav, /<nav role="navigation" aria-label="Footer">/);
    assert.match(nav, /<li><a href="\/x">X<\/a><\/li>/);
});
test("tokenVar maps roles to canonical custom-property names", () => {
    assert.equal(tokenVar("ink"), "--ink");
    assert.equal(tokenVar("inkSoft"), "--ink-soft");
    assert.equal(tokenVar("surfaceDeep"), "--surface-deep");
    assert.equal(tokenVar("accent"), "--accent");
});
test("tokenCss emits only defined roles, in canonical order, on :root", () => {
    const css = tokenCss({ ink: "#000", surface: "#fff", accent: "#3D5588" });
    assert.match(css, /^:root \{/);
    assert.match(css, /--ink: #000;/);
    assert.match(css, /--surface: #fff;/);
    assert.match(css, /--accent: #3D5588;/);
    // ink (role order) precedes surface precedes accent
    assert.ok(css.indexOf("--ink:") < css.indexOf("--surface:"));
    assert.ok(css.indexOf("--surface:") < css.indexOf("--accent:"));
    // undefined roles are not emitted
    assert.doesNotMatch(css, /--mono:/);
});
test("tokenCss accepts a custom selector", () => {
    assert.match(tokenCss({ ink: "#111" }, { selector: '[data-theme="dark"]' }), /^\[data-theme="dark"\] \{/);
});
test("composeTokens is last-wins over defined roles", () => {
    const merged = composeTokens({ ink: "#000", surface: "#fff" }, { surface: "#111", accent: "#f00" }, undefined);
    assert.deepEqual(merged, { ink: "#000", surface: "#111", accent: "#f00" });
});
test("paletteCss renders base, dark @media, and [data-theme] switches from data", () => {
    const css = paletteCss({
        light: { ink: "#262626", surface: "#f5f5f3" },
        dark: { ink: "#d2d2d0", surface: "#161616" },
    });
    // base on :root
    assert.match(css, /:root \{[^}]*--ink: #262626;/);
    // dark behind prefers-color-scheme, composed over light
    assert.match(css, /@media \(prefers-color-scheme: dark\) \{\n:root \{[^}]*--ink: #d2d2d0;[^}]*--surface: #161616;/);
    // explicit pins
    assert.match(css, /\[data-theme="light"\] \{[^}]*--surface: #f5f5f3;/);
    assert.match(css, /\[data-theme="dark"\] \{[^}]*--surface: #161616;/);
});
test("paletteCss without dark emits no media block or data-theme switches", () => {
    const css = paletteCss({ light: { ink: "#0A0A0A", surface: "#F2EAD8" } });
    assert.doesNotMatch(css, /@media/);
    assert.doesNotMatch(css, /data-theme/);
});
test("paletteCss renders named variants composed over light", () => {
    const css = paletteCss({
        light: { ink: "#000", accent: "#3D5588" },
        variants: { sepia: { accent: "#7A2E2E" } },
    });
    assert.match(css, /\[data-theme="sepia"\] \{[^}]*--ink: #000;[^}]*--accent: #7A2E2E;/);
});
test("assembleCss layers palette, reset, components, and chrome in order", () => {
    const css = assembleCss({ light: { ink: "#000" } }, "/* CHROME */");
    assert.ok(css.indexOf(":root {") < css.indexOf(BASE_CSS));
    assert.ok(css.indexOf(BASE_CSS) < css.indexOf(COMPONENT_CSS));
    assert.ok(css.indexOf(COMPONENT_CSS) < css.indexOf("/* CHROME */"));
});
test("the component library styles content against canonical tokens only", () => {
    // Every var() reference in the shared layers must be a canonical role (or a
    // var(--x, fallback) whose primary is canonical) — no private theme names.
    const canonical = new Set(THEME_TOKEN_ROLES.map((r) => tokenVar(r)));
    const refs = [...`${BASE_CSS}\n${COMPONENT_CSS}`.matchAll(/var\((--[a-z0-9-]+)/g)]
        .map((m) => m[1])
        .filter((x) => Boolean(x));
    assert.ok(refs.length > 20, "components actually use tokens");
    for (const ref of refs) {
        assert.ok(canonical.has(ref), `component layer references non-canonical token ${ref}`);
    }
});
test("the component layer styles held contradiction via the --alarm token", () => {
    // The shared stylesheet declares the contested selector with the alarm
    // token, plus separate audit/calm selectors. Source matching establishes
    // these rules, not browser visibility or parity with other theme systems.
    assert.match(COMPONENT_CSS, /\[data-contested=true\]\{[^}]*var\(--alarm/);
    assert.match(COMPONENT_CSS, /\[data-mode=audit\] \[data-contested=true\]/);
    assert.match(COMPONENT_CSS, /\[data-mode=calm\] \[data-contested=true\]/);
    // The gap selectors have a declared shared component rule.
    assert.match(COMPONENT_CSS, /\.gap,\[data-gap=true\]/);
});
test("render emits per-page head links (feed alternates etc.)", () => {
    const doc = render(minimal, "<p>x</p>", {
        title: "Wire",
        links: [
            { rel: "alternate", type: "application/rss+xml", href: "/feed.xml", title: "RSS" },
            { rel: "alternate", type: "application/feed+json", href: "/feed.json" },
        ],
    });
    assert.match(doc, /<link rel="alternate" href="\/feed.xml" type="application\/rss\+xml" title="RSS" \/>/);
    assert.match(doc, /<link rel="alternate" href="\/feed.json" type="application\/feed\+json" \/>/);
});

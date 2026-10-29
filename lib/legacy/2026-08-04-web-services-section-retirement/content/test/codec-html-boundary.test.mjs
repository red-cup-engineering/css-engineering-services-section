import assert from "node:assert/strict";
import test from "node:test";
import { escapeHtml as escapeFeedHtml, escapeHtmlText } from "../dist/codecs/feed.mjs";
import { attrs, classes, el, escapeHtml, hEntry } from "../dist/codecs/microformats.mjs";

const ENTRY = {
  id: "urn:test:1",
  url: "https://example.test/a?x=1&y=2",
  title: 'A <B> & "C"',
  summary: "It's > here",
  author: { name: "D & E", url: "https://example.test/u?a=1&b=2" },
  published: "2026-07-29T12:00:00Z",
  tags: ["x&y"],
};

const ENTRY_HTML = `<article class="h-entry" id="urn:test:1">
  <h2 class="p-name">A &lt;B&gt; &amp; &quot;C&quot;</h2>
  <a class="u-url u-uid" href="https://example.test/a?x=1&amp;y=2">https://example.test/a?x=1&amp;y=2</a>
  <time class="dt-published" datetime="2026-07-29T12:00:00Z">2026-07-29T12:00:00Z</time>
  <span class="p-author"><span class="h-card"><a class="p-name u-url" href="https://example.test/u?a=1&amp;b=2">D &amp; E</a></span></span>
  <p class="p-summary">It&#39;s &gt; here</p>
  <a class="p-category" href="#x&amp;y">x&amp;y</a>
</article>`;

test("keeps feed and microformat HTML bytes stable across the shared boundary", () => {
  assert.equal(escapeFeedHtml("A'B"), "A&apos;B");
  assert.equal(escapeHtmlText("A'B"), "A&#39;B");
  assert.equal(escapeHtml(null), "");
  assert.equal(attrs({ disabled: true, title: "A'B&<", omit: false }),
    ' disabled title="A&#39;B&amp;&lt;"');
  assert.equal(classes("h-entry alpha", "alpha beta"), "h-entry alpha beta");
  assert.equal(el("img", { alt: "A&B" }), '<img alt="A&amp;B" />');
  assert.equal(hEntry(ENTRY), ENTRY_HTML);
});

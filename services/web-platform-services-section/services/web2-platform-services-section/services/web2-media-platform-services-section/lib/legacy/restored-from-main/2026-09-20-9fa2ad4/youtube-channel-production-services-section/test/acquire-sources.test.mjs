import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { acquireSources, formatCitation } from "../scripts/acquire-sources.mjs";

const spec = JSON.parse(await readFile(fileURLToPath(new URL("./fixtures/channel-spec.json", import.meta.url)), "utf8"));

test("formatCitation formats authors, year, container, and DOI", () => {
  const citation = formatCitation({
    title: "A Great Paper",
    author: [{ family: "Doe", given: "Jane" }],
    issued: { "date-parts": [[2024]] },
    "container-title": "Journal of Fixtures",
    DOI: "10.1/fixture",
  });
  assert.match(citation, /Jane Doe/);
  assert.match(citation, /2024/);
  assert.match(citation, /A Great Paper/);
  assert.match(citation, /doi\.org\/10\.1\/fixture/);
});

test("acquireSources reads corpus carriers relative to root and skips DOI refresh offline", async () => {
  const specWithCarrier = { ...spec, corpus: { ...spec.corpus, carriers: ["notes/one.md"] } };
  const readFileImpl = async (path) => { assert.match(path, /notes\/one\.md$/); return "carrier text"; };
  const bundle = await acquireSources({
    spec: specWithCarrier,
    item: { title: "A Topic", DOI: "10.1/fixture" },
    root: "/fixture-root",
    readFileImpl,
  });
  assert.equal(bundle.carriers.length, 1);
  assert.equal(bundle.carriers[0].text, "carrier text");
  assert.equal(bundle.item.DOI, "10.1/fixture");
  assert.match(bundle.bibliographyText, /A Topic/);
});

test("acquireSources refreshes the item from DOI when a fetch is supplied", async () => {
  const fetchImpl = async (url) => {
    assert.match(url.href, /api\.crossref\.org\/works\/10\.1\/fixture/);
    return { ok: true, json: async () => ({ message: { title: ["Refreshed Title"], DOI: "10.1/fixture", author: [], type: "journal-article" } }) };
  };
  const bundle = await acquireSources({ spec, item: { title: "Stale Title", DOI: "10.1/fixture" }, root: "/x", fetchImpl });
  assert.equal(bundle.item.title, "Refreshed Title");
});

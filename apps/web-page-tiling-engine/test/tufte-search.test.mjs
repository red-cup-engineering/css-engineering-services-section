import test from "node:test";
import assert from "node:assert/strict";
import {
  createTufteSearchArtifacts,
} from "../src/tufte-search.mjs";

const page = ({ title, description = "", body, extra = "", lang = "en" }) => `<!doctype html>
<html lang="${lang}"><head><title>${title}</title><meta name="description" content="${description}"></head>
<body><nav data-pagefind-ignore>Repeated navigation</nav><main data-pagefind-body ${extra}>${body}</main></body></html>`;

test("projects a deterministic rendered-artifact index using Pagefind annotations", async () => {
  const first = new Map([
    ["notes/bravo/index.html", page({ title: "Bravo", description: "Second note", body: `<h1 data-pagefind-meta="kind">Field Note</h1><p data-pagefind-filter="topic">Botany</p><p>Juniper juniper.</p>` })],
    ["index.html", page({ title: "Field notes", body: "Welcome to the notebook." })],
    ["notes/alpha/index.html", page({ title: "Alpha", body: "Juniper observations and lichens." })],
    ["404.html", `<!doctype html><meta name="robots" content="noindex"><title>Missing</title><p>Not searchable</p>`],
    ["old/index.html", `<!doctype html><meta http-equiv="refresh" content="0; url=/notes/alpha/"><title>Moved</title>`],
    ["styles.css", "body{}"],
  ]);
  const second = new Map([...first].reverse());
  const a = createTufteSearchArtifacts({ artifacts: first });
  const b = createTufteSearchArtifacts({ artifacts: second });
  assert.deepEqual(a, b);
  assert.equal(a.diagnostics.length, 0);
  assert.deepEqual(a.artifacts.map(({ path }) => path), ["search/search-index.json", "search/search.mjs"]);
  const index = JSON.parse(a.artifacts[0].body);
  assert.equal(index.documentCount, 3);
  assert.deepEqual(index.documents.map(({ url }) => url), ["/", "/notes/alpha/", "/notes/bravo/"]);
  assert.equal(index.documents[2].metadata.kind[0], "Field Note");
  assert.equal(index.documents[2].filters.topic[0], "Botany");
  assert.equal(index.documents[2].excerpt, "Second note");
  assert.equal(index.terms.navigation, undefined);
  assert.deepEqual(index.terms.juniper, [[1, 1], [2, 2]]);
  assert.match(index.digest, /^[a-f0-9]{64}$/);
  assert.doesNotThrow(() => new Function(a.artifacts[1].body.replaceAll("export ", "")));
  const runtime = await import(`data:text/javascript,${encodeURIComponent(a.artifacts[1].body)}`);
  assert.deepEqual(runtime.searchIndex(index, "jun", { filters: { topic: "Botany" } }).map(({ url }) => url), ["/notes/bravo/"]);
});

test("content changes revise the index digest and search configuration is honored", () => {
  const artifacts = new Map([
    ["index.html", page({ title: "Home", body: "The common words cedar moss." })],
    ["private/index.html", page({ title: "Private", body: "Cedar hidden." })],
  ]);
  const config = {
    basePath: "/library/",
    include: ["index.html"],
    stopWords: ["common"],
    minTermLength: 4,
    excerptLength: 12,
    indexPath: "assets/site-search.json",
    runtimePath: "assets/site-search.mjs",
  };
  const first = createTufteSearchArtifacts({ artifacts, config });
  const changed = createTufteSearchArtifacts({ artifacts: new Map([["index.html", page({ title: "Home", body: "The common words cedar fern." })]]), config });
  const index = JSON.parse(first.artifacts[0].body);
  assert.deepEqual(index.documents.map(({ url }) => url), ["/library/"]);
  assert.equal(index.terms.common, undefined);
  assert.equal(index.terms.the, undefined);
  assert.equal(index.terms.moss.length, 1);
  assert.equal(index.terms.cedar.length, 1);
  assert.notEqual(index.digest, JSON.parse(changed.artifacts[0].body).digest);
  assert.match(first.artifacts[1].body, /\/library\/assets\/site-search\.json/);
});

test("fails closed for unsafe configuration, missing selections, collisions, and invalid bodies", () => {
  const collision = createTufteSearchArtifacts({
    artifacts: new Map([["index.html", page({ title: "Home", body: "Hello" })], ["search/search-index.json", "existing"]]),
  });
  assert.equal(collision.artifacts.length, 0);
  assert.ok(collision.diagnostics.some(({ code }) => code === "PSS-004"));

  const invalid = createTufteSearchArtifacts({
    artifacts: new Map([["index.html", new Uint8Array([1, 2])]]),
    config: { include: ["index.html", "missing.html"], runtimePath: "../search.mjs", basePath: "relative" },
  });
  assert.equal(invalid.artifacts.length, 0);
  assert.ok(invalid.diagnostics.some(({ code }) => code === "PSS-002"));
  assert.ok(invalid.diagnostics.some(({ code }) => code === "PSS-003"));
});

test("keeps extensionless and directory public routes distinct", () => {
  const result = createTufteSearchArtifacts({
    artifacts: new Map([
      ["topic", page({ title: "One", body: "one" })],
      ["topic/index.html", page({ title: "Two", body: "two" })],
    ]),
    config: { include: ["topic", "topic/index.html"] },
  });
  // These remain distinct routes: extensionless /topic and directory /topic/.
  assert.equal(result.diagnostics.length, 0);
  assert.equal(JSON.parse(result.artifacts[0].body).documentCount, 2);
});

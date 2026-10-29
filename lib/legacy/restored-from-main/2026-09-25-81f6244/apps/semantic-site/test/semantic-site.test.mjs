import { createHttpServer } from "@red-cup-engineering/http-services-section/node-server";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";

import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { nativeHttpHandler as handler } from "@red-cup-engineering/computer-web-server/native-application";
import { allTriples, atomFeed, buildSite, buildApp, exportAssertions, importAssertions, jsonFeedDocument, joinBuilds, markdownDirectoryReader, meetBuilds, memoryReader, queryTriples, renderIndex, renderSubject, robotsTxt, rssFeed, semanticHead, siteManifest, siteJsonLd, sitemapXml, startMarkdownSite, residualBuild, toJsonLd, toTurtle, watchContent } from "../src/semantic-site-server/index.mjs";
const config = {
    root: "mem",
    baseUrl: "https://site.example",
    title: "Semantic Site",
    tagline: "Claims served calmly"
};
const assertions = [
    {
        e: "morel",
        a: "title",
        v: "Morel",
        t: "src-a"
    },
    {
        e: "morel",
        a: "type",
        v: "term",
        t: "src-a"
    },
    {
        e: "morel",
        a: "aliases",
        v: [
            "morchella"
        ],
        t: "src-a"
    },
    {
        e: "morel",
        a: "part-of",
        v: "fungi",
        t: "src-a"
    },
    {
        e: "morel",
        a: "contains",
        v: [
            "yellow-morel"
        ],
        t: "src-a"
    },
    {
        e: "morel",
        a: "related",
        v: [
            "false-morel"
        ],
        t: "src-a"
    },
    {
        e: "morel",
        a: "references",
        v: {
            title: "Mushroom Guide",
            authors: [
                "Ada"
            ],
            year: 2025,
            url: "https://example.test/guide"
        },
        t: "src-a"
    },
    {
        e: "morel",
        a: "status",
        v: "published",
        t: "src-a"
    },
    {
        e: "morel",
        a: "edibility",
        v: "choice",
        t: "src-a"
    },
    {
        e: "false-morel",
        a: "title",
        v: "False Morel",
        t: "src-b"
    },
    {
        e: "false-morel",
        a: "mention",
        v: {
            url: "https://elsewhere.test/reply",
            author: {
                name: "Bo",
                url: "https://elsewhere.test/bo"
            },
            published: "2026-01-01T00:00:00Z",
            text: "Careful note."
        },
        t: "src-b"
    },
    {
        e: "false-morel",
        a: "edibility",
        v: "safe",
        t: "src-c"
    },
    {
        e: "false-morel",
        a: "edibility",
        v: {
            not: "safe"
        },
        t: "src-d"
    }
];
test("renders subject and index HTML through semantic hypertext and microformats", ()=>{
    const reader = memoryReader(assertions);
    const subject = reader.settle("mem", "false-morel");
    const subjectHtml = renderSubject(subject, config);
    assert.match(subjectHtml, /data-contested="true"/);
    assert.match(subjectHtml, /h-entry/);
    assert.match(subjectHtml, /rel="webmention"/);
    assert.match(subjectHtml, /type="application\/ld\+json"/);
    assert.match(subjectHtml, /false-morel\.ttl/);
    assert.match(subjectHtml, /class="h-cite"/);
    assert.match(subjectHtml, /class="p-author h-card"/);
    assert.match(subjectHtml, /Careful note\./);
    const indexHtml = renderIndex(reader, config);
    assert.match(indexHtml, /h-feed/);
    assert.match(indexHtml, /feed\.xml/);
    assert.match(indexHtml, /"@type": \[\s+"WebSite",\s+"CollectionPage"/);
});
test("emits Turtle, JSON-LD, feeds, sitemap, robots, and a site manifest", ()=>{
    const reader = memoryReader(assertions);
    const algebra = reader.settle("mem", "morel");
    const turtle = toTurtle(algebra, config);
    assert.match(turtle, /schema:DefinedTerm/);
    assert.match(turtle, /schema:name "Morel"/);
    const jsonLd = toJsonLd(algebra, config);
    assert.deepEqual(jsonLd["@type"], [
        "DefinedTerm",
        "skos:Concept"
    ]);
    assert.equal(jsonLd["skos:prefLabel"], "Morel");
    assert.equal(jsonLd["skos:broader"], "https://site.example/fungi");
    assert.deepEqual(jsonLd["skos:narrower"], [
        "https://site.example/yellow-morel"
    ]);
    assert.deepEqual(jsonLd["skos:related"], [
        "https://site.example/false-morel"
    ]);
    assert.equal(jsonLd["citation"].name, "Mushroom Guide");
    assert.equal(Array.isArray(jsonLd["ws:claims"].potential), true);
    assert.equal(siteJsonLd(reader, config)["mainEntity"].length, 2);
    assert.match(semanticHead(config, {
        subject: "morel",
        jsonLd
    }), /rel="pingback"/);
    assert.match(jsonFeedDocument(reader, config), /jsonfeed/);
    assert.match(atomFeed(reader, config), /<feed/);
    assert.match(rssFeed(reader, config), /<rss version="2.0"/);
    assert.match(sitemapXml(reader, config), /<urlset/);
    assert.match(robotsTxt(config), /Sitemap:/);
    const manifest = siteManifest(reader, config);
    assert.equal(manifest.counts.subjects, 2);
    assert.equal(manifest.counts.stable, 1);
    assert.deepEqual(manifest.subjects.map((entry)=>[
            entry.subject,
            entry.state
        ]), [
        [
            "false-morel",
            "absurd"
        ],
        [
            "morel",
            "active"
        ]
    ]);
});
test("queries triples with state and witness filters", ()=>{
    const reader = memoryReader(assertions);
    const triples = allTriples(reader, config);
    assert.equal(queryTriples(triples, {
        state: "stable"
    }).length, 1);
    assert.equal(queryTriples(triples, {
        p: "title"
    }).length, 2);
    assert.equal(queryTriples(triples, {
        witness: "src-d"
    }).length, 1);
});
test("sync export and import append assertions through the reader boundary", ()=>{
    const reader = memoryReader(assertions);
    const exported = exportAssertions(reader, config);
    const target = memoryReader();
    assert.equal(importAssertions(target, config, exported), exported.length);
    assert.equal(target.assertions.length, exported.length);
});
test("buildApp exposes a web-server resource graph", ()=>{
    const app = buildApp(memoryReader(assertions), config, {
        security: {
            contacts: [
                "mailto:security@semantic.example"
            ],
            expires: "2026-12-31T23:59:59Z",
            canonical: "https://semantic.example/.well-known/security.txt"
        }
    });
    assert.ok(app.resources?.some((resource)=>resource.match === "/query"));
    assert.ok(app.resources?.some((resource)=>resource.match === "/sync"));
    assert.ok(app.resources?.some((resource)=>resource.match === "/feed.xml"));
    assert.ok(app.resources?.some((resource)=>resource.id === "semantic-site.manifest" && resource.route === "/site.json"));
    assert.ok(app.resources?.some((resource)=>resource.id === "semantic-site.security-txt" && resource.route === "/.well-known/security.txt"));
    assert.ok(app.resources?.some((resource)=>typeof resource.match === "function"));
    assert.ok(app.resources?.some((resource)=>resource.id === "semantic-site.index" && resource.route === "/"));
    assert.ok(app.resources?.some((resource)=>resource.id === "semantic-site.sync.import" && resource.route === "/sync"));
    assert.ok(app.resources?.some((resource)=>resource.id === "semantic-site.subject" && resource.route === "/:subject"));
});
test("buildSite exposes a finite settlement algebra with multi-format cells and absurd records", ()=>{
    const reader = memoryReader(assertions);
    const report = buildSite(reader, config, {
        now: ()=>"2026-06-08T00:00:00.000Z"
    });
    assert.equal(report.kind, "web-semantic-site.finite-build");
    assert.equal(report.generatedAt, "2026-06-08T00:00:00.000Z");
    assert.ok(report.artifacts.some((entry)=>entry.path === "index.html" && entry.format === "html"));
    assert.ok(report.artifacts.some((entry)=>entry.path === "site.json" && entry.format === "manifest" && /"subjects"/.test(entry.body)));
    assert.ok(report.artifacts.some((entry)=>entry.path === "feed.xml" && /<rss/.test(entry.body)));
    assert.ok(report.cells.some((cell)=>cell.subject === "morel" && cell.format === "ttl" && cell.state === "active"));
    const falseMorelCells = report.cells.filter((cell)=>cell.subject === "false-morel");
    assert.deepEqual(falseMorelCells.map((cell)=>cell.format).sort(), [
        "html",
        "jsonld",
        "ttl"
    ]);
    assert.ok(falseMorelCells.every((cell)=>cell.state === "absurd"));
    assert.ok(falseMorelCells.every((cell)=>(cell.contradictions?.length ?? 0) === 1));
    assert.ok(report.artifacts.some((entry)=>entry.path === "false-morel/index.html" && /data-contested="true"/.test(entry.body)));
    assert.ok(report.artifacts.some((entry)=>entry.path === "false-morel.jsonld" && /ws:claims/.test(entry.body)));
    assert.equal(report.counts.absurd, 3);
    assert.equal(report.counts.potential, 0);
    assert.equal(report.assertions.length, assertions.length);
    const revised = memoryReader(assertions.filter((assertion)=>!(assertion.e === "false-morel" && assertion.a === "edibility" && typeof assertion.v === "object")));
    const next = buildSite(revised, config, {
        now: ()=>"2026-06-08T00:01:00.000Z"
    });
    const meet = meetBuilds(report, next);
    const joined = joinBuilds(report, next);
    const residual = residualBuild(report, next);
    assert.ok(meet.cells.length < report.cells.length);
    assert.ok(joined.cells.some((cell)=>cell.subject === "false-morel" && cell.state === "absurd"));
    assert.equal(residual.removed.length, 0);
    assert.ok(residual.changed.some((cell)=>cell.subject === "false-morel" && cell.state === "active"));
});
test("markdownDirectoryReader settles markdown files as site subjects", ()=>{
    const root = mkdtempSync(join(tmpdir(), "web-semantic-site-"));
    try {
        writeFileSync(join(root, "home.md"), "---\ntitle: Home\ntags: [site, index]\n---\n\nWelcome home.\n", "utf8");
        writeFileSync(join(root, "notes.md"), "---\ntitle: Notes\nstatus: draft\n---\n\nPrivate notes.\n", "utf8");
        const reader = markdownDirectoryReader();
        assert.deepEqual(reader.listSubjects(root), [
            "home",
            "notes"
        ]);
        assert.equal(reader.traceOf(root, "home").find((assertion)=>assertion.a === "body")?.v, "Welcome home.");
        const algebra = reader.settle(root, "home");
        assert.equal(algebra.potential.find((cell)=>cell.predicate === "title")?.object, "Home");
        assert.match(renderIndex(reader, {
            ...config,
            root
        }), /Home/);
    } finally{
        rmSync(root, {
            recursive: true,
            force: true
        });
    }
});
test("watchContent is a best-effort markdown re-derive hook", ()=>{
    const root = mkdtempSync(join(tmpdir(), "web-semantic-site-watch-"));
    try {
        writeFileSync(join(root, "home.md"), "---\ntitle: Home\n---\n\nWelcome.\n", "utf8");
        const reader = markdownDirectoryReader();
        const watcher = watchContent(root, reader, {
            debounceMs: 5,
            onError: ()=>undefined
        });
        watcher?.close();
        assert.ok(watcher === null || typeof watcher.close === "function");
    } finally{
        rmSync(root, {
            recursive: true,
            force: true
        });
    }
});
test("startMarkdownSite serves a markdown directory through web-server", async (t)=>{
    const root = mkdtempSync(join(tmpdir(), "web-semantic-site-start-"));
    t.after(()=>rmSync(root, {
            recursive: true,
            force: true
        }));
    writeFileSync(join(root, "home.md"), "---\ntitle: Home\n---\n\nWelcome.\n", "utf8");
    const running = await startMarkdownSite({
        ...config,
        root
    }, {
        watch: false
    });
    t.after(running.close);
    const response = await fetch(`http://127.0.0.1:${running.port}/`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-language"), "en");
    assert.match(await response.text(), /Home/);
    const manifest = await fetch(`http://127.0.0.1:${running.port}/site.json`, {
        headers: {
            accept: "application/json"
        }
    });
    assert.equal(manifest.status, 200);
    assert.equal(manifest.headers.get("content-language"), "en");
    assert.equal((await manifest.json()).counts.subjects, 1);
    const languageRejected = await fetch(`http://127.0.0.1:${running.port}/home`, {
        headers: {
            accept: "text/html",
            "accept-language": "de, en;q=0"
        }
    });
    assert.equal(languageRejected.status, 406);
});
test("buildApp can expose opt-in security.txt without projecting it as subject truth", async ()=>{
    const app = buildApp(memoryReader(assertions), config, {
        security: {
            contacts: [
                "mailto:security@semantic.example"
            ],
            expires: "2026-12-31T23:59:59Z",
            canonical: "https://semantic.example/.well-known/security.txt"
        }
    });
    const server = createHttpServer({ handle: handler(app) });
    await new Promise((resolve)=>server.listen(0, resolve));
    const address = server.address();
    assert.ok(address && typeof address === "object");
    try {
        const response = await fetch(`http://127.0.0.1:${address.port}/.well-known/security.txt`, {
            headers: {
                accept: "text/plain"
            }
        });
        assert.equal(response.status, 200);
        assert.match(await response.text(), /Contact: mailto:security@semantic\.example/);
    } finally{
        await new Promise((resolve, reject)=>server.close((error)=>error ? reject(error) : resolve()));
    }
});

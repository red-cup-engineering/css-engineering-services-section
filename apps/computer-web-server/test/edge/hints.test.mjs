import assert from "node:assert/strict";
import test from "node:test";
import { buildLinkHeader, earlyHints, preload, REL_TOKENS } from "../../src/edge/hints.mjs";
import { startMiddlewareServer } from "./helpers/server.mjs";
test("buildLinkHeader: renders a plain hint entry as a quoted Link value", ()=>{
    const header = buildLinkHeader([
        {
            url: "/app.js",
            rel: "preload",
            as: "script"
        }
    ]);
    assert.equal(header, '</app.js>; rel="preload"; as="script"');
});
test("buildLinkHeader: href takes precedence over url, and string hints pass through trimmed", ()=>{
    const header = buildLinkHeader([
        {
            href: "/a.css",
            url: "/ignored.css",
            rel: "preload",
            as: "style"
        },
        "  </b.css>; rel=preload  "
    ]);
    assert.equal(header, '</a.css>; rel="preload"; as="style", </b.css>; rel=preload');
});
test("buildLinkHeader: deduplicates identical rendered links", ()=>{
    const header = buildLinkHeader([
        {
            url: "/a.js",
            rel: "preload",
            as: "script"
        },
        {
            url: "/a.js",
            rel: "preload",
            as: "script"
        }
    ]);
    assert.equal(header, '</a.js>; rel="preload"; as="script"');
});
test("buildLinkHeader: escapes quotes and backslashes in parameter values", ()=>{
    const header = buildLinkHeader([
        {
            url: "/x",
            rel: "preload",
            type: 'a"b\\c'
        }
    ]);
    assert.equal(header, '</x>; rel="preload"; type="a\\"b\\\\c"');
});
test("buildLinkHeader: entries without an href or rel are dropped", ()=>{
    assert.equal(buildLinkHeader([
        {
            rel: "preload"
        },
        {
            url: "/x",
            rel: ""
        }
    ]), "");
    assert.equal(buildLinkHeader(undefined), "");
    assert.equal(buildLinkHeader(null), "");
});
test("buildLinkHeader: crossorigin=true renders as a bare token, other values are quoted", ()=>{
    assert.equal(buildLinkHeader([
        {
            url: "/x",
            rel: "preload",
            crossorigin: true
        }
    ]), '</x>; rel="preload"; crossorigin');
    assert.equal(buildLinkHeader([
        {
            url: "/x",
            rel: "preload",
            crossorigin: "use-credentials"
        }
    ]), '</x>; rel="preload"; crossorigin="use-credentials"');
});
test("REL_TOKENS is a frozen, fixed list of known rel values", ()=>{
    assert.ok(Object.isFrozen(REL_TOKENS));
    assert.ok(REL_TOKENS.includes("preload"));
    assert.ok(REL_TOKENS.includes("modulepreload"));
});
test("earlyHints: injects a Link header into the final response", async ()=>{
    const server = await startMiddlewareServer(earlyHints({
        hints: [
            {
                url: "/a.js",
                rel: "preload",
                as: "script"
            }
        ],
        earlyHints: false
    }));
    try {
        const res = await fetch(server.url);
        assert.equal(res.headers.get("link"), '</a.js>; rel="preload"; as="script"');
    } finally{
        await server.close();
    }
});
test("earlyHints: linkHeader:false suppresses the Link header on the final response", async ()=>{
    const server = await startMiddlewareServer(earlyHints({
        hints: [
            {
                url: "/a.js",
                rel: "preload"
            }
        ],
        earlyHints: false,
        linkHeader: false
    }));
    try {
        const res = await fetch(server.url);
        assert.equal(res.headers.get("link"), null);
    } finally{
        await server.close();
    }
});
test("earlyHints: an empty hint list leaves headers untouched", async ()=>{
    const server = await startMiddlewareServer(earlyHints({
        hints: [],
        earlyHints: false
    }));
    try {
        const res = await fetch(server.url);
        assert.equal(res.headers.get("link"), null);
    } finally{
        await server.close();
    }
});
test("preload: shorthand builds preload Link entries with the given `as` and defaults to script", async ()=>{
    const server = await startMiddlewareServer(preload([
        "/a.png"
    ], "image"));
    try {
        const res = await fetch(server.url);
        assert.equal(res.headers.get("link"), '</a.png>; rel="preload"; as="image"');
    } finally{
        await server.close();
    }
});

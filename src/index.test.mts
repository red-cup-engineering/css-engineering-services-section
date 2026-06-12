import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

import { handler } from "@561-group/web-server";
import {
  allTriples,
  fragmentJsonLd,
  fragmentTurtle,
  queryTriples,
  tpfApp,
} from "./index.mjs";

const assertion = (e: string, a: string, v: unknown, by: string) => Object.freeze({ e, a, v, t: { by } });

const world = {
  chanterelle: [
    assertion("chanterelle", "edible", true, "field-guide"),
    assertion("chanterelle", "poisonous", true, "skeptic"),
    assertion("chanterelle", "resembles", "false-morel", "field-guide"),
    assertion("chanterelle", "status", "published", "editor"),
  ],
  morel: [
    assertion("morel", "edible", true, "field-guide"),
    assertion("morel", "status", "draft", "editor"),
  ],
};

const fold = { contrary: { poisonous: "edible" } };

test("allTriples flattens settled assertions and preserves held-contradiction witnesses", () => {
  const triples = allTriples(world, { fold });
  const disputed = triples.find((triple) => triple.subject === "chanterelle" && triple.predicate === "edible");

  assert.equal(disputed?.state, "stable");
  assert.deepEqual(disputed?.witness, ["field-guide", "skeptic"]);
  assert.deepEqual(disputed?.claimedBy, "field-guide");
  assert.deepEqual(disputed?.contraryClaimedBy, "skeptic");
  assert.ok(triples.some((triple) => triple.subject === "morel" && triple.predicate === "status" && triple.object === "draft"));
});

test("queryTriples filters by pattern state and witness and emits page links", () => {
  const held = queryTriples(world, { state: "stable", witness: "skeptic" }, {
    base: "https://example.org/",
    path: "/query",
    fold,
    limit: 1,
  });

  assert.equal(held.totalItems, 1);
  assert.equal(held.triples[0]?.predicate, "edible");
  assert.equal(held.links.self, "https://example.org/query?state=stable&witness=skeptic&page=1&limit=1");

  const paged = queryTriples(world, {}, { base: "https://example.org/", path: "/query", fold, limit: 2, page: 2 });
  assert.equal(paged.page, 2);
  assert.equal(paged.triples.length, 2);
  assert.match(paged.links.previous ?? "", /page=1/);
  assert.match(paged.links.next ?? "", /page=3/);
});

test("JSON-LD fragment carries Hydra controls and void:triples", () => {
  const page = queryTriples(world, { p: "status" }, { base: "https://example.org/", path: "/query", fold, limit: 1 });
  const jsonld = fragmentJsonLd(page, { base: "https://example.org/" });

  assert.deepEqual(jsonld["@type"], ["hydra:Collection", "hydra:PagedCollection"]);
  assert.equal(jsonld["hydra:totalItems"], 2);
  assert.equal(jsonld["void:triples"], 2);
  assert.deepEqual(jsonld["hydra:next"], { "@id": "https://example.org/query?p=status&page=2&limit=1" });
  assert.ok(Array.isArray(jsonld["hydra:member"]));
});

test("Turtle fragment regroups records through linked-data serializers", () => {
  const page = queryTriples(world, { state: "stable" }, { base: "https://example.org/", path: "/query", fold });
  const turtle = fragmentTurtle(page, { base: "https://example.org/", subjects: ["chanterelle", "false-morel", "morel"] });

  assert.match(turtle, /hydra:totalItems 1/);
  assert.match(turtle, /void:triples 1/);
  assert.match(turtle, /ws:StableClaim/);
  assert.match(turtle, /ws:claimedBy \[ a prov:Entity ; rdfs:label "field-guide" \]/);
});

test("tpfApp serves JSON JSON-LD Turtle and negotiation failures", async () => {
  const app = tpfApp({ world, fold, base: "https://example.org/", limit: 2 });
  const resource = app.resources?.[0];
  assert.equal(resource?.route, "/query");
  assert.equal(resource?.id, "triple-pattern-fragments.query");
  assert.equal(resource?.name, "Triple Pattern Fragments Query");

  const server = createServer(handler(app));
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;

  try {
    const json = await fetch(`${base}/query?p=status&limit=1`, { headers: { accept: "application/json" } });
    assert.equal(json.status, 200);
    assert.equal(json.headers.get("access-control-allow-origin"), "*");
    assert.match(json.headers.get("link") ?? "", /rel="next"/);
    const body = await json.json() as { totalItems?: number; triples?: unknown[] };
    assert.equal(body.totalItems, 2);
    assert.equal(body.triples?.length, 1);

    const jsonld = await fetch(`${base}/query?state=stable`, { headers: { accept: "application/ld+json" } });
    assert.equal(jsonld.status, 200);
    assert.equal((await jsonld.json() as Record<string, unknown>)["void:triples"], 1);

    const turtle = await fetch(`${base}/query?state=stable`, { headers: { accept: "text/turtle" } });
    assert.equal(turtle.status, 200);
    assert.match(await turtle.text(), /ws:StableClaim/);

    const rejected = await fetch(`${base}/query`, { headers: { accept: "text/html" } });
    assert.equal(rejected.status, 406);

    const badState = await fetch(`${base}/query?state=nope`, { headers: { accept: "application/json" } });
    assert.equal(badState.status, 400);
    assert.equal(await badState.text(), "state must be potential, active, or stable");
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

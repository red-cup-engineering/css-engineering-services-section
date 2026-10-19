import assert from "node:assert/strict";
import test from "node:test";
import { PUBLIC, readPublicTimeline } from "../src/timeline.mjs";

const origin = "https://moose.example";
const actors = ["alice", "bob"];
const actorId = id => origin + "/actors/" + id;
const note = (identifier, id, published, props = {}) => ({
  type: "Create",
  actor: actorId(identifier),
  to: [PUBLIC],
  object: {
    id: actorId(identifier) + "/posts/" + id,
    type: "Note", attributedTo: actorId(identifier), content: "Body of " + id,
    published,
  },
  ...props,
});

function source(pages) {
  const calls = [];
  const provider = {
    origin,
    async fetch(request) {
      calls.push(request.url);
      const url = new URL(request.url);
      const match = /^\/actors\/([^/]+)\/outbox$/u.exec(url.pathname);
      if (!match || !Object.hasOwn(pages, match[1])) return new Response(null, { status: 404 });
      const items = pages[match[1]];
      return Response.json(url.searchParams.get("page") === "true" ? {
        type: "OrderedCollectionPage", orderedItems: items,
      } : {
        type: "OrderedCollection", totalItems: items.length,
        ...(items.length ? { first: origin + url.pathname + "?page=true" } : {}),
      });
    },
  };
  return { provider, calls };
}

test("two original signed-social outboxes produce one chronological live public timeline", async () => {
  const a = note("alice", "one", "2026-10-19T04:00:00Z");
  const b = note("bob", "two", "2026-10-19T05:00:00Z");
  const pages = { alice: [a], bob: [b] };
  const { provider, calls } = source(pages);
  const first = await readPublicTimeline({ origin, provider, identifiers: actors });
  assert.deepEqual(first.map(row => row.identifier), ["bob", "alice"]);
  assert.equal(first[0].content, "Body of two");
  pages.alice = [note("alice", "three", "2026-10-19T06:00:00Z"), a];
  const second = await readPublicTimeline({ origin, provider, identifiers: actors });
  assert.deepEqual(second.map(row => row.id), [
    actorId("alice") + "/posts/three", actorId("bob") + "/posts/two",
    actorId("alice") + "/posts/one",
  ]);
  assert.equal(calls.length, 8);
});

test("unaddressed private, foreign and forged actors are never projected", async () => {
  const privateNote = note("alice", "private", "2026-10-19T03:00:00Z", {
    to: [actorId("bob")], object: {
      id: actorId("alice") + "/posts/private", type: "Note", attributedTo: actorId("alice"),
      content: "DO NOT SHOW", published: "2026-10-19T03:00:00Z",
    },
  });
  const impersonation = note("alice", "other", "2026-10-19T04:00:00Z",
    { actor: actorId("bob") });
  const crossSite = note("alice", "external", "2026-10-19T05:00:00Z", {
    object: {
      id: "https://evil.example/actors/alice/posts/external",
      type: "Note", attributedTo: actorId("alice"),
      content: "foreign post", published: "2026-10-19T05:00:00Z",
    },
  });
  const { provider } = source({ alice: [privateNote, impersonation, crossSite], bob: [] });
  assert.deepEqual(await readPublicTimeline({ origin, provider, identifiers: actors }), []);
});

test("a wrong-origin outbox cursor is refused, never fetched", async () => {
  let count = 0;
  const provider = {
    origin,
    async fetch() {
      count += 1;
      return Response.json({
        type: "OrderedCollection", totalItems: 1,
        first: "https://untrusted.example/actors/alice/outbox?page=true",
      });
    },
  };
  await assert.rejects(
    readPublicTimeline({ origin, provider, identifiers: ["alice"] }),
    /foreign or noncanonical/,
  );
  assert.equal(count, 1);
});

test("missing original custody or malformed collections fail closed", async () => {
  const broken = { origin, fetch: async () => new Response(null, { status: 503 }) };
  await assert.rejects(readPublicTimeline({ origin, provider: broken, identifiers: ["alice"] }),
    /refused with status 503/);
  const invalid = {
    origin,
    fetch: async () => Response.json({ type: "OrderedCollection", totalItems: "one" }),
  };
  await assert.rejects(readPublicTimeline({ origin, provider: invalid, identifiers: ["alice"] }),
    /malformed public outbox collection/);
});

test("origin, actor provenance and bounded query requirements are mandatory", async () => {
  const { provider } = source({ alice: [] });
  await assert.rejects(readPublicTimeline({ origin: "http://public.example", provider, identifiers: ["alice"] }),
    /canonical HTTPS/);
  await assert.rejects(readPublicTimeline({ origin, provider, identifiers: ["alice", "alice"] }),
    /distinct source-owned/);
  await assert.rejects(readPublicTimeline({ origin, provider, identifiers: ["../bob"] }),
    /distinct source-owned/);
  await assert.rejects(readPublicTimeline({ origin, provider, identifiers: ["alice"], limit: 999 }),
    /limit must be between/);
});


test("native ActivityPub undated /notes IDs remain visible without a fictional clock", async () => {
  const originalActor = actorId("alice");
  const publishedElsewhere = {
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "Create", id: origin + "/activities/alice-1",
    actor: originalActor, to: PUBLIC,
    object: {
      id: origin + "/notes/alice-1", type: "Note",
      attributedTo: originalActor, content: "Original provider post",
    },
  };
  const { provider } = source({ alice: [publishedElsewhere] });
  const rows = await readPublicTimeline({ origin, provider, identifiers: ["alice"] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, origin + "/notes/alice-1");
  assert.equal(rows[0].content, "Original provider post");
  assert.equal(rows[0].published, null);
});

test("ActivityStreams ordered collections with inline public items need no invented cursor", async () => {
  const original = note("alice", "one", "2026-10-19T05:00:00Z");
  const provider = {
    origin,
    fetch: async request => {
      assert.equal(new URL(request.url).search, "");
      return Response.json({
        type: "OrderedCollection", totalItems: 1, orderedItems: [original],
      });
    },
  };
  const rows = await readPublicTimeline({ origin, provider, identifiers: ["alice"] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, actorId("alice") + "/posts/one");
});


test("a retired original actor cannot deny every remaining actor's public timeline", async () => {
  const { provider, calls } = source({ alice: [note("alice", "one", "2026-10-19T05:00:00Z")], bob: [] });
  provider.resolveActor = async id => id === "alice" ? { identifier: id } : null;
  const posts = await readPublicTimeline({ origin, provider, identifiers: actors });
  assert.deepEqual(posts.map(row => row.identifier), ["alice"]);
  assert.equal(calls.length, 2);
});

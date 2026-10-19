import test from "node:test";
import assert from "node:assert/strict";
import { createMooseSocialApplication } from "../src/application.mjs";
import { PUBLIC } from "../src/timeline.mjs";

const origin = "https://community.example";
const alice = origin + "/actors/alice";
const bob = origin + "/actors/bob";
const activity = (kind, content) => ({
  type: kind, actor: alice, to: [PUBLIC],
  object: {
    type: "Note", id: alice + "/posts/one", attributedTo: alice,
    content, published: "2026-10-19T05:00:00Z",
  },
});

function originalSource() {
  const items = [activity("Create", "First original post")];
  const actors = new Map([
    ["alice", { identifier: "alice", actorName: "Alice", summary: "First community member" }],
    ["bob", { identifier: "bob", actorName: "Bob", summary: "Second community member" }],
  ]);
  const provider = {
    origin,
    resolveActor: async identifier => actors.get(identifier) ?? null,
    async fetch(request) {
      const url = new URL(request.url);
      const match = /^\/actors\/([^/]+)\/outbox$/u.exec(url.pathname);
      if (match === null || !actors.has(match[1])) return new Response(null, { status: 404 });
      const authored = match[1] === "alice" ? items : [];
      return Response.json(url.searchParams.has("page")
        ? { type: "OrderedCollectionPage", orderedItems: authored }
        : { type: "OrderedCollection", totalItems: authored.length,
            ...(authored.length ? { first: url.origin + url.pathname + "?page=true" } : {}) });
    },
  };
  return { provider, items, actors };
}
const get = (site, route) => site.fetch(new Request(origin + route, {
  headers: { accept: "application/json" },
}));

test("MOOSE gives native Living Web profile routes to the same original actors and public outbox", async () => {
  const { provider, items } = originalSource();
  const social = createMooseSocialApplication({ origin, provider,
    identifiers: ["alice", "bob"], authorizePublicRead: async () => true });
  assert.deepEqual(social.resources.map(route => route.match), [
    "/social", "/social/timeline", "/social/actors", "/social/people/alice", "/social/people/bob",
  ]);
  assert.ok(social.resources.every(route => route.public === true));
  const home = await get(social, "/social");
  assert.equal(home.status, 200);
  const first = await home.json();
  assert.equal(first.tiles.length, 1);
  assert.match(first.tiles[0].content, /First original post/);
  assert.equal(first.tiles[0].links[0].href, "/social/people/alice");
  assert.equal(first.tiles[0].data.objectId, alice + "/posts/one");
  const profile = await (await get(social, "/social/people/alice")).json();
  assert.equal(profile.title, "@alice · MOOSE");
  assert.equal(profile.tiles[0].title, "Alice");
  assert.equal(profile.tiles.length, 2);
  const index = await (await get(social, "/social/actors")).json();
  assert.deepEqual(index.tiles.map(tile => tile.title), ["@alice", "@bob"]);
  items.unshift(activity("Update", "Revised original post"));
  const revision = await (await get(social, "/social/timeline")).json();
  assert.equal(revision.tiles.length, 1);
  assert.equal(revision.tiles[0].content, "Revised original post");
  items.unshift({ type: "Delete", actor: alice, to: [PUBLIC],
    object: { type: "Tombstone", id: alice + "/posts/one" } });
  const deleted = await (await get(social, "/social/people/alice")).json();
  assert.equal(deleted.tiles.length, 2);
  assert.equal(deleted.tiles[1].id, "empty-timeline");
});

test("public-read refusal and removed actors do not leak identity or source data", async () => {
  const { provider, actors } = originalSource();
  const site = createMooseSocialApplication({ origin, provider,
    identifiers: ["alice", "bob"], authorizePublicRead: async ({resource}) => resource === "home" });
  assert.equal((await get(site, "/social")).status, 200);
  assert.equal((await get(site, "/social/people/alice")).status, 404);
  assert.equal((await get(site, "/social/actors")).status, 404);
  actors.delete("bob");
  const publicSite = createMooseSocialApplication({ origin, provider,
    identifiers: ["alice", "bob"], authorizePublicRead: async () => true });
  const index = await (await get(publicSite, "/social/actors")).json();
  assert.deepEqual(index.tiles.map(tile => tile.title), ["@alice"]);
  assert.equal((await get(publicSite, "/social/people/bob")).status, 404);
  assert.equal((await publicSite.fetch(new Request("https://foreign.example/social"))).status, 421);
});

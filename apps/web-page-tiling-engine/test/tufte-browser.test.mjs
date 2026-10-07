import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeTufteModel,
  diffTufteProjection,
  applyTufteProjectionPatch,
  applyTufteReceipt,
  applyTufteFieldErrors,
  connectTufteDocument,
  connectTufteNavigation,
  withPendingLifecycle,
} from "../src/tufte-browser.mjs";
import { createFakeDocument, buildFakeTufteRoot, fakeFetch, foreignRealmWindow, realmCheckedFetch } from "./fake-dom.mjs";

// ---- item 1: diffTufteProjection (pure) ----

test("diffTufteProjection: no-op on identical projections", () => {
  const model = normalizeTufteModel({ tiles: [{ id: "a", title: "A" }, { id: "b", title: "B" }] });
  assert.deepEqual(diffTufteProjection(model, model), []);
});

test("diffTufteProjection: update carries only changed fields, plus the atomic body representation", () => {
  const previous = normalizeTufteModel({ tiles: [{ id: "score", title: "Score", confidence: "high", content: "12" }] });
  const next = normalizeTufteModel({ tiles: [{ id: "score", title: "Score", confidence: "low", content: "9" }] });
  const patches = diffTufteProjection(previous, next);
  assert.deepEqual(patches, [{ op: "update", id: "score", changed: { confidence: "low", html: undefined, content: "9" } }]);
});

test("diffTufteProjection: insert carries authored afterId, not a DOM-observed one", () => {
  const previous = normalizeTufteModel({ tiles: [{ id: "a" }, { id: "c" }] });
  const next = normalizeTufteModel({ tiles: [{ id: "a" }, { id: "b" }, { id: "c" }] });
  const patches = diffTufteProjection(previous, next);
  assert.equal(patches.length, 1);
  assert.equal(patches[0].op, "insert");
  assert.equal(patches[0].id, "b");
  assert.equal(patches[0].afterId, "a");
});

test("diffTufteProjection: insert-first uses a null afterId", () => {
  const previous = normalizeTufteModel({ tiles: [{ id: "a" }] });
  const next = normalizeTufteModel({ tiles: [{ id: "zero" }, { id: "a" }] });
  const patches = diffTufteProjection(previous, next);
  assert.deepEqual(patches, [{ op: "insert", id: "zero", afterId: null, tile: next.tiles[0] }]);
});

test("diffTufteProjection: remove for a dropped id, no touch on survivors", () => {
  const previous = normalizeTufteModel({ tiles: [{ id: "a" }, { id: "b" }] });
  const next = normalizeTufteModel({ tiles: [{ id: "a" }] });
  assert.deepEqual(diffTufteProjection(previous, next), [{ op: "remove", id: "b" }]);
});

test("diffTufteProjection: reorder is emitted only when the persisted order actually changed", () => {
  const previous = normalizeTufteModel({ tiles: [{ id: "a" }, { id: "b" }] });
  const swapped = normalizeTufteModel({ tiles: [{ id: "b" }, { id: "a" }] });
  const patches = diffTufteProjection(previous, swapped);
  assert.ok(patches.some((patch) => patch.op === "reorder"));

  const untouched = normalizeTufteModel({ tiles: [{ id: "a", title: "A2" }, { id: "b" }] });
  const patches2 = diffTufteProjection(previous, untouched);
  assert.ok(!patches2.some((patch) => patch.op === "reorder"), "a same-order update must not also emit reorder");
});

test("diffTufteProjection: older ticks are rejected while same-tick presentation changes apply", () => {
  const t5 = normalizeTufteModel({ tick: 5, tiles: [{ id: "a", title: "five" }] });
  const t9 = normalizeTufteModel({ tick: 9, tiles: [{ id: "a", title: "nine" }] });
  assert.ok(diffTufteProjection(t5, t9).length > 0, "advancing tick still diffs normally");
  assert.deepEqual(diffTufteProjection(t9, t5), [], "an older tick applied after a newer one is a no-op");
  assert.deepEqual(diffTufteProjection(t9, t9), [], "reapplying the same tick is a no-op");
  const chat = normalizeTufteModel({ tick: 9, tiles: [{ id: "a", title: "nine", html: "a new chat message" }] });
  assert.ok(diffTufteProjection(t9, chat).some(patch => patch.op === "update" && patch.changed.html === "a new chat message"));
});

// ---- item 1: applyTufteProjectionPatch (DOM) ----
// "data change -> exactly the affected tiles replaced, reading order preserved"

test("applyTufteProjectionPatch: only the changed tile's body is replaced; siblings are untouched nodes", () => {
  globalThis.document = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([
    { id: "now", title: "Now", content: "stable" },
    { id: "next", title: "Next", content: "also stable" },
  ]);
  const untouchedNode = grid.querySelector("#next");

  const previous = normalizeTufteModel({ tiles: [{ id: "now", title: "Now", content: "stable" }, { id: "next", title: "Next", content: "also stable" }] });
  const next = normalizeTufteModel({ tiles: [{ id: "now", title: "Now", content: "updated" }, { id: "next", title: "Next", content: "also stable" }] });
  applyTufteProjectionPatch(root, diffTufteProjection(previous, next));

  assert.equal(grid.querySelector("#now").querySelector(".tufte-tile-body").innerHTML, "<p>updated</p>");
  assert.equal(grid.querySelector("#next"), untouchedNode, "the untouched tile must be the same node, not rebuilt");
  assert.equal(grid.children.map((el) => el.id).join(","), "now,next", "reading order preserved");
});

test("applyTufteProjectionPatch: insert/remove/reorder keep authored reading order in the DOM", () => {
  globalThis.document = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([{ id: "a" }, { id: "b" }, { id: "c" }]);
  const previous = normalizeTufteModel({ tiles: [{ id: "a" }, { id: "b" }, { id: "c" }] });
  const next = normalizeTufteModel({ tiles: [{ id: "c" }, { id: "a" }, { id: "zed" }] }); // b removed, zed inserted, c moved first
  applyTufteProjectionPatch(root, diffTufteProjection(previous, next));
  assert.deepEqual(grid.children.map((el) => el.id), ["c", "a", "zed"]);
});

test("applyTufteProjectionPatch: a stale-tick patch list (empty) leaves the DOM untouched", () => {
  globalThis.document = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([{ id: "a", title: "A" }]);
  const before = grid.querySelector("#a");
  const older = normalizeTufteModel({ tick: 3, tiles: [{ id: "a", title: "should not apply" }] });
  const current = normalizeTufteModel({ tick: 9, tiles: [{ id: "a", title: "A" }] });
  applyTufteProjectionPatch(root, diffTufteProjection(current, older));
  assert.equal(grid.querySelector("#a"), before);
  assert.equal(grid.querySelector("#a").querySelector("h2").textContent, "A");
});

// ---- item 2: the action -> receipt/refusal loop ----

test("action loop: a scripted action produces a receipt that patches exactly the named tile", async () => {
  globalThis.document = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([{ id: "confidence", title: "Confidence", confidence: "high", content: "steady" }]);
  root.setAttribute("data-action-endpoint", "/act");
  root.dataset.actionEndpoint = "/act";
  root.dataset.revision = "r1";

  globalThis.fetch = fakeFetch({
    "POST /act": (body) => {
      assert.equal(body.action, "recheck");
      return { status: 200, json: { id: "confidence", confidence: "low", content: "match found" } };
    },
  });

  const receipts = [];
  root.addEventListener("tufte:receipt", (event) => receipts.push(event.detail));
  connectTufteDocument(root, {});

  const button = grid.querySelector("#confidence");
  button.dataset.tufteAction = "recheck";
  await root.dispatchEvent({ type: "click", bubbles: true, target: button });
  // let the async handler's microtasks settle
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(receipts.length, 1);
  applyTufteReceipt(root, receipts[0]);
  const tile = grid.querySelector("#confidence");
  assert.equal(tile.dataset.confidence, "low");
  assert.equal(tile.querySelector(".tufte-tile-body").innerHTML, "<p>match found</p>");
  assert.equal(tile.querySelector("h2").textContent, "Confidence", "a field the receipt did not mention is left alone");
});

test("action loop: a refused action dispatches tufte:refusal with a reason, optionally carrying a tile", async () => {
  globalThis.document = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([{ id: "book", title: "Book" }]);
  root.dataset.actionEndpoint = "/act";

  globalThis.fetch = fakeFetch({
    "POST /act": () => ({ status: 409, json: { id: "book-refusal", title: "Refused", content: "already booked" } }),
  });

  const refusals = [];
  root.addEventListener("tufte:refusal", (event) => refusals.push(event.detail));
  connectTufteDocument(root, {});

  const button = grid.querySelector("#book");
  button.dataset.tufteAction = "book";
  await root.dispatchEvent({ type: "click", bubbles: true, target: button });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(refusals.length, 1);
  assert.match(refusals[0].message, /refused with HTTP 409/);
  assert.equal(refusals[0].tile.id, "book-refusal");
  assert.equal(refusals[0].tile.content, "already booked");
});

test("action loop: an unparseable refusal body still degrades cleanly to {message} only", async () => {
  globalThis.document = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([{ id: "book", title: "Book" }]);
  root.dataset.actionEndpoint = "/act";
  globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => { throw new Error("not json"); } });

  const refusals = [];
  root.addEventListener("tufte:refusal", (event) => refusals.push(event.detail));
  connectTufteDocument(root, {});
  const button = grid.querySelector("#book");
  button.dataset.tufteAction = "book";
  await root.dispatchEvent({ type: "click", bubbles: true, target: button });
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(Object.keys(refusals[0]), ["message"]);
});

test("command endpoints do not steal native form submissions or submit-button clicks", async () => {
  globalThis.document = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([]);
  root.dataset.actionEndpoint = "/act";
  const form = globalThis.document.createElement("form"); form.dataset.tufteAction = "save";
  const submit = globalThis.document.createElement("button"); submit.dataset.tufteAction = "save"; submit.setAttribute("type", "submit");
  form.appendChild(submit); grid.appendChild(form);
  let requests = 0; let prevented = false;
  globalThis.fetch = async () => { requests++; };
  const connection = connectTufteDocument(root);
  root.dispatchEvent({ type: "click", bubbles: true, target: submit });
  root.dispatchEvent({ type: "submit", bubbles: true, target: form, preventDefault() { prevented = true; } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(prevented, false); assert.equal(requests, 0);
  connection.disconnect();
});

// ---- item 3: tick-bound seam stays opaque ----

test("normalizeTufteModel: tick passes through untouched like revision, and is absent when not given", () => {
  assert.equal(normalizeTufteModel({ tick: 42 }).tick, 42);
  assert.ok(!("tick" in normalizeTufteModel({})));
  assert.ok(!("tick" in normalizeTufteModel({ tick: "not-a-number" })));
});

test("normalizeTufteModel: span is always a finite CSS-grid integer within the supported range", () => {
  const spans = normalizeTufteModel({
    tiles: [
      { span: 3.9 },
      { span: 99 },
      { span: -3 },
      { span: Infinity },
      { span: Symbol("not numeric") },
    ],
  }).tiles.map((tile) => tile.span);
  assert.deepEqual(spans, [3, 12, 2, 4, 4]);
  assert.ok(spans.every((span) => Number.isInteger(span) && span >= 2 && span <= 12));
});

// ---- autoPatch opt-in wiring ----

test("connectTufteDocument({autoPatch:true}): the first tufte:projection seeds a baseline (no duplicate render), later ones patch", async () => {
  globalThis.document = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([{ id: "now", title: "Now", content: "v1" }]);
  connectTufteDocument(root, { autoPatch: true });

  const first = normalizeTufteModel({ tick: 1, tiles: [{ id: "now", title: "Now", content: "v1" }] });
  root.dispatchEvent(new CustomEvent("tufte:projection", { bubbles: true, detail: first }));
  assert.equal(grid.children.length, 1, "seeding the baseline must not insert a duplicate tile");

  const second = normalizeTufteModel({ tick: 2, tiles: [{ id: "now", title: "Now", content: "v2" }] });
  root.dispatchEvent(new CustomEvent("tufte:projection", { bubbles: true, detail: second }));
  assert.equal(grid.querySelector("#now").querySelector(".tufte-tile-body").innerHTML, "<p>v2</p>");
});

test("autoPatch never regresses its baseline after stale tick events", () => {
  globalThis.document = createFakeDocument();
  const current = normalizeTufteModel({ tick: 9, tiles: [{ id: "now", content: "nine" }] });
  const { root, grid } = buildFakeTufteRoot(current.tiles);
  connectTufteDocument(root, { autoPatch: true, projection: current });

  root.dispatchEvent(new CustomEvent("tufte:projection", {
    bubbles: true,
    detail: { tick: 5, tiles: [{ id: "now", content: "five" }] },
  }));
  root.dispatchEvent(new CustomEvent("tufte:projection", {
    bubbles: true,
    detail: { tick: 7, tiles: [{ id: "now", content: "seven" }] },
  }));
  assert.equal(grid.querySelector("#now").querySelector(".tufte-tile-body").innerHTML, "<p>nine</p>");

  root.dispatchEvent(new CustomEvent("tufte:projection", {
    bubbles: true,
    detail: { tick: 10, tiles: [{ id: "now", content: "ten" }] },
  }));
  assert.equal(grid.querySelector("#now").querySelector(".tufte-tile-body").innerHTML, "<p>ten</p>");
});

test("disconnect suppresses late projection/refusal events from an in-flight source request", async () => {
  globalThis.document = createFakeDocument();
  const { root } = buildFakeTufteRoot([]);
  let resolveFetch;
  globalThis.fetch = () => new Promise((resolve) => { resolveFetch = resolve; });
  const observed = [];
  root.addEventListener("tufte:projection", () => observed.push("projection"));
  root.addEventListener("tufte:refusal", () => observed.push("refusal"));

  const connection = connectTufteDocument(root, { source: "/projection" });
  connection.disconnect();
  resolveFetch({ ok: true, json: async () => ({ tiles: [{ id: "late" }] }) });
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(observed, []);
});

test("disconnect suppresses a late receipt from an in-flight action request", async () => {
  globalThis.document = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([{ id: "action" }]);
  root.dataset.actionEndpoint = "/act";
  grid.querySelector("#action").dataset.tufteAction = "run";
  let resolveFetch;
  globalThis.fetch = () => new Promise((resolve) => { resolveFetch = resolve; });
  const receipts = [];
  root.addEventListener("tufte:receipt", (event) => receipts.push(event.detail));

  const connection = connectTufteDocument(root);
  root.dispatchEvent({ type: "click", bubbles: true, target: grid.querySelector("#action") });
  connection.disconnect();
  resolveFetch({ ok: true, json: async () => ({ id: "late" }) });
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(receipts, []);
});

// ---- Wave1 item 5: the `live` field ----

test("normalizeTufteModel: live keeps only the two valid tokens, dropping the key entirely otherwise", () => {
  assert.equal(normalizeTufteModel({ tiles: [{ id: "a", live: "polite" }] }).tiles[0].live, "polite");
  assert.equal(normalizeTufteModel({ tiles: [{ id: "a", live: "assertive" }] }).tiles[0].live, "assertive");
  assert.ok(!("live" in normalizeTufteModel({ tiles: [{ id: "a", live: "very-loud" }] }).tiles[0]));
  assert.ok(!("live" in normalizeTufteModel({ tiles: [{ id: "a" }] }).tiles[0]));
});

test("diffTufteProjection: a live change is diffed like any other vocabulary field", () => {
  const previous = normalizeTufteModel({ tiles: [{ id: "a", title: "A" }] });
  const next = normalizeTufteModel({ tiles: [{ id: "a", title: "A", live: "polite" }] });
  assert.deepEqual(diffTufteProjection(previous, next), [{ op: "update", id: "a", changed: { live: "polite" } }]);
  assert.deepEqual(diffTufteProjection(next, previous), [{ op: "update", id: "a", changed: { live: undefined } }]);
});

test("applyTufteProjectionPatch: live update writes/clears aria-live+aria-atomic on the tile body, insert builds it in place", () => {
  globalThis.document = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([{ id: "status", title: "Status", content: "Ready." }]);

  applyTufteProjectionPatch(root, [{ op: "update", id: "status", changed: { live: "assertive" } }]);
  const body = grid.querySelector("#status").querySelector(".tufte-tile-body");
  assert.equal(body.getAttribute("aria-live"), "assertive");
  assert.equal(body.getAttribute("aria-atomic"), "true");

  applyTufteProjectionPatch(root, [{ op: "update", id: "status", changed: { live: undefined } }]);
  assert.equal(body.getAttribute("aria-live"), null);
  assert.equal(body.getAttribute("aria-atomic"), null);

  const tile = normalizeTufteModel({ tiles: [{ id: "new", title: "New", content: "x", live: "polite" }] }).tiles[0];
  applyTufteProjectionPatch(root, [{ op: "insert", id: "new", afterId: "status", tile }]);
  const newBody = grid.querySelector("#new").querySelector(".tufte-tile-body");
  assert.equal(newBody.getAttribute("aria-live"), "polite");
});

test("applyTufteReceipt honors live the same way as any other patchable field", () => {
  globalThis.document = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([{ id: "status", title: "Status", content: "Ready." }]);
  applyTufteReceipt(root, { id: "status", live: "polite", content: "Updated." });
  assert.equal(grid.querySelector("#status").querySelector(".tufte-tile-body").getAttribute("aria-live"), "polite");
});

// ---- Wave1 item 3: withPendingLifecycle ----

test("withPendingLifecycle: reverts to the prior lifecycle only when the tile is still pending", async () => {
  globalThis.document = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([{ id: "a", lifecycle: "imminent" }, { id: "b", lifecycle: "present" }]);

  const result = await withPendingLifecycle(root, ["a", "b"], async () => {
    assert.equal(grid.querySelector("#a").dataset.lifecycle, "pending");
    assert.equal(grid.querySelector("#b").dataset.lifecycle, "pending");
    // Something else (e.g. a receipt arriving mid-flight) moves "b" on
    // before this action settles.
    grid.querySelector("#b").dataset.lifecycle = "imminent";
    return 42;
  });

  assert.equal(result, 42);
  assert.equal(grid.querySelector("#a").dataset.lifecycle, "imminent", "reverted: still pending when the action settled");
  assert.equal(grid.querySelector("#b").dataset.lifecycle, "imminent", "left alone: no longer pending, not clobbered back to 'present'");
});

test("withPendingLifecycle: propagates a rejection but still runs its revert", async () => {
  globalThis.document = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([{ id: "a", lifecycle: "present" }]);
  await assert.rejects(
    withPendingLifecycle(root, "a", async () => { throw new Error("boom"); }),
    /boom/,
  );
  assert.equal(grid.querySelector("#a").dataset.lifecycle, "present");
});

test("withPendingLifecycle: an unknown id and a grid-less root are both silent no-ops around the action", async () => {
  globalThis.document = createFakeDocument();
  const { root } = buildFakeTufteRoot([]);
  assert.equal(await withPendingLifecycle(root, "missing", async () => "ok"), "ok");
  const bareElement = globalThis.document.createElement("div");
  assert.equal(await withPendingLifecycle(bareElement, "x", async () => "ok2"), "ok2");
});

// ---- Wave1 item 2: applyTufteFieldErrors ----

test("applyTufteFieldErrors: sanitizes an unsafe field name into a valid element id", () => {
  globalThis.document = createFakeDocument();
  const form = globalThis.document.createElement("form");
  const input = globalThis.document.createElement("input");
  input.name = "user.email[0]";
  form.appendChild(input);
  form.elements = [input];

  applyTufteFieldErrors(form, { fields: { "user.email[0]": "Invalid." } });
  assert.equal(input.getAttribute("aria-invalid"), "true");
  const describedBy = input.getAttribute("aria-describedby");
  assert.match(describedBy, /^[a-zA-Z0-9_-]+-error$/, "the generated id must be a valid token even for an unsafe field name");
  assert.equal(form.querySelector(`#${describedBy}`).textContent, "Invalid.");
});

test("applyTufteFieldErrors: an absent tile clears every named field's error state", () => {
  globalThis.document = createFakeDocument();
  const form = globalThis.document.createElement("form");
  const a = globalThis.document.createElement("input");
  a.name = "a";
  form.appendChild(a);
  form.elements = [a];
  applyTufteFieldErrors(form, { fields: { a: "Bad." } });
  assert.equal(a.getAttribute("aria-invalid"), "true");
  applyTufteFieldErrors(form, null);
  assert.equal(a.getAttribute("aria-invalid"), null);
  assert.equal(form.querySelector("#a-error"), null);
});

test("applyTufteFieldErrors: a form with no elements collection is a no-op, not a throw", () => {
  globalThis.document = createFakeDocument();
  const form = globalThis.document.createElement("form");
  assert.equal(applyTufteFieldErrors(form, { fields: { a: "x" } }), form);
  assert.equal(applyTufteFieldErrors(null, {}), null);
});

// ---- Wave1 item 1: connectTufteNavigation ----

function fakeWindow(overrides = {}) {
  return {
    history: { pushState() {}, replaceState() {} },
    location: { pathname: "/", search: "" },
    addEventListener() {},
    removeEventListener() {},
    ...overrides,
  };
}

test("connectTufteNavigation: a click fetches data-tufte-nav-source but pushes the link's own href", async () => {
  globalThis.document = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([{ id: "page", title: "Home" }]);
  root.contains = () => true;
  const link = globalThis.document.createElement("a");
  link.setAttribute("href", "/pretty-url");
  link.setAttribute("data-tufte-nav", "");
  link.setAttribute("data-tufte-nav-source", "/api/pretty-url");
  grid.appendChild(link);

  let fetchedUrl;
  globalThis.fetch = fakeFetch({
    "GET /api/pretty-url": () => { fetchedUrl = "/api/pretty-url"; return { status: 200, json: { tiles: [{ id: "page", title: "Fetched" }] } }; },
  });
  const pushed = [];
  const win = fakeWindow({ history: { pushState: (...args) => pushed.push(args), replaceState() {} } });
  const connection = connectTufteNavigation(root, { projection: normalizeTufteModel({ tiles: [{ id: "page", title: "Home" }] }), window: win });

  root.dispatchEvent({ type: "click", bubbles: true, target: link, preventDefault() {} });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(fetchedUrl, "/api/pretty-url");
  assert.equal(grid.querySelector("#page").querySelector("h2").textContent, "Fetched");
  assert.deepEqual(pushed[0], [{ tufteHref: "/pretty-url", tufteSource: "/api/pretty-url" }, "", "/pretty-url"], "the address bar adopts the link's own href, not the fetched source");
  connection.disconnect();
});

test("connectTufteNavigation: a modified click (new-tab intent) is left alone", async () => {
  globalThis.document = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([]);
  root.contains = () => true;
  const link = globalThis.document.createElement("a");
  link.setAttribute("href", "/next");
  link.setAttribute("data-tufte-nav", "");
  grid.appendChild(link);
  let fetched = false;
  globalThis.fetch = async () => { fetched = true; return { ok: true, json: async () => ({ tiles: [] }) }; };
  const connection = connectTufteNavigation(root, { window: fakeWindow() });

  let prevented = false;
  root.dispatchEvent({ type: "click", bubbles: true, target: link, metaKey: true, preventDefault: () => { prevented = true; } });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(prevented, false);
  assert.equal(fetched, false);
  connection.disconnect();
});

test("connectTufteNavigation: a non-ok response dispatches tufte:refusal and never pushes history", async () => {
  globalThis.document = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([]);
  root.contains = () => true;
  const link = globalThis.document.createElement("a");
  link.setAttribute("href", "/missing");
  link.setAttribute("data-tufte-nav", "");
  grid.appendChild(link);
  globalThis.fetch = fakeFetch({ "GET /missing": () => ({ status: 404, json: {} }) });
  const pushed = [];
  const win = fakeWindow({ history: { pushState: (...args) => pushed.push(args), replaceState() {} } });
  const refusals = [];
  root.addEventListener("tufte:refusal", (event) => refusals.push(event.detail));
  const connection = connectTufteNavigation(root, { window: win });

  root.dispatchEvent({ type: "click", bubbles: true, target: link, preventDefault() {} });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(refusals.length, 1);
  assert.match(refusals[0].message, /navigation refused with HTTP 404/);
  assert.equal(pushed.length, 0);
  connection.disconnect();
});

test("connectTufteNavigation: disconnect removes the click listener and the popstate listener", async () => {
  globalThis.document = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([]);
  root.contains = () => true;
  const link = globalThis.document.createElement("a");
  link.setAttribute("href", "/next");
  link.setAttribute("data-tufte-nav", "");
  grid.appendChild(link);
  let fetched = false;
  globalThis.fetch = async () => { fetched = true; return { ok: true, json: async () => ({ tiles: [] }) }; };
  const popstateHandlers = [];
  const win = fakeWindow({
    addEventListener(type, handler) { if (type === "popstate") popstateHandlers.push(handler); },
    removeEventListener(type, handler) { if (type === "popstate") popstateHandlers.splice(popstateHandlers.indexOf(handler), 1); },
  });
  const connection = connectTufteNavigation(root, { window: win });
  assert.equal(popstateHandlers.length, 1, "popstate is wired by default");

  connection.disconnect();
  assert.equal(popstateHandlers.length, 0, "disconnect tears the popstate listener back down");

  root.dispatchEvent({ type: "click", bubbles: true, target: link, preventDefault() {} });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(fetched, false, "disconnect also tears down the click listener");
});

test("connectTufteNavigation: options.popState === false skips wiring popstate at all", () => {
  globalThis.document = createFakeDocument();
  const { root } = buildFakeTufteRoot([]);
  let calls = 0;
  const win = fakeWindow({ addEventListener() { calls += 1; } });
  connectTufteNavigation(root, { window: win, popState: false }).disconnect();
  assert.equal(calls, 0);
});

test("connectTufteNavigation: the returned connection's navigate() method drives the same loop as a click", async () => {
  globalThis.document = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([{ id: "page", title: "Home" }]);
  globalThis.fetch = fakeFetch({ "GET /programmatic": () => ({ status: 200, json: { tiles: [{ id: "page", title: "Programmatic" }] } }) });
  const connection = connectTufteNavigation(root, { projection: normalizeTufteModel({ tiles: [{ id: "page", title: "Home" }] }), window: fakeWindow() });

  await connection.navigate("/programmatic");
  assert.equal(grid.querySelector("#page").querySelector("h2").textContent, "Programmatic");
  connection.disconnect();
});

test("connectTufteNavigation: a null root returns an inert connection, same posture as connectTufteDocument", () => {
  const connection = connectTufteNavigation(null, {});
  assert.doesNotThrow(() => connection.disconnect());
});

// ---- Wave1 item 5/6: applyTufteProjectionPatch options ----

test("applyTufteProjectionPatch: focusOnInsert focuses only the first of several inserted tiles, in authored order", () => {
  globalThis.document = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([]);
  const previous = normalizeTufteModel({ tiles: [] });
  const next = normalizeTufteModel({ tiles: [{ id: "first", title: "First" }, { id: "second", title: "Second" }] });
  applyTufteProjectionPatch(root, diffTufteProjection(previous, next), { focusOnInsert: true });
  assert.equal(grid.querySelector("#first").querySelector("h2").focused, true);
  assert.equal(grid.querySelector("#second").querySelector("h2").focused, undefined);
});

test("applyTufteProjectionPatch: focusOnInsert defaults to false -- no tabindex, no focus call", () => {
  globalThis.document = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([]);
  const previous = normalizeTufteModel({ tiles: [] });
  const next = normalizeTufteModel({ tiles: [{ id: "a", title: "A" }] });
  applyTufteProjectionPatch(root, diffTufteProjection(previous, next));
  assert.equal(grid.querySelector("#a").querySelector("h2").getAttribute("tabindex"), null);
  assert.equal(grid.querySelector("#a").querySelector("h2").focused, undefined);
});

test("applyTufteProjectionPatch: transition only engages startViewTransition for a structural patch, and defaults to off", () => {
  globalThis.document = createFakeDocument();
  let calls = 0;
  globalThis.document.startViewTransition = (callback) => { calls += 1; callback(); return {}; };

  const { root, grid } = buildFakeTufteRoot([{ id: "a", title: "A" }]);
  // A pure update, no structural op: never wrapped, transition or not.
  applyTufteProjectionPatch(root, [{ op: "update", id: "a", changed: { title: "A2" } }], { transition: true });
  assert.equal(calls, 0, "a non-structural patch never engages the transition wrap");
  assert.equal(grid.querySelector("#a").querySelector("h2").textContent, "A2");

  // A structural patch with transition left off (default): still not wrapped.
  applyTufteProjectionPatch(root, [{ op: "insert", id: "b", afterId: null, tile: normalizeTufteModel({ tiles: [{ id: "b" }] }).tiles[0] }]);
  assert.equal(calls, 0, "transition is opt-in; a structural patch alone does not engage it");

  // A structural patch with transition on: wrapped.
  applyTufteProjectionPatch(root, [{ op: "remove", id: "b" }], { transition: true });
  assert.equal(calls, 1);
  assert.equal(grid.querySelector("#b"), null);
});

test("disconnect suppresses a late refusal while its response body is still parsing", async () => {
  globalThis.document = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([{ id: "action" }]);
  root.dataset.actionEndpoint = "/act";
  grid.querySelector("#action").dataset.tufteAction = "run";
  let resolveJson;
  globalThis.fetch = async () => ({
    ok: false,
    status: 409,
    json: () => new Promise((resolve) => { resolveJson = resolve; }),
  });
  const refusals = [];
  root.addEventListener("tufte:refusal", (event) => refusals.push(event.detail));

  const connection = connectTufteDocument(root);
  root.dispatchEvent({ type: "click", bubbles: true, target: grid.querySelector("#action") });
  await new Promise((resolve) => setImmediate(resolve));
  connection.disconnect();
  resolveJson({ id: "late-refusal" });
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(refusals, []);
});

// ---- P0 regressions (0.4.0): findTileById perf, and cross-realm AbortSignal ----
//
// Both were shipped in 0.4.0 with the full suite green -- neither had a
// test. These are that missing coverage, failing-first against the 0.4.0
// code these fixes replace.

test("findTileById: a large grid's per-tile lookup does not scan every tile (P0 perf: 0.4.0 regressed this to an O(n) Array.from(children).find() -- ~9-12x slower, 69.9ms -> 816.9ms median on a 1k-tile/200-tick bench)", () => {
  globalThis.document = createFakeDocument();
  const N = 500;
  const { root, grid } = buildFakeTufteRoot(Array.from({ length: N }, (_, i) => ({ id: `tile-${i + 1}`, title: `T${i + 1}` })));

  // Count every hasClass() check (the predicate an O(n) scan runs once per
  // candidate element) via the one method every FakeElement's classList
  // shares -- an operation-count assertion, not a timing one, so it is not
  // sensitive to machine speed.
  const classListProto = Object.getPrototypeOf(grid.children[0].classList);
  const originalContains = classListProto.contains;
  let touches = 0;
  classListProto.contains = function contains(name) { touches += 1; return originalContains.call(this, name); };

  try {
    // A grid's very first lookup may legitimately cost O(n) to build an
    // index -- that one-time cost is not what is under test.
    applyTufteProjectionPatch(root, [{ op: "update", id: "tile-1", changed: { title: "warm" } }]);
    touches = 0;

    // 50 further lookups, scattered across the rest of the grid (never
    // tile-1, kept distinct so its "warm" title below proves nothing else
    // touched it), on an already-indexed grid: each must cost O(1). A
    // per-call O(n) scan would touch roughly 50 * (N / 2) = 12500 elements
    // here; a correct O(1) lookup touches about 50 (one classList check
    // per call, to verify the cached node).
    for (let i = 0; i < 50; i += 1) {
      const id = `tile-${((i * 7) % (N - 1)) + 2}`;
      applyTufteProjectionPatch(root, [{ op: "update", id, changed: { title: `U${i}` } }]);
    }

    assert.ok(
      touches <= 150,
      `findTileById must not re-scan the ${N}-tile grid per lookup (50 lookups touched ${touches} elements; an O(1) lookup touches ~50, an O(n) scan ~${Math.round(50 * (N / 2))})`,
    );
  } finally {
    classListProto.contains = originalContains;
  }

  assert.equal(grid.querySelector("#tile-1").querySelector("h2").textContent, "warm", "an untouched tile's own earlier update must survive later, unrelated lookups");
});

test("findTileById: a tile id colliding with a *different* tile's own `${id}-title` heading id resolves to the real tile, not the heading (the correctness need 0.4.0's scan existed to satisfy)", () => {
  globalThis.document = createFakeDocument();
  // tile "x"'s own heading gets id "x-title" (buildTileElement's own
  // convention); a second, distinct tile is deliberately given that exact
  // string as its *own* id. A deep, unscoped `#id` lookup (0.3.1's bug)
  // would find tile "x"'s nested heading first, in document order, not
  // the real "x-title" tile section.
  const { root, grid } = buildFakeTufteRoot([
    { id: "x", title: "X" },
    { id: "x-title", title: "Colliding" },
  ]);
  applyTufteProjectionPatch(root, [{ op: "update", id: "x-title", changed: { title: "Updated" } }]);

  assert.equal(grid.querySelector("#x").querySelector("h2").textContent, "X", "tile x's own heading must be untouched");
  const target = grid.children.find((element) => element.id === "x-title");
  assert.equal(target.querySelector("h2").textContent, "Updated", "the real x-title tile must have received the update");
});

test("connectTufteDocument P0: the `source` projection fetch's AbortSignal must come from fetch's own realm, not the root's owner window (0.4.0: every request rejected before send)", async () => {
  globalThis.document = createFakeDocument();
  const { root } = buildFakeTufteRoot([]);
  root.dataset.source = "/projection";
  // Stand in for a root built by a *different* window than the one
  // `fetch` itself resolves from (e.g. jsdom's window vs. Node's native
  // fetch) -- exactly the split the debug/bench harness hit.
  root.ownerDocument = { defaultView: foreignRealmWindow() };

  const nativeSignalCtor = new AbortController().signal.constructor;
  let requestSent = false;
  globalThis.fetch = realmCheckedFetch(nativeSignalCtor, async () => { requestSent = true; return { ok: true, status: 200, json: async () => ({ tiles: [] }) }; });

  const refusals = [];
  root.addEventListener("tufte:refusal", (event) => refusals.push(event.detail));
  connectTufteDocument(root);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(requestSent, true, "P0: a cross-realm AbortSignal must not make the projection fetch reject before send");
  assert.deepEqual(refusals, [], "no refusal should fire from a realm-mismatched signal");
});

test("connectTufteDocument P0: the action-dispatch fetch's AbortSignal must also come from fetch's own realm", async () => {
  globalThis.document = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([{ id: "action" }]);
  root.dataset.actionEndpoint = "/act";
  grid.querySelector("#action").dataset.tufteAction = "run";
  root.ownerDocument = { defaultView: foreignRealmWindow() };

  const nativeSignalCtor = new AbortController().signal.constructor;
  let requestSent = false;
  globalThis.fetch = realmCheckedFetch(nativeSignalCtor, async () => { requestSent = true; return { ok: true, status: 200, json: async () => ({ tiles: [] }) }; });

  const refusals = [];
  root.addEventListener("tufte:refusal", (event) => refusals.push(event.detail));
  connectTufteDocument(root);
  root.dispatchEvent({ type: "click", bubbles: true, target: grid.querySelector("#action") });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(requestSent, true, "P0: a cross-realm AbortSignal must not make the action fetch reject before send");
  assert.deepEqual(refusals, []);
});

test("connectTufteNavigation P0: navigate()'s fetch AbortSignal must come from fetch's own realm, not options.window", async () => {
  globalThis.document = createFakeDocument();
  const { root } = buildFakeTufteRoot([{ id: "page", title: "Home" }]);

  const nativeSignalCtor = new AbortController().signal.constructor;
  let requestSent = false;
  globalThis.fetch = realmCheckedFetch(nativeSignalCtor, async () => { requestSent = true; return { ok: true, status: 200, json: async () => ({ tiles: [{ id: "page", title: "Programmatic" }] }) }; });

  const connection = connectTufteNavigation(root, {
    projection: normalizeTufteModel({ tiles: [{ id: "page", title: "Home" }] }),
    window: fakeWindow(foreignRealmWindow()),
  });
  await connection.navigate("/programmatic");
  connection.disconnect();

  assert.equal(requestSent, true, "P0: a cross-realm AbortSignal must not make the navigation fetch reject before send");
});

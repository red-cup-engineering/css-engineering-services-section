import assert from "node:assert/strict";
import test from "node:test";

import { compose, mergeApps } from "../../src/compose/compose-http-application.mjs";

test("mergeApps composes resources, hooks, scalar policy, and locals", async () => {
  const events = [];
  const first = {
    resources: [{ match: "/first", handler: () => undefined }],
    base: "https://first.example/",
    locals: { first: true, shared: "first" },
    onStart: () => events.push("first"),
  };
  const second = {
    resources: [{ match: "/second", handler: () => undefined }],
    base: "https://second.example/",
    locals: { second: true, shared: "second" },
    onStart: () => events.push("second"),
  };

  const merged = mergeApps(first, second);
  assert.deepEqual(merged.resources.map((resource) => resource.match), ["/first", "/second"]);
  assert.equal(merged.base, "https://first.example/");
  assert.deepEqual(merged.locals, { first: true, shared: "second", second: true });
  await merged.onStart(merged);
  assert.deepEqual(events, ["first", "second"]);
});

test("compose applies transforms from left to right", () => {
  const result = compose(
    { locals: { order: "" } },
    (app) => ({ ...app, locals: { order: `${app.locals.order}a` } }),
    (app) => ({ ...app, locals: { order: `${app.locals.order}b` } }),
  );
  assert.equal(result.locals.order, "ab");
});

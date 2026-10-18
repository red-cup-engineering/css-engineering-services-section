import assert from "node:assert/strict";
import test from "node:test";
import { createLivingWebServer } from "../src/application.mjs";

const page = value => ({ title: "Living public source", tiles: [
  { id: "currently-admitted", title: "Public observation", content: value },
] });

test("one live source changes its TUFTE human and machine readouts without a second store", async () => {
  let current = "first", calls = 0;
  const site = createLivingWebServer({
    origin: "https://world.example",
    authorizePublicRead: async () => true,
    home: () => { calls++; return page(current); },
  });
  const get = type => site.fetch(new Request("https://world.example/", { headers: { accept: type } }));
  const first = await get("text/html");
  assert.equal(first.status, 200);
  assert.match(await first.text(), /first/);
  current = "second";
  const second = await get("text/html");
  assert.equal(second.status, 200);
  assert.match(await second.text(), /second/);
  const structured = await get("application/json");
  assert.equal(structured.status, 200);
  assert.match(JSON.stringify(await structured.json()), /second/);
  assert.equal(calls, 3);
});

test("private or wrong-origin requests do not even consult the original reader", async () => {
  let reads = 0;
  const site = createLivingWebServer({
    origin: "https://world.example",
    authorizePublicRead: async ({ context }) => context.request.headers.get("x-eligible") === "yes",
    home: () => { reads++; return page("private"); },
  });
  assert.equal((await site.fetch(new Request("https://other.example/"))).status, 421);
  assert.equal((await site.fetch(new Request("https://world.example/"))).status, 404);
  assert.equal(reads, 0);
  const admitted = await site.fetch(new Request("https://world.example/", { headers: {
    accept: "text/html", "x-eligible": "yes",
  } }));
  assert.equal(admitted.status, 200);
  assert.equal(reads, 1);
  assert.equal((await site.fetch(new Request("https://world.example/unknown"))).status, 404);
});

test("invalid origins or undeclared authority refuse at construction", () => {
  for (const origin of ["http://public.example", "https://user:pass@world.example/", "https://world.example/page",
    "https://world.example/?state=private"]) {
    assert.throws(() => createLivingWebServer({ origin, home: () => page("x"), authorizePublicRead: async () => true }), TypeError);
  }
  assert.throws(() => createLivingWebServer({ origin: "https://world.example", home: () => page("x") }),
    /source-owned public-read authority/);
  assert.throws(() => createLivingWebServer({ origin: "https://world.example", authorizePublicRead: async () => true,
    pages: [{ match: "/rooms" }] }), /source readers/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { parseLinkHeader } from "@red-cup-engineering/code-http-link-service";
import {
  collectionPageUrl,
  pageCollection,
  paginateWebCollection,
  paginationLinkHeader,
} from "../src/paginate-web-collection.mjs";

test("pages an ordered collection without mutating it", () => {
  const items = ["a", "b", "c", "d", "e"];
  const page = pageCollection(items, { page: 2, pageSize: 2 });
  assert.deepEqual(page, {
    page: 2,
    pageSize: 2,
    totalPages: 3,
    totalItems: 5,
    offset: 2,
    items: ["c", "d"],
    isFirst: false,
    isLast: false,
    previousPage: 1,
    nextPage: 3,
  });
  assert.deepEqual(items, ["a", "b", "c", "d", "e"]);
  assert.ok(Object.isFrozen(page));
  assert.ok(Object.isFrozen(page.items));
});

test("an empty collection has one empty first and last page", () => {
  const page = pageCollection([], { pageSize: 10 });
  assert.equal(page.totalPages, 1);
  assert.equal(page.isFirst, true);
  assert.equal(page.isLast, true);
  assert.deepEqual(page.items, []);
});

test("canonical page URLs preserve unrelated query data and omit page one", () => {
  assert.equal(
    collectionPageUrl("https://example.test/articles/?tag=web&page=9#old", 1),
    "https://example.test/articles/?tag=web",
  );
  assert.equal(
    collectionPageUrl("https://example.test/articles/?tag=web", 3),
    "https://example.test/articles/?tag=web&page=3",
  );
});

test("forms page navigation and an interoperable HTTP Link field", () => {
  const result = paginateWebCollection([1, 2, 3, 4, 5], {
    baseUrl: "https://example.test/notes/",
    page: 2,
    pageSize: 2,
  });
  assert.deepEqual(result.links, {
    self: "https://example.test/notes/?page=2",
    first: "https://example.test/notes/",
    previous: "https://example.test/notes/",
    next: "https://example.test/notes/?page=3",
    last: "https://example.test/notes/?page=3",
  });
  const parsed = parseLinkHeader(paginationLinkHeader(result.links));
  assert.deepEqual(parsed.map((item) => item.params.rel), ["self", "first", "prev", "next", "last"]);
});

test("rejects invalid pages, sizes, URLs, and query parameter names", () => {
  assert.throws(() => pageCollection([], { page: 2 }), /range 1\.\.1/);
  assert.throws(() => pageCollection([], { pageSize: 0 }), /positive safe integer/);
  assert.throws(() => collectionPageUrl("/relative", 1), /absolute URL/);
  assert.throws(() => collectionPageUrl("ftp://example.test/", 1), /HTTP or HTTPS/);
  assert.throws(() => collectionPageUrl("https://example.test/", 1, { pageParam: "bad name" }), /query parameter/);
});

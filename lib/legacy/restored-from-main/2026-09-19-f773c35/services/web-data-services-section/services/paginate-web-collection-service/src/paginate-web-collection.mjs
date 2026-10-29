import { linkHeader } from "@red-cup-engineering/code-http-link-service";

function positiveInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
  return value;
}

function orderedItems(items) {
  if (!Array.isArray(items)) throw new TypeError("items must be an array");
  return items;
}

/** Page an already ordered collection without changing or reordering its items. */
export function pageCollection(items, options = {}) {
  const ordered = orderedItems(items);
  const pageSize = positiveInteger(options.pageSize ?? 20, "pageSize");
  const page = positiveInteger(options.page ?? 1, "page");
  const totalItems = ordered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (page > totalPages) throw new RangeError(`page must be in range 1..${totalPages}`);
  const offset = (page - 1) * pageSize;
  return Object.freeze({
    page,
    pageSize,
    totalPages,
    totalItems,
    offset,
    items: Object.freeze(ordered.slice(offset, offset + pageSize)),
    isFirst: page === 1,
    isLast: page === totalPages,
    previousPage: page === 1 ? null : page - 1,
    nextPage: page === totalPages ? null : page + 1,
  });
}

/** Form a canonical absolute page URL. Page one omits the paging parameter. */
export function collectionPageUrl(baseUrl, page, options = {}) {
  positiveInteger(page, "page");
  const pageParam = options.pageParam ?? "page";
  if (typeof pageParam !== "string" || !/^[A-Za-z][A-Za-z0-9_.~-]*$/u.test(pageParam)) {
    throw new TypeError("pageParam must be a non-empty URL query parameter name");
  }
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new TypeError("baseUrl must be an absolute URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("baseUrl must use HTTP or HTTPS");
  }
  url.hash = "";
  if (page === 1) url.searchParams.delete(pageParam);
  else url.searchParams.set(pageParam, String(page));
  return url.href;
}

/** Form canonical self/first/prev/next/last navigation for one collection page. */
export function collectionPageLinks(page, baseUrl, options = {}) {
  if (!page || !Number.isSafeInteger(page.page) || !Number.isSafeInteger(page.totalPages)) {
    throw new TypeError("page must be a pageCollection result");
  }
  const href = (number) => collectionPageUrl(baseUrl, number, options);
  return Object.freeze({
    self: href(page.page),
    first: href(1),
    previous: page.previousPage === null ? null : href(page.previousPage),
    next: page.nextPage === null ? null : href(page.nextPage),
    last: href(page.totalPages),
  });
}

/** Page an ordered collection and attach its canonical web navigation. */
export function paginateWebCollection(items, options) {
  if (!options || typeof options !== "object") {
    throw new TypeError("options with baseUrl are required");
  }
  const page = pageCollection(items, options);
  return Object.freeze({ ...page, links: collectionPageLinks(page, options.baseUrl, options) });
}

/** Serialize page navigation as an RFC 8288 Link field value. */
export function paginationLinkHeader(links) {
  if (!links || typeof links !== "object") throw new TypeError("links are required");
  return linkHeader([
    { href: links.self, rel: "self" },
    { href: links.first, rel: "first" },
    ...(links.previous === null ? [] : [{ href: links.previous, rel: "prev" }]),
    ...(links.next === null ? [] : [{ href: links.next, rel: "next" }]),
    { href: links.last, rel: "last" },
  ]);
}

import { slugify } from "@red-cup-engineering/computer-text-content-engineering-services-section/slugify-text";

function positiveInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
  return value;
}

/** Page an already ordered collection without changing or reordering its items. */
function pageCollection(items, options = {}) {
  const pageSize = positiveInteger(options.pageSize ?? 20, 'pageSize');
  const page = positiveInteger(options.page ?? 1, 'page');
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (page > totalPages) throw new RangeError(`page must be in range 1..${totalPages}`);
  const offset = (page - 1) * pageSize;
  return Object.freeze({
    page,
    pageSize,
    totalPages,
    totalItems,
    offset,
    items: Object.freeze(items.slice(offset, offset + pageSize)),
    isFirst: page === 1,
    isLast: page === totalPages,
    previousPage: page === 1 ? null : page - 1,
    nextPage: page === totalPages ? null : page + 1,
  });
}

const DIMENSIONS = Object.freeze([
  Object.freeze({ name: 'section', field: 'sections', root: 'sections' }),
  Object.freeze({ name: 'tag', field: 'tags', root: 'tags' }),
  Object.freeze({ name: 'type', field: 'type', root: 'types' }),
  Object.freeze({ name: 'status', field: 'status', root: 'statuses' }),
]);

function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} must be a non-empty string`);
  return value.trim();
}

function webBase(value) {
  let url;
  try { url = new URL(value); } catch { throw new TypeError('baseUrl must be an absolute URL'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError('baseUrl must use HTTP or HTTPS');
  url.search = '';
  url.hash = '';
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}

function pageSize(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new RangeError('pageSize must be a positive safe integer');
  return value;
}

function values(value) {
  const list = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
  return [...new Set(list.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()))];
}

export function publicationArchiveSlug(value) {
  return slugify(nonEmpty(value, 'term'));
}

function sectionRoute(term) {
  return term.split('/').map(publicationArchiveSlug).filter(Boolean).join('/');
}

function routeUrl(base, route) {
  return new URL(route ? `${route}/` : './', base).href;
}

function artifactPath(route) {
  return route ? `${route}/index.html` : 'index.html';
}

function item(input, index) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError(`items[${index}] must be an object`);
  return Object.freeze({
    ...input,
    id: nonEmpty(input.id, `items[${index}].id`),
    title: nonEmpty(input.title, `items[${index}].title`),
    sections: Object.freeze(values(input.sections)),
    tags: Object.freeze(values(input.tags)),
    ...(input.type === undefined ? {} : { type: nonEmpty(input.type, `items[${index}].type`) }),
    ...(input.status === undefined ? {} : { status: nonEmpty(input.status, `items[${index}].status`) }),
  });
}

function group(items, dimension) {
  const groups = new Map();
  for (const publication of items) {
    for (const term of values(publication[dimension.field])) {
      const key = dimension.name === 'section' ? sectionRoute(term) : publicationArchiveSlug(term);
      if (!key) continue;
      const termKey = term.toLocaleLowerCase('en-US');
      const groupKey = `${dimension.name}:${termKey}`;
      const current = groups.get(groupKey) ?? { id: groupKey, dimension: dimension.name, key, label: term, items: [] };
      current.items.push(publication);
      groups.set(groupKey, current);
    }
  }
  return [...groups.values()]
    .map((entry) => Object.freeze({ ...entry, items: Object.freeze(entry.items) }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function basePathOf(collection) {
  if (collection.dimension === 'all') return '';
  if (collection.dimension === 'section') return collection.key;
  return `${DIMENSIONS.find(({ name }) => name === collection.dimension).root}/${collection.key}`;
}

function collectionRoutes(collection, base, size) {
  const basePath = basePathOf(collection);
  const first = pageCollection(collection.items, { pageSize: size });
  const pageRoute = (number) => number === 1 ? basePath : [basePath, 'page', number].filter((part) => part !== '').join('/');
  const pageUrl = (number) => routeUrl(base, pageRoute(number));
  const pages = [];
  for (let number = 1; number <= first.totalPages; number++) {
    const page = number === 1 ? first : pageCollection(collection.items, { pageSize: size, page: number });
    const route = pageRoute(number);
    pages.push(Object.freeze({
      kind: 'collection-page',
      owner: collection.id,
      route,
      path: artifactPath(route),
      url: routeUrl(base, route),
      collection,
      page,
      links: Object.freeze({
        self: pageUrl(number), first: pageUrl(1),
        previous: page.previousPage === null ? null : pageUrl(page.previousPage),
        next: page.nextPage === null ? null : pageUrl(page.nextPage),
        last: pageUrl(page.totalPages),
      }),
    }));
  }
  const archiveRoute = [basePath, 'archive'].filter(Boolean).join('/');
  return Object.freeze([
    ...pages,
    Object.freeze({
      kind: 'complete-archive', owner: collection.id, route: archiveRoute,
      path: artifactPath(archiveRoute), url: routeUrl(base, archiveRoute),
      collection, items: collection.items,
    }),
  ]);
}

/** Project already ordered publications; ordering remains the caller's policy. */
export function projectWebPublicationArchives(inputItems, options = {}) {
  if (!Array.isArray(inputItems)) throw new TypeError('items must be an array');
  const base = webBase(options.baseUrl);
  const size = pageSize(options.pageSize ?? 20);
  const items = Object.freeze(inputItems.map(item));
  const diagnostics = [];
  const all = Object.freeze({ id: 'all', dimension: 'all', key: 'all', label: 'All publications', items });
  const grouped = DIMENSIONS.flatMap((dimension) => group(items, dimension));
  const collections = Object.freeze([all, ...grouped]);

  const taxonomyIndexes = Object.freeze(DIMENSIONS.map((dimension) => {
    const terms = grouped.filter(({ dimension: name }) => name === dimension.name)
      .map((collection) => Object.freeze({
        dimension: collection.dimension,
        key: collection.key,
        label: collection.label,
        count: collection.items.length,
        route: basePathOf(collection),
        url: routeUrl(base, basePathOf(collection)),
      }))
      .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
    return Object.freeze({ dimension: dimension.name, route: dimension.root, terms: Object.freeze(terms) });
  }));

  const candidates = [
    ...collections.flatMap((collection) => collectionRoutes(collection, base, size)),
    ...taxonomyIndexes.map((index) => Object.freeze({
      kind: 'taxonomy-index', owner: `${index.dimension}:index`, route: index.route,
      path: artifactPath(index.route), url: routeUrl(base, index.route), index,
    })),
  ];
  const claims = new Map(values(options.reservedPaths).map((path) => [path, 'reserved']));
  // A cell that declares `section-index: true` is the curated index of its own section; the generated one yields.
  const curated = new Set(values(options.curatedPaths));
  const routes = [];
  for (const candidate of candidates) {
    if (curated.has(candidate.path)) continue;
    const prior = claims.get(candidate.path);
    if (prior !== undefined) {
      diagnostics.push(Object.freeze({
        severity: 'error', code: 'WPA-001', subject: candidate.path,
        message: `archive route conflicts with ${prior}`,
        details: Object.freeze({ path: candidate.path, owner: candidate.owner, conflictingOwner: prior }),
      }));
      continue;
    }
    claims.set(candidate.path, candidate.owner);
    routes.push(candidate);
  }

  return Object.freeze({
    type: 'WebPublicationArchiveProjection', version: 1, pageSize: size,
    items, collections, taxonomyIndexes, routes: Object.freeze(routes),
    diagnostics: Object.freeze(diagnostics),
  });
}

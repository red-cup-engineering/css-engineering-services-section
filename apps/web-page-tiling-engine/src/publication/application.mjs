import { makeResolver } from '@red-cup-engineering/knowledge-system-server/catalog';
import { projectWebFeedArtifacts } from '@red-cup-engineering/computer-serialized-content-engineering-services-section/project-web-feed';
import { robots, sitemap } from '@red-cup-engineering/computer-serialized-content-engineering-services-section/web-feed';
import { generateStylesheet } from '@red-cup-engineering/web-theming-service/theming';
import { renderBody } from '@red-cup-engineering/markdown-engineering-services-section/relational-markdown';
import { createTufteApplication } from '../tufte-application.mjs';
import { tuftePublicationFeedItems } from './feeds.mjs';
import {
  renderIndexPage,
  renderNotFoundPage,
  renderPage,
  renderPublicationArchiveRoute,
  renderRedirectPage,
  renderSearchPage,
} from './page.mjs';
import { projectWebPublicationArchives } from './publication-archives.mjs';
import { routeName } from './route-naming.mjs';
import { renderAtlasPage, renderNeighborhoodPage } from './tiles.mjs';

const PROJECTORS = Object.freeze([
  Object.freeze({ group: 'archives', name: 'victor-publication-archives', priority: 5 }),
  Object.freeze({ group: 'pages', name: 'victor-page-tree', priority: 10 }),
  Object.freeze({ group: 'tiles', name: 'victor-tufte', priority: 20 }),
  Object.freeze({ group: 'theme', name: 'victor-theme', priority: 30 }),
  Object.freeze({ group: 'feeds', name: 'victor-feeds', priority: 40 }),
  Object.freeze({ group: 'discovery', name: 'victor-discovery', priority: 50 }),
  Object.freeze({ group: 'search', name: 'victor-search-page', priority: 55 }),
  Object.freeze({ group: 'redirects', name: 'victor-redirects', priority: 60 }),
]);

function artifactRoute({ path, source, group, render, mediaType, status = 200 }) {
  const match = path === 'index.html' ? '/' : path.endsWith('/index.html')
    ? `/${path.slice(0, -'index.html'.length)}`
    : `/${path}`;
  return Object.freeze({
    path, match, source, group, render, mediaType, status,
    load: () => new Response(render(), {
      status,
      headers: { 'content-type': mediaType ?? (path.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream') },
    }),
  });
}

function publicationArchiveItem(cell) {
  const parents = cell.name.split('/').slice(0, -1);
  return Object.freeze({
    id: cell.name,
    title: cell.title,
    summary: cell.summary,
    published: cell.dateCreated,
    sections: Object.freeze(parents.map((_, index) => parents.slice(0, index + 1).join('/'))),
    tags: Object.freeze([...cell.tags]),
    type: cell.type,
    status: cell.status,
    address: cell.address,
  });
}

function reservedArchivePaths(catalog, published, tilesEnabled) {
  return [
    ...(tilesEnabled ? ['atlas/index.html'] : []),
    '404.html',
    ...published.flatMap((cell) => [
      `${cell.name}/index.html`,
      ...(tilesEnabled ? [`${cell.name}/neighborhood/index.html`] : []),
    ]),
    ...[...catalog.redirects.keys()].map((name) => `${name}/index.html`),
  ];
}

function searchRuntimeHref(search) {
  const path = search && typeof search === 'object' && typeof search.runtimePath === 'string'
    ? search.runtimePath
    : 'search/search.mjs';
  if (!path || path.startsWith('/') || path.includes('\\') || path.split('/').some((part) => !part || part === '.' || part === '..')) {
    return '/search/search.mjs';
  }
  return `/${path}`;
}

function publicationState(catalog, site, options) {
  const home = options.home ?? site.home ?? true;
  const drafts = options.drafts ?? false;
  const tilesEnabled = (options.tufte ?? site.tufte) !== false;
  const search = options.search ?? site.search ?? {};
  const archives = options.archives ?? site.archives ?? { enabled: false, pageSize: 20 };
  const discovery = options.discovery ?? site.discovery ?? {};
  const published = [...catalog.cells.values()]
    .filter((cell) => drafts || cell.status !== 'potential')
    .sort((a, b) => (b.dateCreated ?? '').localeCompare(a.dateCreated ?? '') || a.name.localeCompare(b.name));
  const indexItems = published.filter((cell) => cell.type !== 'chapter');
  const homeCell = typeof home === 'string' ? published.find((cell) => cell.name === home) : undefined;
  const resolve = makeResolver(catalog.cells, catalog.redirects, { homeName: homeCell?.name, routeName });
  const publicationArchives = archives.enabled
    ? projectWebPublicationArchives(indexItems.filter((cell) => cell.dateCreated).map(publicationArchiveItem), {
      baseUrl: site.baseIri,
      pageSize: archives.pageSize,
      reservedPaths: reservedArchivePaths(catalog, published, tilesEnabled),
      curatedPaths: published.filter((cell) => cell.frontMatter?.['section-index'] === true).map((cell) => `${cell.name}/index.html`),
    })
    : null;
  const updated = published[0]?.dateCreated ? `${published[0].dateCreated}T00:00:00Z` : '1970-01-01T00:00:00Z';
  return Object.freeze({
    catalog, site, home, homeCell, resolve, discovery, publicationArchives,
    published: Object.freeze(published), indexItems: Object.freeze(indexItems), updated,
    searchEnabled: search !== false, searchRuntimeHref: searchRuntimeHref(search),
    tufteEnabled: tilesEnabled,
    renderCell: (cell) => renderBody(cell.parsed, { resolve }),
  });
}

function publicationRoutes(context, theme) {
  const { catalog, site, home, homeCell, resolve, discovery, publicationArchives, published, indexItems, searchEnabled, searchRuntimeHref, tufteEnabled, updated } = context;
  const routes = [];
  const add = (route) => routes.push(artifactRoute(route));

  for (const route of publicationArchives?.routes ?? []) {
    if (home !== true && route.path === 'index.html') continue;
    add({
      path: route.path, group: 'archives', source: `archive:${route.owner}`,
      render: () => renderPublicationArchiveRoute(route, { site, searchEnabled, discovery, chaptersByPaper: catalog.chaptersByPaper, homeName: homeCell?.name }),
    });
  }
  if (homeCell) add({
    path: 'index.html', group: 'pages', source: homeCell.address,
    render: () => renderPage(homeCell, { site, cells: catalog.cells, incoming: catalog.incoming, resolve, searchEnabled, tufteEnabled, discovery, canonicalUrl: site.baseIri }),
  });
  if (home === true && publicationArchives === null) add({
    path: 'index.html', group: 'pages', source: 'catalog:index',
    render: () => renderIndexPage(indexItems, { site, searchEnabled, discovery, chaptersByPaper: catalog.chaptersByPaper }),
  });
  for (const cell of published) add({
    path: `${cell.name}/index.html`, group: 'pages', source: cell.address,
    render: () => cell === homeCell
      ? renderRedirectPage(cell.name, '', { site })
      : renderPage(cell, { site, cells: catalog.cells, incoming: catalog.incoming, resolve, searchEnabled, tufteEnabled, discovery }),
  });
  if (tufteEnabled) {
    add({ path: 'atlas/index.html', group: 'tiles', source: 'catalog:atlas', render: () => renderAtlasPage(published, { site, discovery, homeName: homeCell?.name }) });
    for (const cell of published) add({
      path: `${cell.name}/neighborhood/index.html`, group: 'tiles', source: cell.address,
      render: () => renderNeighborhoodPage(cell, { site, cells: catalog.cells, incoming: catalog.incoming, discovery, homeName: homeCell?.name }),
    });
  }
  add({ path: 'styles.css', group: 'theme', source: 'site:theme', mediaType: 'text/css; charset=utf-8', render: () => generateStylesheet(theme) });

  const feedProjection = projectWebFeedArtifacts({
    channel: {
      title: site.name, homePageUrl: site.baseIri,
      ...(site.description ? { description: site.description } : {}),
      ...(site.language ? { language: site.language } : {}),
    },
    items: tuftePublicationFeedItems(published, { site, resolve, homeName: homeCell?.name }),
    updated,
  });
  for (const artifact of feedProjection.artifacts) add({ ...artifact, group: 'feeds', source: 'catalog:published', render: () => artifact.body });

  const archivePaths = publicationArchives?.routes.filter(({ route }) => route !== '').map(({ route }) => `${route}/`) ?? [];
  add({
    path: 'sitemap.xml', group: 'discovery', source: 'catalog:published', mediaType: 'application/xml; charset=utf-8',
    render: () => sitemap(['', ...published.filter((cell) => cell !== homeCell).map((cell) => `${cell.name}/`), ...(tufteEnabled ? ['atlas/', ...published.map((cell) => `${cell.name}/neighborhood/`)] : []), ...archivePaths].map((path) => ({ loc: new URL(path, site.baseIri).href }))),
  });
  add({ path: 'robots.txt', group: 'discovery', source: 'site:discovery', mediaType: 'text/plain; charset=utf-8', render: () => robots(new URL('sitemap.xml', site.baseIri).href) });
  add({ path: '404.html', group: 'discovery', source: 'site:not-found', status: 404, render: () => renderNotFoundPage({ site }) });
  if (searchEnabled) add({ path: 'search/index.html', group: 'search', source: 'site:search', render: () => renderSearchPage({ site, runtimeHref: searchRuntimeHref, discovery }) });
  for (const [from, to] of catalog.redirects) add({
    path: `${from}/index.html`, group: 'redirects', source: `redirect:${from}->${to}`,
    render: () => renderRedirectPage(from, to === homeCell?.name ? '' : to, { site }),
  });
  add({
    path: 'redirects.json', group: 'redirects', source: 'catalog:redirects', mediaType: 'application/json; charset=utf-8',
    render: () => `${JSON.stringify(Object.fromEntries(catalog.redirects), null, 2)}\n`,
  });
  return Object.freeze(routes);
}

function routeProjectors(routes, publicationArchives) {
  return Object.freeze(PROJECTORS.map(({ group, name, priority }) => Object.freeze({
    name,
    priority,
    project() {
      return {
        artifacts: routes.filter((route) => route.group === group).map((route) => ({
          path: route.path,
          body: route.render(),
          source: route.source,
          ...(route.mediaType === undefined ? {} : { mediaType: route.mediaType }),
        })),
        diagnostics: group === 'archives' ? publicationArchives?.diagnostics ?? [] : [],
      };
    },
  })));
}

/**
 * Form the TUFTE publication application for one admitted CAIRN catalog and
 * site description. The same declared route renderers serve live requests and
 * supply static artifacts to a publisher.
 */
export function createTuftePublicationApplication({ catalog, site, theme, ...options } = {}) {
  if (!(catalog?.cells instanceof Map) || !(catalog?.redirects instanceof Map)) {
    throw new TypeError('A TUFTE publication application requires a CAIRN catalog');
  }
  if (!site || typeof site !== 'object' || typeof site.name !== 'string' || typeof site.baseIri !== 'string') {
    throw new TypeError('A TUFTE publication application requires a site description');
  }
  const context = publicationState(catalog, site, options);
  const routes = publicationRoutes(context, theme ?? site.theme);
  const pages = routes.filter((route) => route.path.endsWith('.html')).map((route) => ({ match: route.match, load: route.load }));
  const resources = routes.filter((route) => !route.path.endsWith('.html')).map((route) => ({ match: route.match, methods: ['GET'], handler: route.load }));
  const application = createTufteApplication({ pages, resources, enhance: false });
  return Object.freeze({
    ...application,
    publicationContext: context,
    publicationRoutes: routes,
    publicationProjectors: routeProjectors(routes, context.publicationArchives),
  });
}

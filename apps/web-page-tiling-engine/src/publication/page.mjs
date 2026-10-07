// The page projection: one cell -> one complete page with the full anatomy.
// Masthead (header), breadcrumb (nav), spine (main), reservoir (aside), colophon (footer).

import { html, raw } from '@red-cup-engineering/html-engineering-services-section/html-template';
import { renderBody, tocOf } from '@red-cup-engineering/markdown-engineering-services-section/relational-markdown';
import { formatReferenceEntry, schemaOrgCitation } from '@red-cup-engineering/csl-json-services-section/record-formatting';
import { socialMetaTags } from '@red-cup-engineering/html-engineering-services-section/page-metadata';
import { schemaTypeOfNote } from '@red-cup-engineering/rdf-data-model-services-section/schema-org';
import { renderTufteDocument } from '../tufte-rendering.mjs';

export function renderPage(cell, { site, cells, incoming, resolve, searchEnabled = true, tufteEnabled = true, discovery = {}, canonicalUrl = `${site.baseIri}${cell.name}/` }) {
  const backlinks = groupBy(incoming.get(cell.name) || [], (r) => r.type);
  // Tile ids and their title ids belong to the shell; a body heading never claims one.
  const tileIds = ['catalog-cell', 'contents', 'explore', 'tags', ...Object.keys(backlinks).map((type) => `backlinks-${type}`)];
  const reservedIds = tileIds.flatMap((id) => [id, `${id}-title`]);
  const bodyHtml = renderBody(cell.parsed, { resolve, reservedIds });
  const toc = tocOf(cell.parsed, { reservedIds });
  const jsonLd = pageJsonLd(cell, site, canonicalUrl);
  const social = socialMeta({
    title: cell.title, type: 'article', url: canonicalUrl,
    description: cell.summary, image: resolveSocialImage(cell.frontMatter?.image, site.baseIri),
  });

  const article = html`<article class="h-entry" data-pagefind-body data-cell-type="${cell.type}" data-cell-status="${cell.status}">
  <data class="u-url" value="${canonicalUrl}"></data>
  ${cell.firstPublishedAt ? renderRepublication(cell) : html`<time class="dt-published" datetime="${cell.dateCreated}"></time>`}
  ${cell.status === 'absurd' ? html`<aside class="callout callout-caution"><p class="callout-label">Retracted</p><p>This cell is retracted. It remains published because nothing here is deleted.</p></aside>` : ''}
  ${raw(bodyHtml)}
  ${cell.parsed.citations.length ? renderReferenceList(cell.parsed.citations) : ''}
</article>`;
  const tiles = [
    { id: 'catalog-cell', title: site.cellLabel ?? 'Publication', role: 'now', span: 8, html: String(article) },
    ...(toc.length >= 3 ? [{ id: 'contents', title: 'Contents', role: 'aside', span: 4, html: String(html`<nav aria-label="Contents"><ol>${toc.map((heading) => html`<li><a href="#${heading.id}">${heading.text}</a></li>`)}</ol></nav>`) }] : []),
    ...(tufteEnabled || searchEnabled ? [{ id: 'explore', title: 'Explore', role: 'aside', span: 4, html: String(html`<nav aria-label="Explore"><ul>${tufteEnabled ? html`<li><a href="/${cell.name}/neighborhood/">Neighborhood</a></li><li><a href="/atlas/">Atlas</a></li>` : ''}${searchEnabled ? html`<li><a href="/search/">Search</a></li>` : ''}</ul></nav>`) }] : []),
    ...Object.entries(backlinks).map(([type, refs]) => ({ id: `backlinks-${type}`, title: backlinkLabel(type), role: 'aside', span: 4, html: String(html`<ul>${refs.map((reference) => html`<li><a href="${resolve(reference.from)?.href ?? `/${reference.from}/`}">${cells.get(reference.from).title}</a></li>`)}</ul>`) })),
    ...(cell.tags.length ? [{ id: 'tags', title: 'Tagged', role: 'aside', span: 4, html: String(html`<ul>${cell.tags.map((tag) => html`<li>${tag}</li>`)}</ul>`) }] : []),
  ];
  let currentMenuLink = false;
  const navigation = site.menu.map((link) => {
    let current = false;
    try {
      current = !currentMenuLink && new URL(link.href, site.baseIri).href === new URL(canonicalUrl, site.baseIri).href;
    } catch { /* malformed menu URLs are not current */ }
    if (current) currentMenuLink = true;
    return { ...link, current };
  });
  return renderTufteDocument({
    eyebrow: cell.eyebrow || cell.frontMatter?.eyebrow || site.eyebrow || cell.type,
    title: cell.title,
    subtitle: cell.summary,
    navigation: [...navigation, ...(searchEnabled ? [{ href: '/search/', label: 'Search' }] : [])],
    tiles,
    footerHtml: String(html`<p>${site.showRecordMetadata !== false ? html`${cell.dateCreated ? html`Created ${cell.dateCreated} · ` : ''}status ${cell.status} · ${cell.address} · ` : ''}${site.license}</p>`),
  }, {
    documentTitle: documentTitleOf(cell, site, canonicalUrl),
    language: site.language,
    styles: site.tufteStyles,
    theme: site.tufteTheme,
    headHtml: String(html`${cell.summary ? html`<meta name="description" content="${cell.summary}">` : ''}<link rel="canonical" href="${canonicalUrl}">${social}${discoveryLinks(discovery)}<script type="application/ld+json">${raw(JSON.stringify(jsonLd))}</script>`),
  }).replace('<h1>', '<h1 class="p-name">');
}

export function renderIndexPage(cellsSorted, { site, searchEnabled = true, discovery = {}, chaptersByPaper = new Map() }) {
  const social = socialMeta({ title: site.name, type: 'website', url: site.baseIri });
  const listing = html`<div data-pagefind-body><p class="listing-order">Ordered by date created, newest first.</p><ul class="listing">${cellsSorted.map((cell) => html`<li><a href="/${cell.name}/">${cell.title}</a> <span class="listing-order">${cell.dateCreated ? html`${cell.dateCreated} · ` : ''}${cell.type}</span>${cell.summary ? html`<br />${cell.summary}` : ''}${renderChapterLinks(chaptersByPaper.get(cell.name))}</li>`)}</ul></div>`;
  return renderTufteDocument({
    eyebrow: 'publication index', title: site.name,
    navigation: publicationNavigation(site, searchEnabled),
    tiles: [{ id: 'publication-index', title: 'Publications', role: 'now', span: 12, html: String(listing) }],
    footerHtml: String(html`<p>${site.name} · generated by VICTOR · ${site.license}</p>`),
  }, publicationDocumentOptions(site, site.name, site.baseIri, social, discovery));
}

export function renderPublicationArchiveRoute(route, { site, searchEnabled = true, discovery = {}, chaptersByPaper = new Map(), homeName }) {
  if (route.kind === 'taxonomy-index') return renderTaxonomyIndex(route, site, searchEnabled, discovery);
  const complete = route.kind === 'complete-archive';
  const items = complete ? route.items : route.page.items;
  const collection = route.collection;
  const title = collection.dimension === 'all'
    ? (complete ? 'Complete archive' : site.name)
    : `${collection.label} ${collection.dimension}`;
  const suffix = !complete && route.page.totalPages > 1 ? ` — page ${route.page.page}` : '';
  const links = complete ? null : route.links;
  const previousLink = archivePageLink(links?.previous, homeName);
  const nextLink = archivePageLink(links?.next, homeName);
  const social = socialMeta({ title: `${title}${suffix}`, type: 'website', url: route.url });
  const body = html`<div data-pagefind-body><p class="listing-order">Ordered by date created, newest first. ${complete ? `All ${items.length} publications are shown on this page.` : `Page ${route.page.page} of ${route.page.totalPages}; ${route.page.totalItems} publications total.`}</p><ul class="listing">${items.map((item) => html`<li><a href="${item.id === homeName ? '/' : `/${item.id}/`}">${item.title}</a> <span class="listing-order">${item.published ?? ''}${item.type ? ` · ${item.type}` : ''}</span>${item.summary ? html`<br />${item.summary}` : ''}${renderChapterLinks(chaptersByPaper.get(item.id), homeName)}</li>`)}</ul>${complete && !(homeName && route.collection.dimension === 'all') ? html`<p><a href="${route.collection.dimension === 'all' ? '/' : `/${archiveCollectionBase(route.collection)}/`}">Return to the paged index</a>.</p>` : complete ? '' : renderPagination(route, homeName)}</div>`;
  const documentTitle = `${title}${suffix}${collection.dimension === 'all' && !complete ? '' : ` — ${site.name}`}`;
  const relations = `${previousLink ? String(html`<link rel="prev" href="${previousLink}">`) : ''}${nextLink ? String(html`<link rel="next" href="${nextLink}">`) : ''}`;
  return renderTufteDocument({
    eyebrow: complete ? 'complete archive' : collection.dimension === 'all' ? 'publication index' : `${collection.dimension} archive`,
    title: `${title}${suffix}`, navigation: publicationNavigation(site, searchEnabled),
    tiles: [{ id: 'publication-archive', title: 'Publications', role: 'now', span: 12, html: String(body) }],
    footerHtml: String(html`<p>${site.name} · generated by VICTOR · ${site.license}</p>`),
  }, publicationDocumentOptions(site, documentTitle, route.url, `${social}${relations}`, discovery));
}

function renderPagination(route, homeName) {
  const base = archiveCollectionBase(route.collection);
  const archiveHref = base ? `/${base}/archive/` : '/archive/';
  const previousLink = archivePageLink(route.links.previous, homeName);
  const nextLink = archivePageLink(route.links.next, homeName);
  return html`<nav class="pagination" aria-label="Archive pages">
    ${previousLink ? html`<a rel="prev" href="${new URL(previousLink).pathname}">Previous</a>` : ''}
    <span>Page ${route.page.page} of ${route.page.totalPages}</span>
    ${nextLink ? html`<a rel="next" href="${new URL(nextLink).pathname}">Next</a>` : ''}
    <a href="${archiveHref}">Complete archive</a>
  </nav>`;
}

function archivePageLink(href, homeName) {
  if (!href || (homeName && new URL(href).pathname === '/')) return null;
  return href;
}

function archiveCollectionBase(collection) {
  if (collection.dimension === 'all') return '';
  if (collection.dimension === 'section') return collection.key;
  return `${{ tag: 'tags', type: 'types', status: 'statuses' }[collection.dimension]}/${collection.key}`;
}

function renderTaxonomyIndex(route, site, searchEnabled, discovery) {
  const title = `${route.index.dimension[0].toUpperCase()}${route.index.dimension.slice(1)} archives`;
  const social = socialMeta({ title, type: 'website', url: route.url });
  const body = html`<p class="listing-order">Ordered by publication count, then term.</p><ul class="listing">${route.index.terms.map((term) => html`<li><a href="/${term.route}/">${term.label}</a> <span class="listing-order">${term.count}</span></li>`)}</ul>`;
  return renderTufteDocument({
    eyebrow: 'taxonomy', title, navigation: publicationNavigation(site, searchEnabled),
    tiles: [{ id: 'taxonomy-archive', title: 'Terms', role: 'now', span: 12, html: String(body) }],
    footerHtml: String(html`<p>${site.name} · generated by VICTOR · ${site.license}</p>`),
  }, publicationDocumentOptions(site, `${title} — ${site.name}`, route.url, social, discovery));
}

export function renderSearchPage({ site, runtimeHref = '/search/search.mjs', discovery = {} }) {
  const moduleSpecifier = JSON.stringify(runtimeHref).replace(/</gu, '\\u003c');
  const script = `
import { createSearchClient } from ${moduleSpecifier};
const form = document.querySelector('[data-search-form]');
const input = document.querySelector('[data-search-input]');
const status = document.querySelector('[data-search-status]');
const results = document.querySelector('[data-search-results]');
const search = createSearchClient();
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const query = input.value.trim();
  results.replaceChildren();
  if (!query) { status.textContent = 'Enter a search term.'; return; }
  status.textContent = 'Searching…';
  try {
    const matches = await search(query);
    status.textContent = matches.length === 1 ? '1 result' : matches.length + ' results';
    for (const match of matches) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = match.url;
      link.textContent = match.title;
      item.append(link);
      if (match.excerpt) { const summary = document.createElement('p'); summary.textContent = match.excerpt; item.append(summary); }
      results.append(item);
    }
  } catch { status.textContent = 'Search is temporarily unavailable.'; }
});`;
  const social = socialMeta({ title: `Search — ${site.name}`, type: 'website', url: new URL('search/', site.baseIri).href });
  const body = '<form data-search-form role="search"><label for="site-search">Search this site</label><input id="site-search" data-search-input name="q" type="search" autocomplete="off"><button type="submit">Search</button></form><p data-search-status aria-live="polite">Enter a search term.</p><ol class="listing" data-search-results></ol>';
  const url = new URL('search/', site.baseIri).href;
  return renderTufteDocument({
    metadata: { robots: 'noindex' }, eyebrow: 'site search', title: 'Search',
    navigation: publicationNavigation(site, true),
    tiles: [{ id: 'search-page', title: 'Search this site', role: 'now', span: 12, html: body }],
    footerHtml: String(html`<p>${site.name} · generated by VICTOR · ${site.license}</p>`),
  }, { ...publicationDocumentOptions(site, `Search — ${site.name}`, url, social, discovery), clientScript: script });
}

function discoveryLinks(discovery) {
  return html`<link rel="alternate" type="application/rss+xml" title="RSS" href="/feed.rss.xml" />
<link rel="alternate" type="application/atom+xml" title="Atom" href="/feed.atom.xml" />
<link rel="alternate" type="application/feed+json" title="JSON Feed" href="/feed.json" />
${discovery.webmention ? html`<link rel="webmention" href="${discovery.webmention}" />` : ''}
${discovery.micropub ? html`<link rel="micropub" href="${discovery.micropub}" />` : ''}
${discovery.indieauthMetadata ? html`<link rel="indieauth-metadata" href="${discovery.indieauthMetadata}" />` : ''}
${(discovery.me ?? []).map((href) => html`<link rel="me" href="${href}" />`)}`;
}

function publicationNavigation(site, searchEnabled) {
  return [
    ...site.menu.map(({ href, label }) => ({ href, label })),
    ...(searchEnabled ? [{ href: '/search/', label: 'Search' }] : []),
  ];
}

function publicationDocumentOptions(site, documentTitle, canonicalUrl, social, discovery) {
  return {
    documentTitle,
    language: site.language,
    styles: site.tufteStyles,
    theme: site.tufteTheme,
    stylesheets: [{ href: '/styles.css' }],
    headHtml: String(html`<link rel="canonical" href="${canonicalUrl}">${raw(String(social))}${discoveryLinks(discovery)}`),
  };
}

export function renderNotFoundPage({ site }) {
  return renderTufteDocument({
    metadata: { robots: 'noindex' },
    eyebrow: '404',
    title: 'Page not found',
    navigation: site.menu.map(({ href, label }) => ({ href, label })),
    mastheadHtml: String(html`<a href="/">${site.name}</a>`),
    tiles: [{
      id: 'not-found', title: 'Not found', role: 'now', span: 12,
      html: String(html`<p>The requested page does not exist. Return to the <a href="/">site index</a>.</p>`),
    }],
    footerHtml: String(html`<p>${site.name} · ${site.license}</p>`),
  }, {
    documentTitle: `Page not found — ${site.name}`,
    language: site.language,
    styles: site.tufteStyles,
    theme: site.tufteTheme,
  });
}

export function renderRedirectPage(from, to, { site }) {
  const target = new URL(to ? `${to}/` : '/', site.baseIri).href;
  return renderTufteDocument({
    metadata: { robots: 'noindex' }, eyebrow: 'redirect', title: 'This page moved',
    tiles: [{ id: 'redirect', title: 'New location', role: 'now', span: 12, html: String(html`<p><a href="${target}">${from}</a> now lives at ${to || 'the home page'}.</p>`) }],
  }, {
    documentTitle: `Moved — ${site.name}`, language: site.language,
    styles: site.tufteStyles, theme: site.tufteTheme,
    headHtml: String(html`<meta http-equiv="refresh" content="0; url=${target}"><link rel="canonical" href="${target}">`),
  });
}


// The reference list a page's citations resolve to, in citation order.
function renderReferenceList(citations) {
  return html`<section class="reference-list" aria-label="References">
  <h2>References</h2>
  <ul>${citations.map((c) => html`<li id="ref-${c.key}">${raw(formatReferenceEntry(c.reference))}</li>`)}</ul>
</section>`;
}

// A paper listing entry's ordered chapter links, when it has any.
function renderChapterLinks(chapters, homeName) {
  if (!chapters || !chapters.length) return '';
  return html`<p class="listing-order">Chapters, in order.</p><ol class="chapter-list">${chapters.map((c) => html`<li><a href="${c.name === homeName ? '/' : `/${c.name}/`}">${c.title}</a></li>`)}</ol>`;
}

// The <title>: an explicit `page-title` wins; the home page does not repeat the site name after itself.
function documentTitleOf(cell, site, canonicalUrl) {
  const explicit = cell.frontMatter?.['page-title'];
  if (typeof explicit === 'string' && explicit.trim() !== '') return explicit.trim();
  return cell.title === site.name || canonicalUrl === site.baseIri && cell.title.includes(site.name)
    ? cell.title : `${cell.title} — ${site.name}`;
}

// A cell may declare itself a profile page with `profile-name` in its front matter: the page is then a
// schema.org ProfilePage whose main entity is that Person (Google's author / "About Me" page shape).
function profileEntity(cell, pageUrl) {
  const name = cell.frontMatter?.['profile-name'];
  return typeof name === 'string' && name.trim() !== ''
    ? { '@id': `${pageUrl}#person`, '@type': 'Person', name: name.trim(), url: pageUrl }
    : null;
}

function pageJsonLd(cell, site, pageUrl = `${site.baseIri}${cell.name}/`) {
  const profile = profileEntity(cell, pageUrl);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@id': site.baseIri, '@type': 'WebSite', name: site.name },
      {
        '@id': pageUrl,
        '@type': profile ? 'ProfilePage' : schemaTypeOfNote(cell.type),
        ...(profile ? { mainEntity: { '@id': profile['@id'] } } : {}),
        headline: cell.title,
        datePublished: cell.dateCreated || undefined,
        dateModified: cell.republished || undefined,
        isBasedOn: cell.firstPublishedAt || undefined,
        archivedAt: cell.archivedAt || undefined,
        keywords: cell.tags.join(', ') || undefined,
        description: cell.summary || undefined,
        ...(pageUrl === site.baseIri ? {} : { isPartOf: { '@id': site.baseIri } }),
        identifier: cell.address,
        alternateName: cell.aliases?.length ? [...cell.aliases] : undefined,
        citation: cell.parsed?.citations?.length ? cell.parsed.citations.map((c) => schemaOrgCitation(c.reference)) : undefined,
      },
      ...(profile ? [profile] : []),
    ],
  };
}

function renderRepublication(cell) {
  let host;
  try { host = new URL(cell.firstPublishedAt).host; } catch { host = cell.firstPublishedAt; }
  return html`<p class="publication-history">First published <time class="dt-published" datetime="${cell.dateCreated}">${formatDate(cell.dateCreated)}</time> at <a class="u-url" href="${cell.firstPublishedAt}">${host}</a>${cell.archivedAt ? html` (<a href="${cell.archivedAt}">archived copy</a>)` : ''}; republished here <time class="dt-updated" datetime="${cell.republished}">${formatDate(cell.republished)}</time></p>`;
}

function formatDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${day} ${months[month - 1]} ${year}`;
}

// OpenGraph + Twitter-card meta, derived from the same title/summary/image
// data every projection already reads off the cell or the site config.
function socialMeta({ title, type, url, description, image }) {
  return raw(socialMetaTags({ title, type, url, description, image }));
}

function resolveSocialImage(image, baseIri) {
  if (!image || typeof image !== 'string') return undefined;
  try {
    return new URL(image, baseIri).href;
  } catch {
    return undefined;
  }
}

function backlinkLabel(type) {
  return { links: 'Linked from', cites: 'Cited by', transcludes: 'Transcluded by', 'part-of': 'Chapters' }[type] || `Related by ${type}`;
}

function groupBy(items, keyOf) {
  const out = {};
  for (const item of items) (out[keyOf(item)] ??= []).push(item);
  return out;
}

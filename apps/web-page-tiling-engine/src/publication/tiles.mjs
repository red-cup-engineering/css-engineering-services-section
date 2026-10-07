import { renderTufteDocument } from '../tufte-rendering.mjs';
import { slugify } from '@red-cup-engineering/computer-text-content-engineering-services-section/slugify-text';
import { escapeHtml } from '@red-cup-engineering/html-engineering-services-section/html-template';
import { resolveName } from '@red-cup-engineering/knowledge-system-server/catalog';
import { routeName } from './route-naming.mjs';

function tileId(name) {
  return `cell-${slugify(name) || 'home'}`;
}

function pageHref(name, homeName) {
  return name === homeName ? '/' : `/${name}/`;
}

function cellTile(cell, { relation, direction, current = false, homeName } = {}) {
  const label = relation ? `${direction} · ${relation}` : cell.type;
  const summary = cell.summary ? `<p>${escapeHtml(cell.summary)}</p>` : '';
  return {
    id: tileId(cell.name),
    title: cell.title,
    eyebrow: label,
    role: current ? 'now' : 'standard',
    span: current ? 8 : 4,
    html: `${summary}<p><a href="${escapeHtml(pageHref(cell.name, homeName))}">Open page</a></p>`,
  };
}

function documentOptions(site, path, title, discovery = {}) {
  const canonical = new URL(path, site.baseIri).href;
  const protocolLinks = [
    ['webmention', discovery.webmention],
    ['micropub', discovery.micropub],
    ['indieauth-metadata', discovery.indieauthMetadata],
    ...(discovery.me ?? []).map((href) => ['me', href]),
  ].filter(([, href]) => href).map(([rel, href]) => `<link rel="${rel}" href="${escapeHtml(href)}">`).join('');
  return {
    documentTitle: `${title} — ${site.name}`,
    language: site.language,
    styles: site.tufteStyles,
    headHtml: `<link rel="canonical" href="${escapeHtml(canonical)}"><link rel="alternate" type="application/rss+xml" title="RSS" href="/feed.rss.xml"><link rel="alternate" type="application/atom+xml" title="Atom" href="/feed.atom.xml"><link rel="alternate" type="application/feed+json" title="JSON Feed" href="/feed.json">${protocolLinks}`,
  };
}

export function renderAtlasPage(cellsSorted, { site, discovery, homeName }) {
  return renderTufteDocument({
    eyebrow: site.name,
    title: 'Atlas',
    subtitle: 'Ordered by date created, newest first.',
    navigation: [...site.menu],
    tiles: cellsSorted.map((cell) => cellTile(cell, { homeName })),
    footerHtml: `<nav aria-label="Return"><a href="/">Return to ${escapeHtml(site.name)}</a></nav><p>${escapeHtml(site.license)}</p>`,
  }, documentOptions(site, 'atlas/', 'Atlas', discovery));
}

export function renderNeighborhoodPage(cell, { site, cells, incoming, discovery, homeName }) {
  const related = [];
  const seen = new Set([cell.name]);

  for (const relation of cell.relations) {
    if (relation.literal) continue;
    const name = resolveName(cells, relation.to, new Map(), { routeName });
    if (!name || seen.has(name)) continue;
    seen.add(name);
    related.push(cellTile(cells.get(name), { relation: relation.type, direction: 'outgoing', homeName }));
  }

  for (const relation of incoming.get(cell.name) || []) {
    if (seen.has(relation.from)) continue;
    seen.add(relation.from);
    related.push(cellTile(cells.get(relation.from), { relation: relation.type, direction: 'incoming', homeName }));
  }

  return renderTufteDocument({
    eyebrow: site.name,
    title: `${cell.title} neighborhood`,
    subtitle: 'The current page first, followed by its outgoing and incoming relations.',
    navigation: [...site.menu],
    tiles: [cellTile(cell, { current: true, homeName }), ...related],
    footerHtml: `<nav aria-label="Return"><a href="${escapeHtml(pageHref(cell.name, homeName))}">Return to ${escapeHtml(cell.title)}</a> · <a href="/atlas/">Open atlas</a></nav>`,
  }, documentOptions(site, `${cell.name}/neighborhood/`, `${cell.title} neighborhood`, discovery));
}

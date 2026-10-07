import { admitTufteUrl, normalizeTufteForm, renderTufteForm } from './tufte-browser.mjs';
import { composeTufteTile, htmlElement as element, htmlFragment } from './tufte-composition.mjs';

export const STOREFRONT_STYLES = `.tufte-tile:has(.tufte-storefront-item)>header h2{font-size:1.05rem;letter-spacing:normal;text-transform:none;color:var(--tufte-ink)}#storefront-results .tufte-tile-body:empty{display:none}.tufte-storefront-item{display:grid;gap:1rem;min-width:0}.tufte-storefront-item :is(p,dd,li,code){overflow-wrap:anywhere}.tufte-storefront-item>p{margin:0}.tufte-storefront-item img{display:block;width:100%;max-height:20rem;object-fit:contain;border-radius:.35rem}.tufte-storefront-illustration{display:flex;align-items:center;justify-content:center;min-height:6rem}.tufte-storefront-illustration svg{width:5rem;height:5rem}.tufte-storefront-item dl{display:grid;grid-template-columns:auto 1fr;gap:.4rem 1rem;margin:0}.tufte-storefront-item dd{margin:0}.tufte-storefront-keywords{display:flex;gap:.5rem;flex-wrap:wrap;list-style:none;padding:0;margin:0}.tufte-storefront-keywords li{border:1px solid currentColor;border-radius:1rem;padding:.15rem .65rem;font-size:.8rem}.tufte-storefront-actions{display:flex;flex-wrap:wrap;gap:1rem;align-items:center}.tufte-storefront-actions p{margin:0}.tufte-storefront-actions a{display:inline-block;padding:.45rem .7rem;border:1px solid currentColor;border-radius:.3rem;text-decoration:none}.tufte-storefront-actions [aria-disabled=true]{opacity:.7}@media(min-width:800px){#storefront-search form{display:flex;gap:1rem;align-items:end;flex-wrap:wrap}}`;

/** Presentation admission only. Domain producers retain product, price, offer,
 * entitlement and playability semantics and supply their already-decided actions. */
export function admitTufteStorefront(catalog) {
  if (!catalog || typeof catalog.title !== 'string' || !Array.isArray(catalog.items)) throw new TypeError('Storefront requires a title and items');
  const ids = new Set();
  for (const item of catalog.items) {
    if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id) || item.id.startsWith('storefront-') || typeof item.title !== 'string') throw new TypeError('Storefront items require unique IDs and titles outside the storefront- namespace');
    ids.add(item.id);
    if (item.image) admitTufteUrl(item.image.src);
    for (const action of item.actions ?? []) {
      if (action.kind === 'link') admitTufteUrl(action.href);
      else if (action.kind === 'form') normalizeTufteForm(action.form);
      else if (action.kind !== 'unavailable') throw new TypeError('Unsupported storefront action');
    }
  }
  const facets = new Set();
  for (const facet of catalog.facets ?? []) {
    if (!/^[a-z][a-z0-9_-]*$/u.test(facet.key) || facet.key === 'q' || facets.has(facet.key)) throw new TypeError('Storefront facets require unique query keys');
    facets.add(facet.key);
  }
  return catalog;
}

export function storefrontFacetValues(catalog, key) {
  return [...new Set(catalog.items.flatMap(item => item.facets?.[key] ?? []))];
}

/** URL is the sole search/filter state; no second client state machine. */
export function storefrontQuery(catalog, parameters = new URLSearchParams()) {
  admitTufteStorefront(catalog);
  const facets = {};
  for (const { key } of catalog.facets ?? []) {
    const value = parameters.get(key);
    if (value && storefrontFacetValues(catalog, key).includes(value)) facets[key] = value;
  }
  return { term: (parameters.get('q') ?? '').trim(), facets };
}

export function storefrontSearchParams(query) {
  const parameters = new URLSearchParams();
  if (query.term) parameters.set('q', query.term);
  for (const [key, value] of Object.entries(query.facets ?? {})) if (value) parameters.set(key, value);
  return parameters;
}

export function filterStorefrontItems(catalog, query = { term: '', facets: {} }) {
  const term = query.term.toLocaleLowerCase('en-US');
  return catalog.items.filter(item => {
    const words = [item.id, item.title, item.summary ?? '', ...(item.keywords ?? [])].join(' ').toLocaleLowerCase('en-US');
    return words.includes(term) && Object.entries(query.facets).every(([key, value]) => (item.facets?.[key] ?? []).includes(value));
  });
}

function itemNodes(item, detail) {
  const nodes = [];
  if (item.image) nodes.push(element('img', { src: admitTufteUrl(item.image.src), alt: item.image.alt ?? '', loading: 'lazy', decoding: 'async' }));
  if (item.illustration) nodes.push(element('div', { class: 'tufte-storefront-illustration' }, item.illustration));
  if (item.summary) {
    const summary = !detail && item.summary.length > 240 ? `${item.summary.slice(0, 240).replace(/\s+\S*$/u, '')}…` : item.summary;
    nodes.push(element('p', {}, [summary]));
  }
  if (item.status) nodes.push(element('p', {}, [element('strong', {}, [item.status.label]), ...(detail && item.status.note ? [` — ${item.status.note}`] : [])]));
  const facts = item.facts?.filter(fact => detail || !fact.detailOnly) ?? [];
  if (facts.length) nodes.push(element('dl', {}, facts.flatMap(fact => [element('dt', {}, [fact.label]), element('dd', {}, [fact.value])])));
  if (item.keywords?.length) nodes.push(element('ul', { class: 'tufte-storefront-keywords', 'aria-label': 'Keywords' }, (detail ? item.keywords : item.keywords.slice(0, 6)).map(word => element('li', {}, [word]))));
  if (detail && item.detail) nodes.push(...item.detail);
  return nodes;
}

function actionNodes(actions, itemId) {
  return actions.map((action, index) => {
    if (action.kind === 'link') return element('p', {}, [element('a', { href: admitTufteUrl(action.href), ...(action.download ? { download: action.download === true ? '' : action.download } : {}) }, [action.label])]);
    if (action.kind === 'form') return htmlFragment(renderTufteForm(normalizeTufteForm({ ...action.form, id: action.form.id ?? `${itemId}-action-${index + 1}` })));
    return element('p', { 'aria-disabled': 'true' }, [action.label, ...(action.reason ? [` — ${action.reason}`] : [])]);
  });
}

export function storefrontItemTile(item, { detail = false, href } = {}) {
  const nodes = itemNodes(item, detail);
  if (!detail && href) nodes.push(element('p', {}, [element('a', { href: admitTufteUrl(href) }, [`View ${item.title}`])]));
  nodes.push(element('div', { class: 'tufte-storefront-actions' }, actionNodes(item.actions ?? [], item.id)));
  return composeTufteTile([element('div', { class: 'tufte-storefront-item' }, nodes)], { id: item.id, title: item.title, eyebrow: item.eyebrow, span: detail ? 12 : 4 });
}

/** Shared catalog presentation for goods, games and other capability adapters. */
export function storefrontCatalogModel(catalog, { path = '/', itemHref, parameters = new URLSearchParams(), search = true } = {}) {
  admitTufteStorefront(catalog);admitTufteUrl(path);
  const query = storefrontQuery(catalog, parameters);
  const items = filterStorefrontItems(catalog, query);
  const tiles = [];
  if (search) tiles.push({ id: 'storefront-search', title: 'Find an item', span: 12, form: {
    action: path, method: 'get', fields: [{ name: 'q', label: 'Search', kind: 'search', value: query.term },
      ...(catalog.facets ?? []).map(facet => ({ name: facet.key, label: facet.label, kind: 'select', value: query.facets[facet.key] ?? '', options: [
        { value: '', label: `All ${facet.label.toLocaleLowerCase('en-US')}` }, ...storefrontFacetValues(catalog, facet.key).map(value => ({ value, label: facet.labels?.[value] ?? value })),
      ] })),
    ], submitters: [{ label: 'Search' }],
  } });
  tiles.push({ id: 'storefront-results', title: `${items.length} ${items.length === 1 ? 'item' : 'items'}`, span: 12, content: items.length ? undefined : 'No items match these filters.', live: 'polite' });
  tiles.push(...items.map(item => storefrontItemTile(item, { href: itemHref?.(item.id) })));
  return { title: catalog.title, subtitle: catalog.description, eyebrow: catalog.eyebrow, metadata: catalog.metadata, navigation: catalog.navigation, footerHtml: catalog.footerHtml, tiles };
}

/** Missing identity is an explicit result; the application chooses its 404 policy. */
export function storefrontDetailModel(catalog, id, { catalogHref = '/' } = {}) {
  admitTufteStorefront(catalog);admitTufteUrl(catalogHref);
  const item = catalog.items.find(candidate => candidate.id === id);
  if (!item) return null;
  // An item may carry its own page metadata (canonical, image, Open Graph type, structured data).
  return { title: item.title, eyebrow: catalog.title, navigation: catalog.navigation, metadata: { description: item.summary, ...item.metadata }, footerHtml: catalog.footerHtml, tiles: [
    { id: 'storefront-navigation', title: 'Browse', span: 12, links: [{ href: catalogHref, label: `All ${catalog.title}` }] },
    storefrontItemTile(item, { detail: true }),
  ] };
}

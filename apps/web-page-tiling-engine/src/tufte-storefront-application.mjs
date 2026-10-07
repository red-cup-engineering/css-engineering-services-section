import { createTufteApplication, tuftePage } from './tufte-application.mjs';
import { storefrontCatalogModel, storefrontDetailModel, STOREFRONT_STYLES } from './tufte-storefront.mjs';
import { admitTufteUrl } from './tufte-browser.mjs';

/** Compile a storefront's catalog capability and route configuration into TUFTE
 * pages. Effects and additional resources retain the common application contract. */
export function createTufteStorefront({ catalog, path = '/', itemPath = '/items/:id', pages = [], document: documentOptions = {}, ...application } = {}) {
  if (!catalog) throw new TypeError('Storefront requires a catalog capability or display model');
  admitTufteUrl(path);admitTufteUrl(itemPath);
  if (![path, itemPath].every(value => value.startsWith('/') && !/[?#]/u.test(value)) || (itemPath.match(/:[A-Za-z0-9_]+/gu) ?? []).join() !== ':id') throw new TypeError('Storefront itemPath requires one :id parameter');
  const load = typeof catalog === 'function' ? catalog : () => catalog;
  return createTufteApplication({ ...application, document: { ...documentOptions, styles: `${STOREFRONT_STYLES}\n${documentOptions.styles ?? ''}` }, pages: [
    { match: path, load: async context => tuftePage(storefrontCatalogModel(await load(context), {
      path, itemHref: id => itemPath.replace(':id', encodeURIComponent(id)), parameters: context.url.searchParams,
    })) },
    { match: itemPath, load: async context => {
      const model = storefrontDetailModel(await load(context), context.params.id, { catalogHref: path });
      return model ? tuftePage(model) : tuftePage({ title: 'Item not found', tiles: [{ id: 'storefront-navigation', title: 'Browse', links: [{ href: path, label: 'Back to catalog' }] }] }, { status: 404 });
    } },
    ...pages,
  ] });
}

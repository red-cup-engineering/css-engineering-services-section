import type { HtmlNode } from './tufte-composition.mjs';
import type { TufteForm, TufteLink, TufteMetadata, TufteModel, TufteTile } from './tufte-browser.mjs';
/** Pass through the document styles option; the framework applies its CSP nonce. */
export const STOREFRONT_STYLES: string;
/** Display actions are projections of domain capabilities, never offers or entitlements. */
export type StorefrontAction = { kind: 'link'; label: string; href: string; download?: boolean | string } | { kind: 'form'; form: TufteForm } | { kind: 'unavailable'; label: string; reason?: string };
export interface StorefrontItem {
  readonly id: string; readonly title: string; readonly summary?: string; readonly eyebrow?: string;
  readonly image?: { readonly src: string; readonly alt?: string };
  /** Author-controlled leaf graphics/rich content use the shared HTML node contract. */
  readonly illustration?: readonly HtmlNode[]; readonly detail?: readonly HtmlNode[];
  readonly status?: { readonly label: string; readonly note?: string };
  readonly facts?: readonly { readonly label: string; readonly value: string; readonly detailOnly?: boolean }[];
  readonly keywords?: readonly string[]; readonly facets?: Readonly<Record<string, readonly string[]>>;
  readonly actions?: readonly StorefrontAction[];
}
export interface StorefrontFacet { readonly key: string; readonly label: string; readonly labels?: Readonly<Record<string, string>>; }
export interface TufteStorefront { readonly title: string; readonly description?: string; readonly eyebrow?: string; readonly metadata?: TufteMetadata; readonly navigation?: readonly TufteLink[]; readonly items: readonly StorefrontItem[]; readonly facets?: readonly StorefrontFacet[]; }
export interface StorefrontQuery { readonly term: string; readonly facets: Readonly<Record<string, string>>; }
export function admitTufteStorefront(catalog: TufteStorefront): TufteStorefront;
export function storefrontFacetValues(catalog: TufteStorefront, key: string): string[];
export function storefrontQuery(catalog: TufteStorefront, parameters?: URLSearchParams): StorefrontQuery;
export function storefrontSearchParams(query: StorefrontQuery): URLSearchParams;
export function filterStorefrontItems(catalog: TufteStorefront, query?: StorefrontQuery): StorefrontItem[];
export function storefrontItemTile(item: StorefrontItem, options?: { detail?: boolean; href?: string }): TufteTile;
export function storefrontCatalogModel(catalog: TufteStorefront, options?: { path?: string; itemHref?: (id: string) => string; parameters?: URLSearchParams; search?: boolean }): TufteModel;
export function storefrontDetailModel(catalog: TufteStorefront, id: string, options?: { catalogHref?: string }): TufteModel | null;

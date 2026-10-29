export const TUFTE_RUNTIME_PATH: string;
/** Stable, revalidated redirect to the versioned standalone storefront browser module. */
export const TUFTE_STOREFRONT_MODULE_URL: '/_tufte/storefront.mjs';
export interface TufteRuntimeAsset { readonly name: string; readonly path: string; readonly source: string; readonly contentType: 'text/javascript; charset=utf-8'; }
export const TUFTE_RUNTIME_ASSETS: readonly TufteRuntimeAsset[];

import { runtimeVersion, runtimeSources } from '../dist/runtime-assets.mjs';
export const TUFTE_RUNTIME_PATH = `/_tufte/${runtimeVersion}`;
export const TUFTE_STOREFRONT_MODULE_URL = '/_tufte/storefront.mjs';
/** Complete browser assets for the application's resources or a shared artifact adapter. */
export const TUFTE_RUNTIME_ASSETS = Object.freeze(Object.entries(runtimeSources).map(([name, source]) => Object.freeze({ name, path: `${TUFTE_RUNTIME_PATH}/${name}`, source, contentType: 'text/javascript; charset=utf-8' })));

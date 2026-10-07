import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readBrowserModuleClosure, servedBrowserModules } from './browser-modules.mjs';

// The browser runtime is served straight from its own source: these files
// already are the plain ES modules a browser loads, each importing its
// siblings by the same relative specifiers used here (e.g.
// tufte-topology.mjs's `./tufte-browser.mjs`), which resolve correctly once
// every file in the closure below is served from one shared runtime path.
// No bundler, no minifier, no dist/ output -- request time content is
// exactly what git holds in src/.
const RUNTIME_MODULES = [
  'tufte-browser.mjs',
  'tufte-topology.mjs',
  'tufte-bootstrap.mjs',
  'tufte-theme.mjs',
  'tufte-rendering.mjs',
  'tufte-storefront.mjs',
  'tufte-composition.mjs',
];
// A runtime module may import a house package by its bare specifier
// (tufte-composition.mjs imports the HTML node model from
// html-structural-projection-service). Each such package file is served from
// its own source too, under `packages/<package name>/<path in package>`, so
// its relative imports still resolve, and TUFTE_RUNTIME_IMPORT_MAP tells the
// browser where each bare specifier lives.

// tufte-storefront-browser.mjs is TUFTE_STOREFRONT_MODULE_URL's target: the
// same source, served under the name its own consumers (and the redirect
// below) expect.
const STOREFRONT_ENTRY_SOURCE = 'tufte-storefront-browser.mjs';
const STOREFRONT_ENTRY_NAME = 'storefront.mjs';

const SOURCE_DIRECTORY = () => dirname(fileURLToPath(import.meta.url));

/** Every file the browser runtime loads, named by the path it is served under, plus the import map its bare imports need. */
function readRuntimeClosure() {
  const directory = SOURCE_DIRECTORY();
  return readBrowserModuleClosure({
    directory,
    entries: [...RUNTIME_MODULES, { file: join(directory, STOREFRONT_ENTRY_SOURCE), name: STOREFRONT_ENTRY_NAME }],
  });
}

// A bundled module has no source directory beside it: a Cloudflare Worker's
// import.meta.url is not a file URL, so there is nothing to read. There the
// browser runtime is absent rather than a load-time crash, pages render as
// the zero-JavaScript documents they already are, and asking for enhancement
// is refused where it is asked (tufte-application.mjs).
async function readRuntime() {
  try {
    return await readRuntimeClosure();
  } catch (error) {
    if (typeof import.meta.url === 'string' && import.meta.url.startsWith('file:')) throw error;
    return null;
  }
}
const runtime = await readRuntime();
const served = runtime && servedBrowserModules('/_tufte', runtime);

/** The versioned path the browser runtime is served under, or null where there is no runtime to serve. */
export const TUFTE_RUNTIME_PATH = served?.path ?? null;
export const TUFTE_STOREFRONT_MODULE_URL = '/_tufte/storefront.mjs';
/** Complete browser assets for the application's resources or a shared artifact adapter. */
export const TUFTE_RUNTIME_ASSETS = served?.assets ?? Object.freeze([]);
/** The import map an enhanced page declares so the runtime's bare package imports resolve to their served sources. */
export const TUFTE_RUNTIME_IMPORT_MAP = served?.importMap ?? null;

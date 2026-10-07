import { BodyReadError } from '@red-cup-engineering/http-services-section/body/web';
import { createWebApplication as createWebApplicationEngine } from '@red-cup-engineering/http-services-section/create-application';
import { normalizeTufteModel, admitTufteUrl } from './tufte-browser.mjs';
import { renderTufteDocument } from './tufte-rendering.mjs';
import { TUFTE_RUNTIME_PATH, TUFTE_RUNTIME_ASSETS, TUFTE_RUNTIME_IMPORT_MAP, TUFTE_STOREFRONT_MODULE_URL } from './tufte-runtime.mjs';

export { TUFTE_RUNTIME_PATH } from './tufte-runtime.mjs';
const representations = Object.freeze(['text/html', 'application/json']);

// Explicit enhancement negotiation also works before resource admission, so
// authentication redirects need no second Accept parser or route engine.
function projectRedirect(response, context) {
  if (!(response instanceof Response) || context.request.headers.get('x-tufte-projection') !== '1') return response;
  if (![301, 302, 303, 307, 308].includes(response.status) || !response.headers.has('location')) return response;
  // Unsafe 307/308 redirects preserve their request body through native HTTP.
  if ([307, 308].includes(response.status) && !['GET', 'HEAD'].includes(context.request.method)) return response;
  const location = new URL(admitTufteUrl(response.headers.get('location')), context.url).href;
  const headers = new Headers(response.headers);
  for (const name of ['location', 'content-length', 'content-encoding', 'content-type']) headers.delete(name);
  headers.set('cache-control', 'no-store');
  headers.set('vary', [...new Set([...(headers.get('vary') ?? '').split(',').map(value => value.trim()).filter(Boolean), 'Accept', 'X-Tufte-Projection'])].join(', '));
  return Response.json({ kind: 'tufte.redirect', location, status: response.status }, { headers });
}

/** A page result is an explicit model, representation policy and status. */
export function tuftePage(model, options = {}) {
  if (!model || typeof model !== 'object' || Array.isArray(model)) throw new TypeError('A TUFTE page requires a model');
  const status = options.status ?? 200;
  if (!Number.isInteger(status) || status < 200 || status > 599 || [204, 205, 304].includes(status)) throw new TypeError('A TUFTE page status must allow a representation body');
  return Object.freeze({ ...options, kind: 'tufte.page', model, status });
}

/** Standard Fetch redirects are shared by native navigation and enhancement. */
export function tufteRedirect(location, status = 303) {
  admitTufteUrl(location);
  if (![301, 302, 303, 307, 308].includes(status)) throw new TypeError('Unsupported redirect status');
  return new Response(null, { status, headers: { location, 'cache-control': 'no-store' } });
}

async function renderPage(page, context, defaults) {
  if (page instanceof Response) return projectRedirect(page, context);
  if (page?.kind !== 'tufte.page') throw new TypeError('A TUFTE page handler must return tuftePage(...) or Response');
  const documentOptions = { ...defaults.document, ...page.document };
  const model = { ...page.model, metadata: { ...page.model.metadata,
    ...(documentOptions.documentTitle ? { title: documentOptions.documentTitle } : {}),
    ...(documentOptions.language ? { language: documentOptions.language } : {}),
    ...(documentOptions.themeColor ? { themeColor: documentOptions.themeColor } : {}),
  } };
  const enhance = page.enhance ?? defaults.enhance;
  // A changed document shell needs a native navigation: its scripts, styles,
  // component registrations and workspace must be initialized together.
  const shellBytes = new TextEncoder().encode(JSON.stringify([documentOptions, enhance, model.mastheadHtml, model.footerHtml, model.workspace]));
  const shell = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', shellBytes)), byte => byte.toString(16).padStart(2, '0')).join('');
  const projection = normalizeTufteModel({ ...model, shell });
  const headers = new Headers(page.headers);
  headers.set('cache-control', headers.get('cache-control') ?? 'no-store');
  headers.set('vary', [...new Set([...(headers.get('vary') ?? '').split(',').map(value => value.trim()).filter(Boolean), 'Accept'])].join(', '));
  if (context.negotiatedType === 'application/json') {
    headers.set('content-type', 'application/json; charset=utf-8');
    return new Response(JSON.stringify(projection), { status: page.status, headers });
  }
  headers.set('content-type', 'text/html; charset=utf-8');
  const settings = { ...documentOptions, nonce: context.nonce };
  if (enhance) {
    if (TUFTE_RUNTIME_PATH === null) throw new TypeError('Enhancement needs TUFTE\'s browser runtime, which this platform has no source directory to serve it from');
    const options = enhance === true ? {} : enhance;
    const components = Object.fromEntries(Object.entries(options.components ?? {}).map(([name, src]) => {
      admitTufteUrl(src);
      // Local browser modules resolve against the document URL, never against the runtime directory.
      const url = new URL(src, context.url);
      if (url.origin !== context.url.origin) throw new TypeError('Component modules must be same-origin');
      return [name, url.href];
    }));
    settings.bootstrapData = { projection, navigation: options.navigation !== false, forms: options.forms !== false, components, workspace: model.workspace };
    settings.importMap = TUFTE_RUNTIME_IMPORT_MAP;
    settings.scripts = [...(settings.scripts ?? []), { src: `${TUFTE_RUNTIME_PATH}/tufte-bootstrap.mjs` }];
  }
  return new Response(renderTufteDocument(model, settings), { status: page.status, headers });
}

/** Default CSRF boundary: browser-origin evidence must match the actual request origin.
 * Non-browser callers supply an explicit verification capability when needed. */
export function sameOriginTufteAction(context) {
  const origin = context.request.headers.get('origin');
  if (origin && origin !== 'null') { try { return new URL(origin).origin === context.url.origin; } catch { return false; } }
  return context.request.headers.get('sec-fetch-site') === 'same-origin';
}

/** Compile page/action descriptors to the shared HTTP engine's resource terms.
 * Routing, admission, HEAD, OPTIONS, errors and response policy stay in that engine. */
export function createTufteApplication(options = {}) {
  const { pages = [], actions = [], resources = [], enhance = false, document: documentOptions = {}, body: bodyOptions = {}, csrf = sameOriginTufteAction, authorize, ...http } = options;
  if (typeof csrf !== 'function') throw new TypeError('csrf must be an explicit verification capability');
  const defaults = { enhance, document: documentOptions };
  const compile = (descriptor, action) => {
    const { load, run, ...resource } = descriptor;
    const handler = action ? run : load;
    if (typeof handler !== 'function') throw new TypeError(action ? 'Action requires run(context)' : 'Page requires load(context)');
    return { ...resource, methods: action ? descriptor.methods ?? ['POST'] : ['GET'], produces: representations, handler: async context => {
      return renderPage(await handler(context), context, defaults);
    } };
  };
  const assetResources = TUFTE_RUNTIME_ASSETS.map(({ path, source, contentType }) => ({
    match: path, methods: ['GET'], produces: ['text/javascript'],
    handler: () => new Response(source, { headers: { 'content-type': contentType, 'cache-control': 'public, max-age=31536000, immutable' } }),
  }));
  if (TUFTE_RUNTIME_PATH !== null) assetResources.push({ match: TUFTE_STOREFRONT_MODULE_URL, methods: ['GET'], handler: () => tufteRedirect(`${TUFTE_RUNTIME_PATH}/storefront.mjs`, 307) });
  const guard = async context => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(context.request.method)) {
      const verdict = await csrf(context);
      if (verdict instanceof Response) return projectRedirect(verdict, context);
      if (verdict !== true) return new Response('Forbidden origin', { status: 403, headers: { 'cache-control': 'no-store' } });
    }
    return projectRedirect(await authorize?.(context), context);
  };
  const onError = async (error, context) => {
    if (!(error instanceof BodyReadError)) return http.onError?.(error, context);
    if (context.negotiatedType === 'application/json') return Response.json({ message: error.message, code: error.code, status: error.status }, { status: error.status, headers: { 'cache-control': 'no-store', vary: 'Accept' } });
    return renderPage(tuftePage({ title: 'Request refused', tiles: [{ id: 'request-error', title: 'Request input', content: error.message, live: 'assertive' }] }, { status: error.status, enhance: false }), context, defaults);
  };
  return createWebApplicationEngine({ ...http, body: bodyOptions, onError, security: http.security ?? true, cacheControl: http.cacheControl ?? 'no-store',
    middlewares: [guard, ...(http.middlewares ?? [])],
    resources: [...assetResources, ...pages.map(page => compile(page, false)), ...actions.map(action => compile(action, true)), ...resources],
  });
}

const MIME_TYPES = Object.freeze({ ".mts": "text/javascript; charset=utf-8" });

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isPath = (value) => typeof value === "string" && value.startsWith("/") && !value.includes("?") && !value.includes("#");
const isBinding = (value) => typeof value === "string" && /^[A-Z][A-Z0-9_]{0,127}$/u.test(value);
const freeze = (value) => Object.freeze(value);
const failure = (message) => { throw new TypeError(`invalid static-assets route policy: ${message}`); };

/**
 * Builds the stateless Cloudflare Worker shell for an asset release.
 *
 * The only provider effect is the returned Worker fetch handler calling the declared
 * Assets capability. Route decisions stay data, so public applications do not each
 * reimplement redirect, rewrite, and media-type behavior.
 */
export function createCloudflareStaticAssetsWorker(policy) {
  if (!isRecord(policy) || !isBinding(policy.assetBinding)) failure("assetBinding must be an uppercase Worker binding name");
  const redirects = policy.redirects ?? [];
  const rewrites = policy.rewrites ?? [];
  const responses = policy.responses ?? [];
  const mimeTypes = policy.mimeTypes ?? MIME_TYPES;
  if (!Array.isArray(redirects) || !redirects.every((rule) => isRecord(rule) && isPath(rule.from) && isPath(rule.to) && [301, 302, 303, 307, 308].includes(rule.status ?? 302))) failure("redirects must be path-to-path redirect rules");
  if (!Array.isArray(rewrites) || !rewrites.every((rule) => isRecord(rule) && isPath(rule.from) && isPath(rule.to))) failure("rewrites must be path-to-path rewrite rules");
  if (!Array.isArray(responses) || !responses.every((rule) => isRecord(rule) && isPath(rule.path) && Number.isInteger(rule.status) && rule.status >= 100 && rule.status <= 599 && typeof rule.body === "string" && isRecord(rule.headers ?? {}))) failure("responses must be declared path, status, body, and headers");
  if (!isRecord(mimeTypes) || Object.entries(mimeTypes).some(([suffix, type]) => !suffix.startsWith(".") || typeof type !== "string" || type.length === 0)) failure("mimeTypes must map filename suffixes to media types");
  if (policy.prefix !== undefined && (!isRecord(policy.prefix) || !isPath(policy.prefix.path) || !Array.isArray(policy.prefix.exclude) || !policy.prefix.exclude.every(isPath) || !isPath(policy.prefix.index))) failure("prefix requires path, excluded path prefixes, and index path");
  const byPath = (rules, key) => new Map(rules.map((rule) => [rule[key], rule]));
  const redirectByPath = byPath(redirects, "from");
  const rewriteByPath = byPath(rewrites, "from");
  const responseByPath = byPath(responses, "path");
  if (redirectByPath.size !== redirects.length || rewriteByPath.size !== rewrites.length || responseByPath.size !== responses.length) failure("route rule paths must be unique within their kind");
  const prefix = policy.prefix === undefined ? undefined : freeze({ path: policy.prefix.path.replace(/\/$/u, ""), exclude: freeze([...policy.prefix.exclude]), index: policy.prefix.index });

  const rewriteRequest = (request, target) => {
    const url = new URL(request.url);
    url.pathname = target;
    return new Request(url, request);
  };
  const resolveAssetRequest = (request) => {
    const url = new URL(request.url);
    const explicit = rewriteByPath.get(url.pathname);
    if (explicit !== undefined) return rewriteRequest(request, explicit.to);
    if (prefix !== undefined && !prefix.exclude.some((entry) => url.pathname.startsWith(entry))) {
      let relative = url.pathname;
      if (relative === "/" || relative === "") relative = prefix.index;
      else if (relative.endsWith("/")) relative = `${relative}${prefix.index.slice(1)}`;
      return rewriteRequest(request, `${prefix.path}${relative}`);
    }
    return request;
  };
  return freeze({
    async fetch(request, env) {
      const url = new URL(request.url);
      const response = responseByPath.get(url.pathname);
      if (response !== undefined) return new Response(response.body, { status: response.status, headers: response.headers });
      const redirect = redirectByPath.get(url.pathname);
      if (redirect !== undefined) return new Response(null, { status: redirect.status ?? 302, headers: { Location: redirect.to } });
      const assets = env[policy.assetBinding];
      if (!assets || typeof assets.fetch !== "function") throw new TypeError(`missing declared Assets binding ${policy.assetBinding}`);
      const assetResponse = await assets.fetch(resolveAssetRequest(request));
      const mediaType = Object.entries(mimeTypes).find(([suffix]) => url.pathname.endsWith(suffix))?.[1];
      if (!mediaType || !assetResponse.ok) return assetResponse;
      const headers = new Headers(assetResponse.headers);
      headers.set("Content-Type", mediaType);
      return new Response(assetResponse.body, { status: assetResponse.status, statusText: assetResponse.statusText, headers });
    },
  });
}

/**
 * The declared `responses` that make a Worker site legible to crawlers: its robots.txt, which
 * allows every path and names the sitemap, and its sitemap.xml, which lists the site's canonical
 * public URLs. A site passes its own origin and canonical paths; the unbranded engineering layer
 * holds no site's data, and a site does not hand-write crawler text.
 * @param {{origin: string, paths: ReadonlyArray<string>}} site the https origin and the canonical public paths, each the path a crawler is served with a 200
 * @returns {ReadonlyArray<{path: string, status: number, body: string, headers: Record<string, string>}>}
 */
export function crawlerResponses(site) {
  if (!isRecord(site) || typeof site.origin !== "string" || !/^https:\/\/[a-z0-9.-]+$/u.test(site.origin)) failure("crawler origin must be an https origin without a path");
  if (!Array.isArray(site.paths) || site.paths.length === 0 || !site.paths.every(isPath)) failure("crawler paths must list the site's canonical public paths");
  const escapeXml = (text) => text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");
  const urls = site.paths.map((path) => `  <url><loc>${escapeXml(`${site.origin}${path}`)}</loc></url>`).join("\n");
  return freeze([
    freeze({ path: "/robots.txt", status: 200, body: `User-agent: *\nAllow: /\n\nSitemap: ${site.origin}/sitemap.xml\n`, headers: freeze({ "Content-Type": "text/plain; charset=utf-8" }) }),
    freeze({ path: "/sitemap.xml", status: 200, body: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, headers: freeze({ "Content-Type": "application/xml; charset=utf-8" }) }),
  ]);
}

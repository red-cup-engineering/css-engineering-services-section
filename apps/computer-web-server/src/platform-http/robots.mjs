
/**
 * projections/robots - deterministic robots.txt text bodies.
 */

export function robotsTxt(options) {
  const allow = options.allow ?? ["/"];
  const disallow = options.disallow ?? [];
  const sitemapUrls = options.sitemapUrls ?? [options.sitemapUrl];
  const lines = [
    `User-agent: ${options.userAgent ?? "*"}`,
    ...allow.map((path) => `Allow: ${path}`),
    ...disallow.map((path) => `Disallow: ${path}`),
    ...sitemapUrls.map((url) => `Sitemap: ${url}`),
  ];
  return `${lines.join("\n")}\n`;
}

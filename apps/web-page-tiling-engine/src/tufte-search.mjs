import { semanticHex } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";

const DEFAULTS = Object.freeze({
  basePath: "/",
  indexPath: "search/search-index.json",
  runtimePath: "search/search.mjs",
  minTermLength: 2,
  maxTextLength: 200_000,
  excerptLength: 240,
  stopWords: Object.freeze([]),
  excludeNoIndex: true,
  excludeRedirects: true,
  excludeNotFound: true,
});

function diagnostic(code, message, subject, details) {
  return Object.freeze({
    severity: "error",
    code,
    message,
    ...(subject === undefined ? {} : { subject }),
    ...(details === undefined ? {} : { details }),
  });
}

function safePath(value) {
  return typeof value === "string"
    && value.length > 0
    && !value.startsWith("/")
    && !value.includes("\\")
    && value.split("/").every((part) => part.length > 0 && part !== "." && part !== "..");
}

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function pathList(value, name, diagnostics) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((path) => !safePath(path))) {
    diagnostics.push(diagnostic("PSS-002", `${name} must be an array of safe relative artifact paths`, `config.${name}`));
    return [];
  }
  return [...new Set(value)].sort(compareText);
}

function positiveInteger(value, fallback, name, diagnostics) {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 1) {
    diagnostics.push(diagnostic("PSS-002", `${name} must be a positive safe integer`, `config.${name}`));
    return fallback;
  }
  return value;
}

function normalizeConfig(value, diagnostics) {
  if (value === undefined) value = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    diagnostics.push(diagnostic("PSS-002", "config must be an object", "config"));
    value = {};
  }
  const config = {
    ...DEFAULTS,
    ...value,
    include: pathList(value.include, "include", diagnostics),
    exclude: pathList(value.exclude, "exclude", diagnostics) ?? [],
    minTermLength: positiveInteger(value.minTermLength, DEFAULTS.minTermLength, "minTermLength", diagnostics),
    maxTextLength: positiveInteger(value.maxTextLength, DEFAULTS.maxTextLength, "maxTextLength", diagnostics),
    excerptLength: positiveInteger(value.excerptLength, DEFAULTS.excerptLength, "excerptLength", diagnostics),
  };
  for (const name of ["indexPath", "runtimePath"]) {
    if (!safePath(config[name])) diagnostics.push(diagnostic("PSS-002", `${name} must be a safe relative artifact path`, `config.${name}`));
  }
  if (config.indexPath === config.runtimePath) {
    diagnostics.push(diagnostic("PSS-002", "indexPath and runtimePath must differ", "config.runtimePath"));
  }
  if (typeof config.basePath !== "string"
    || !/^\/(?:[^?#]*\/)?$/.test(config.basePath)
    || config.basePath.includes("//")
    || config.basePath.includes("\\")
    || config.basePath.split("/").some((part) => part === "." || part === "..")) {
    diagnostics.push(diagnostic("PSS-002", "basePath must be an absolute URL path ending in /", "config.basePath"));
  }
  for (const name of ["excludeNoIndex", "excludeRedirects", "excludeNotFound"]) {
    if (typeof config[name] !== "boolean") diagnostics.push(diagnostic("PSS-002", `${name} must be boolean`, `config.${name}`));
  }
  if (!Array.isArray(config.stopWords) || config.stopWords.some((word) => typeof word !== "string")) {
    diagnostics.push(diagnostic("PSS-002", "stopWords must be an array of strings", "config.stopWords"));
    config.stopWords = [];
  }
  return config;
}

function inventoryEntries(artifacts, diagnostics) {
  if (!artifacts || typeof artifacts[Symbol.iterator] !== "function") {
    diagnostics.push(diagnostic("PSS-001", "artifacts must be a Map or iterable artifact inventory", "artifacts"));
    return new Map();
  }
  const inventory = new Map();
  for (const entry of artifacts) {
    const tuple = Array.isArray(entry);
    const path = tuple ? entry[0] : entry?.path;
    const candidate = tuple ? entry[1] : entry;
    const body = candidate && typeof candidate === "object" && !(candidate instanceof Uint8Array)
      ? candidate.body
      : candidate;
    if (!safePath(path) || (typeof body !== "string" && !(body instanceof Uint8Array))) {
      diagnostics.push(diagnostic("PSS-001", "each artifact needs a safe relative path and string or Uint8Array body", path));
      continue;
    }
    if (inventory.has(path)) {
      diagnostics.push(diagnostic("PSS-001", "artifact paths must be unique", path));
      continue;
    }
    inventory.set(path, body);
  }
  return inventory;
}

function decodeEntities(value) {
  const named = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' };
  return value.replace(/&(#(?:x[0-9a-f]+|[0-9]+)|[a-z][a-z0-9]+);/gi, (whole, entity) => {
    if (entity[0] !== "#") return named[entity.toLowerCase()] ?? whole;
    const hex = entity[1]?.toLowerCase() === "x";
    const point = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
    try { return Number.isFinite(point) ? String.fromCodePoint(point) : whole; } catch { return whole; }
  });
}

function textContent(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function removeElement(html, attribute) {
  const paired = new RegExp(`<([a-z][a-z0-9:-]*)\\b(?=[^>]*\\b${attribute}\\b)[^>]*>[\\s\\S]*?<\\/\\1\\s*>`, "gi");
  const unpaired = new RegExp(`<[^>]+\\b${attribute}\\b[^>]*>`, "gi");
  let next = html;
  let previous;
  do {
    previous = next;
    next = next.replace(paired, " ");
  } while (next !== previous);
  return next.replace(unpaired, " ");
}

function searchableRegion(html) {
  const regions = [];
  const marker = /<([a-z][a-z0-9:-]*)\b(?=[^>]*\bdata-pagefind-body\b)[^>]*>([\s\S]*?)<\/\1\s*>/gi;
  for (const match of html.matchAll(marker)) regions.push(match[2]);
  if (regions.length > 0) return regions.join(" ");
  return /<body\b[^>]*>([\s\S]*?)<\/body\s*>/i.exec(html)?.[1] ?? html;
}

function cleanSearchableHtml(html) {
  let value = html.replace(/<!--[\s\S]*?-->/g, " ");
  value = removeElement(value, "data-pagefind-ignore");
  value = value.replace(/<(script|style|template|noscript|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ");
  return value;
}

function attributes(tag) {
  const result = {};
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for (const match of tag.matchAll(pattern)) result[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  return result;
}

function metaContent(html, name) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag);
    if (attrs.name?.toLowerCase() === name) return attrs.content?.trim() ?? "";
  }
  return "";
}

function annotatedValues(html, attribute) {
  const values = {};
  const pattern = new RegExp(`<([a-z][a-z0-9:-]*)\\b(?=[^>]*\\b${attribute}\\s*=)[^>]*>([\\s\\S]*?)<\\/\\1\\s*>|<(meta|input)\\b(?=[^>]*\\b${attribute}\\s*=)[^>]*>`, "gi");
  for (const match of html.matchAll(pattern)) {
    const tag = match[0].slice(0, match[0].indexOf(">") + 1);
    const attrs = attributes(tag);
    const name = attrs[attribute];
    const value = (attrs.content ?? attrs.value ?? textContent(match[2] ?? "")).trim();
    if (!name || !value) continue;
    (values[name] ??= []).push(value);
  }
  return Object.fromEntries(Object.entries(values).sort(([a], [b]) => compareText(a, b)).map(([key, items]) => [key, [...new Set(items)].sort(compareText)]));
}

function hasMetaDirective(html, name, value) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag);
    if (attrs[name]?.toLowerCase() === value) return true;
  }
  return false;
}

function routeOf(path, basePath) {
  let route;
  if (path === "index.html") route = "";
  else if (path.endsWith("/index.html")) route = `${path.slice(0, -"index.html".length)}`;
  else route = path;
  return `${basePath}${route}`.replace(/\/+/g, "/");
}

function tokenize(value, config) {
  const stopWords = config.stopWordSet ?? new Set(config.stopWords.map((word) => word.normalize("NFKC").toLocaleLowerCase("und")));
  return (value.normalize("NFKC").toLocaleLowerCase("und").match(/[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu) ?? [])
    .filter((term) => term.length >= config.minTermLength && !stopWords.has(term));
}

function frequencies(terms) {
  const result = new Map();
  for (const term of terms) result.set(term, (result.get(term) ?? 0) + 1);
  return result;
}

function extractDocument(path, html, config) {
  const metadata = annotatedValues(html, "data-pagefind-meta");
  const filters = annotatedValues(html, "data-pagefind-filter");
  const title = metadata.title?.[0]
    ?? textContent(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(html)?.[1] ?? "")
    ?? "";
  const description = metadata.description?.[0] ?? metaContent(html, "description");
  const region = cleanSearchableHtml(searchableRegion(html));
  const text = textContent(region).slice(0, config.maxTextLength);
  const excerptSource = description || text;
  const excerpt = excerptSource.length > config.excerptLength
    ? `${excerptSource.slice(0, Math.max(1, config.excerptLength - 1)).trimEnd()}…`
    : excerptSource;
  const language = attributes(/<html\b[^>]*>/i.exec(html)?.[0] ?? "").lang || undefined;
  return {
    path,
    url: routeOf(path, config.basePath),
    title: title || routeOf(path, config.basePath),
    description,
    excerpt,
    ...(language === undefined ? {} : { language }),
    ...(Object.keys(metadata).length === 0 ? {} : { metadata }),
    ...(Object.keys(filters).length === 0 ? {} : { filters }),
    searchableText: text,
  };
}

function selectedPaths(inventory, config, diagnostics) {
  const excluded = new Set(config.exclude);
  const paths = config.include ?? [...inventory.keys()].filter((path) => path.endsWith(".html"));
  if (config.include) {
    for (const path of config.include) {
      if (!inventory.has(path)) diagnostics.push(diagnostic("PSS-003", "explicitly included artifact is missing", path));
    }
  }
  return paths.filter((path) => inventory.has(path) && !excluded.has(path)).sort(compareText);
}

function makeIndex(documents, config) {
  const postings = new Map();
  const publicDocuments = [];
  documents.forEach((document, id) => {
    const title = frequencies(tokenize(document.title, config));
    const description = frequencies(tokenize(document.description, config));
    const body = frequencies(tokenize(document.searchableText, config));
    const terms = new Set([...title.keys(), ...description.keys(), ...body.keys()]);
    for (const term of terms) {
      const score = (title.get(term) ?? 0) * 8 + (description.get(term) ?? 0) * 3 + (body.get(term) ?? 0);
      (postings.get(term) ?? postings.set(term, []).get(term)).push([id, score]);
    }
    const { searchableText, ...result } = document;
    publicDocuments.push(result);
  });
  const terms = Object.fromEntries([...postings].sort(([a], [b]) => compareText(a, b)));
  const core = {
    format: "red-cup-public-site-search-index",
    version: 1,
    documentCount: publicDocuments.length,
    documents: publicDocuments,
    terms,
  };
  const digest = semanticHex(core);
  return { ...core, digest };
}

function runtimeSource(indexUrl) {
  return `/* generated by TUFTE search */
const DEFAULT_INDEX_URL=${JSON.stringify(indexUrl)};
const normalize=value=>String(value).normalize("NFKC").toLocaleLowerCase("und");
const termsOf=value=>normalize(value).match(/[\\p{L}\\p{N}]+(?:['’_-][\\p{L}\\p{N}]+)*/gu)||[];
export async function loadSearchIndex(url=DEFAULT_INDEX_URL,{fetchImpl=globalThis.fetch}={}){
  if(typeof fetchImpl!=="function")throw new TypeError("fetchImpl must be a function");
  const response=await fetchImpl(url,{headers:{accept:"application/json"}});
  if(!response.ok)throw new Error(\`search index request failed with status \${response.status}\`);
  const index=await response.json();
  if(index?.format!=="red-cup-public-site-search-index"||index.version!==1||!Array.isArray(index.documents)||!index.terms)throw new Error("unsupported search index");
  return index;
}
export function searchIndex(index,query,{limit=20,filters={}}={}){
  if(!Number.isSafeInteger(limit)||limit<1)throw new TypeError("limit must be a positive safe integer");
  const queryTerms=[...new Set(termsOf(query))];
  if(queryTerms.length===0)return [];
  const scores=new Map();
  for(const queryTerm of queryTerms){
    for(const [term,postings] of Object.entries(index.terms)){
      if(term!==queryTerm&&!term.startsWith(queryTerm))continue;
      const factor=term===queryTerm?1:0.35;
      for(const [id,weight] of postings)scores.set(id,(scores.get(id)||0)+weight*factor);
    }
  }
  const accepts=document=>Object.entries(filters).every(([name,wanted])=>{
    const actual=document.filters?.[name]||[];
    const values=Array.isArray(wanted)?wanted:[wanted];
    return values.some(value=>actual.includes(String(value)));
  });
  return [...scores].map(([id,score])=>({...index.documents[id],score}))
    .filter(accepts).sort((a,b)=>b.score-a.score||a.url.localeCompare(b.url)).slice(0,limit);
}
export function createSearchClient({indexUrl=DEFAULT_INDEX_URL,fetchImpl=globalThis.fetch}={}){
  let pending;
  return async(query,options)=>searchIndex(await(pending??=loadSearchIndex(indexUrl,{fetchImpl})),query,options);
}
`;
}

/** Derive TUFTE's browser-search index and query module from rendered documents. */
export function createTufteSearchArtifacts({ artifacts, config } = {}) {
  const diagnostics = [];
  const normalized = normalizeConfig(config, diagnostics);
  const inventory = inventoryEntries(artifacts, diagnostics);
  for (const path of [normalized.indexPath, normalized.runtimePath]) {
    if (inventory.has(path)) diagnostics.push(diagnostic("PSS-004", "generated search artifact collides with the input inventory", path));
  }
  const documents = [];
  const routes = new Map();
  for (const path of selectedPaths(inventory, normalized, diagnostics)) {
    const raw = inventory.get(path);
    if (typeof raw !== "string") {
      diagnostics.push(diagnostic("PSS-003", "selected HTML artifact must have a string body", path));
      continue;
    }
    if (normalized.excludeNotFound && (path === "404.html" || path.endsWith("/404.html"))) continue;
    if (normalized.excludeNoIndex && /(?:^|[\s,])noindex(?:$|[\s,])/i.test(metaContent(raw, "robots"))) continue;
    if (normalized.excludeRedirects && hasMetaDirective(raw, "http-equiv", "refresh")) continue;
    const document = extractDocument(path, raw, normalized);
    const existing = routes.get(document.url);
    if (existing) {
      diagnostics.push(diagnostic("PSS-005", "multiple HTML artifacts resolve to the same public search URL", document.url, { first: existing, second: path }));
      continue;
    }
    routes.set(document.url, path);
    documents.push(document);
  }
  documents.sort((a, b) => compareText(a.url, b.url));
  if (diagnostics.some((item) => item.severity === "error")) {
    return Object.freeze({ artifacts: Object.freeze([]), diagnostics: Object.freeze(diagnostics) });
  }
  const index = makeIndex(documents, { ...normalized, stopWordSet: new Set(normalized.stopWords.map((word) => word.normalize("NFKC").toLocaleLowerCase("und"))) });
  const artifactsOut = [
    Object.freeze({
      path: normalized.indexPath,
      body: `${JSON.stringify(index)}\n`,
      mediaType: "application/json; charset=utf-8",
      cacheControl: "public, max-age=0, must-revalidate",
      source: `search:${index.digest}`,
    }),
    Object.freeze({
      path: normalized.runtimePath,
      body: runtimeSource(routeOf(normalized.indexPath, normalized.basePath)),
      mediaType: "text/javascript; charset=utf-8",
      cacheControl: "public, max-age=0, must-revalidate",
      source: "search:browser-runtime",
    }),
  ];
  return Object.freeze({ artifacts: Object.freeze(artifactsOut), diagnostics: Object.freeze(diagnostics) });
}

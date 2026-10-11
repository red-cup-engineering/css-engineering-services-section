import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve, relative, isAbsolute } from "node:path";

const assetPath = (value) => typeof value === "string" && value.startsWith("/") && !value.split("/").includes("..") && !value.includes("\\");

function browserEntryPaths(html) {
  const paths = new Set();
  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/giu)) {
    if (match[1].startsWith("/")) paths.add(match[1]);
  }
  for (const script of html.matchAll(/<script\b[^>]*\btype=["']module["'][^>]*>([\s\S]*?)<\/script>/giu)) {
    for (const imported of script[1].matchAll(/\bimport\s*(?:\(\s*)?["'](\/[^"']+)["']/gu)) paths.add(imported[1]);
  }
  return [...paths].sort();
}

function browserImportMap(html, assets) {
  const tag = html.match(/<script\b[^>]*\btype=["']importmap["'][^>]*>([\s\S]*?)<\/script>/iu);
  if (!tag) return new Map();
  let parsed;
  try { parsed = JSON.parse(tag[1]); }
  catch (error) { throw new TypeError(`HTML import map is invalid JSON: ${error.message}`); }
  const imports = parsed?.imports ?? {};
  if (imports === null || typeof imports !== "object" || Array.isArray(imports)) throw new TypeError("HTML import map imports must be an object");
  const result = new Map();
  for (const [specifier, url] of Object.entries(imports)) {
    if (typeof url !== "string" || !assetPath(url) || !assets.has(url)) throw new TypeError(`HTML import map entry ${specifier} must resolve to a declared local asset`);
    result.set(specifier, assets.get(url));
  }
  return result;
}

const documentOutputPath = (route) => {
  if (route === "/") return "index.html";
  const relative = route.slice(1);
  return route.endsWith("/") ? `${relative}index.html` : relative;
};

function validateDocuments(documents) {
  if (documents === null || typeof documents !== "object" || Array.isArray(documents)) throw new TypeError("documents must map GET paths to HTML strings");
  const paths = new Set();
  const outputs = new Set();
  for (const [route, html] of Object.entries(documents)) {
    if (!assetPath(route) || route.startsWith("//") || route.includes("//") || route.includes("?") || route.includes("#") || route.includes("%") || route.split("/").some((part) => part === "." || part === "..")) throw new TypeError(`invalid HTML document route: ${route}`);
    if (route !== "/" && !route.endsWith("/") && !route.endsWith(".html")) throw new TypeError(`HTML document route must end with / or .html: ${route}`);
    if (typeof html !== "string") throw new TypeError(`HTML document ${route} must be a string`);
    const output = documentOutputPath(route);
    if (outputs.has(output)) throw new TypeError(`multiple HTML document routes resolve to ${output}`);
    paths.add(route);
    outputs.add(output);
  }
  return { paths, outputs };
}

/**
 * Build one Cloudflare Worker module and its browser assets from source files.
 *
 * `documents` maps public GET paths to generated HTML; `assets` maps public
 * URL paths to local source files. HTML module roots are bundled into their
 * original public paths; imports resolve through that map or through normal
 * Node package resolution from the importing source file.
 */
async function buildBrowserAssetsInternal({ outdir, documents, assets } = {}) {
  if (typeof outdir !== "string" || outdir.length === 0) throw new TypeError("outdir must be a directory path");
  const { paths: documentPaths, outputs: documentOutputs } = validateDocuments(documents);
  if (assets === null || typeof assets !== "object" || Array.isArray(assets)) throw new TypeError("assets must map public URL paths to local source files");

  const assetFiles = new Map();
  for (const [url, file] of Object.entries(assets)) {
    if (!assetPath(url) || url === "/") throw new TypeError(`invalid public asset path: ${url}`);
    if (typeof file !== "string" || file.length === 0) throw new TypeError(`asset ${url} must name a local source file`);
    if (documentOutputs.has(url.slice(1))) throw new TypeError(`asset ${url} conflicts with a generated HTML document`);
    assetFiles.set(url, resolve(file));
  }
  const entries = [...new Set(Object.values(documents).flatMap(browserEntryPaths))].sort();
  const importMap = new Map();
  for (const html of Object.values(documents)) {
    for (const [specifier, file] of browserImportMap(html, assetFiles)) {
      const prior = importMap.get(specifier);
      if (prior !== undefined && prior !== file) throw new TypeError(`HTML documents map ${specifier} to conflicting local assets`);
      importMap.set(specifier, file);
    }
  }
  for (const url of entries) {
    if (!assetFiles.has(url)) throw new TypeError(`HTML module entry ${url} is missing from assets`);
    if (!new Set([".js", ".mjs", ".cjs"]).has(extname(url))) throw new TypeError(`HTML module entry ${url} must use a JavaScript extension`);
  }

  const { build } = await import("esbuild");
  const outputRoot = resolve(outdir);
  const contains = (parent, child) => {
    const path = relative(parent, child);
    return path === "" || (!path.startsWith("..") && !isAbsolute(path));
  };
  if ([...assetFiles.values(), process.cwd()].some((file) => contains(outputRoot, file))) {
    throw new TypeError("outdir must not contain source files or the working directory");
  }
  const publicRoot = join(outputRoot, "public");
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(publicRoot, { recursive: true });

  const writtenAssets = [];
  const browserUrlResolver = {
    name: "cloudflare-browser-asset-urls",
    setup(context) {
      context.onResolve({ filter: /^\/[^/]/ }, (args) => {
        if (args.kind === "entry-point") return undefined;
        const file = assetFiles.get(args.path);
        if (!file) return { errors: [{ text: `browser URL import ${args.path} is absent from assets` }] };
        return { path: file };
      });
      context.onResolve({ filter: /.*/ }, (args) => {
        if (args.kind === "entry-point") return undefined;
        const file = importMap.get(args.path);
        return file ? { path: file } : undefined;
      });
    },
  };
  for (const url of [...assetFiles.keys()].sort()) {
    const target = join(publicRoot, url.slice(1));
    await mkdir(dirname(target), { recursive: true });
    if (entries.includes(url)) {
      const result = await build({
        entryPoints: [assetFiles.get(url)],
        outfile: target,
        bundle: true,
        write: true,
        format: "esm",
        platform: "browser",
        target: "es2022",
        external: ["node:*"],
        define: { "import.meta.main": "false" },
        minifySyntax: true,
        // Whitespace minification also drops esbuild's "// <source path>" comments,
        // which would otherwise publish repository-internal paths in public bundles.
        minifyWhitespace: true,
        plugins: [browserUrlResolver],
        metafile: true,
        sourcemap: false,
        legalComments: "none",
      });
      for (const output of Object.values(result.metafile.outputs)) {
        const unsupported = output.imports.find((entry) => entry.external && entry.path.startsWith("node:"));
        if (unsupported) throw new TypeError(`browser asset ${url} still imports ${unsupported.path}`);
      }
      writtenAssets.push(...result.outputFiles?.map(({ path }) => path) ?? [target]);
    } else {
      await copyFile(assetFiles.get(url), target);
      writtenAssets.push(target);
    }
  }

  const htmlPaths = [];
  for (const route of [...documentPaths].sort()) {
    const target = join(publicRoot, documentOutputPath(route));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, documents[route]);
    htmlPaths.push(target);
  }

  return Object.freeze({ publicRoot, documents: Object.freeze([...documentPaths].sort()), htmlPaths: Object.freeze(htmlPaths), assets: Object.freeze(writtenAssets.sort()) });
}

/** Compile the browser document and module graph without building a Worker runtime. */
export async function buildBrowserAssets(options = {}) {
  return buildBrowserAssetsInternal(options);
}

/** Build one Cloudflare Worker module and the same browser assets used by local hosting. */
export async function buildCloudflareWorker({ entry, outdir, documents, assets } = {}) {
  if (typeof entry !== "string" || entry.length === 0) throw new TypeError("entry must be a source file path");
  const outputRoot = resolve(outdir);
  const contains = (parent, child) => {
    const path = relative(parent, child);
    return path === "" || (!path.startsWith("..") && !isAbsolute(path));
  };
  if (contains(outputRoot, resolve(entry)) || contains(outputRoot, process.cwd())) {
    throw new TypeError("outdir must not contain source files or the working directory");
  }
  const browser = await buildBrowserAssetsInternal({ outdir, documents, assets });
  const { build } = await import("esbuild");
  const workerPath = join(outputRoot, "worker.mjs");
  await build({
    entryPoints: [resolve(entry)],
    outfile: workerPath,
    bundle: true,
    write: true,
    format: "esm",
    platform: "node",
    target: "es2022",
    conditions: ["workerd", "browser", "import", "default"],
    external: ["node:*"],
    define: { "import.meta.main": "false" },
    minifySyntax: true,
    sourcemap: false,
    legalComments: "none",
  });

  return Object.freeze({ workerPath, ...browser });
}

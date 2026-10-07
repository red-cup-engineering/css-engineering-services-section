import { readFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { semanticHex } from '@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address';

// A browser module closure served straight from its own source: the files a
// page's entry modules import, followed through relative specifiers and
// through bare package specifiers (resolved the way Node resolves them, from
// the nearest node_modules, by the package's exports map), each served under
// one versioned path so its relative imports still resolve, with the import
// map the page declares for the bare ones. No bundler, no minifier, no dist/:
// what a browser loads is exactly what git (or the installed package) holds.
// TUFTE's own runtime is one such closure; any application with browser code
// serves its own the same way.

const IMPORTED = /(?:^|[\n;])\s*(?:import|export)\s*(?:[^'"]*?\sfrom\s*)?["']([^"']+)["']/gu;

async function packageOf(file) {
  for (let directory = dirname(file); directory !== dirname(directory); directory = dirname(directory)) {
    try {
      const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
      if (typeof manifest.name === 'string') return { root: directory, name: manifest.name };
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  throw new TypeError(`No package owns ${file}`);
}

// The file a browser import of `specifier` from `importer` means: the
// package found the way Node finds it (the nearest node_modules), and the
// entry its exports map gives a browser importing an ES module. A pattern
// export ("./*": "./src/*.mjs") resolves by substituting the matched part.
async function resolvePackageImport(specifier, importer) {
  const parts = specifier.split('/');
  const name = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  const subpath = ['.', ...parts.slice(specifier.startsWith('@') ? 2 : 1)].join('/');
  for (let directory = dirname(importer); directory !== dirname(directory); directory = dirname(directory)) {
    const root = join(directory, 'node_modules', name);
    let manifest;
    try { manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')); } catch (error) { if (error?.code === 'ENOENT') continue; throw error; }
    const exports = manifest.exports;
    let target;
    if (typeof exports === 'object' && !Array.isArray(exports) && Object.keys(exports).every(key => key.startsWith('.'))) {
      target = exports[subpath];
      if (target === undefined) {
        for (const [pattern, value] of Object.entries(exports)) {
          const star = pattern.indexOf('*');
          if (star < 0 || !subpath.startsWith(pattern.slice(0, star)) || !subpath.endsWith(pattern.slice(star + 1))) continue;
          const matched = subpath.slice(star, subpath.length - (pattern.length - star - 1));
          let chosen = value;
          while (chosen && typeof chosen === 'object') chosen = chosen.browser ?? chosen.import ?? chosen.default;
          if (typeof chosen === 'string') { target = chosen.replace('*', matched); break; }
        }
      }
    } else {
      target = subpath === '.' ? exports ?? manifest.module ?? manifest.main : undefined;
    }
    while (target && typeof target === 'object') target = target.browser ?? target.import ?? target.default;
    if (typeof target !== 'string') throw new TypeError(`${name} exports no browser module at ${subpath}`);
    return join(root, target);
  }
  throw new TypeError(`No package ${name} is installed where ${importer} can import it`);
}

/**
 * Every file the given entries load, named by the path each is served under
 * (an entry by its own name, a sibling by its path relative to `directory`, a
 * package file under `packages/<package name>/<path in package>`), and the
 * bare specifiers' targets by the same names.
 * @param {{ directory: string, entries: Array<string | { file: string, name: string }> }} closure
 */
export async function readBrowserModuleClosure({ directory, entries }) {
  const sources = {};
  const imports = {};
  const named = new Set();
  const pending = entries.map(entry => typeof entry === 'string' ? { file: join(directory, entry), name: entry } : { ...entry, alias: true });
  const served = new Map();
  while (pending.length) {
    const { file, name, alias } = pending.shift();
    if (served.has(file) && !alias) continue;
    if (named.has(name)) continue;
    served.set(file, name);
    named.add(name);
    const source = await readFile(file, 'utf8');
    sources[name] = source;
    for (const [, specifier] of source.matchAll(IMPORTED)) {
      if (specifier.startsWith('.')) {
        const target = join(dirname(file), specifier);
        const targetName = relative(directory, target).startsWith('..')
          ? join(dirname(name), specifier).split(sep).join('/')
          : relative(directory, target).split(sep).join('/');
        if (!served.has(target)) pending.push({ file: target, name: targetName });
        continue;
      }
      if (specifier.startsWith('node:')) throw new TypeError(`Browser module ${name} imports ${specifier}`);
      const target = await resolvePackageImport(specifier, file);
      const owner = await packageOf(target);
      const targetName = `packages/${owner.name}/${relative(owner.root, target).split(sep).join('/')}`;
      if (imports[specifier] !== undefined && imports[specifier] !== targetName) throw new TypeError(`${specifier} resolves to two different browser modules`);
      imports[specifier] = targetName;
      if (!served.has(target)) pending.push({ file: target, name: targetName });
    }
  }
  return { sources, imports };
}

/**
 * A closure as served: its content-versioned path under `prefix`, every
 * asset with its served path, and the import map a page declares.
 * @param {string} prefix the path the versioned directory sits under, e.g. `/_tufte`
 * @param {{ sources: Record<string, string>, imports: Record<string, string> }} closure
 */
export function servedBrowserModules(prefix, { sources, imports }) {
  const ordered = Object.freeze(Object.fromEntries(Object.entries(sources).sort(([left], [right]) => left.localeCompare(right))));
  // A content hash keeps the path versioned (and so safely cacheable as
  // immutable) without a build step ever having minted the version number.
  const path = `${prefix}/${semanticHex(ordered).slice(0, 20)}`;
  return Object.freeze({
    path,
    assets: Object.freeze(Object.entries(ordered).map(([name, source]) => Object.freeze({ name, path: `${path}/${name}`, source, contentType: 'text/javascript; charset=utf-8' }))),
    importMap: Object.freeze({ imports: Object.freeze(Object.fromEntries(Object.entries(imports).map(([specifier, name]) => [specifier, `${path}/${name}`]))) }),
  });
}

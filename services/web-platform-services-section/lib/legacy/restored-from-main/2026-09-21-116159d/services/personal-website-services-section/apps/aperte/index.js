#!/usr/bin/env node
/*
 * Aperte 2 - an unconstrained and simple blogging system, still.
 *   Copyright (C) 2026 emsenn
 *   A rewrite of Aperte (2008), by emsenn, a fork of OpenBlag, by Marz.
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */
import { createServer } from 'node:http';
import { mkdir, readdir, readFile, writeFile, rm, appendFile, stat } from 'node:fs/promises';
import { createHash, createHmac, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { gzipSync, brotliCompressSync, deflateSync } from 'node:zlib';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scrypt = promisify(scryptCb);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(process.env.APERTE_DATA || path.join(HERE, 'data'));
const PORT = Number(process.env.PORT) || 8080;
const SITE_URL = (process.env.APERTE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const POSTS_DIR = path.join(DATA, 'posts');
const COMMENTS_DIR = path.join(DATA, 'comments');
const MENTIONS_DIR = path.join(DATA, 'mentions');
const CONFIG_FILE = path.join(DATA, 'config.json');
const AUTH_FILE = path.join(DATA, 'auth.json');

const DEFAULT_CONFIG = {
  title: 'A New Blog', description: 'Welcome to your new Aperte blog. Visit /setup to configure it.',
  postsPerPage: 5, recentCount: 10, accent: '#369',
  author: { name: '', url: '', photo: '' },
};

const ensureDir = d => mkdir(d, { recursive: true });
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const escA = s => esc(s).replace(/"/g, '&quot;');
const escX = escA;
const slugify = s => (s || '').toString().toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'post';

async function loadJSON(file, fallback) {
  try { return { ...fallback, ...JSON.parse(await readFile(file, 'utf8')) }; } catch { return fallback && { ...fallback }; }
}
const loadConfig = () => loadJSON(CONFIG_FILE, DEFAULT_CONFIG);
const saveConfig = async cfg => { await ensureDir(DATA); await writeFile(CONFIG_FILE, JSON.stringify(cfg, null, 2)); };
const loadAuth = () => loadJSON(AUTH_FILE, null);
const saveAuth = async a => { await ensureDir(DATA); await writeFile(AUTH_FILE, JSON.stringify(a)); };

async function hashPassword(pw) {
  const salt = randomBytes(16);
  const hash = await scrypt(pw, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}
async function verifyPassword(pw, stored) {
  if (!stored) return false;
  const [saltHex, hashHex] = stored.split(':');
  const want = Buffer.from(hashHex, 'hex');
  const got = await scrypt(pw, Buffer.from(saltHex, 'hex'), want.length);
  return got.length === want.length && timingSafeEqual(got, want);
}
function signSession(auth, username, days = 7) {
  const exp = Date.now() + days * 86400000;
  const payload = `${username}.${exp}`;
  return `${payload}.${createHmac('sha256', auth.secret).update(payload).digest('hex')}`;
}
function verifySession(auth, cookieVal) {
  if (!auth || !cookieVal) return null;
  const [username, exp, sig] = cookieVal.split('.');
  if (!username || !exp || !sig) return null;
  const expected = createHmac('sha256', auth.secret).update(`${username}.${exp}`).digest('hex');
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b) || Date.now() >= Number(exp)) return null;
  return username;
}
function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').filter(Boolean).map(p => {
    const i = p.indexOf('='); return [p.slice(0, i).trim(), decodeURIComponent(p.slice(i + 1).trim())];
  }));
}

function parsePost(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':'); if (i === -1) continue;
    const k = line.slice(0, i).trim(); let v = line.slice(i + 1).trim();
    if (k === 'tags') meta[k] = v ? v.split(',').map(s => s.trim()).filter(Boolean) : [];
    else if (k === 'draft') meta[k] = v === 'true';
    else meta[k] = v;
  }
  return { meta, body: m[2] };
}
function stringifyPost(meta, body) {
  const lines = Object.entries(meta).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
  return `---\n${lines.join('\n')}\n---\n${body}`;
}
async function listPosts({ includeDrafts = false } = {}) {
  await ensureDir(POSTS_DIR);
  const files = (await readdir(POSTS_DIR)).filter(f => f.endsWith('.md'));
  const posts = [];
  for (const f of files) {
    const { meta, body } = parsePost(await readFile(path.join(POSTS_DIR, f), 'utf8'));
    if (meta.draft && !includeDrafts) continue;
    posts.push({ slug: f.slice(0, -3), meta, body });
  }
  posts.sort((a, b) => new Date(b.meta.created) - new Date(a.meta.created));
  return posts;
}
async function getPost(slug) {
  try {
    const { meta, body } = parsePost(await readFile(path.join(POSTS_DIR, `${slug}.md`), 'utf8'));
    return { slug, meta, body };
  } catch { return null; }
}
async function savePost(slug, meta, body) {
  await ensureDir(POSTS_DIR);
  await writeFile(path.join(POSTS_DIR, `${slug}.md`), stringifyPost(meta, body));
}
async function deletePost(slug) {
  await rm(path.join(POSTS_DIR, `${slug}.md`), { force: true });
  await rm(path.join(COMMENTS_DIR, `${slug}.jsonl`), { force: true });
  await rm(path.join(MENTIONS_DIR, `${slug}.jsonl`), { force: true });
}

async function readJSONL(file) {
  try { return (await readFile(file, 'utf8')).split('\n').filter(Boolean).map(l => JSON.parse(l)); }
  catch { return []; }
}
const listComments = slug => readJSONL(path.join(COMMENTS_DIR, `${slug}.jsonl`));
const listMentions = async slug => (await readJSONL(path.join(MENTIONS_DIR, `${slug}.jsonl`))).filter(m => m.approved);
async function appendComment(slug, entry) {
  await ensureDir(COMMENTS_DIR);
  await appendFile(path.join(COMMENTS_DIR, `${slug}.jsonl`), JSON.stringify(entry) + '\n');
}
async function appendMention(slug, entry) {
  await ensureDir(MENTIONS_DIR);
  await appendFile(path.join(MENTIONS_DIR, `${slug}.jsonl`), JSON.stringify(entry) + '\n');
}

function inline(s) {
  return s
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, a, u) => `<img src="${escA(u)}" alt="${escA(a)}" loading="lazy">`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${escA(u)}">${t}</a>`)
    .replace(/`([^`]+)`/g, (_, c) => `<code>${esc(c)}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>');
}
function renderMarkdown(src) {
  return src.split(/\n{2,}/).map(block => {
    block = block.trim(); if (!block) return '';
    if (/^```/.test(block)) return `<pre><code>${esc(block.replace(/^```\w*\n?/, '').replace(/```$/, ''))}</code></pre>`;
    let m = block.match(/^(#{1,6})\s+(.*)$/);
    if (m) return `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`;
    if (/^>/.test(block)) return `<blockquote>${block.split('\n').map(l => inline(l.replace(/^>\s?/, ''))).join('<br>')}</blockquote>`;
    if (/^(-|\*)\s+/.test(block)) return `<ul>${block.split('\n').map(l => `<li>${inline(l.replace(/^(-|\*)\s+/, ''))}</li>`).join('')}</ul>`;
    if (/^\d+\.\s+/.test(block)) return `<ol>${block.split('\n').map(l => `<li>${inline(l.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`;
    return `<p>${block.split('\n').map(inline).join('<br>')}</p>`;
  }).join('\n');
}
function renderComment(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/(https?:\/\/[^\s<]+)/g, u => `<a href="${u}" rel="nofollow ugc">${u}</a>`)
    .split('\n').join('<br>');
}

function rssFeed(posts, cfg) {
  const items = posts.slice(0, cfg.recentCount).map(p => `<item><title>${escX(p.meta.title)}</title><link>${SITE_URL}/post/${p.slug}</link>` +
    `<guid isPermaLink="true">${SITE_URL}/post/${p.slug}</guid><pubDate>${new Date(p.meta.created).toUTCString()}</pubDate>` +
    `<description>${escX(renderMarkdown(p.body))}</description></item>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escX(cfg.title)}</title>` +
    `<link>${SITE_URL}</link><description>${escX(cfg.description)}</description><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}</channel></rss>`;
}
function atomFeed(posts, cfg) {
  const entries = posts.slice(0, cfg.recentCount).map(p => `<entry><title>${escX(p.meta.title)}</title><id>${SITE_URL}/post/${p.slug}</id>` +
    `<link href="${SITE_URL}/post/${p.slug}"/><updated>${new Date(p.meta.updated || p.meta.created).toISOString()}</updated>` +
    `<published>${new Date(p.meta.created).toISOString()}</published><summary type="html">${escX(renderMarkdown(p.body))}</summary></entry>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>${escX(cfg.title)}</title>` +
    `<id>${SITE_URL}/</id><updated>${new Date().toISOString()}</updated><link href="${SITE_URL}/feed.atom" rel="self"/>` +
    `<link href="${SITE_URL}/"/>${entries}</feed>`;
}
function jsonFeed(posts, cfg) {
  return JSON.stringify({
    version: 'https://jsonfeed.org/version/1.1', title: cfg.title, home_page_url: SITE_URL, feed_url: `${SITE_URL}/feed.json`,
    description: cfg.description,
    items: posts.slice(0, cfg.recentCount).map(p => ({
      id: `${SITE_URL}/post/${p.slug}`, url: `${SITE_URL}/post/${p.slug}`, title: p.meta.title,
      content_html: renderMarkdown(p.body), date_published: new Date(p.meta.created).toISOString(),
      date_modified: new Date(p.meta.updated || p.meta.created).toISOString(), tags: p.meta.tags || [],
    })),
  });
}

async function discoverEndpoint(url) {
  const res = await fetch(url).catch(() => null);
  if (!res) return null;
  const link = res.headers.get('link');
  let m = link && link.match(/<([^>]+)>\s*;\s*rel="?webmention"?/i);
  if (m) return new URL(m[1], url).href;
  const text = await res.text().catch(() => '');
  m = text.match(/<(?:link|a)[^>]+rel=["']?webmention["']?[^>]*href=["']([^"']+)["']/i) ||
    text.match(/<(?:link|a)[^>]+href=["']([^"']+)["'][^>]*rel=["']?webmention["']?/i);
  return m ? new URL(m[1], url).href : null;
}
async function sendWebmentionsFor(sourceUrl, html) {
  const links = [...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(m => m[1])
    .filter(u => !u.startsWith(SITE_URL));
  for (const target of new Set(links)) {
    discoverEndpoint(target).then(endpoint => {
      if (!endpoint) return;
      return fetch(endpoint, {
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: `source=${encodeURIComponent(sourceUrl)}&target=${encodeURIComponent(target)}`,
      });
    }).catch(() => {});
  }
}

function pickEncoding(accept = '') {
  if (/\bbr\b/.test(accept)) return 'br';
  if (/\bgzip\b/.test(accept)) return 'gzip';
  if (/\bdeflate\b/.test(accept)) return 'deflate';
  return null;
}
function compress(buf, enc) {
  return enc === 'br' ? brotliCompressSync(buf) : enc === 'gzip' ? gzipSync(buf) : deflateSync(buf);
}
function send(req, res, status, body, headers = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body ?? '', 'utf8');
  const etag = `"${createHash('sha1').update(buf).digest('hex')}"`;
  const base = {
    Vary: 'Accept-Encoding', 'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin', Link: '</webmention>; rel="webmention"',
    ETag: etag, ...headers,
  };
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, base); res.end(); return; }
  const enc = pickEncoding(req.headers['accept-encoding']);
  const out = enc && buf.length > 256 ? compress(buf, enc) : buf;
  res.writeHead(status, { ...base, ...(out !== buf ? { 'Content-Encoding': enc } : {}), 'Content-Length': out.length });
  res.end(out);
}
const sendHtml = (req, res, status, body) => send(req, res, status, body, { 'Content-Type': 'text/html; charset=utf-8' });
const redirect = (res, to) => { res.writeHead(302, { Location: to }); res.end(); };

async function readBody(req) {
  const chunks = []; for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}
const parseForm = body => Object.fromEntries(new URLSearchParams(body));

function css(cfg) {
  return `:root{--accent:${cfg.accent};--bg:#fff;--fg:#111;--faint:#666;--border:#ccc}
@media(prefers-color-scheme:dark){:root{--bg:#181818;--fg:#eee;--faint:#999;--border:#333}}
*{box-sizing:border-box}body{background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif;margin:0}
header,main,footer{max-width:42em;margin:0 auto;padding:1em}
header{border-bottom:2px solid var(--accent)}header a{color:var(--fg);text-decoration:none}
header h1{margin:.2em 0}nav a{margin-right:1em;color:var(--accent)}
a{color:var(--accent)}img{max-width:100%}pre{overflow:auto;background:#0002;padding:.5em}
article{margin:2em 0;padding-bottom:1em;border-bottom:1px dotted var(--border)}
time,.faint{color:var(--faint);font-size:.9em}
aside{border-top:1px solid var(--border);margin-top:2em;padding-top:1em}
aside ul{list-style:none;padding:0}
form div{margin:.7em 0}label{display:block;font-weight:bold}
input,textarea{width:100%;padding:.4em;background:var(--bg);color:var(--fg);border:1px solid var(--border)}
.hp{position:absolute;left:-9999px}
#pager a,#pager strong{margin:0 .3em}
footer{border-top:1px solid var(--border);font-size:.85em;color:var(--faint)}`;
}

function layout(cfg, { title, description, url, admin, jsonld, body }) {
  const full = title ? `${title} · ${cfg.title}` : cfg.title;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${escA(description || cfg.description)}">
<link rel="canonical" href="${escA(url || SITE_URL)}">
<link rel="alternate" type="application/rss+xml" title="RSS" href="/feed.xml">
<link rel="alternate" type="application/atom+xml" title="Atom" href="/feed.atom">
<link rel="alternate" type="application/feed+json" title="JSON Feed" href="/feed.json">
<link rel="webmention" href="/webmention">
<link rel="sitemap" href="/sitemap.xml">
<meta property="og:type" content="${title ? 'article' : 'website'}">
<meta property="og:title" content="${escA(full)}">
<meta property="og:description" content="${escA(description || cfg.description)}">
<meta property="og:url" content="${escA(url || SITE_URL)}">
<meta name="twitter:card" content="summary">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}
<style>${css(cfg)}</style></head><body>
<header><h1><a href="/">${esc(cfg.title)}</a></h1><p>${esc(cfg.description)}</p>
<nav>${admin ? '<a href="/new">New Post</a><a href="/setup">Settings</a><form method=post action=/logout style="display:inline"><button>Log out</button></form>' : '<a href="/login">Log in</a>'}</nav></header>
<main class="h-feed">${body}</main>
<footer>${cfg.author?.name ? `<p><a rel="me author" class="p-author h-card u-url" href="${escA(cfg.author.url || '#')}">${esc(cfg.author.name)}</a></p>` : ''}
<p>Powered by Aperte 2, a single-file libre blog engine, GPLv3.</p></footer>
</body></html>`;
}

function postArticle(cfg, p, { full = false } = {}) {
  const url = `${SITE_URL}/post/${p.slug}`;
  const created = new Date(p.meta.created || Date.now());
  return `<article class="h-entry">
<h2 class="p-name"><a class="u-url u-uid" href="${escA(url)}">${esc(p.meta.title)}</a></h2>
<div class="faint"><time class="dt-published" datetime="${created.toISOString()}">${created.toDateString()}</time>${p.meta.author ? ` &middot; <span class="p-author">${esc(p.meta.author)}</span>` : ''}${(p.meta.tags || []).map(t => ` <span class="p-category">#${esc(t)}</span>`).join('')}</div>
<div class="e-content">${renderMarkdown(p.body)}</div>
${full ? `<p class="faint"><a href="/edit/${escA(p.slug)}">edit</a></p>` : ''}
</article>`;
}

function form(action, fields) {
  return `<form method="post" action="${escA(action)}">${fields.map(f => {
    if (f.type === 'hp') return `<div class="hp"><label for="${f.name}">Leave blank</label><input id="${f.name}" name="${f.name}" tabindex="-1" autocomplete="off"></div>`;
    if (f.type === 'hidden') return `<input type="hidden" name="${f.name}" value="${escA(f.value)}">`;
    if (f.type === 'checkbox') return `<div><label><input type="checkbox" name="${f.name}" ${f.value ? 'checked' : ''}> ${esc(f.label)}</label></div>`;
    if (f.type === 'textarea') return `<div><label for="${f.name}">${esc(f.label)}</label><textarea id="${f.name}" name="${f.name}" rows="${f.rows || 8}">${esc(f.value || '')}</textarea></div>`;
    return `<div><label for="${f.name}">${esc(f.label)}</label><input id="${f.name}" name="${f.name}" type="${f.type || 'text'}" value="${escA(f.value || '')}"></div>`;
  }).join('')}<button type="submit">${esc(action.startsWith('/setup') ? 'Save' : 'Submit')}</button></form>`;
}

const server = createServer(async (req, res) => {
  try {
    const u = new URL(req.url, SITE_URL);
    const p = u.pathname;
    const cfg = await loadConfig();
    const auth = await loadAuth();
    const cookies = parseCookies(req.headers.cookie);
    const admin = !!verifySession(auth, cookies.session);
    const requireAdmin = () => { if (!admin) { redirect(res, '/login'); return false; } return true; };

    if (p === '/setup' && (req.method === 'GET' || req.method === 'POST')) {
      const firstRun = !auth;
      if (!firstRun && !requireAdmin()) return;
      if (req.method === 'POST') {
        const f = parseForm(await readBody(req));
        const next = {
          ...cfg, title: f.title || cfg.title, description: f.description || cfg.description,
          accent: f.accent || cfg.accent, postsPerPage: Number(f.postsPerPage) || cfg.postsPerPage,
          recentCount: Number(f.recentCount) || cfg.recentCount,
          author: { name: f.authorName || '', url: f.authorUrl || '', photo: '' },
        };
        await saveConfig(next);
        let session;
        if (firstRun) {
          const newAuth = { username: f.username || 'admin', passwordHash: await hashPassword(f.password || randomUUID()), secret: randomBytes(32).toString('hex') };
          await saveAuth(newAuth);
          session = signSession(newAuth, newAuth.username);
        } else if (f.password) {
          const newAuth = { ...auth, username: f.username || auth.username, passwordHash: await hashPassword(f.password), secret: randomBytes(32).toString('hex') };
          await saveAuth(newAuth);
          session = signSession(newAuth, newAuth.username);
        }
        res.setHeader('Set-Cookie', session ? `session=${session}; HttpOnly; SameSite=Lax; Path=/` : []);
        return redirect(res, '/');
      }
      const body = form('/setup', [
        { name: 'title', label: 'Blog title', value: cfg.title },
        { name: 'description', label: 'Description', value: cfg.description },
        { name: 'accent', label: 'Accent color', value: cfg.accent },
        { name: 'postsPerPage', label: 'Posts per page', value: cfg.postsPerPage },
        { name: 'recentCount', label: 'Recent posts to show', value: cfg.recentCount },
        { name: 'authorName', label: 'Author name (for the h-card & feeds)', value: cfg.author?.name },
        { name: 'authorUrl', label: 'Author URL (rel=me)', value: cfg.author?.url },
        { name: 'username', label: 'Admin username', value: auth?.username || '' },
        { name: 'password', label: firstRun ? 'Admin password' : 'New password (leave blank to keep current)', type: 'password' },
      ]);
      return sendHtml(req, res, 200, layout(cfg, { title: 'Setup', admin, body: `<h2>Configure your blog</h2>${body}` }));
    }

    if (p === '/login') {
      if (req.method === 'POST') {
        const f = parseForm(await readBody(req));
        if (auth && f.username === auth.username && await verifyPassword(f.password || '', auth.passwordHash)) {
          res.setHeader('Set-Cookie', `session=${signSession(auth, auth.username)}; HttpOnly; SameSite=Lax; Path=/`);
          return redirect(res, '/');
        }
        return sendHtml(req, res, 401, layout(cfg, { title: 'Log in', admin, body: `<p>Incorrect username or password.</p>${form('/login', [{ name: 'username', label: 'Username' }, { name: 'password', label: 'Password', type: 'password' }])}` }));
      }
      if (!auth) return redirect(res, '/setup');
      return sendHtml(req, res, 200, layout(cfg, { title: 'Log in', admin, body: form('/login', [{ name: 'username', label: 'Username' }, { name: 'password', label: 'Password', type: 'password' }]) }));
    }
    if (p === '/logout' && req.method === 'POST') {
      res.setHeader('Set-Cookie', 'session=; Max-Age=0; Path=/');
      return redirect(res, '/');
    }

    if (p === '/new' || p.match(/^\/edit\/([^/]+)$/)) {
      if (!requireAdmin()) return;
      const editSlug = p.startsWith('/edit/') ? p.slice(6) : null;
      const existing = editSlug ? await getPost(editSlug) : null;
      if (editSlug && !existing) return sendHtml(req, res, 404, layout(cfg, { title: 'Not found', admin, body: '<p>No such post.</p>' }));
      if (req.method === 'POST') {
        const f = parseForm(await readBody(req));
        const now = new Date().toISOString();
        let slug = editSlug;
        if (!slug) {
          slug = slugify(f.title);
          let i = 2; const base = slug;
          while (await getPost(slug)) slug = `${base}-${i++}`;
        }
        const meta = {
          title: f.title || 'Untitled', created: existing?.meta.created || now, updated: now,
          author: cfg.author?.name || auth.username, tags: (f.tags || '').split(',').map(s => s.trim()).filter(Boolean),
          draft: f.draft === 'on',
        };
        await savePost(slug, meta, f.content || '');
        if (!meta.draft) sendWebmentionsFor(`${SITE_URL}/post/${slug}`, renderMarkdown(f.content || ''));
        return redirect(res, `/post/${slug}`);
      }
      const body = form(editSlug ? `/edit/${editSlug}` : '/new', [
        { name: 'title', label: 'Title', value: existing?.meta.title },
        { name: 'tags', label: 'Tags (comma separated)', value: (existing?.meta.tags || []).join(', ') },
        { name: 'content', label: 'Content (Markdown)', type: 'textarea', rows: 18, value: existing?.body },
        { name: 'draft', label: 'Save as draft', type: 'checkbox', value: existing?.meta.draft },
      ]) + (editSlug ? `<p class="faint"><a href="/delete/${escA(editSlug)}">delete this post</a></p>` : '');
      return sendHtml(req, res, 200, layout(cfg, { title: editSlug ? 'Edit post' : 'New post', admin, body }));
    }
    let m = p.match(/^\/delete\/([^/]+)$/);
    if (m) {
      if (!requireAdmin()) return;
      const target = await getPost(m[1]);
      if (!target) return sendHtml(req, res, 404, layout(cfg, { title: 'Not found', admin, body: '<p>No such post.</p>' }));
      if (req.method === 'POST') { await deletePost(m[1]); return redirect(res, '/'); }
      return sendHtml(req, res, 200, layout(cfg, {
        title: 'Delete post', admin,
        body: `<p>Delete "${esc(target.meta.title)}"? This can't be undone.</p><form method="post" action="/delete/${escA(m[1])}"><button type="submit">Delete it</button></form> <a href="/edit/${escA(m[1])}">Cancel</a>`,
      }));
    }

    if ((p === '/feed.xml' || p === '/rss.xml' || p === '/feed.atom' || p === '/feed.json' || p === '/feed') && req.method === 'GET') {
      const posts = await listPosts();
      const accept = req.headers.accept || '';
      const kind = p === '/feed.atom' ? 'atom' : p === '/feed.json' ? 'json' : p === '/feed'
        ? (accept.includes('json') ? 'json' : accept.includes('atom') ? 'atom' : 'rss') : 'rss';
      if (kind === 'atom') return send(req, res, 200, atomFeed(posts, cfg), { 'Content-Type': 'application/atom+xml; charset=utf-8' });
      if (kind === 'json') return send(req, res, 200, jsonFeed(posts, cfg), { 'Content-Type': 'application/feed+json; charset=utf-8' });
      return send(req, res, 200, rssFeed(posts, cfg), { 'Content-Type': 'application/rss+xml; charset=utf-8' });
    }
    if (p === '/sitemap.xml') {
      const posts = await listPosts();
      const urls = [SITE_URL, ...posts.map(p2 => `${SITE_URL}/post/${p2.slug}`)]
        .map(url => `<url><loc>${escX(url)}</loc></url>`).join('');
      return send(req, res, 200, `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { 'Content-Type': 'application/xml; charset=utf-8' });
    }
    if (p === '/robots.txt') return send(req, res, 200, `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`, { 'Content-Type': 'text/plain; charset=utf-8' });

    if (p === '/webmention' && req.method === 'POST') {
      const f = parseForm(await readBody(req));
      const target = f.target, source = f.source;
      const tm = target && new URL(target, SITE_URL).pathname.match(/^\/post\/([^/]+)$/);
      if (!source || !tm || !(await getPost(tm[1]))) { res.writeHead(400); return res.end('invalid source/target'); }
      res.writeHead(202); res.end('accepted');
      (async () => {
        const r = await fetch(source).catch(() => null);
        if (!r) return;
        const text = await r.text();
        if (!text.includes(target)) return;
        await appendMention(tm[1], { source, target, created: new Date().toISOString(), approved: true });
      })();
      return;
    }

    if (p === '/') {
      const drafted = !auth;
      const all = await listPosts({ includeDrafts: admin });
      const page = Math.max(1, Number(u.searchParams.get('page')) || 1);
      const per = cfg.postsPerPage;
      const slice = all.slice((page - 1) * per, page * per);
      const pages = Math.max(1, Math.ceil(all.length / per));
      const items = slice.map(post => postArticle(cfg, post)).join('') ||
        (drafted ? '<p>This blog has not been configured yet. Visit <a href="/setup">/setup</a> to get started.</p>' : `<p>${esc(cfg.title)} doesn't have any posts yet.</p>`);
      const pager = all.length ? `<div id="pager">${page > 1 ? `<a href="/?page=${page - 1}">&laquo;</a>` : '&laquo;'} ${Array.from({ length: pages }, (_, i) => i + 1).map(n => n === page ? `<strong>${n}</strong>` : `<a href="/?page=${n}">${n}</a>`).join(' ')} ${page < pages ? `<a href="/?page=${page + 1}">&raquo;</a>` : '&raquo;'}</div>` : '';
      const recent = all.slice(0, cfg.recentCount);
      const aside = recent.length ? `<aside><strong>Recent posts</strong><ul>${recent.map(r => `<li><a href="/post/${escA(r.slug)}">${esc(r.meta.title)}</a></li>`).join('')}</ul></aside>` : '';
      return sendHtml(req, res, 200, layout(cfg, {
        admin, jsonld: { '@context': 'https://schema.org', '@type': 'Blog', name: cfg.title, description: cfg.description, url: SITE_URL },
        body: `${items}${pager}${aside}`,
      }));
    }

    m = p.match(/^\/post\/([^/]+)$/);
    if (m) {
      const post = await getPost(m[1]);
      if (!post || (post.meta.draft && !admin)) return sendHtml(req, res, 404, layout(cfg, { title: 'Not found', admin, body: '<p>No such post.</p>' }));
      const url = `${SITE_URL}/post/${post.slug}`;
      if (req.method === 'POST') {
        const f = parseForm(await readBody(req));
        const tokenOk = /^\d+\.[0-9a-f]{64}$/.test(f.ts || '') && (() => {
          const [ts, sig] = f.ts.split('.');
          const expect = createHmac('sha256', auth?.secret || 'anon').update(ts).digest('hex');
          const age = Date.now() - Number(ts);
          return sig === expect && age > 3000 && age < 86400000;
        })();
        if (!f.hp && f.content && tokenOk) {
          await appendComment(post.slug, { id: randomUUID(), name: f.name || 'Anonymous', url: f.url || '', content: f.content.slice(0, 5000), created: new Date().toISOString(), approved: true });
        }
        return redirect(res, `/post/${post.slug}#comments`);
      }
      const comments = await listComments(post.slug);
      const mentions = await listMentions(post.slug);
      const ts = Date.now().toString();
      const token = `${ts}.${createHmac('sha256', auth?.secret || 'anon').update(ts).digest('hex')}`;
      const commentsHtml = comments.map(c => `<div class="h-cite"><strong class="p-author">${esc(c.name)}</strong> <time class="dt-published">${new Date(c.created).toDateString()}</time><div class="e-content">${renderComment(c.content)}</div></div>`).join('') || '<p class="faint">No comments yet.</p>';
      const mentionsHtml = mentions.length ? `<h3>Webmentions</h3><ul>${mentions.map(w => `<li><a href="${escA(w.source)}">${escA(w.source)}</a></li>`).join('')}</ul>` : '';
      const commentForm = form(`/post/${post.slug}`, [
        { name: 'name', label: 'Name' }, { name: 'url', label: 'Website (optional)' },
        { name: 'content', label: 'Comment', type: 'textarea', rows: 5 },
        { name: 'hp', type: 'hp' }, { name: 'ts', type: 'hidden', value: token },
      ]);
      return sendHtml(req, res, 200, layout(cfg, {
        title: post.meta.title, url, admin,
        jsonld: { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.meta.title, datePublished: post.meta.created, dateModified: post.meta.updated || post.meta.created, url, author: cfg.author?.name ? { '@type': 'Person', name: cfg.author.name } : undefined },
        body: `${postArticle(cfg, post, { full: true })}<section id="comments"><h3>Comments</h3>${commentsHtml}${commentForm}</section>${mentionsHtml}`,
      }));
    }

    sendHtml(req, res, 404, layout(cfg, { title: 'Not found', admin, body: '<p>Nothing here.</p>' }));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal error.');
  }
});

await ensureDir(DATA);
server.listen(PORT, async () => {
  console.log(`Aperte 2 listening on ${SITE_URL}`);
  try {
    const [self, license] = await Promise.all([stat(fileURLToPath(import.meta.url)), stat(path.join(HERE, 'LICENSE'))]);
    console.log(`index.js is ${self.size}B; the GPLv3 licensing it is ${license.size}B. Still the shorter document.`);
  } catch {}
});

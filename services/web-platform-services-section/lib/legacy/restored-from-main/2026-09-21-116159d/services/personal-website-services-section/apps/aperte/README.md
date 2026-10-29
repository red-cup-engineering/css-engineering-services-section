# Aperte 2

Aperte was a flatfile PHP blog engine emsenn wrote in 2008, forked from Marz's
OpenBlag. Its source lives on in [lib/legacy/2008-aperte/source.org](lib/legacy/2008-aperte/source.org),
moved here from its old home under `personal-services-section` so it sits
next to its successor.

This is that successor: the same idea — a blog that is nothing but flat files
on disk and one script that serves them — rebuilt in modern Node, eighteen
years later, to see how far "simple and clean, dedicated to remaining
lightweight" can be pushed when the file staying small is a hard constraint
rather than a slogan.

## The rule

The whole engine is [index.js](index.js): one file, zero dependencies
(nothing in `package.json` but Node itself), runnable with `node index.js`.
And it has to stay smaller, in bytes, than [LICENSE](LICENSE) — the GPLv3
text that covers it, same as the original. At last count:

```
$ node index.js
Aperte 2 listening on http://localhost:8080
index.js is 30384B; the GPLv3 licensing it is 35149B. Still the shorter document.
```

It prints that comparison on every boot, because a joke worth making is worth
verifying at runtime.

## Running it

```
node index.js                 # serves on :8080, data in ./data
PORT=3000 node index.js       # pick a port
APERTE_URL=https://you.example node index.js   # site URL (feeds, webmention, OG tags)
APERTE_DATA=/path/to/data node index.js        # where posts/comments/config live
```

Visit `/setup` on first run to name the blog and create the admin account.
Everything after that — new posts, comments, config — happens through plain
HTML forms; there is no build step and no client-side JavaScript.

## What it keeps from 2008

- Flat files, no database: posts are Markdown files with a small frontmatter
  header, comments and webmentions are append-only JSON-lines files.
- A "recent posts" sidebar and simple numbered pagination.
- Configurable title, description, and accent color.
- A "Powered by Aperte" footer, same as ever.
- Comments open to anyone, no accounts required.

## What it drops

- The GD-rendered image CAPTCHA (inaccessible, and easy to defeat with OCR
  anyway) — replaced by a honeypot field plus a signed minimum-fill-time
  check, which is both more accessible and, per the current state of comment
  spam, more effective.
- The multi-blog "server mode" that let strangers spin up sub-blogs under
  your install. It was a neat trick in 2008; today it's just an open abuse
  vector for a personal site, so this app is single-blog only.
- Unescaped `TITLE`/`DESC`/`SERVMSG` echoed straight into the page (the
  original's actual reflected-XSS surface). Everything user-supplied is
  HTML-escaped by default here; only the admin's own post bodies get to
  contain raw HTML, since only the admin can write them.
- `whirlpool` password hashes → `scrypt` with a timing-safe comparison.

## What it adds, to hold its own on the 2026 web

- **Three feed formats from one post store**: RSS 2.0, Atom 1.0, and JSON
  Feed 1.1 at `/feed.xml`, `/feed.atom`, `/feed.json`, plus a content-negotiated
  `/feed` that picks one from `Accept`.
- **Microformats2** (`h-entry`, `h-feed`, `p-name`, `e-content`,
  `dt-published`, `p-author`, `h-card`, `rel=me`) so feed readers, webmention
  senders, and IndieWeb tooling can parse a post without a special API.
- **schema.org JSON-LD** (`Blog` / `BlogPosting`) alongside Open Graph and
  Twitter Card meta, for the crawlers and link-unfurlers that want structured
  data instead.
- **Webmention**, both directions: it advertises an endpoint (`Link` header
  and `<link rel=webmention>`), verifies and stores incoming mentions against
  the post they claim to reference, and fires outgoing webmentions itself
  when a new post links out to a site that supports them.
- **Conditional GET and compression**: ETags with `304 Not Modified`, and
  brotli/gzip/deflate negotiated per request via `Accept-Encoding` — all
  from Node's built-in `zlib`, nothing external.
- `sitemap.xml` and `robots.txt`, generated from the same post list as
  everything else.
- Baseline security headers (`X-Content-Type-Options`, `Referrer-Policy`) and
  an HMAC-signed, `HttpOnly` session cookie instead of a hand-rolled
  auth-in-the-URL scheme.
- Drafts: posts can be saved unpublished, visible only to the logged-in
  admin, and excluded from feeds/sitemap/listing until published.

## Layout

```
index.js                 the entire engine
package.json              name, engines, zero dependencies
LICENSE                   GPLv3 — the file index.js has to stay shorter than
lib/legacy/2008-aperte/   the 2008 original this one succeeds
data/                     created at runtime; not committed
```

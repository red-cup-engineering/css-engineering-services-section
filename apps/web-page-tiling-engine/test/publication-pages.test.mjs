import assert from 'node:assert/strict';
import test from 'node:test';

import { parseCell } from '@red-cup-engineering/knowledge-system-server/catalog';
import { renderAtlasPage, renderIndexPage, renderPage } from '../src/tufte-publication.mjs';

const source = `---
title: A Test Cell
date-created: 2020-09-26
type: note
first-published-at: https://old.example/essay/
archived-at: https://web.archive.org/web/20201001000000/https://old.example/essay/
republished: 2026-09-27
tags:
- testing
---

Republished body.`;

const cell = parseCell('essay', source);
const site = Object.freeze({
  name: 'Site', baseIri: 'https://site.example/', language: 'en', menu: Object.freeze([]), license: 'Test',
});

test('publication renderers use the TUFTE document path and preserve public provenance', () => {
  const page = renderPage(cell, { site, cells: new Map([[cell.name, cell]]), incoming: new Map(), resolve: () => null });
  assert.match(page, /data-tufte/u);
  assert.match(page, /<article class="h-entry"/u);
  assert.match(page, /First published <time class="dt-published" datetime="2020-09-26">/u);
  assert.match(page, /republished here <time class="dt-updated" datetime="2026-09-27">/u);
  assert.match(page, /"isBasedOn":"https:\/\/old\.example\/essay\/"/u);

  const index = renderIndexPage([cell], { site });
  const atlas = renderAtlasPage([cell], { site });
  assert.match(index, /data-tufte/u);
  assert.match(index, /href="\/essay\/"/u);
  assert.match(atlas, /data-tufte/u);
  assert.match(atlas, /Open page/u);
});

test('a cell with profile-name is a ProfilePage whose main entity is that Person; others are unchanged', () => {
  const profile = parseCell('about-someone', '---\ntitle: About Someone\ndate-created: 2026-09-29\ntype: note\nprofile-name: Someone Real\n---\n\nBody.');
  const ctx = (c) => ({ site, cells: new Map([[c.name, c]]), incoming: new Map(), resolve: () => null });
  const page = renderPage(profile, ctx(profile));
  assert.match(page, /"@type":"ProfilePage"/u);
  assert.match(page, /"mainEntity":\{"@id":"https:\/\/site\.example\/about-someone\/#person"\}/u);
  assert.match(page, /"@type":"Person","name":"Someone Real"/u);
  assert.doesNotMatch(renderPage(cell, ctx(cell)), /ProfilePage|"Person"/u);
});

test('page-title overrides the document title; a title equal to the site name is not doubled', () => {
  const ctx = (c) => ({ site, cells: new Map([[c.name, c]]), incoming: new Map(), resolve: () => null });
  const titled = parseCell('t', '---\ntitle: Short\ndate-created: 2026-09-29\ntype: note\npage-title: A Longer Search Title\n---\n\nBody.');
  assert.match(renderPage(titled, ctx(titled)), /<title>A Longer Search Title<\/title>/u);
  const same = parseCell('s', '---\ntitle: Site\ndate-created: 2026-09-29\ntype: note\n---\n\nBody.');
  assert.match(renderPage(same, ctx(same)), /<title>Site<\/title>/u);
  assert.match(renderPage(cell, ctx(cell)), /<title>A Test Cell — Site<\/title>/u);
});

test('a site supplies its own TUFTE theme as a value; unknown or malformed themes resolve to none', () => {
  const themed = { ...site, tufteTheme: { name: 'quiet-press', styles: 'body[data-tufte-theme=quiet-press] .tufte-tile{border:0}', themeColor: '#1D4A36' } };
  const page = renderPage(cell, { site: themed, cells: new Map([[cell.name, cell]]), incoming: new Map(), resolve: () => null });
  assert.match(page, /<body[^>]*data-tufte-theme="quiet-press"/u);
  assert.match(page, /body\[data-tufte-theme=quiet-press\] \.tufte-tile\{border:0\}/u);
  assert.match(page, /name="theme-color" content="#1D4A36"/u);
  const plain = renderPage(cell, { site: { ...site, tufteTheme: { name: 'bad name', styles: '' } }, cells: new Map([[cell.name, cell]]), incoming: new Map(), resolve: () => null });
  assert.doesNotMatch(plain, /data-tufte-theme/u);
});

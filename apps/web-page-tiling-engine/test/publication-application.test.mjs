import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_THEME } from '@red-cup-engineering/web-theming-service/theming';
import { createTuftePublicationApplication } from '../src/tufte-publication.mjs';

const catalog = Object.freeze({
  cells: new Map(),
  redirects: new Map(),
  incoming: new Map(),
  chaptersByPaper: new Map(),
});

const site = Object.freeze({
  name: 'Fixture publication',
  baseIri: 'https://example.test/',
  language: 'en',
  license: 'CC0',
  menu: Object.freeze([]),
  archives: Object.freeze({ enabled: false, pageSize: 20 }),
  discovery: Object.freeze({}),
});

test('one declared TUFTE publication route set supplies both live pages and static projectors', () => {
  const application = createTuftePublicationApplication({ catalog, site, theme: DEFAULT_THEME });
  const paths = application.publicationRoutes.map(({ path }) => path);
  assert.ok(paths.includes('index.html'));
  assert.ok(paths.includes('feed.rss.xml'));
  assert.ok(paths.includes('feed.atom.xml'));
  assert.ok(paths.includes('feed.json'));
  assert.ok(paths.includes('sitemap.xml'));
  assert.ok(paths.includes('robots.txt'));
  assert.ok(paths.includes('404.html'));
  assert.ok(paths.includes('search/index.html'));

  const projectedPaths = application.publicationProjectors
    .flatMap((projector) => projector.project().artifacts.map(({ path }) => path));
  assert.deepEqual([...projectedPaths].sort(), [...paths].sort());
});

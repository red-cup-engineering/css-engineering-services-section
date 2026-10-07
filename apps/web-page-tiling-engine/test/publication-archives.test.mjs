import assert from 'node:assert/strict';
import test from 'node:test';

import { projectWebPublicationArchives } from '../src/publication/publication-archives.mjs';

const items = [
  { id: 'notes/new', title: 'New', sections: ['notes'], tags: ['Web'], type: 'note', status: 'stable' },
  { id: 'notes/old', title: 'Old', sections: ['notes'], tags: ['Web', 'History'], type: 'note', status: 'active' },
  { id: 'letters/one', title: 'Letter', sections: ['letters'], tags: ['History'], type: 'letter', status: 'active' },
];

test('projects complete and paged archives while preserving caller order', () => {
  const projection = projectWebPublicationArchives(items, { baseUrl: 'https://example.test/', pageSize: 2 });
  const pageOne = projection.routes.find(({ path }) => path === 'index.html');
  const pageTwo = projection.routes.find(({ path }) => path === 'page/2/index.html');
  const complete = projection.routes.find(({ path }) => path === 'archive/index.html');
  assert.deepEqual(pageOne.page.items.map(({ id }) => id), ['notes/new', 'notes/old']);
  assert.equal(pageOne.url, 'https://example.test/');
  assert.deepEqual(pageTwo.page.items.map(({ id }) => id), ['letters/one']);
  assert.equal(pageTwo.url, 'https://example.test/page/2/');
  assert.deepEqual(pageTwo.links, {
    self: 'https://example.test/page/2/', first: 'https://example.test/',
    previous: 'https://example.test/', next: null, last: 'https://example.test/page/2/',
  });
  assert.deepEqual(complete.items.map(({ id }) => id), items.map(({ id }) => id));
  assert.equal(complete.url, 'https://example.test/archive/');
});

test('indexes sections, tags, types, and statuses with canonical term URLs', () => {
  const projection = projectWebPublicationArchives(items, { baseUrl: 'https://example.test/' });
  for (const dimension of ['section', 'tag', 'type', 'status']) {
    assert.ok(projection.taxonomyIndexes.some((index) => index.dimension === dimension));
  }
  const web = projection.taxonomyIndexes.find(({ dimension }) => dimension === 'tag').terms.find(({ key }) => key === 'web');
  assert.deepEqual(web, {
    dimension: 'tag', key: 'web', label: 'Web', count: 2,
    route: 'tags/web', url: 'https://example.test/tags/web/',
  });
  assert.ok(projection.routes.some(({ path }) => path === 'notes/archive/index.html'));
  assert.ok(projection.routes.some(({ path }) => path === 'types/note/index.html'));
  assert.ok(projection.routes.some(({ path }) => path === 'statuses/active/index.html'));
});

test('reports and omits reserved and normalized route collisions', () => {
  const projection = projectWebPublicationArchives([
    { id: 'a', title: 'A', tags: ['C++'] },
    { id: 'b', title: 'B', tags: ['C#'] },
  ], { baseUrl: 'https://example.test/', reservedPaths: ['archive/index.html'] });
  assert.ok(projection.diagnostics.some(({ subject, details }) => subject === 'archive/index.html' && details.conflictingOwner === 'reserved'));
  assert.ok(projection.diagnostics.some(({ subject }) => subject === 'tags/c/index.html'));
  assert.equal(projection.routes.filter(({ path }) => path === 'tags/c/index.html').length, 1);
  assert.equal(projection.routes.some(({ path }) => path === 'archive/index.html'), false);
});

test('rejects invalid inputs and pagination sizes', () => {
  assert.throws(() => projectWebPublicationArchives([], { baseUrl: '/relative' }), /absolute URL/);
  assert.throws(() => projectWebPublicationArchives([], { baseUrl: 'https://example.test/', pageSize: 0 }), /positive safe integer/);
  assert.throws(() => projectWebPublicationArchives([{ id: '', title: 'No' }], { baseUrl: 'https://example.test/' }), /items\[0\]\.id/);
});

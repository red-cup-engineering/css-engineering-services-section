import test from 'node:test';
import assert from 'node:assert/strict';
import { exportBrowserLocalState, importBrowserLocalState, openBrowserLocalState } from '../src/browser-local-state.mjs';

const validate = (value) => value && value.schema === 1 && typeof value.count === 'number' ? { schema: 1, count: value.count } : null;
const create = () => ({ schema: 1, count: 0 });

function memoryStorage() {
  const map = new Map();
  return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: (key) => map.delete(key), map };
}

test('valid state persists and round-trips through the schema validator', () => {
  const storage = memoryStorage();
  const opened = openBrowserLocalState({ key: 'a', create, validate, getStorage: () => storage });
  assert.equal(opened.mode, 'persistent');
  assert.equal(opened.save({ schema: 1, count: 3 }), true);
  assert.deepEqual(openBrowserLocalState({ key: 'a', create, validate, getStorage: () => storage }).state, { schema: 1, count: 3 });
  assert.deepEqual(importBrowserLocalState(exportBrowserLocalState({ schema: 1, count: 3 }, validate), validate), { schema: 1, count: 3 });
});

test('corrupt persisted bytes stay unchanged during session-mode saves and only explicit replacement changes them', () => {
  const storage = memoryStorage(); storage.setItem('a', '{broken');
  const opened = openBrowserLocalState({ key: 'a', create, validate, getStorage: () => storage });
  assert.equal(opened.mode, 'session');
  assert.equal(opened.save({ schema: 1, count: 4 }), false);
  assert.equal(storage.map.get('a'), '{broken');
  assert.equal(opened.replace({ schema: 1, count: 4 }), true);
  assert.equal(storage.map.get('a'), '{"schema":1,"count":4}');
});

test('an unavailable localStorage getter runs as session-only state', () => {
  const opened = openBrowserLocalState({ key: 'a', create, validate, getStorage: () => { throw new Error('blocked'); } });
  assert.equal(opened.mode, 'session');
  assert.equal(opened.save({ schema: 1, count: 1 }), false);
  assert.equal(opened.state.count, 1);
});

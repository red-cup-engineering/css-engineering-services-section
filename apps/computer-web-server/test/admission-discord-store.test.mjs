// Discord admission's journal store, and the read-once import of what a D1 (SQLite) database held.
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createSemanticRecordJournal } from '@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record';
import { DISCORD_ADMISSION_OBJECT_KIND, DISCORD_ADMISSION_TABLES, createDiscordAdmissionStore } from "../src/admission/discord-store.mjs";

function freshRoot(t, name) {
  const root = mkdtempSync(join(tmpdir(), name));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test('a row is its highest revision, a removal is told denied, and every revision stays in the journal', (t) => {
  const root = freshRoot(t, 'discord-store-');
  const store = createDiscordAdmissionStore({ root });
  assert.equal(store.oauthSessions.read('s1'), null);
  store.oauthSessions.write('s1', { session_hash: 's1', retry_after: 0 });
  store.oauthSessions.write('s1', { session_hash: 's1', retry_after: 9 });
  assert.deepEqual(store.oauthSessions.read('s1'), { session_hash: 's1', retry_after: 9 });
  store.oauthSessions.write('s1', null);
  assert.equal(store.oauthSessions.read('s1'), null);
  assert.deepEqual(store.oauthSessions.rows(), []);

  const history = createSemanticRecordJournal({ root, objectKind: DISCORD_ADMISSION_OBJECT_KIND }).query({ category: DISCORD_ADMISSION_TABLES.oauthSessions });
  assert.deepEqual(history.map((entry) => entry.record.revision), [1, 2, 3]);
  assert.deepEqual(history.map((entry) => entry.told), [{ for: true, against: false }, { for: true, against: false }, { for: false, against: true }]);
  // A reopened store reads the same rows from the journal.
  assert.equal(createDiscordAdmissionStore({ root }).oauthSessions.read('s1'), null);
});

test('an update writes only what its change returns, as one step', (t) => {
  const store = createDiscordAdmissionStore({ root: freshRoot(t, 'discord-store-update-') });
  const once = (row) => (row === null || row.approved_at !== null ? undefined : { ...row, approved_at: 5 });
  assert.deepEqual(store.atomically(() => store.commandChallenges.update('c', once)), { before: null, after: null });
  store.commandChallenges.write('c', { challenge_hash: 'c', approved_at: null });
  assert.deepEqual(store.atomically(() => store.commandChallenges.update('c', once)).after, { challenge_hash: 'c', approved_at: 5 });
  const second = store.atomically(() => store.commandChallenges.update('c', once));
  assert.equal(second.before, second.after, 'a challenge is approved once');
  store.interactionSessions.write('i', { session_hash: 'i' });
  assert.deepEqual(store.interactionSessions.rows(), [{ session_hash: 'i' }]);
});

test('a rate-limit window is one rewritten file per source, never a journal record, and is removed once it ends', (t) => {
  const root = freshRoot(t, 'discord-store-rate-');
  const store = createDiscordAdmissionStore({ root });
  const a = 'a'.repeat(64), b = 'b'.repeat(64);
  assert.deepEqual(store.atomically(() => store.rateLimits.hit(a, 100, 60)), { attempts: 1, reset_at: 160 });
  assert.deepEqual(store.atomically(() => store.rateLimits.hit(a, 130, 60)), { attempts: 2, reset_at: 160 });
  assert.deepEqual(store.atomically(() => store.rateLimits.hit(a, 160, 60)), { attempts: 1, reset_at: 220 }, 'an ended window starts again');
  store.atomically(() => store.rateLimits.hit(b, 300, 60));
  assert.equal(store.rateLimits.read(a), null, 'another source\'s hit removes a window that has ended');
  assert.deepEqual(readdirSync(join(root, '.discord-admission', 'rate-limits')), [`${b}.json`]);
  assert.deepEqual(readdirSync(root), ['.discord-admission'], 'no rate-limit hit is journaled: only the window files exist');
  assert.throws(() => store.rateLimits.hit('../escape', 1, 60), TypeError);
});


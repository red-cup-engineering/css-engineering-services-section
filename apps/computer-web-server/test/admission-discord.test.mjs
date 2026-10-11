import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after } from 'node:test';
import { DiscordUserAuthorizationError } from '@red-cup-engineering/discord-rest-transport-service/user-oauth';
import {
  beginDiscordLogin,
  completeDiscordLogin,
  discordSubjectHash,
  identifyDiscord,
  logoutDiscord,
  purgeExpiredDiscordSessions,
  resolveDiscordSettings,
} from "../src/admission/discord.mjs";
import { sealConfidential } from "../src/admission/session.mjs";
import { createDiscordAdmissionStore } from "../src/admission/discord-store.mjs";

const SECRET = 'test-session-secret-value-long-enough';
const GUILD_ID = '1184863861065658419';
const USER_ID = '1184863861065658420';
const ROLE_ID = '1346540684810915973';
const url = (path) => new URL(`https://vault.example${path}`);
const cookieValue = (setCookie) => setCookie.split(';')[0];

const roots = [];
after(() => { for (const root of roots) rmSync(root, { recursive: true, force: true }); });
/** Discord admission's journal store under a fresh root, its OAuth sessions readable as `rows`. */
function sessionStore() {
  const root = mkdtempSync(join(tmpdir(), 'discord-oauth-store-'));
  roots.push(root);
  const store = createDiscordAdmissionStore({ root });
  return Object.freeze({ ...store, get rows() { return new Map(store.oauthSessions.rows().map((row) => [row.session_hash, row])); } });
}

function settings(overrides = {}) {
  return { clientId: '1346540684810915972', clientSecret: 'discord-client-secret', guildId: GUILD_ID, roleId: ROLE_ID, sessionSecret: SECRET, publicBaseUrl: 'https://vault.example', ...overrides };
}

function discordCalls(options = {}) {
  const state = { memberCalls: 0, revocations: 0, refreshes: 0 };
  return {
    state,
    async exchange(code, config) {
      assert.equal(code, 'authorization-code');
      assert.equal(config.redirectUri, 'https://vault.example/oauth/discord/callback');
      assert.ok(config.codeVerifier.length >= 43);
      return { accessToken: 'access-one', refreshToken: 'refresh-one', expiresIn: options.expiresIn ?? 3600, tokenType: 'Bearer', scopes: ['identify', 'guilds.members.read'] };
    },
    async refresh(refreshToken) {
      state.refreshes += 1;
      assert.equal(refreshToken, 'refresh-one');
      return { accessToken: 'access-two', refreshToken: 'refresh-two', expiresIn: 3600, tokenType: 'Bearer', scopes: ['identify', 'guilds.members.read'] };
    },
    async revoke() { state.revocations += 1; },
    async currentUser() { return { id: USER_ID, username: 'reader', globalName: 'Island Reader' }; },
    async currentMember(accessToken) {
      state.memberCalls += 1;
      if (state.refreshes > 0) assert.equal(accessToken, 'access-two');
      return { roles: options.roles ?? [ROLE_ID], pending: options.pending ?? false };
    },
  };
}

async function beginAndComplete(db, calls, now = Date.now) {
  const begun = beginDiscordLogin(settings(), url('/oauth/discord/login?return_to=%2F%23%2Fhalls'), now);
  const target = new URL(begun.redirect);
  const completed = await completeDiscordLogin(
    settings(), db,
    new Request(url('/oauth/discord/callback'), { headers: { cookie: cookieValue(begun.cookies[0]) } }),
    url(`/oauth/discord/callback?code=authorization-code&state=${encodeURIComponent(target.searchParams.get('state'))}`),
    now, calls,
  );
  return { begun, target, completed };
}

const sessionCookieOf = (completed) => cookieValue(completed.cookies.find((cookie) => cookie.startsWith('web_discord_session=')));

test('Discord login refuses missing or non-snowflake deployment authority', () => {
  for (const name of ['clientId', 'clientSecret', 'guildId', 'roleId', 'sessionSecret']) {
    const resolved = resolveDiscordSettings(settings({ [name]: '' }));
    assert.equal(resolved.configured, false);
    assert.ok(resolved.missing.includes(name));
  }
  assert.deepEqual(resolveDiscordSettings(settings({ roleId: 'islander' })).malformed, ['roleId']);
  assert.equal(beginDiscordLogin(settings({ roleId: '' }), url('/oauth/discord/login')).status, 503);
});

test('Discord consent asks only for identity and current membership, with state and S256 PKCE', () => {
  const begun = beginDiscordLogin(settings(), url('/oauth/discord/login'));
  assert.equal(begun.status, 302);
  const target = new URL(begun.redirect);
  assert.equal(target.origin, 'https://discord.com');
  assert.deepEqual(target.searchParams.get('scope').split(' ').sort(), ['guilds.members.read', 'identify']);
  assert.equal(target.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(target.searchParams.get('redirect_uri'), 'https://vault.example/oauth/discord/callback');
  assert.match(cookieValue(begun.cookies[0]), /^web_discord_oauth=v1\./u, 'the PKCE verifier is sealed, not merely signed');
  for (const attribute of [/HttpOnly/u, /Secure/u, /SameSite=Lax/u]) assert.match(begun.cookies[0], attribute);
});

test('only a current member holding the role receives an opaque session backed by encrypted tokens', async () => {
  const db = sessionStore();
  const calls = discordCalls();
  const { completed } = await beginAndComplete(db, calls);
  assert.equal(completed.status, 302);
  assert.equal(completed.redirect, '/#/halls');
  const sessionCookie = sessionCookieOf(completed);
  const browserToken = sessionCookie.split('=')[1];
  const [row] = db.rows.values();
  assert.notEqual(row.session_hash, browserToken, 'the store keeps only a hash of the browser bearer');
  assert.equal(row.authorization_ciphertext.includes('access-one'), false);
  assert.equal(row.authorization_ciphertext.includes('refresh-one'), false);
  assert.equal(row.subject_hash, discordSubjectHash(USER_ID));

  const identity = await identifyDiscord(settings(), db, new Request(url('/api/v1/me'), { headers: { cookie: sessionCookie } }), Date.now, calls);
  assert.deepEqual(identity, { provider: 'discord', subject: `discord:${USER_ID}`, subjectHash: row.subject_hash, label: 'Island Reader' });
  assert.equal(calls.state.memberCalls, 2, 'membership is observed at callback and again for the protected request');
});

test('missing, pending, and removed roles fail closed', async () => {
  for (const options of [{ roles: [] }, { roles: [ROLE_ID], pending: true }]) {
    const db = sessionStore();
    const calls = discordCalls(options);
    const { completed } = await beginAndComplete(db, calls);
    assert.equal(completed.status, 403);
    assert.equal(db.rows.size, 0);
    assert.equal(calls.state.revocations, 1);
  }
  const db = sessionStore();
  const calls = discordCalls();
  const { completed } = await beginAndComplete(db, calls);
  const sessionCookie = sessionCookieOf(completed);
  calls.currentMember = async () => ({ roles: [], pending: false });
  assert.equal(await identifyDiscord(settings(), db, new Request(url('/'), { headers: { cookie: sessionCookie } }), Date.now, calls), null);
  assert.equal(db.rows.size, 0, 'role removal deletes the local session rather than caching authority');
});

test('expired access is refreshed server-side and logout deletes and revokes it', async () => {
  let current = Date.now();
  const now = () => current;
  const db = sessionStore();
  const calls = discordCalls({ expiresIn: 1 });
  const { completed } = await beginAndComplete(db, calls, now);
  const sessionCookie = sessionCookieOf(completed);
  current += 120_000;
  const request = new Request(url('/api/v1/me'), { headers: { cookie: sessionCookie } });
  assert.ok(await identifyDiscord(settings(), db, request, now, calls));
  assert.equal(calls.state.refreshes, 1);
  const logout = await logoutDiscord(settings(), db, request, calls);
  assert.equal(db.rows.size, 0);
  assert.equal(calls.state.revocations, 1);
  assert.ok(logout.cookies.every((cookie) => cookie.includes('Max-Age=0')));
});

test('a concurrent refresh winner is reloaded instead of losing the session', async () => {
  let current = Date.now();
  const now = () => current;
  const db = sessionStore();
  const calls = discordCalls({ expiresIn: 1 });
  const { completed } = await beginAndComplete(db, calls, now);
  const sessionCookie = sessionCookieOf(completed);
  current += 120_000;
  const [row] = db.rows.values();
  calls.refresh = async () => {
    db.oauthSessions.write(row.session_hash, { ...row, authorization_ciphertext: sealConfidential({ accessToken: 'winner-access', refreshToken: 'winner-refresh' }, SECRET),
      authorization_version: row.authorization_version + 1, token_expires_at: Math.floor(current / 1000) + 3600 });
    throw new Error('rotated refresh token lost the race');
  };
  calls.currentMember = async (accessToken) => { assert.equal(accessToken, 'winner-access'); return { roles: [ROLE_ID], pending: false }; };
  const identity = await identifyDiscord(settings(), db, new Request(url('/api/v1/me'), { headers: { cookie: sessionCookie } }), now, calls);
  assert.equal(identity.provider, 'discord');
  assert.equal(db.rows.size, 1);
});

test('Discord rate limits persist bounded backoff and are retryable without deleting authority', async () => {
  const db = sessionStore();
  const calls = discordCalls();
  const { completed } = await beginAndComplete(db, calls);
  const request = new Request(url('/api/v1/me'), { headers: { cookie: sessionCookieOf(completed) } });
  calls.currentMember = async () => { throw new DiscordUserAuthorizationError('rate_limited', 'slow down', { status: 429, retryAfter: 7 }); };
  assert.deepEqual(await identifyDiscord(settings(), db, request, Date.now, calls), { unavailable: true, retryAfter: 7 });
  assert.equal(db.rows.size, 1);
  assert.equal(calls.state.memberCalls, 1, 'the callback was the only successful member observation');
  const backedOff = await identifyDiscord(settings(), db, request, Date.now, calls);
  assert.equal(backedOff.unavailable, true);
  assert.ok(backedOff.retryAfter >= 1 && backedOff.retryAfter <= 7);
});

test('the scheduled retention sweep revokes and deletes expired encrypted sessions', async () => {
  const db = sessionStore();
  const calls = discordCalls();
  await beginAndComplete(db, calls);
  const [row] = db.rows.values();
  db.oauthSessions.write(row.session_hash, { ...row, session_expires_at: 1 });
  assert.deepEqual(await purgeExpiredDiscordSessions(settings(), db, () => Date.now(), calls), { purged: 1 });
  assert.equal(calls.state.revocations, 1);
  assert.equal(db.rows.size, 0);
});

test('a callback without its sealed transaction or with mismatched state is refused', async () => {
  const db = sessionStore();
  const calls = discordCalls();
  const absent = await completeDiscordLogin(settings(), db, new Request(url('/')), url('/oauth/discord/callback?code=authorization-code&state=s'), Date.now, calls);
  assert.equal(absent.error, 'discord-login-expired');
  const begun = beginDiscordLogin(settings(), url('/oauth/discord/login'));
  const mismatch = await completeDiscordLogin(settings(), db, new Request(url('/'), { headers: { cookie: cookieValue(begun.cookies[0]) } }), url('/oauth/discord/callback?code=authorization-code&state=attacker'), Date.now, calls);
  assert.equal(mismatch.error, 'discord-state-mismatch');
  assert.equal((await completeDiscordLogin(settings(), null, new Request(url('/')), url('/oauth/discord/callback?code=c&state=s'), Date.now, calls)).error, 'discord-session-store-unconfigured');
});

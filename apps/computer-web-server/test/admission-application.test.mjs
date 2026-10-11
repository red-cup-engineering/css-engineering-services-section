// The gate. What an anonymous request may reach, what an admitted one carries,
// and what only the author may do.
import assert from 'node:assert/strict';
import test from 'node:test';
import { applyMigrations } from '@red-cup-engineering/cloudflare-d1-service/migrations';
import { createSqliteD1 } from '@red-cup-engineering/cloudflare-d1-service/sqlite';
import { ADMISSION_MIGRATIONS } from "../src/admission/schema.mjs";
import {
  CLAIM_AUTHOR,
  CLAIM_EMAIL,
  CLAIM_PROVIDER,
  CLAIM_SUBJECT,
  canonicalPath,
  createWebAdmissionApplication,
  defaultPublicRoute,
} from "../src/admission/application.mjs";
import {
  acceptDiscordGatewayCommand,
  createDiscordCommandChallenge,
  pollDiscordCommandChallenge,
} from "../src/admission/discord-command.mjs";
import { createSessionCookie } from "../src/admission/session.mjs";
import { subjectHashOf } from "../src/admission/google.mjs";
import { createHmac } from 'node:crypto';

const SECRET = 'test-session-secret-value';
const READER = 'reader@example.test';
const ORIGIN = 'https://vault.example';
const KEY = 'a'.repeat(64);
const google = { clientId: 'client-id', clientSecret: 'client-secret', sessionSecret: SECRET, allowedEmails: READER };

function context(path, init = {}) {
  const request = new Request(`${ORIGIN}${path}`, init);
  return { request, url: new URL(request.url), params: {}, locals: {}, trace: { kind: 'web-server.request-trace', id: 'trace-1', entries: [] } };
}

function signedIn(path, init = {}, email = READER) {
  const cookie = createSessionCookie({ name: 'web_session', subject: 'google-subject-1', subjectHash: subjectHashOf('google-subject-1'), email, secret: SECRET, now: Date.now });
  return context(path, { ...init, headers: { ...(init.headers ?? {}), cookie: cookie.split(';')[0] } });
}

const claim = (entries, attribute) => entries.find((entry) => entry.a === attribute)?.v;
const resourceOf = (application, id) => application.resources.find((resource) => resource.id === id);

test('the vault requires a session, and says where to get one', async () => {
  const application = createWebAdmissionApplication({ providers: { google } });
  const [gate] = application.middlewares;
  const refused = await gate(context('/api/v1/me'));
  assert.ok(refused instanceof Response);
  assert.equal(refused.status, 401);
  assert.match(refused.headers.get('www-authenticate'), /Bearer/u);
  assert.deepEqual(await refused.json(), { error: 'access-required', login: '/oauth/login' });
});

test('an admitted reader is witnessed on the trace and sees their own address and nothing else', async () => {
  const application = createWebAdmissionApplication({ providers: { google } });
  const [gate] = application.middlewares;
  const ctx = signedIn('/api/v1/me');
  const entries = await gate(ctx);
  assert.ok(Array.isArray(entries), 'an admitted request appends claims');
  assert.equal(claim(entries, CLAIM_SUBJECT), subjectHashOf('google-subject-1'));
  assert.equal(claim(entries, CLAIM_PROVIDER), 'google');
  assert.equal(claim(entries, CLAIM_EMAIL), READER);
  assert.equal(claim(entries, CLAIM_AUTHOR), 'false');
  assert.ok(entries.every((entry) => entry.e === 'trace-1'));
  assert.equal(application.subjectOf(ctx), subjectHashOf('google-subject-1'));
  const identity = await resourceOf(application, 'web-admission-identity').handler(ctx);
  assert.deepEqual(await identity.json(), { provider: 'google', label: READER, email: READER, application: 'vaultmaze' });
  const selected = await resourceOf(application, 'web-admission-application').handler(ctx);
  assert.equal((await selected.json()).application, 'vaultmaze');
});

test('a reader outside the allowlist, or a deployment with no allowlist, has no session at all', async () => {
  const [gate] = createWebAdmissionApplication({ providers: { google: { ...google, allowedEmails: 'someone.else@example.test' } } }).middlewares;
  assert.equal((await gate(signedIn('/api/v1/me'))).status, 401);
  const [closed] = createWebAdmissionApplication({ providers: { google: { ...google, allowedEmails: '' } } }).middlewares;
  assert.equal((await closed(signedIn('/vault/index.json'))).status, 401);
});

test('the anonymous surface opens without a session, and only it', async () => {
  const [gate] = createWebAdmissionApplication({ providers: { google } }).middlewares;
  for (const path of ['/', '/index.html', '/healthz', '/readyz', '/robots.txt', '/app.js', '/app.a1b2c3.js', '/vaultmaze.css', '/styles.css', '/js/srs.mjs', '/js/srs.deadbeef.mjs',
    '/vault/public/surface.json', '/vault/public/index.json', `/vault/public/rooms/${KEY}.json`, '/vault/public/feed.xml', '/ns/term/order', '/oauth/login', '/oauth/discord/login']) {
    assert.equal(await gate(context(path)), undefined, `${path} must open without an identity`);
  }
  // The URL parser resolves a literal dot segment before the gate sees the path, so this is the public index.
  assert.equal(await gate(context('/vault/public/rooms/../index.json')), undefined);
});

test('the authenticated vault is unreachable without a session, by any spelling', async () => {
  const [gate] = createWebAdmissionApplication({ providers: { google } }).middlewares;
  for (const path of ['/vault/index.json', '/vault/manifest.json', `/vault/rooms/${KEY}.json`, '/vault/views/garden.json', '/api/feltos', '/api/v1/me', '/api/v1/reviews',
    '/js/%2e%2e/vault/index.json', '/js/../../vault/index.json', '/js/%5c../vault/index.json', '/JS/srs.mjs', '/vault/public/../index.json', '/vault/public/rooms/not-a-key.json',
    '/js/evil.mjs/../../vault/index.json', '/nsx', '/app.js/../vault/index.json']) {
    const response = await gate(context(path));
    assert.ok(response instanceof Response, `${path} must refuse an anonymous reader`);
    assert.equal(response.status, 401, path);
    assert.deepEqual(await response.json(), { error: 'access-required', login: '/oauth/login' });
  }
  assert.equal(canonicalPath('/a/%2e%2e/b'), null);
  assert.equal(canonicalPath('/a%5Cb'), null);
  assert.equal(canonicalPath('/vault/public/surface.json'), '/vault/public/surface.json');
});

test('anonymous writes are refused even on public routes', async () => {
  const [gate] = createWebAdmissionApplication({ providers: { google } }).middlewares;
  for (const method of ['PUT', 'POST', 'DELETE']) {
    const response = await gate(context('/vault/public/index.json', { method }));
    assert.equal(response.status, 401, `${method} must not reach the public tree`);
    assert.equal(defaultPublicRoute('/vault/public/index.json', method), false);
  }
});

test('a signed-in reader passes the gate on every route and an unknown spelling is not found', async () => {
  const [gate] = createWebAdmissionApplication({ providers: { google } }).middlewares;
  assert.ok(Array.isArray(await gate(signedIn('/vault/index.json'))));
  assert.ok(Array.isArray(await gate(signedIn(`/vault/rooms/${KEY}.json`))));
  assert.ok(Array.isArray(await gate(signedIn('/api/v1/reviews', { method: 'PUT' }))));
  // The URL parser resolves dot segments, literal or percent-encoded, before the
  // gate sees a path; a backslash survives it and is no spelling of any route.
  assert.ok(Array.isArray(await gate(signedIn('/js/../../vault/index.json'))), 'the parser already resolved this to the index route');
  assert.ok(Array.isArray(await gate(signedIn('/js/%2e%2e/vault/index.json'))), 'the parser resolves encoded dots too');
  assert.equal((await gate(signedIn('/js/%5c../vault/index.json'))).status, 404);
});

test('only the one verified Google author carries the author claim and reaches author routes', async () => {
  const application = createWebAdmissionApplication({
    providers: { google },
    authorEmail: READER,
    authorRoute: (path, method) => method === 'POST' && (path === '/api/action' || path === '/api/refresh'),
  });
  const [gate] = application.middlewares;
  const author = signedIn('/api/action', { method: 'POST' });
  const entries = await gate(author);
  assert.equal(claim(entries, CLAIM_AUTHOR), 'true');
  assert.deepEqual(await (await resourceOf(application, 'web-admission-identity').handler(author)).json(), { provider: 'google', label: READER, email: READER, canAuthor: true, application: 'geode' });

  const readerOnly = createWebAdmissionApplication({
    providers: { google: { ...google, allowedEmails: `${READER}, other@example.test` } },
    authorEmail: READER,
    authorRoute: (path, method) => method === 'POST' && path === '/api/action',
  });
  const other = signedIn('/api/action', { method: 'POST' }, 'other@example.test');
  const refused = await readerOnly.middlewares[0](other);
  assert.equal(refused.status, 403);
  assert.deepEqual(await refused.json(), { error: 'authoring-authority-required' });
  assert.ok(Array.isArray(await readerOnly.middlewares[0](signedIn('/api/note', {}, 'other@example.test'))), 'reads stay open to admitted readers');
});

function gatewayCommand(settings, payload, timestamp = String(Math.floor(Date.now() / 1000))) {
  const body = JSON.stringify(payload);
  const signature = createHmac('sha256', settings.botToken).update(`${timestamp}.${body}`).digest('hex');
  return new Request(`${ORIGIN}/api/v1/discord/gateway-command`, { method: 'POST', headers: { 'x-web-gateway-timestamp': timestamp, 'x-web-gateway-signature': signature }, body });
}

test('a Discord command session admits a reader as a Discord principal, and Discord being unavailable is a retryable denial, not a login', async () => {
  const db = createSqliteD1(':memory:');
  await applyMigrations(db, ADMISSION_MIGRATIONS);
  const GUILD = '123456789012345678'; const ROLE = '234567890123456789'; const USER = '345678901234567890';
  const discordCommand = { botToken: 'bot-token', guildId: GUILD, roleId: ROLE, sessionSecret: SECRET, commandName: 'vault-login' };
  const bot = { status: 200 };
  const application = createWebAdmissionApplication({ providers: { google, discordCommand }, database: db, calls: { bot: { async member() { return bot.status === 200 ? { status: 200, member: { pending: false, roles: [ROLE] } } : { status: bot.status, retryAfter: 5 }; } } } });
  const [gate] = application.middlewares;
  assert.equal(await gate(context('/api/v1/discord/command-challenge', { method: 'POST' })), undefined, 'the challenge route is how an anonymous reader becomes admitted');

  const created = await createDiscordCommandChallenge(discordCommand, db, new Request(`${ORIGIN}/`));
  assert.equal((await acceptDiscordGatewayCommand(discordCommand, db, gatewayCommand(discordCommand, { challenge: created.challenge, guildId: GUILD, userId: USER, pending: false, roles: [ROLE] }))).status, 204);
  const issued = await pollDiscordCommandChallenge(discordCommand, db, new Request(`${ORIGIN}/`, { headers: { cookie: created.cookies[0].split(';')[0] } }), created.challenge);
  const cookie = issued.cookies[0].split(';')[0];

  const entries = await gate(context('/vault/index.json', { headers: { cookie } }));
  assert.ok(Array.isArray(entries));
  assert.equal(claim(entries, CLAIM_PROVIDER), 'discord');
  assert.equal(claim(entries, CLAIM_AUTHOR), 'false');
  assert.equal(claim(entries, CLAIM_EMAIL), undefined, 'a Discord principal carries no address');
  const identity = await resourceOf(application, 'web-admission-identity').handler(Object.assign(context('/api/v1/me', { headers: { cookie } }), { locals: { principal: await application.identify(new Request(`${ORIGIN}/`, { headers: { cookie } })) } }));
  assert.deepEqual(await identity.json(), { provider: 'discord', label: 'Discord member', application: 'vaultmaze' });

  bot.status = 429;
  const unavailable = await gate(context('/vault/index.json', { headers: { cookie } }));
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get('retry-after'), '5');
  assert.deepEqual(await unavailable.json(), { error: 'authorization-temporarily-unavailable' });
});

test('the application names its resources and its public routes once', () => {
  const application = createWebAdmissionApplication({ providers: { google } });
  assert.deepEqual(application.resources.map((resource) => resource.match).sort(), ['/api/v1/application', '/api/v1/me', '/oauth/callback', '/oauth/login', '/oauth/logout', '/sign-in']);
  assert.equal(application.isPublic('/api/v1/discord/command-challenge', 'POST'), false, 'no command provider, no command route');
  const withCommand = createWebAdmissionApplication({ providers: { google, discordCommand: { botToken: 'b', guildId: '123456789012345678', roleId: '234567890123456789', sessionSecret: SECRET, commandName: 'x' } } });
  assert.equal(withCommand.isPublic('/api/v1/discord/command-challenge', 'POST'), true);
  assert.equal(withCommand.isPublic('/api/v1/discord/command-challenge', 'GET'), false);
});

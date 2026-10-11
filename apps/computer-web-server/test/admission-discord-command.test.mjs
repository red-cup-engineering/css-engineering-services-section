import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after } from 'node:test';
import { createDiscordAdmissionStore } from "../src/admission/discord-store.mjs";
import {
  acceptDiscordGatewayCommand,
  acceptDiscordInteraction,
  createDiscordCommandChallenge,
  identifyDiscordCommandSession,
  pollDiscordCommandChallenge,
  resolveDiscordCommandSettings,
} from "../src/admission/discord-command.mjs";

const GUILD_ID = '123456789012345678';
const ROLE_ID = '234567890123456789';
const USER_ID = '345678901234567890';
const SECRET = 'test-session-secret';
const ORIGIN = 'https://vault.example';

const roots = [];
after(() => { for (const root of roots) rmSync(root, { recursive: true, force: true }); });
/** Every byte the store has written under its root, as text. */
function storedText(root) {
  return readdirSync(root, { recursive: true }).map((name) => join(root, String(name)))
    .filter((file) => statSync(file).isFile()).map((file) => readFileSync(file, 'latin1')).join('\n');
}

async function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'discord-command-store-'));
  roots.push(root);
  const db = createDiscordAdmissionStore({ root });
  const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const settings = {
    publicKey: [...raw].map((byte) => byte.toString(16).padStart(2, '0')).join(''),
    botToken: 'bot-token', guildId: GUILD_ID, roleId: ROLE_ID, sessionSecret: SECRET, commandName: 'vault-login',
  };
  return { db, settings, privateKey: pair.privateKey };
}

const verifierCookie = (created) => created.cookies[0].split(';')[0];
const currentMember = { async member() { return { status: 200, member: { pending: false, roles: [ROLE_ID] } }; } };
const at = (path, init) => new Request(`${ORIGIN}${path}`, init);

async function signedInteraction(privateKey, body, timestamp = String(Math.floor(Date.now() / 1000))) {
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, privateKey, new TextEncoder().encode(`${timestamp}${body}`)));
  return at('/api/v1/discord/interactions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-signature-timestamp': timestamp, 'x-signature-ed25519': [...signature].map((byte) => byte.toString(16).padStart(2, '0')).join('') },
    body,
  });
}

function signedGatewayCommand(settings, payload, timestamp = String(Math.floor(Date.now() / 1000))) {
  const body = JSON.stringify(payload);
  const signature = createHmac('sha256', settings.botToken).update(`${timestamp}.${body}`).digest('hex');
  return at('/api/v1/discord/gateway-command', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-web-gateway-timestamp': timestamp, 'x-web-gateway-signature': signature },
    body,
  });
}

const command = (challenge, member = { pending: false, roles: [ROLE_ID], user: { id: USER_ID, username: 'not-persisted' } }) => JSON.stringify({
  type: 2, guild_id: GUILD_ID, member, data: { name: 'vault-login', options: [{ name: 'code', value: challenge }] },
});

test('settings refuse missing authority and malformed snowflakes, and a gateway may run without the public key', () => {
  const base = { publicKey: 'a'.repeat(64), botToken: 'b', guildId: GUILD_ID, roleId: ROLE_ID, sessionSecret: 's', commandName: 'c' };
  assert.equal(resolveDiscordCommandSettings(base).configured, true);
  assert.deepEqual(resolveDiscordCommandSettings({ ...base, roleId: 'islander' }).malformed, ['roleId']);
  assert.equal(resolveDiscordCommandSettings({ ...base, botToken: '' }).gatewayConfigured, false);
  const gatewayOnly = resolveDiscordCommandSettings({ ...base, publicKey: undefined });
  assert.equal(gatewayOnly.gatewayConfigured, true);
  assert.equal(gatewayOnly.configured, false);
});

test('command login verifies the Discord PING signature before responding', async () => {
  const { db, settings, privateKey } = await fixture();
  const body = JSON.stringify({ type: 1 });
  const response = await acceptDiscordInteraction(settings, db, await signedInteraction(privateKey, body));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { type: 1 });
  const rejected = await acceptDiscordInteraction(settings, db, at('/api/v1/discord/interactions', { method: 'POST', body }));
  assert.equal(rejected.status, 401);
});

test('a signed exact-guild member command consumes one short browser challenge without retaining Discord identity', async () => {
  const { db, settings, privateKey } = await fixture();
  const created = await createDiscordCommandChallenge(settings, db, at('/', { headers: { 'cf-connecting-ip': '203.0.113.9' } }));
  assert.equal(created.status, 201);
  assert.equal(created.command, `/vault-login ${created.challenge}`);
  const interaction = await acceptDiscordInteraction(settings, db, await signedInteraction(privateKey, command(created.challenge)));
  assert.equal(interaction.status, 200);
  assert.match((await interaction.json()).data.content, /Login confirmed/u);
  const [challenge] = db.commandChallenges.rows();
  assert.equal(typeof challenge.discord_user_ciphertext, 'string');
  assert.equal(storedText(db.root).includes(USER_ID), false, 'the user id is encrypted at rest');

  const issued = await pollDiscordCommandChallenge(settings, db, at('/', { headers: { cookie: verifierCookie(created) } }), created.challenge);
  assert.equal(issued.status, 200);
  const cookie = issued.cookies[0];
  assert.match(cookie, /HttpOnly/u);
  const session = await identifyDiscordCommandSession(settings, db, at('/', { headers: { cookie } }), Date.now, currentMember);
  assert.equal(session.provider, 'discord');
  assert.match(session.subjectHash, /^[a-f0-9]{64}$/u);
  assert.equal((await pollDiscordCommandChallenge(settings, db, at('/', { headers: { cookie: verifierCookie(created) } }), created.challenge)).status, 404, 'a challenge is consumed once');
});

test('a timestamped HMAC gateway command approves the existing challenge without Discord interactions', async () => {
  const { db, settings } = await fixture();
  const created = await createDiscordCommandChallenge(settings, db, at('/'));
  const payload = { challenge: created.challenge, guildId: GUILD_ID, userId: USER_ID, pending: false, roles: [ROLE_ID] };
  assert.equal((await acceptDiscordGatewayCommand(settings, db, signedGatewayCommand(settings, payload))).status, 204);
  assert.equal((await pollDiscordCommandChallenge(settings, db, at('/', { headers: { cookie: verifierCookie(created) } }), created.challenge)).status, 200);
  assert.equal((await acceptDiscordGatewayCommand(settings, db, signedGatewayCommand(settings, payload, '1'))).status, 401, 'a stale timestamp is refused');
  assert.equal((await acceptDiscordGatewayCommand(settings, db, at('/api/v1/discord/gateway-command', { method: 'POST', body: JSON.stringify(payload) }))).status, 401);
  assert.equal((await acceptDiscordGatewayCommand(settings, db, signedGatewayCommand(settings, { ...payload, extra: 1 }))).status, 400, 'the payload shape is exact');
});

test('wrong guild, pending membership, or a missing role cannot approve a challenge', async () => {
  for (const member of [{ pending: true, roles: [ROLE_ID] }, { pending: false, roles: [] }]) {
    const { db, settings, privateKey } = await fixture();
    const created = await createDiscordCommandChallenge(settings, db, at('/'));
    const response = await acceptDiscordInteraction(settings, db, await signedInteraction(privateKey, command(created.challenge, { ...member, user: { id: USER_ID } })));
    assert.match((await response.json()).data.content, /needed/u);
    assert.equal((await pollDiscordCommandChallenge(settings, db, at('/', { headers: { cookie: verifierCookie(created) } }), created.challenge)).status, 202);
  }
  const { db, settings } = await fixture();
  const created = await createDiscordCommandChallenge(settings, db, at('/'));
  const wrongGuild = { challenge: created.challenge, guildId: '999999999999999999', userId: USER_ID, pending: false, roles: [ROLE_ID] };
  assert.equal((await acceptDiscordGatewayCommand(settings, db, signedGatewayCommand(settings, wrongGuild))).status, 403);
});

test('challenge creation is bounded per edge-source bucket', async () => {
  const { db, settings } = await fixture();
  const request = () => at('/', { headers: { 'cf-connecting-ip': '203.0.113.10' } });
  for (let index = 0; index < 12; index += 1) assert.equal((await createDiscordCommandChallenge(settings, db, request())).status, 201);
  const limited = await createDiscordCommandChallenge(settings, db, request());
  assert.equal(limited.status, 429);
  assert.equal(limited.retryAfter, 60);
});

test('the command code cannot be claimed without its browser verifier', async () => {
  const { db, settings, privateKey } = await fixture();
  const created = await createDiscordCommandChallenge(settings, db, at('/'));
  await acceptDiscordInteraction(settings, db, await signedInteraction(privateKey, command(created.challenge)));
  assert.equal((await pollDiscordCommandChallenge(settings, db, at('/'), created.challenge)).status, 404);
  assert.equal((await pollDiscordCommandChallenge(settings, db, at('/', { headers: { cookie: verifierCookie(created) } }), created.challenge)).status, 200);
});

test('command sessions re-observe current membership and fail closed', async () => {
  const { db, settings, privateKey } = await fixture();
  const created = await createDiscordCommandChallenge(settings, db, at('/'));
  await acceptDiscordInteraction(settings, db, await signedInteraction(privateKey, command(created.challenge)));
  const issued = await pollDiscordCommandChallenge(settings, db, at('/', { headers: { cookie: verifierCookie(created) } }), created.challenge);
  const sessionRequest = at('/', { headers: { cookie: issued.cookies[0] } });
  assert.ok(await identifyDiscordCommandSession(settings, db, sessionRequest, Date.now, currentMember));
  assert.equal(await identifyDiscordCommandSession(settings, db, sessionRequest, Date.now, { async member() { return { status: 404 }; } }), null);
  assert.equal(db.interactionSessions.rows().length, 0);
});

test('bot rate limiting is reported as retryable denial', async () => {
  const { db, settings, privateKey } = await fixture();
  const created = await createDiscordCommandChallenge(settings, db, at('/'));
  await acceptDiscordInteraction(settings, db, await signedInteraction(privateKey, command(created.challenge)));
  const issued = await pollDiscordCommandChallenge(settings, db, at('/', { headers: { cookie: verifierCookie(created) } }), created.challenge);
  const identity = await identifyDiscordCommandSession(settings, db, at('/', { headers: { cookie: issued.cookies[0] } }), Date.now, { async member() { return { status: 429, retryAfter: 7 }; } });
  assert.deepEqual(identity, { unavailable: true, retryAfter: 7 });
});

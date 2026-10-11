import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createWebAdmissionApplication } from '../src/admission/application.mjs';
import { createPrincipalRegistry, hashPrincipalSecret, writePrincipalsFile } from '../src/admission/principals.mjs';
import { createSessionCookie } from '../src/admission/session.mjs';

const SECRET = 'a-session-secret-of-some-length';
const stateDir = mkdtempSync(join(tmpdir(), 'admission-'));
writePrincipalsFile(stateDir, [
  { kind: 'human', username: 'morgan', ...hashPrincipalSecret('correct horse battery') },
  { kind: 'hive', account: 'emsenn' },
]);
const registry = createPrincipalRegistry({ stateDir });
const admission = createWebAdmissionApplication({
  realm: 'ops.test',
  providers: {
    password: { sessionSecret: SECRET, registry, publicBaseUrl: 'https://ops.test' },
    hive: { sessionSecret: SECRET, stateDir, appName: 'ops.test', registry },
  },
});
const find = (path) => admission.resources.find((resource) => resource.match === path);
const context = (request) => ({ request, url: new URL(request.url), locals: {}, trace: { id: 't' } });
const cookiesOf = (response) => response.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ');

test('sign-in offers each configured method with the return address', async () => {
  const response = await find('/sign-in').handler(context(new Request('https://ops.test/sign-in?return_to=%2Foauth%2Fauthorize%3Fx%3D1')));
  const body = await response.text();
  assert.match(body, /href="\/login\/password\?return_to=%2Foauth%2Fauthorize%3Fx%3D1"/u);
  assert.match(body, /href="\/login\/hive\?return_to=%2Foauth%2Fauthorize%3Fx%3D1"/u);
  assert.equal(admission.isPublic('/login/password', 'POST'), true);
  assert.equal(admission.isPublic('/login/hive/callback', 'POST'), true);
});

test('a password signs an admitted person in, returns them, and identifies them after', async () => {
  const login = find('/login/password');
  const form = await login.handler(context(new Request('https://ops.test/login/password?return_to=%2Ftasks')));
  const csrf = /name="csrf" value="([^"]+)"/u.exec(await form.text())[1];
  const post = (password) => login.handler(context(new Request('https://ops.test/login/password', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://ops.test', cookie: cookiesOf(form) },
    body: new URLSearchParams({ csrf, return_to: '/tasks', username: 'Morgan', password }).toString(),
  })));
  assert.equal((await post('wrong password here')).status, 401);
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const signedIn = await post('correct horse battery');
  assert.equal(signedIn.status, 303);
  assert.equal(signedIn.headers.get('location'), '/tasks');
  const principal = await admission.identify(new Request('https://ops.test/tasks', { headers: { cookie: cookiesOf(signedIn) } }));
  assert.equal(principal.provider, 'password');
  assert.equal(principal.label, 'morgan');
  writePrincipalsFile(stateDir, [{ kind: 'human', username: 'morgan', revoked: true, ...hashPrincipalSecret('x'.repeat(12)) }]);
  assert.equal(await admission.identify(new Request('https://ops.test/tasks', { headers: { cookie: cookiesOf(signedIn) } })), null);
});

test('a local subject the deployment names is the author', async () => {
  writePrincipalsFile(stateDir, [{ kind: 'human', username: 'morgan', ...hashPrincipalSecret('correct horse battery') }]);
  const authored = createWebAdmissionApplication({ realm: 'ops.test', authors: ['password:morgan'], providers: { password: { sessionSecret: SECRET, registry, publicBaseUrl: 'https://ops.test' } } });
  const login = authored.resources.find((resource) => resource.match === '/login/password');
  const form = await login.handler(context(new Request('https://ops.test/login/password')));
  const csrf = /name="csrf" value="([^"]+)"/u.exec(await form.text())[1];
  const signedIn = await login.handler(context(new Request('https://ops.test/login/password', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://ops.test', cookie: cookiesOf(form) }, body: new URLSearchParams({ csrf, username: 'morgan', password: 'correct horse battery' }).toString() })));
  assert.equal((await authored.identify(new Request('https://ops.test/', { headers: { cookie: cookiesOf(signedIn) } }))).author, true);
});

test('switching from Google to password clears the old identity and preserves the OAuth request', async () => {
  const registry = createPrincipalRegistry({ principals: [{ kind: 'human', username: 'chatgpt-web', ...hashPrincipalSecret('a-password-for-the-web') }] });
  const app = createWebAdmissionApplication({
    realm: 'ops.test',
    providers: {
      google: { clientId: 'google', clientSecret: 'google-secret', sessionSecret: SECRET, admitEmail: () => true, publicBaseUrl: 'https://ops.test' },
      password: { sessionSecret: SECRET, registry, publicBaseUrl: 'https://ops.test' },
    },
  });
  const route = (request) => app.resources.find((resource) => resource.match === new URL(request.url).pathname).handler(context(request));
  const googleCookie = createSessionCookie({ name: 'web_session', subject: 'google-user', subjectHash: 'google-hash', email: 'human@example.test', secret: SECRET, now: Date.now }).split(';')[0];
  const returnTo = '/oauth/authorize?client_id=ChatGPT&state=preserved&code_challenge=preserved';
  const signIn = await route(new Request(`https://ops.test/sign-in?return_to=${encodeURIComponent(returnTo)}`, { headers: { cookie: googleCookie } }));
  const html = await signIn.text();
  assert.match(html, /Signed in as <strong>human@example.test/u);
  const choice = [...html.matchAll(/href="([^"]+)"/gu)].find((match) => match[1].includes('login%2Fpassword'))[1];
  const logout = await route(new Request(`https://ops.test${choice}`, { headers: { cookie: googleCookie } }));
  assert.equal(logout.status, 302);
  assert.ok(logout.headers.getSetCookie().some((cookie) => cookie.startsWith('web_session=;') && cookie.includes('Max-Age=0')));
  const passwordUrl = new URL(logout.headers.get('location'), 'https://ops.test');
  assert.equal(passwordUrl.pathname, '/login/password');
  assert.equal(passwordUrl.searchParams.get('return_to'), returnTo);
  const cleared = cookiesOf(logout);
  assert.equal(await app.identify(new Request(passwordUrl, { headers: { cookie: cleared } })), null);
  const form = await route(new Request(passwordUrl, { headers: { cookie: cleared } }));
  const csrf = /name="csrf" value="([^"]+)"/u.exec(await form.text())[1];
  const loggedIn = await route(new Request('https://ops.test/login/password', {
    method: 'POST', headers: { origin: 'https://ops.test', cookie: `${cleared}; ${cookiesOf(form)}` },
    body: new URLSearchParams({ csrf, return_to: returnTo, username: 'chatgpt-web', password: 'a-password-for-the-web' }),
  }));
  assert.equal(loggedIn.status, 303);
  assert.equal(loggedIn.headers.get('location'), returnTo);
  const principal = await app.identify(new Request(`https://ops.test${returnTo}`, { headers: { cookie: cookiesOf(loggedIn) } }));
  assert.equal(principal.provider, 'password');
  assert.equal(principal.label, 'chatgpt-web');
  const foreign = await route(new Request('https://ops.test/oauth/logout?return_to=https%3A%2F%2Fevil.test%2F'));
  assert.equal(foreign.headers.get('location'), '/');
});

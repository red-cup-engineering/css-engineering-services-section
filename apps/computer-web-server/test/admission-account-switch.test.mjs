import assert from 'node:assert/strict';
import test from 'node:test';
import { createWebAdmissionApplication } from '../src/admission/application.mjs';
import { createSessionCookie, readTransaction } from '../src/admission/session.mjs';

const ORIGIN = 'https://accounts.test';
const SECRET = 'synthetic-session-secret-only';
const google = { clientId: 'fixture-id', clientSecret: 'fixture-secret', sessionSecret: SECRET, allowedEmails: 'human@example.test' };
const registry = { isHumanAdmitted: (username) => username === 'existing-agent', verifyHumanPassword: () => false };
const application = () => createWebAdmissionApplication({
  providers: {
    google,
    password: { sessionSecret: SECRET, registry, publicBaseUrl: ORIGIN },
  },
});
const context = (request) => ({ request, url: new URL(request.url), locals: {}, trace: { id: 'fixture' } });
const cookie = (name, email) => createSessionCookie({ name, subject: name + ':subject', subjectHash: name + ':hash', email, secret: SECRET, now: Date.now }).split(';')[0];

test('switching clears competing Google and password cookies and preserves the authorization return request', async () => {
  const admission = application();
  const cookies = [cookie('web_session', 'human@example.test'), cookie('web_password_session', 'existing-agent')];
  const request = new Request(ORIGIN + '/oauth/authorize', { method: 'POST', headers: { cookie: cookies.join('; ') } });
  assert.equal((await admission.identify(request)).provider, 'google', 'a lingering Google session wins before switching');
  const target = '/oauth/authorize?state=opaque%20%26%20state&resource=https%3A%2F%2Faccounts.test%2Fmcp&code_challenge=fixture';
  const response = await admission.switchAccount(context(request), target);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const redirect = new URL(response.headers.get('location'), ORIGIN);
  assert.equal(redirect.pathname, '/sign-in');
  assert.equal(redirect.searchParams.get('return_to'), target);
  const cleared = response.headers.getSetCookie();
  for (const name of ['web_session', 'web_password_session']) {
    assert.ok(cleared.some((value) => value.startsWith(name + '=') && /Max-Age=0/iu.test(value)), name);
  }
  // Apply Set-Cookie expiry as a browser would; no second provider may retain the old identity.
  const removed = new Set(cleared.map((value) => value.split('=')[0]));
  const remaining = cookies.filter((value) => !removed.has(value.split('=')[0]));
  assert.equal(await admission.identify(new Request(ORIGIN, { headers: { cookie: remaining.join('; ') } })), null);
  const passwordOnly = new Request(ORIGIN, { headers: { cookie: cookie('web_password_session', 'existing-agent') } });
  assert.equal((await admission.identify(passwordOnly)).label, 'existing-agent');
});

test('switch return addresses use the existing same-site guard and expose no new HTTP route', async () => {
  const admission = application();
  for (const offered of ['https://attacker.test/', '//attacker.test/', '/\\attacker.test/', undefined]) {
    const response = await admission.switchAccount(context(new Request(ORIGIN)), offered);
    assert.equal(new URL(response.headers.get('location'), ORIGIN).searchParams.get('return_to'), '/');
  }
  assert.equal(admission.resources.some((resource) => resource.match === '/switch-account'), false);
});

test('the actual Google admission handler reaches the exported relay with account selection and a preserved transaction', async () => {
  const admission = application();
  const returnTo = '/oauth/authorize?state=original%20state&client_id=fixture';
  const route = admission.resources.find((resource) => resource.id === 'web-admission-google-login');
  const request = new Request(ORIGIN + '/oauth/login?return_to=' + encodeURIComponent(returnTo));
  const response = await route.handler(context(request));
  assert.equal(response.status, 302);
  const target = new URL(response.headers.get('location'));
  assert.equal(target.origin, 'https://accounts.google.com');
  assert.equal(target.searchParams.get('prompt'), 'select_account');
  assert.equal(target.searchParams.get('redirect_uri'), ORIGIN + '/oauth/callback');
  assert.equal(target.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(target.searchParams.get('scope'), 'openid email profile');
  const cookieHeader = response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
  const transaction = readTransaction(new Request(ORIGIN, { headers: { cookie: cookieHeader } }), 'web_oauth', SECRET, Date.now);
  assert.equal(transaction.returnTo, returnTo);
  assert.equal(transaction.state, target.searchParams.get('state'));
  assert.equal(transaction.nonce, target.searchParams.get('nonce'));
});

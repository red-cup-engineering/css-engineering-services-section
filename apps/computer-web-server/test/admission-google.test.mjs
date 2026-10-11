// The admission boundary. Google will authenticate any account on earth, so
// these tests are less about "can someone log in" than about who is refused:
// an unconfigured deployment, an empty allowlist, an address nobody added, a
// forged cookie, a stale session, a replayed or mismatched state, and a
// redirect aimed off-site.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  beginGoogleLogin,
  completeGoogleLogin,
  googleLogout,
  identifyGoogle,
  resolveGoogleSettings,
  subjectHashOf,
} from "../src/admission/google.mjs";
import {
  createSessionCookie,
  createTransactionCookie,
  publicBaseUrl,
  readSession,
  safeReturnTo,
} from "../src/admission/session.mjs";

const SECRET = 'test-session-secret-value';
const READER = 'reader@example.test';
const url = (path) => new URL(`https://vault.example${path}`);
const request = (cookie) => new Request('https://vault.example/', cookie ? { headers: { cookie } } : undefined);
const cookieValue = (setCookie) => setCookie.split(';')[0];

function settings(overrides = {}) {
  return { clientId: 'client-id.apps.googleusercontent.com', clientSecret: 'client-secret', sessionSecret: SECRET, allowedEmails: READER, ...overrides };
}

function googleCalls(claims = {}) {
  return {
    async exchange(code, config) {
      assert.equal(config.codeVerifier?.length > 20, true, 'PKCE verifier must be sent to Google');
      assert.equal(typeof config.expectedNonce, 'string', 'a nonce must be required of Google');
      assert.equal(config.redirectPath, '/oauth/callback');
      return { email: claims.email ?? READER, emailVerified: claims.emailVerified ?? true, subject: claims.subject ?? 'google-subject-1' };
    },
  };
}

const transactionCookie = (overrides = {}) => cookieValue(createTransactionCookie({
  name: 'web_oauth', state: 's', nonce: 'n', codeVerifier: 'v'.repeat(43), returnTo: '/', secret: SECRET, now: Date.now, ...overrides,
}));

test('a deployment missing its secrets admits nobody and says which are missing', async () => {
  for (const missing of ['clientId', 'clientSecret', 'sessionSecret']) {
    const broken = settings({ [missing]: '' });
    assert.equal(resolveGoogleSettings(broken).configured, false);
    const begun = beginGoogleLogin(broken, url('/oauth/login'));
    assert.equal(begun.status, 503, `${missing} missing must refuse to start a login`);
    assert.ok(begun.missing.includes(missing));
    assert.equal(identifyGoogle(broken, request()), null);
  }
});

test('an empty allowlist admits nobody, and never everybody', async () => {
  for (const allowed of ['', '   ', undefined]) {
    const noList = settings({ allowedEmails: allowed });
    assert.equal(resolveGoogleSettings(noList).admits, false);
    const completed = await completeGoogleLogin(noList, request(), url('/oauth/callback?code=c&state=s'), Date.now, googleCalls());
    assert.equal(completed.status, 503);
    assert.equal(completed.error, 'no-allowlist-configured');
    const cookie = createSessionCookie({ name: 'web_session', subject: 's', subjectHash: 'h', email: READER, secret: SECRET, now: Date.now });
    assert.equal(identifyGoogle(noList, request(cookieValue(cookie))), null, 'a previously valid session must also stop working');
  }
});

test('the consent redirect carries state, nonce, and an S256 PKCE challenge', () => {
  const begun = beginGoogleLogin(settings(), url('/oauth/login'));
  assert.equal(begun.status, 302);
  const target = new URL(begun.redirect);
  assert.equal(target.origin, 'https://accounts.google.com');
  assert.equal(target.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(target.searchParams.get('code_challenge')?.length > 20, 'a PKCE challenge must be sent');
  assert.ok(target.searchParams.get('nonce')?.length > 20, 'a nonce must be sent');
  assert.ok(target.searchParams.get('state')?.length > 20, 'a state must be sent');
  assert.equal(target.searchParams.get('redirect_uri'), 'https://vault.example/oauth/callback');
  assert.match(target.searchParams.get('scope'), /openid/u);
  assert.equal(begun.cookies.length, 1);
  for (const attribute of [/HttpOnly/u, /Secure/u, /SameSite=Lax/u, /Path=\//u]) assert.match(begun.cookies[0], attribute);
  assert.match(cookieValue(begun.cookies[0]), /^web_oauth=v1\./u, 'the PKCE verifier is sealed, not merely signed');
});

test('a callback without the matching transaction cookie is refused', async () => {
  const noCookie = await completeGoogleLogin(settings(), request(), url('/oauth/callback?code=c&state=s'), Date.now, googleCalls());
  assert.equal(noCookie.status, 400);
  assert.equal(noCookie.error, 'login-expired');
  const wrongState = await completeGoogleLogin(settings(), request(transactionCookie({ state: 'the-real-state' })), url('/oauth/callback?code=c&state=an-attackers-state'), Date.now, googleCalls());
  assert.equal(wrongState.status, 400);
  assert.equal(wrongState.error, 'state-mismatch');
});

test('a verified Google identity outside the allowlist is refused', async () => {
  const completed = await completeGoogleLogin(settings(), request(transactionCookie()), url('/oauth/callback?code=c&state=s'), Date.now, googleCalls({ email: 'stranger@example.test' }));
  assert.equal(completed.status, 403);
  assert.equal(completed.error, 'not-authorized');
});

test('an unverified Google email is refused even when the address is allowlisted', async () => {
  const completed = await completeGoogleLogin(settings(), request(transactionCookie()), url('/oauth/callback?code=c&state=s'), Date.now, googleCalls({ emailVerified: false }));
  assert.equal(completed.status, 403);
  assert.match(completed.reason, /not verified/u);
});

test('an allowlisted reader completes login and receives a usable session', async () => {
  const completed = await completeGoogleLogin(settings(), request(transactionCookie({ returnTo: '/#/halls' })), url('/oauth/callback?code=c&state=s'), Date.now, googleCalls());
  assert.equal(completed.status, 302);
  assert.equal(completed.redirect, '/#/halls');
  const session = completed.cookies.find((cookie) => cookie.startsWith('web_session='));
  assert.ok(session, 'a session cookie must be issued');
  for (const attribute of [/HttpOnly/u, /Secure/u, /SameSite=Lax/u, /Path=\//u]) assert.match(session, attribute);
  const cleared = completed.cookies.find((cookie) => cookie.startsWith('web_oauth='));
  assert.match(cleared, /Max-Age=0/u, 'the transaction is over');
  const identified = identifyGoogle(settings(), request(cookieValue(session)));
  assert.equal(identified.provider, 'google');
  assert.equal(identified.email, READER);
  assert.equal(identified.label, READER);
  assert.equal(identified.subjectHash, subjectHashOf('google-subject-1'));
});

test('a session is refused once its address leaves the allowlist', () => {
  const cookie = cookieValue(createSessionCookie({ name: 'web_session', subject: 'google-subject-1', subjectHash: 'h', email: READER, secret: SECRET, now: Date.now }));
  assert.ok(identifyGoogle(settings(), request(cookie)), 'the reader is admitted while allowlisted');
  assert.equal(identifyGoogle(settings({ allowedEmails: 'someone.else@example.test' }), request(cookie)), null, 'removal must take effect immediately');
});

test('a forged, tampered, or expired session is simply not a session', () => {
  const cookie = cookieValue(createSessionCookie({ name: 'web_session', subject: 's', subjectHash: 'h', email: READER, secret: SECRET, now: Date.now }));
  const value = cookie.slice(cookie.indexOf('=') + 1);
  assert.equal(identifyGoogle(settings(), request(`web_session=${value.slice(0, -8)}AAAAAAAA`)), null);
  assert.equal(identifyGoogle(settings(), request('web_session=notevenclose')), null);
  assert.equal(identifyGoogle(settings(), request('web_session=')), null);
  assert.equal(identifyGoogle(settings(), request('')), null);
  const otherSecret = cookieValue(createSessionCookie({ name: 'web_session', subject: 's', subjectHash: 'h', email: READER, secret: 'a-different-secret', now: Date.now }));
  assert.equal(identifyGoogle(settings(), request(otherSecret)), null);
  const long = 20 * 24 * 3600 * 1000;
  assert.equal(readSession(request(cookie), 'web_session', SECRET, () => Date.now() + long), null);
});

test('login never redirects off site', () => {
  for (const hostile of ['//evil.example', 'https://evil.example', 'http://evil.example', '/\\evil.example', '\\\\evil.example', 'javascript:alert(1)', '', null, undefined, 42]) {
    assert.equal(safeReturnTo(hostile), '/', `${String(hostile)} must not be a redirect target`);
  }
  assert.equal(safeReturnTo('/#/room/abc'), '/#/room/abc');
  assert.equal(safeReturnTo('/halls'), '/halls');
});

test('logout clears both cookies', () => {
  const result = googleLogout(settings());
  assert.equal(result.status, 302);
  assert.equal(result.cookies.length, 2);
  for (const cookie of result.cookies) assert.match(cookie, /Max-Age=0/u);
});

test('the subject pseudonym is a stable hash, and not the Google subject itself', () => {
  const hash = subjectHashOf('google-subject-1');
  assert.match(hash, /^[a-f0-9]{64}$/u);
  assert.equal(hash, subjectHashOf('google-subject-1'));
  assert.notEqual(hash, subjectHashOf('google-subject-2'));
  assert.ok(!hash.includes('google-subject-1'));
});

test('the redirect URI is pinned by configuration, not taken from the request', () => {
  assert.equal(publicBaseUrl('https://vault.example', new URL('http://vault.example/oauth/login')), 'https://vault.example');
  assert.equal(publicBaseUrl('https://vault.example/', new URL('http://x/')), 'https://vault.example');
  assert.equal(publicBaseUrl(undefined, new URL('http://127.0.0.1:8788/oauth/login')), 'http://127.0.0.1:8788');
  assert.equal(publicBaseUrl('  ', new URL('http://127.0.0.1:8788/')), 'http://127.0.0.1:8788');
  const begun = beginGoogleLogin(settings({ publicBaseUrl: 'https://vault.example' }), new URL('http://vault.example/oauth/login'));
  assert.equal(new URL(begun.redirect).searchParams.get('redirect_uri'), 'https://vault.example/oauth/callback');
});

// Google as an OpenID Connect identity provider, with admission decided here.
//
// Google will authenticate anyone on earth with a Google account, so
// authentication is not admission. The allowlist is the admission policy, it is
// a deployment value, and an unset or empty allowlist admits nobody. Admission
// is re-judged on every request rather than trusted from the cookie, so
// removing an address locks that reader out immediately.
import { OAuthError } from '@red-cup-engineering/oauth-services-section';
import { exchangeGoogleCallback } from '@red-cup-engineering/google-oauth-services-section/exchange-google-callback-service';
import { judgePrincipalAdmission, resolveAdmissionPolicy } from '@red-cup-engineering/oauth-services-section/judge-principal-admission-service';
import { relayToGoogleConsent } from '@red-cup-engineering/google-oauth-services-section/relay-to-google-consent-service';
import { clearedCookie, createSessionCookie, createTransactionCookie, publicBaseUrl, randomToken, readSession, readTransaction, safeReturnTo, } from './session.mjs';
import { sha256Base64Url } from '@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity';
import { sha256Hex } from '@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity';
export const GOOGLE_LOGIN_PATH = '/oauth/login';
export const GOOGLE_CALLBACK_PATH = '/oauth/callback';
export const GOOGLE_LOGOUT_PATH = '/oauth/logout';
export const defaultGoogleCalls = Object.freeze({
    exchange: (code, config) => exchangeGoogleCallback(code, config),
});
/** Read the settings, refusing rather than guessing: a deployment missing its secrets admits nobody. */
export function resolveGoogleSettings(settings) {
    const missing = [];
    for (const name of ['clientId', 'clientSecret', 'sessionSecret']) {
        if (typeof settings[name] !== 'string' || settings[name].length === 0)
            missing.push(name);
    }
    const allowed = typeof settings.allowedEmails === 'string' ? settings.allowedEmails : '';
    // A deployment admits by an allowlist string, or by a predicate over its own principals.
    const predicate = typeof settings.admitEmail === 'function' ? settings.admitEmail : undefined;
    return Object.freeze({
        configured: missing.length === 0,
        missing: Object.freeze(missing),
        admits: predicate !== undefined || allowed.trim().length > 0,
        admit: predicate ?? resolveAdmissionPolicy({ allowedEmails: allowed }),
        sessionCookie: settings.sessionCookie ?? 'web_session',
        transactionCookie: settings.transactionCookie ?? 'web_oauth',
        sessionTtlSeconds: settings.sessionTtlSeconds ?? 1_209_600,
        settings,
    });
}
/** A stable pseudonym for a provider subject; never the subject itself. */
export function subjectHashOf(subject) {
    return sha256Hex(subject);
}
export function beginGoogleLogin(settings, url, now = Date.now) {
    const resolved = resolveGoogleSettings(settings);
    if (!resolved.configured)
        return { status: 503, error: 'login-unconfigured', missing: resolved.missing };
    const state = randomToken();
    const nonce = randomToken();
    const codeVerifier = randomToken(48);
    const returnTo = safeReturnTo(url.searchParams.get('return_to'));
    const redirect = relayToGoogleConsent({
        state,
        nonce,
        googleClientId: settings.clientId,
        publicBaseUrl: publicBaseUrl(settings.publicBaseUrl, url),
        redirectPath: settings.callbackPath ?? GOOGLE_CALLBACK_PATH,
        scopes: ['openid', 'email', 'profile'],
        codeChallenge: sha256Base64Url(codeVerifier),
        prompt: 'select_account',
    });
    return {
        status: 302,
        redirect,
        cookies: [createTransactionCookie({ name: resolved.transactionCookie, state, nonce, codeVerifier, returnTo, secret: settings.sessionSecret, now })],
    };
}
export async function completeGoogleLogin(settings, request, url, now = Date.now, calls = defaultGoogleCalls) {
    const resolved = resolveGoogleSettings(settings);
    if (!resolved.configured)
        return { status: 503, error: 'login-unconfigured', missing: resolved.missing };
    // Refuse before contacting Google: with no allowlist there is no one to admit.
    if (!resolved.admits)
        return { status: 503, error: 'no-allowlist-configured' };
    const transaction = readTransaction(request, resolved.transactionCookie, settings.sessionSecret, now);
    if (transaction === null)
        return { status: 400, error: 'login-expired' };
    const offeredState = url.searchParams.get('state');
    if (typeof offeredState !== 'string' || offeredState !== transaction.state)
        return { status: 400, error: 'state-mismatch' };
    const code = url.searchParams.get('code');
    if (typeof code !== 'string' || code.length === 0)
        return { status: 400, error: url.searchParams.get('error') ?? 'no-authorization-code' };
    let identity;
    try {
        identity = await calls.exchange(code, {
            googleClientId: settings.clientId,
            googleClientSecret: settings.clientSecret,
            // Byte-identical to the value sent at login: Google compares the two, and
            // so does the authorization-code binding.
            publicBaseUrl: publicBaseUrl(settings.publicBaseUrl, url),
            redirectPath: settings.callbackPath ?? GOOGLE_CALLBACK_PATH,
            codeVerifier: transaction.codeVerifier,
            expectedNonce: transaction.nonce,
        });
    }
    catch (error) {
        const code = error instanceof OAuthError ? error.code : 'server_error';
        console.warn('Google callback refused', code);
        return { status: 502, error: 'google-exchange-failed' };
    }
    const admission = judgePrincipalAdmission({ email: identity.email, emailVerified: identity.emailVerified }, resolved.admit);
    if (!admission.admitted)
        return { status: 403, error: 'not-authorized', reason: admission.reason, email: identity.email };
    if (typeof identity.subject !== 'string' || identity.subject.length === 0)
        return { status: 502, error: 'google-subject-missing' };
    return {
        status: 302,
        redirect: safeReturnTo(transaction.returnTo),
        cookies: [
            createSessionCookie({
                name: resolved.sessionCookie, subject: identity.subject, subjectHash: subjectHashOf(identity.subject), email: identity.email,
                secret: settings.sessionSecret, now, ttlSeconds: resolved.sessionTtlSeconds,
            }),
            clearedCookie(resolved.transactionCookie),
        ],
    };
}
export function googleLogout(settings) {
    const resolved = resolveGoogleSettings(settings);
    return { status: 302, redirect: '/', cookies: [clearedCookie(resolved.sessionCookie), clearedCookie(resolved.transactionCookie)] };
}
/** The identity for one request, or null. Admission is re-judged on every request. */
export function identifyGoogle(settings, request, now = Date.now) {
    const resolved = resolveGoogleSettings(settings);
    if (!resolved.configured || !resolved.admits)
        return null;
    const session = readSession(request, resolved.sessionCookie, settings.sessionSecret, now);
    if (session === null)
        return null;
    const admission = judgePrincipalAdmission({ email: session.email, emailVerified: true }, resolved.admit);
    return admission.admitted
        ? Object.freeze({ provider: 'google', subject: session.subject, subjectHash: session.subjectHash, email: session.email, label: session.email })
        : null;
}

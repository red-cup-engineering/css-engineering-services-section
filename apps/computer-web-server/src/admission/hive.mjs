// A Hive account as an identity provider: the Hive Keychain login service mints a one-time
// challenge, verifies the signed answer against the account's live authority, and this provider
// keeps the resulting session in the admission's signed cookie. Only accounts the principals
// file admits get a session, and admission is re-judged on every request.
import { readJsonBody } from '@red-cup-engineering/http-services-section/body';
import { htmlRepr, jsonRepr } from '@red-cup-engineering/http-services-section/representation';
import { createHiveLoginApp } from '@red-cup-engineering/hive-keychain-login-service';
import { sha256Hex } from '@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity';
import { admissionPage } from './page.mjs';
import { clearedCookie, cookieValue, createSessionCookie, opaqueCookie, readSession, safeReturnTo, sealConfidential, unsealConfidential } from './session.mjs';

export const HIVE_LOGIN_PATH = '/login/hive';
export const HIVE_CALLBACK_PATH = '/login/hive/callback';

const cookieRequest = (headers) => new Request('http://local/', { headers: { cookie: Array.isArray(headers?.cookie) ? headers.cookie.join('; ') : headers?.cookie ?? '' } });

/**
 * @param {{ sessionSecret: string, stateDir: string, appName: string, registry: { isHiveAdmitted: Function }, sessionCookie?: string, sessionTtlSeconds?: number, verify?: Function }} settings
 */
export function createHiveLogin(settings, { now = Date.now, title } = {}) {
    const renderLoginPage = (heading, body) => admissionPage({ title: heading, place: title, body });
    const sessionCookie = settings.sessionCookie ?? 'web_hive_session';
    const challengeCookie = `${sessionCookie}_challenge`;
    function identify(request) {
        const session = readSession(request, sessionCookie, settings.sessionSecret, now);
        if (session === null || !settings.registry.isHiveAdmitted(session.email))
            return null;
        return Object.freeze({ provider: 'hive', subject: session.subject, subjectHash: session.subjectHash, label: `@${session.email}` });
    }
    const challengeOf = (headers) => {
        const sealed = unsealConfidential(cookieValue(cookieRequest(headers), challengeCookie), settings.sessionSecret);
        return sealed && sealed.expiresAt > now() ? sealed : null;
    };
    const browser = Object.freeze({
        validSession: (headers) => identify(cookieRequest(headers)),
        establishHiveSession: (account) => {
            const subject = `hive:${account.toLowerCase()}`;
            return { cookieHeader: createSessionCookie({ name: sessionCookie, subject, subjectHash: sha256Hex(subject), email: account.toLowerCase(), secret: settings.sessionSecret, now, ttlSeconds: settings.sessionTtlSeconds }) };
        },
        mintHiveChallengeCookie: (nonce, ttlMs, returnTo) => opaqueCookie(challengeCookie, sealConfidential({ nonce, returnTo: safeReturnTo(returnTo), expiresAt: now() + ttlMs }, settings.sessionSecret), Math.floor(ttlMs / 1000)),
        hiveChallengeFrom: (headers) => challengeOf(headers)?.nonce ?? null,
        hiveReturnTo: (headers) => challengeOf(headers)?.returnTo,
        clearHiveChallengeCookie: () => clearedCookie(challengeCookie),
    });
    const app = createHiveLoginApp({
        appName: settings.appName,
        home: '/',
        paths: { login: HIVE_LOGIN_PATH, callback: HIVE_CALLBACK_PATH, chooser: '/sign-in' },
        stateDir: settings.stateDir,
        registry: settings.registry,
        browser,
        ...(settings.verify === undefined ? {} : { verify: settings.verify }),
        now,
        htmlRepr,
        jsonRepr,
        readJsonBody,
        renderLoginPage,
    });
    return Object.freeze({ resources: app.resources, identify, logoutCookies: () => [clearedCookie(sessionCookie), clearedCookie(challengeCookie)] });
}

// A username and password as an identity provider: the principals file holds each person's
// scrypt hash, the form is bound to a signed CSRF cookie and same-origin posts, failures back
// off per username, and admission is re-judged on every request like every other provider.
import { sha256Hex } from '@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity';
import { admissionPage, escapeHtml as escape } from './page.mjs';
import { clearedCookie, cookieValue, createSessionCookie, opaqueCookie, publicBaseUrl, randomToken, readSession, safeReturnTo, sealConfidential, unsealConfidential } from './session.mjs';

export const PASSWORD_LOGIN_PATH = '/login/password';
const FORM_TTL_SECONDS = 600;

function page(title, { csrf, returnTo, failed }) {
    return admissionPage({ title: `Sign in to ${title}`, place: title, body: `<h1>Sign in</h1>${failed ? '<p role="alert">Sign-in was refused.</p>' : ''}<form method="post" action="${PASSWORD_LOGIN_PATH}"><input type="hidden" name="csrf" value="${escape(csrf)}"><input type="hidden" name="return_to" value="${escape(returnTo)}"><label>Username <input name="username" autocomplete="username" required></label><label>Password <input name="password" type="password" autocomplete="current-password" required></label><button type="submit">Sign in</button></form><p class="aside"><a href="/sign-in?return_to=${encodeURIComponent(returnTo)}">Other sign-in methods</a></p>` });
}

/**
 * @param {{ sessionSecret: string, registry: { verifyHumanPassword: Function, isHumanAdmitted: Function }, sessionCookie?: string, publicBaseUrl?: string, sessionTtlSeconds?: number }} settings
 */
export function createPasswordLogin(settings, { title = 'web', now = Date.now } = {}) {
    const sessionCookie = settings.sessionCookie ?? 'web_password_session';
    const formCookie = `${sessionCookie}_form`;
    const attempts = new Map();
    const html = (body, status = 200, cookies = []) => new Response(body, { status, headers: [['content-type', 'text/html; charset=utf-8'], ['cache-control', 'no-store'], ['x-frame-options', 'DENY'], ...cookies.map((cookie) => ['set-cookie', cookie])] });
    const throttled = (username) => (attempts.get(username)?.until ?? 0) > now();
    const fail = (username) => {
        if (attempts.size >= 4096 && !attempts.has(username)) attempts.delete(attempts.keys().next().value);
        const failures = Math.min((attempts.get(username)?.failures ?? 0) + 1, 8);
        attempts.set(username, { failures, until: now() + Math.min(60_000, 1000 * 2 ** (failures - 1)) });
    };
    const freshForm = (returnTo, failed = false, status = 200) => {
        const csrf = randomToken(24);
        return html(page(title, { csrf, returnTo, failed }), status, [opaqueCookie(formCookie, sealConfidential({ csrf, expiresAt: Math.floor(now() / 1000) + FORM_TTL_SECONDS }, settings.sessionSecret), FORM_TTL_SECONDS)]);
    };
    return Object.freeze({
        /** GET shows the form; POST checks it and signs the person in. */
        async handle(request, url) {
            if (request.method.toUpperCase() !== 'POST')
                return freshForm(safeReturnTo(url.searchParams.get('return_to')));
            const origin = request.headers.get('origin');
            if (origin !== null && origin !== publicBaseUrl(settings.publicBaseUrl, url))
                return new Response(null, { status: 403 });
            let form;
            try { form = new URLSearchParams(await request.text()); }
            catch { return new Response(null, { status: 400 }); }
            const returnTo = safeReturnTo(form.get('return_to'));
            const bound = unsealConfidential(cookieValue(request, formCookie), settings.sessionSecret);
            if (!bound || bound.expiresAt < Math.floor(now() / 1000) || form.get('csrf') !== bound.csrf)
                return freshForm(returnTo, true, 403);
            const username = String(form.get('username') ?? '').trim().toLowerCase();
            let admitted = false;
            try { admitted = !throttled(username) && settings.registry.verifyHumanPassword(username, String(form.get('password') ?? '')); }
            catch { admitted = false; }
            if (!admitted) {
                fail(username);
                return freshForm(returnTo, true, 401);
            }
            attempts.delete(username);
            const subject = `password:${username}`;
            const session = createSessionCookie({ name: sessionCookie, subject, subjectHash: sha256Hex(subject), email: username, secret: settings.sessionSecret, now, ttlSeconds: settings.sessionTtlSeconds });
            return new Response(null, { status: 303, headers: [['location', returnTo], ['cache-control', 'no-store'], ['set-cookie', session], ['set-cookie', clearedCookie(formCookie)]] });
        },
        /** The identity for one request, or null; the person must still be admitted. */
        identify(request) {
            const session = readSession(request, sessionCookie, settings.sessionSecret, now);
            if (session === null || !settings.registry.isHumanAdmitted(session.email))
                return null;
            return Object.freeze({ provider: 'password', subject: session.subject, subjectHash: session.subjectHash, label: session.email });
        },
        logoutCookies: () => [clearedCookie(sessionCookie)],
    });
}

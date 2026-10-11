// Sessions and in-flight login transactions as cookies.
//
// A session cookie is a signed, unencrypted bearer of facts the server needs
// back on a later request: who the reader is. A transaction cookie names which
// login is in flight. Neither holds anything that would harm the reader if
// read, only things that would harm them if forged, so the house signed-cookie
// value is the right size of tool. A confidential cookie, by contrast, carries
// a secret (a PKCE verifier, a token) and is sealed with AES-GCM.
//
// This lifts the shape two Workers had duplicated (EVE Assist, L-Space) into
// the one owner. It runs on node:crypto; a Workers runtime needs the same
// operations over Web Crypto, which is a port of this module, not a fork of it.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { sha256 } from '@red-cup-engineering/cryptographic-computer-data-engineering-services-section/hash';
import { parseCookieHeader, serializeSetCookie } from '@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/cookie';
import { signCookieValue, unsignCookieValue } from '@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/signed-cookie';
export const DEFAULT_SESSION_TTL_SECONDS = 1_209_600; // 14 days, the house precedent.
export const DEFAULT_TRANSACTION_TTL_SECONDS = 600; // A consent round trip, not a session.
const COOKIE_ATTRIBUTES = Object.freeze({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
function required(value, label) {
    if (value === undefined || value === null || value === '')
        throw new TypeError(`session: ${label} is required`);
}
export function base64UrlEncode(bytes) {
    return Buffer.from(bytes).toString('base64url');
}
export function base64UrlDecode(value) {
    return new Uint8Array(Buffer.from(value, 'base64url'));
}
/** Random, URL-safe token bytes. */
export function randomToken(bytes = 32) {
    return randomBytes(bytes).toString('base64url');
}
/** One Set-Cookie value with the house attributes: HttpOnly, Secure, SameSite=Lax, Path=/. */
export function opaqueCookie(name, value, ttlSeconds) {
    required(name, 'cookie name');
    required(value, 'cookie value');
    return serializeSetCookie(name, value, { ...COOKIE_ATTRIBUTES, maxAge: Math.floor(ttlSeconds) });
}
/** The Set-Cookie value that clears cookie `name`. */
export function clearedCookie(name) {
    return serializeSetCookie(name, '', { ...COOKIE_ATTRIBUTES, maxAge: 0, expires: new Date(0) });
}
/** The raw value of cookie `name` on the request, or null. */
export function cookieValue(request, name) {
    const header = request.headers.get('cookie');
    if (header === null || header === '')
        return null;
    const value = parseCookieHeader(header)[name];
    return typeof value === 'string' ? value : null;
}
function signedPayload(value, secret, salt) {
    required(secret, 'secret');
    return signCookieValue(base64UrlEncode(new TextEncoder().encode(JSON.stringify(value))), secret, salt);
}
/** Recover a signed value, or null. Never throws on attacker input. */
function unsignedPayload(raw, secret, salt, now) {
    if (typeof raw !== 'string' || raw.length === 0)
        return null;
    let payload;
    try {
        payload = unsignCookieValue(raw, secret, salt);
    }
    catch {
        return null;
    }
    if (payload === null)
        return null;
    let parsed;
    try {
        parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
    }
    catch {
        return null;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        return null;
    const expiresAt = parsed.expiresAt;
    if (typeof expiresAt !== 'number')
        return null;
    if (Math.floor(now() / 1000) > expiresAt)
        return null;
    return parsed;
}
function encryptionKey(secret) {
    return sha256(`web-admission confidential cookie\0${secret}`);
}
/** Encrypt a secret-bearing value. AES-256-GCM supplies confidentiality and integrity. */
export function sealConfidential(value, secret) {
    required(secret, 'secret');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1.${iv.toString('base64url')}.${Buffer.concat([ciphertext, tag]).toString('base64url')}`;
}
/** Recover an encrypted value, or null. Never throws on attacker input. */
export function unsealConfidential(raw, secret) {
    if (typeof raw !== 'string' || !raw.startsWith('v1.'))
        return null;
    const parts = raw.split('.');
    if (parts.length !== 3)
        return null;
    try {
        const iv = Buffer.from(parts[1], 'base64url');
        const body = Buffer.from(parts[2], 'base64url');
        if (body.length < 16)
            return null;
        const decipher = createDecipheriv('aes-256-gcm', encryptionKey(secret), iv);
        decipher.setAuthTag(body.subarray(body.length - 16));
        const plaintext = Buffer.concat([decipher.update(body.subarray(0, body.length - 16)), decipher.final()]);
        return JSON.parse(plaintext.toString('utf8'));
    }
    catch {
        return null;
    }
}
/** A session cookie: who the reader is, signed, with an expiry. */
export function createSessionCookie(options) {
    const { name, subject, subjectHash, email, secret, now, ttlSeconds = DEFAULT_SESSION_TTL_SECONDS } = options;
    required(name, 'name');
    required(subject, 'subject');
    required(subjectHash, 'subjectHash');
    required(email, 'email');
    required(secret, 'secret');
    if (typeof now !== 'function')
        throw new TypeError('session: now must be a function');
    const issuedAt = Math.floor(now() / 1000);
    const value = signedPayload({ subject, subjectHash, email, issuedAt, expiresAt: issuedAt + Math.floor(ttlSeconds) }, secret, name);
    return opaqueCookie(name, value, ttlSeconds);
}
/** Recover the session named by cookie `name`, or null. */
export function readSession(request, name, secret, now) {
    const parsed = unsignedPayload(cookieValue(request, name), secret, name, now);
    if (parsed === null)
        return null;
    const { subject, subjectHash, email } = parsed;
    if (typeof subject !== 'string' || typeof subjectHash !== 'string' || typeof email !== 'string')
        return null;
    return Object.freeze({ subject, subjectHash, email });
}
/**
 * The in-flight login. State, nonce, and the PKCE verifier live in a sealed
 * cookie rather than server storage: they only ever need to come back to the
 * same browser. The verifier is a secret, so the whole transaction is sealed.
 */
export function createTransactionCookie(options) {
    const { name, state, nonce, codeVerifier, returnTo, secret, now, ttlSeconds = DEFAULT_TRANSACTION_TTL_SECONDS } = options;
    required(name, 'name');
    required(state, 'state');
    required(nonce, 'nonce');
    required(codeVerifier, 'codeVerifier');
    required(secret, 'secret');
    const issuedAt = Math.floor(now() / 1000);
    const value = sealConfidential({ state, nonce, codeVerifier, returnTo, issuedAt, expiresAt: issuedAt + Math.floor(ttlSeconds) }, secret);
    return opaqueCookie(name, value, ttlSeconds);
}
export function readTransaction(request, name, secret, now) {
    const value = unsealConfidential(cookieValue(request, name), secret);
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    const record = value;
    if (typeof record.expiresAt !== 'number' || Math.floor(now() / 1000) > record.expiresAt)
        return null;
    if (typeof record.state !== 'string' || typeof record.nonce !== 'string' || typeof record.codeVerifier !== 'string')
        return null;
    return Object.freeze({
        state: record.state,
        nonce: record.nonce,
        codeVerifier: record.codeVerifier,
        returnTo: safeReturnTo(record.returnTo),
    });
}
/**
 * Where to send the reader after login. Only a same-site absolute path is
 * allowed: `//evil.example` and `https://evil.example` are both valid values
 * for a Location header, and neither is a place this site may send anyone.
 */
export function safeReturnTo(offered) {
    if (typeof offered !== 'string' || offered.length === 0)
        return '/';
    if (!offered.startsWith('/') || offered.startsWith('//') || offered.includes('\\'))
        return '/';
    return offered;
}
/**
 * The origin an identity provider will be told to redirect back to. Pinned by
 * configuration, because a redirect URI must match its registration byte for
 * byte and a request's own origin is not a reliable source of it behind a
 * proxy; the request origin remains the fallback so local development works.
 */
export function publicBaseUrl(configured, url) {
    const trimmed = typeof configured === 'string' ? configured.trim() : '';
    return trimmed === '' ? url.origin : trimmed.replace(/\/$/u, '');
}

// Discord user OAuth with live guild-role admission.
//
// The browser receives only a random opaque session bearer. Discord access and
// refresh tokens stay in the admission store (discord-store.mjs) encrypted with the session secret, and
// every protected request re-observes the reader's current membership record.
// A role snapshot is never durable authorization: leaving the guild, losing the
// role, remaining pending, revoking the grant, or an unavailable Discord fails
// closed rather than falling back to a cached role.
import { DiscordUserAuthorizationError, discordMemberHasRole, discordUserAuthorizationUrl, exchangeDiscordAuthorizationCode, getCurrentDiscordGuildMember, getCurrentDiscordUser, refreshDiscordAuthorization, revokeDiscordAuthorization, } from '@red-cup-engineering/discord-rest-transport-service/user-oauth';
import { clearedCookie, cookieValue, opaqueCookie, publicBaseUrl, randomToken, safeReturnTo, sealConfidential, unsealConfidential, } from './session.mjs';
import { sha256Base64Url } from '@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity';
import { sha256Hex } from '@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity';
export const DISCORD_LOGIN_PATH = '/oauth/discord/login';
export const DISCORD_CALLBACK_PATH = '/oauth/discord/callback';
const TRANSACTION_TTL_SECONDS = 600;
const SESSION_TTL_SECONDS = 14 * 24 * 60 * 60;
const REFRESH_SKEW_SECONDS = 60;
export const SNOWFLAKE = /^\d{17,20}$/u;
export const defaultDiscordCalls = Object.freeze({
    exchange: (code, input) => exchangeDiscordAuthorizationCode(code, input),
    refresh: (token, input) => refreshDiscordAuthorization(token, input),
    revoke: (token, input) => revokeDiscordAuthorization(token, input),
    currentUser: (accessToken) => getCurrentDiscordUser(accessToken),
    currentMember: (accessToken, guildId) => getCurrentDiscordGuildMember(accessToken, guildId),
});
export function resolveDiscordSettings(settings) {
    const missing = [];
    for (const name of ['clientId', 'clientSecret', 'guildId', 'roleId', 'sessionSecret']) {
        if (typeof settings[name] !== 'string' || settings[name].trim().length === 0)
            missing.push(name);
    }
    const malformed = [];
    for (const name of ['clientId', 'guildId', 'roleId']) {
        if (!missing.includes(name) && !SNOWFLAKE.test(settings[name]))
            malformed.push(name);
    }
    return Object.freeze({
        configured: missing.length === 0 && malformed.length === 0,
        missing: Object.freeze(missing),
        malformed: Object.freeze(malformed),
        sessionCookie: settings.sessionCookie ?? 'web_discord_session',
        transactionCookie: settings.transactionCookie ?? 'web_discord_oauth',
    });
}
export function discordSubjectHash(userId) {
    return sha256Hex(`discord:${userId}`);
}
const redirectUri = (settings, url) => `${publicBaseUrl(settings.publicBaseUrl, url)}${DISCORD_CALLBACK_PATH}`;
const nowSeconds = (now) => Math.floor(now() / 1000);
function storedAuthorization(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    const { accessToken, refreshToken } = value;
    return typeof accessToken === 'string' && typeof refreshToken === 'string' ? Object.freeze({ accessToken, refreshToken }) : null;
}
async function findSession(db, sessionHash) {
    return db.oauthSessions.read(sessionHash);
}
async function updateAuthorization(db, sessionHash, ciphertext, tokenExpiresAt, updatedAt, expectedVersion) {
    // Only the refresh that read `expectedVersion` commits; a concurrent winner is left as it is.
    let committed = false;
    db.atomically(() => db.oauthSessions.update(sessionHash, (row) => {
        if (row === null || row.authorization_version !== expectedVersion)
            return undefined;
        committed = true;
        return { ...row, authorization_ciphertext: ciphertext, token_expires_at: tokenExpiresAt, updated_at: updatedAt, authorization_version: expectedVersion + 1, retry_after: 0 };
    }));
    return committed;
}
async function updateRetryAfter(db, sessionHash, retryAfter) {
    db.atomically(() => db.oauthSessions.update(sessionHash, (row) => (row === null ? undefined : { ...row, retry_after: retryAfter })));
}
async function deleteSession(db, sessionHash) {
    db.atomically(() => db.oauthSessions.update(sessionHash, (row) => (row === null ? undefined : null)));
}
async function revokeQuietly(authorization, settings, calls) {
    if (authorization === null)
        return;
    try {
        await calls.revoke(authorization.refreshToken, { clientId: settings.clientId, clientSecret: settings.clientSecret, tokenTypeHint: 'refresh_token' });
    }
    catch { /* Refusal and cleanup never become authorization on revocation failure. */ }
}
/** Scheduled bounded retention: revoke and remove expired OAuth sessions. */
export async function purgeExpiredDiscordSessions(settings, db, now = Date.now, calls = defaultDiscordCalls, limit = 25) {
    if (!resolveDiscordSettings(settings).configured || db === null)
        return { purged: 0 };
    const current = nowSeconds(now);
    const expired = db.oauthSessions.rows()
        .filter((row) => row.session_expires_at < current)
        .sort((a, b) => a.session_expires_at - b.session_expires_at)
        .slice(0, Math.max(1, Math.min(500, limit)));
    let purged = 0;
    for (const row of expired) {
        await revokeQuietly(storedAuthorization(unsealConfidential(row.authorization_ciphertext, settings.sessionSecret)), settings, calls);
        await deleteSession(db, row.session_hash);
        purged += 1;
    }
    return { purged };
}
export function beginDiscordLogin(settings, url, now = Date.now) {
    const resolved = resolveDiscordSettings(settings);
    if (!resolved.configured)
        return { status: 503, error: 'discord-login-unconfigured', missing: resolved.missing, malformed: resolved.malformed };
    const state = randomToken();
    const codeVerifier = randomToken(48);
    const returnTo = safeReturnTo(url.searchParams.get('return_to'));
    const issuedAt = nowSeconds(now);
    return {
        status: 302,
        redirect: discordUserAuthorizationUrl({
            clientId: settings.clientId, redirectUri: redirectUri(settings, url), state, codeChallenge: sha256Base64Url(codeVerifier), prompt: 'consent',
        }),
        cookies: [opaqueCookie(resolved.transactionCookie, sealConfidential({ state, codeVerifier, returnTo, issuedAt, expiresAt: issuedAt + TRANSACTION_TTL_SECONDS }, settings.sessionSecret), TRANSACTION_TTL_SECONDS)],
    };
}
function readDiscordTransaction(request, cookie, secret, now) {
    const value = unsealConfidential(cookieValue(request, cookie), secret);
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    const record = value;
    if (typeof record.expiresAt !== 'number' || nowSeconds(now) > record.expiresAt)
        return null;
    if (typeof record.state !== 'string' || typeof record.codeVerifier !== 'string')
        return null;
    return Object.freeze({ state: record.state, codeVerifier: record.codeVerifier, returnTo: safeReturnTo(record.returnTo) });
}
export async function completeDiscordLogin(settings, db, request, url, now = Date.now, calls = defaultDiscordCalls) {
    const resolved = resolveDiscordSettings(settings);
    if (!resolved.configured)
        return { status: 503, error: 'discord-login-unconfigured', missing: resolved.missing, malformed: resolved.malformed };
    if (db === null)
        return { status: 503, error: 'discord-session-store-unconfigured' };
    const transaction = readDiscordTransaction(request, resolved.transactionCookie, settings.sessionSecret, now);
    if (transaction === null)
        return { status: 400, error: 'discord-login-expired' };
    if (url.searchParams.get('state') !== transaction.state)
        return { status: 400, error: 'discord-state-mismatch' };
    const code = url.searchParams.get('code');
    if (typeof code !== 'string' || code.length === 0)
        return { status: 400, error: url.searchParams.get('error') ?? 'no-discord-authorization-code' };
    let authorization = null;
    let user;
    let member;
    try {
        authorization = await calls.exchange(code, { clientId: settings.clientId, clientSecret: settings.clientSecret, redirectUri: redirectUri(settings, url), codeVerifier: transaction.codeVerifier });
        [user, member] = await Promise.all([calls.currentUser(authorization.accessToken), calls.currentMember(authorization.accessToken, settings.guildId)]);
    }
    catch (error) {
        console.warn('Discord callback refused', error instanceof DiscordUserAuthorizationError ? error.code : 'server_error');
        await revokeQuietly(authorization, settings, calls);
        if (error instanceof DiscordUserAuthorizationError && [429, 500, 502, 503, 504].includes(error.status ?? 0)) {
            return { status: 503, error: 'discord-authorization-unavailable', retryAfter: Math.max(1, Math.ceil(error.retryAfter ?? 1)) };
        }
        return { status: 502, error: 'discord-exchange-failed' };
    }
    if (member === null || !discordMemberHasRole(member, settings.roleId)) {
        await revokeQuietly(authorization, settings, calls);
        return { status: 403, error: 'discord-role-required' };
    }
    const issuedAt = nowSeconds(now);
    const sessionToken = randomToken(32);
    const sessionHash = sha256Hex(sessionToken);
    const sessionExpiresAt = issuedAt + SESSION_TTL_SECONDS;
    try {
        db.oauthSessions.write(sessionHash, {
            session_hash: sessionHash, subject_hash: discordSubjectHash(user.id), discord_user_id: user.id, display_name: user.globalName ?? user.username,
            authorization_ciphertext: sealConfidential({ accessToken: authorization.accessToken, refreshToken: authorization.refreshToken }, settings.sessionSecret),
            authorization_version: 0, token_expires_at: issuedAt + Math.floor(authorization.expiresIn), session_expires_at: sessionExpiresAt,
            retry_after: 0, created_at: issuedAt, updated_at: issuedAt,
        });
    }
    catch (error) {
        console.error('Discord session could not be stored', error instanceof Error ? error.message : 'unknown error');
        await revokeQuietly(authorization, settings, calls);
        return { status: 503, error: 'discord-session-store-unavailable', retryAfter: 1 };
    }
    return {
        status: 302,
        redirect: transaction.returnTo,
        cookies: [opaqueCookie(resolved.sessionCookie, sessionToken, SESSION_TTL_SECONDS), clearedCookie(resolved.transactionCookie)],
    };
}
async function refreshStoredAuthorization(row, settings, db, sessionHash, now, calls, current) {
    const expectedVersion = Number.isInteger(row.authorization_version) ? row.authorization_version : 0;
    const winnerOrNull = async () => {
        const winner = await findSession(db, sessionHash);
        if (winner !== null && winner.authorization_version !== expectedVersion) {
            const authorization = storedAuthorization(unsealConfidential(winner.authorization_ciphertext, settings.sessionSecret));
            if (authorization !== null)
                return { ...authorization, tokenExpiresAt: winner.token_expires_at, row: winner };
        }
        return null;
    };
    let refreshed;
    try {
        refreshed = await calls.refresh(current.refreshToken, { clientId: settings.clientId, clientSecret: settings.clientSecret });
    }
    catch (error) {
        // Discord rotates refresh tokens. A concurrent request may already have won
        // this refresh; use its committed authorization instead of deleting the
        // session merely because this request lost the race.
        const winner = await winnerOrNull();
        if (winner !== null)
            return winner;
        throw error;
    }
    const updatedAt = nowSeconds(now);
    const ciphertext = sealConfidential({ accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken }, settings.sessionSecret);
    const tokenExpiresAt = updatedAt + Math.floor(refreshed.expiresIn);
    if (!(await updateAuthorization(db, sessionHash, ciphertext, tokenExpiresAt, updatedAt, expectedVersion))) {
        const winner = await winnerOrNull();
        if (winner !== null)
            return winner;
        throw new Error('Discord authorization refresh lost without a committed winner');
    }
    return {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        tokenExpiresAt,
        row: { ...row, authorization_ciphertext: ciphertext, authorization_version: expectedVersion + 1, token_expires_at: tokenExpiresAt, retry_after: 0 },
    };
}
export async function identifyDiscord(settings, db, request, now = Date.now, calls = defaultDiscordCalls) {
    const resolved = resolveDiscordSettings(settings);
    if (!resolved.configured || db === null)
        return null;
    const sessionToken = cookieValue(request, resolved.sessionCookie);
    if (sessionToken === null)
        return null;
    const sessionHash = sha256Hex(sessionToken);
    let row = await findSession(db, sessionHash);
    if (row === null)
        return null;
    const current = nowSeconds(now);
    if (typeof row.session_expires_at !== 'number' || row.session_expires_at < current) {
        await revokeQuietly(storedAuthorization(unsealConfidential(row.authorization_ciphertext, settings.sessionSecret)), settings, calls);
        await deleteSession(db, sessionHash);
        return null;
    }
    if (typeof row.retry_after === 'number' && row.retry_after > current) {
        return { unavailable: true, retryAfter: Math.max(1, row.retry_after - current) };
    }
    let sealed = storedAuthorization(unsealConfidential(row.authorization_ciphertext, settings.sessionSecret));
    if (sealed === null) {
        await deleteSession(db, sessionHash);
        return null;
    }
    try {
        if (typeof row.token_expires_at !== 'number' || row.token_expires_at <= current + REFRESH_SKEW_SECONDS) {
            const refreshed = await refreshStoredAuthorization(row, settings, db, sessionHash, now, calls, sealed);
            if (refreshed === null)
                throw new Error('stored Discord authorization is unreadable');
            sealed = refreshed;
            row = refreshed.row;
        }
        let member;
        try {
            member = await calls.currentMember(sealed.accessToken, settings.guildId);
        }
        catch (error) {
            if (!(error instanceof DiscordUserAuthorizationError) || error.status !== 401)
                throw error;
            const refreshed = await refreshStoredAuthorization(row, settings, db, sessionHash, now, calls, sealed);
            if (refreshed === null)
                throw error;
            sealed = refreshed;
            row = refreshed.row;
            member = await calls.currentMember(sealed.accessToken, settings.guildId);
        }
        if (member === null || !discordMemberHasRole(member, settings.roleId)) {
            await revokeQuietly(sealed, settings, calls);
            await deleteSession(db, sessionHash);
            return null;
        }
        if (row.retry_after !== 0)
            await updateRetryAfter(db, sessionHash, 0);
    }
    catch (error) {
        // Transient Discord failures deny this request without converting a valid
        // session into a stale authorization snapshot. Token failures are removed.
        if (error instanceof DiscordUserAuthorizationError && error.status === 429) {
            const seconds = Math.max(1, Math.ceil(error.retryAfter ?? 1));
            await updateRetryAfter(db, sessionHash, current + seconds);
            return { unavailable: true, retryAfter: seconds };
        }
        if (error instanceof DiscordUserAuthorizationError && [500, 502, 503, 504].includes(error.status ?? 0)) {
            return { unavailable: true, retryAfter: 1 };
        }
        await deleteSession(db, sessionHash);
        return null;
    }
    return Object.freeze({ provider: 'discord', subject: `discord:${row.discord_user_id}`, subjectHash: row.subject_hash, label: row.display_name });
}
export async function logoutDiscord(settings, db, request, calls = defaultDiscordCalls) {
    const resolved = resolveDiscordSettings(settings);
    const sessionToken = cookieValue(request, resolved.sessionCookie);
    if (resolved.configured && db !== null && sessionToken !== null) {
        const sessionHash = sha256Hex(sessionToken);
        const row = await findSession(db, sessionHash);
        if (row !== null) {
            const sealed = storedAuthorization(unsealConfidential(row.authorization_ciphertext, settings.sessionSecret));
            await deleteSession(db, sessionHash);
            await revokeQuietly(sealed, settings, calls);
        }
    }
    return { status: 302, redirect: '/', cookies: [clearedCookie(resolved.sessionCookie), clearedCookie(resolved.transactionCookie)] };
}

// Discord application-command admission. This deliberately has no OAuth
// client secret: Discord's Ed25519 signature (or a bot-owned gateway's HMAC)
// authenticates the command, then the configured bot re-observes current
// membership on every protected read. The database keeps a code hash, a
// separate browser-verifier hash, and a provider-qualified subject hash; the
// Discord user id is encrypted at rest solely so membership can be re-observed.
import { createHmac, timingSafeEqual, verify as verifySignature } from 'node:crypto';
import { SNOWFLAKE, discordSubjectHash } from './discord.mjs';
import { clearedCookie, cookieValue, opaqueCookie, randomToken, sealConfidential, unsealConfidential } from './session.mjs';
import { sha256Hex } from '@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity';
const CHALLENGE_TTL_SECONDS = 5 * 60;
const SESSION_TTL_SECONDS = 14 * 24 * 60 * 60;
const RATE_WINDOW_SECONDS = 60;
const RATE_LIMIT = 12;
const HEX64 = /^[a-f0-9]{64}$/iu;
const encoder = new TextEncoder();
function hexBytes(value, length) {
    return typeof value === 'string' && new RegExp(`^[a-f0-9]{${length}}$`, 'iu').test(value) ? Uint8Array.from(Buffer.from(value, 'hex')) : null;
}
export function resolveDiscordCommandSettings(settings) {
    const missing = [];
    for (const name of ['botToken', 'guildId', 'roleId', 'sessionSecret', 'commandName']) {
        if (typeof settings[name] !== 'string' || settings[name].trim() === '')
            missing.push(name);
    }
    const malformed = [];
    for (const name of ['guildId', 'roleId']) {
        if (!missing.includes(name) && !SNOWFLAKE.test(settings[name]))
            malformed.push(name);
    }
    const publicKeyMissing = typeof settings.publicKey !== 'string' || settings.publicKey.trim() === '';
    if (!publicKeyMissing && hexBytes(settings.publicKey, 64) === null)
        malformed.push('publicKey');
    const gatewayConfigured = missing.length === 0 && malformed.length === 0;
    return Object.freeze({
        configured: gatewayConfigured && !publicKeyMissing,
        gatewayConfigured,
        missing: Object.freeze(publicKeyMissing ? [...missing, 'publicKey'] : missing),
        malformed: Object.freeze(malformed),
        sessionCookie: settings.sessionCookie ?? 'web_discord_session',
        verifierCookie: settings.verifierCookie ?? 'web_discord_command_verifier',
        gatewayTimestampHeader: settings.gatewayTimestampHeader ?? 'x-web-gateway-timestamp',
        gatewaySignatureHeader: settings.gatewaySignatureHeader ?? 'x-web-gateway-signature',
    });
}
const nowSeconds = (now) => Math.floor(now() / 1000);
function sourceBucket(request) {
    const forwarded = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    // A missing edge address shares one conservative bucket; it never disables
    // the limit or stores a client-provided raw address.
    return typeof forwarded === 'string' && forwarded.length <= 128 ? forwarded : 'unknown';
}
async function allowChallenge(request, settings, db, now) {
    const current = nowSeconds(now);
    const key = sha256Hex(`discord-command-rate\0${settings.sessionSecret}\0${sourceBucket(request)}`);
    await db.prepare(`
    INSERT INTO discord_command_login_rate_limits (rate_key, attempts, reset_at) VALUES (?, 1, ?)
    ON CONFLICT(rate_key) DO UPDATE SET
      attempts = CASE WHEN reset_at <= ? THEN 1 ELSE attempts + 1 END,
      reset_at = CASE WHEN reset_at <= ? THEN ? ELSE reset_at END
  `).bind(key, current + RATE_WINDOW_SECONDS, current, current, current + RATE_WINDOW_SECONDS).run();
    const row = await db.prepare('SELECT attempts, reset_at FROM discord_command_login_rate_limits WHERE rate_key = ?').bind(key).first();
    return Number(row?.attempts) <= RATE_LIMIT;
}
export async function createDiscordCommandChallenge(settings, db, request, now = Date.now) {
    const resolved = resolveDiscordCommandSettings(settings);
    if (!resolved.gatewayConfigured)
        return { status: 503, error: 'discord-command-login-unconfigured' };
    if (db === null)
        return { status: 503, error: 'discord-command-store-unconfigured' };
    if (!(await allowChallenge(request, settings, db, now)))
        return { status: 429, error: 'discord-command-login-rate-limited', retryAfter: RATE_WINDOW_SECONDS };
    const code = randomToken(18);
    const verifier = randomToken(32);
    const current = nowSeconds(now);
    await db.prepare('INSERT INTO discord_command_login_challenges (challenge_hash, verifier_hash, expires_at, created_at) VALUES (?, ?, ?, ?)')
        .bind(sha256Hex(code), sha256Hex(verifier), current + CHALLENGE_TTL_SECONDS, current).run();
    return {
        status: 201,
        challenge: code,
        expiresAt: current + CHALLENGE_TTL_SECONDS,
        command: `/${settings.commandName} ${code}`,
        cookies: [opaqueCookie(resolved.verifierCookie, verifier, CHALLENGE_TTL_SECONDS)],
    };
}
export async function pollDiscordCommandChallenge(settings, db, request, offered, now = Date.now) {
    const resolved = resolveDiscordCommandSettings(settings);
    const notFound = { status: 404, error: 'discord-command-challenge-not-found' };
    if (!resolved.gatewayConfigured || db === null || typeof offered !== 'string' || offered.length < 16 || offered.length > 128)
        return notFound;
    const current = nowSeconds(now);
    const challengeHash = sha256Hex(offered);
    const verifier = cookieValue(request, resolved.verifierCookie);
    const row = await db.prepare('SELECT verifier_hash, expires_at, approved_at, consumed_at, subject_hash, discord_user_ciphertext FROM discord_command_login_challenges WHERE challenge_hash = ?')
        .bind(challengeHash).first();
    if (row === null || row === undefined || row.expires_at < current || row.consumed_at !== null)
        return notFound;
    if (typeof verifier !== 'string' || row.verifier_hash !== sha256Hex(verifier))
        return notFound;
    if (row.approved_at === null || typeof row.subject_hash !== 'string' || typeof row.discord_user_ciphertext !== 'string') {
        return { status: 202, authenticated: false, expiresAt: row.expires_at };
    }
    const consumed = await db.prepare('UPDATE discord_command_login_challenges SET consumed_at = ? WHERE challenge_hash = ? AND consumed_at IS NULL AND approved_at IS NOT NULL AND expires_at >= ?')
        .bind(current, challengeHash, current).run();
    if (Number(consumed?.meta?.changes ?? 0) !== 1)
        return notFound;
    const session = randomToken();
    await db.prepare('INSERT INTO discord_interaction_sessions (session_hash, subject_hash, discord_user_ciphertext, session_expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(sha256Hex(session), row.subject_hash, row.discord_user_ciphertext, current + SESSION_TTL_SECONDS, current).run();
    return { status: 200, authenticated: true, cookies: [opaqueCookie(resolved.sessionCookie, session, SESSION_TTL_SECONDS), clearedCookie(resolved.verifierCookie)] };
}
function validDiscordSignature(settings, request, raw, now) {
    const timestamp = request.headers.get('x-signature-timestamp');
    const signature = hexBytes(request.headers.get('x-signature-ed25519'), 128);
    const publicKey = hexBytes(settings.publicKey, 64);
    if (typeof timestamp !== 'string' || !/^\d{10,13}$/u.test(timestamp) || signature === null || publicKey === null)
        return false;
    const supplied = Number(timestamp);
    const seconds = timestamp.length === 13 ? Math.floor(supplied / 1000) : supplied;
    if (!Number.isSafeInteger(seconds) || Math.abs(nowSeconds(now) - seconds) > 300)
        return false;
    try {
        // Ed25519 raw public keys are wrapped in the SubjectPublicKeyInfo prefix Node expects.
        const spki = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(publicKey)]);
        return verifySignature(null, encoder.encode(`${timestamp}${raw}`), { key: spki, format: 'der', type: 'spki' }, Buffer.from(signature));
    }
    catch {
        return false;
    }
}
function validGatewaySignature(settings, resolved, request, rawBytes, now) {
    const timestamp = request.headers.get(resolved.gatewayTimestampHeader);
    const signature = hexBytes(request.headers.get(resolved.gatewaySignatureHeader), 64);
    if (typeof timestamp !== 'string' || !/^\d{10}$/u.test(timestamp) || signature === null || Math.abs(nowSeconds(now) - Number(timestamp)) > 300)
        return false;
    const expected = createHmac('sha256', settings.botToken).update(`${timestamp}.`).update(rawBytes).digest();
    return expected.length === signature.length && timingSafeEqual(expected, Buffer.from(signature));
}
async function approveChallenge(settings, db, challenge, userId, now) {
    const current = nowSeconds(now);
    const changed = await db.prepare('UPDATE discord_command_login_challenges SET approved_at = ?, subject_hash = ?, discord_user_ciphertext = ? WHERE challenge_hash = ? AND approved_at IS NULL AND consumed_at IS NULL AND expires_at >= ?')
        .bind(current, discordSubjectHash(userId), sealConfidential({ id: userId }, settings.sessionSecret), sha256Hex(challenge), current).run();
    return Number(changed?.meta?.changes ?? 0) === 1;
}
function memberAdmitted(settings, guildId, member, userId) {
    return guildId === settings.guildId && member?.pending !== true && typeof userId === 'string' && SNOWFLAKE.test(userId)
        && Array.isArray(member?.roles) && member.roles.includes(settings.roleId);
}
/** A bot-owned gateway approves a challenge with a timestamped HMAC over the exact request bytes. */
export async function acceptDiscordGatewayCommand(settings, db, request, now = Date.now) {
    const resolved = resolveDiscordCommandSettings(settings);
    if (!resolved.gatewayConfigured)
        return new Response('Not found', { status: 404 });
    const rawBytes = new Uint8Array(await request.arrayBuffer());
    if (!validGatewaySignature(settings, resolved, request, rawBytes, now))
        return new Response('Unauthorized', { status: 401 });
    let payload;
    try {
        payload = JSON.parse(new TextDecoder().decode(rawBytes));
    }
    catch {
        return new Response('Bad Request', { status: 400 });
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload))
        return new Response('Bad Request', { status: 400 });
    const record = payload;
    if (Object.keys(record).sort().join(',') !== 'challenge,guildId,pending,roles,userId' || typeof record.challenge !== 'string' || typeof record.guildId !== 'string'
        || typeof record.userId !== 'string' || typeof record.pending !== 'boolean' || !Array.isArray(record.roles)) {
        return new Response('Bad Request', { status: 400 });
    }
    if (!memberAdmitted(settings, record.guildId, { pending: record.pending, roles: record.roles }, record.userId))
        return new Response('Forbidden', { status: 403 });
    if (db === null)
        return new Response('Unavailable', { status: 503 });
    return new Response(null, { status: (await approveChallenge(settings, db, record.challenge, record.userId, now)) ? 204 : 404 });
}
const interactionReply = (content) => Response.json({ type: 4, data: { content, flags: 64 } });
/** Discord's Interactions Endpoint: an Ed25519-verified application command approves a challenge. */
export async function acceptDiscordInteraction(settings, db, request, now = Date.now) {
    const resolved = resolveDiscordCommandSettings(settings);
    if (!resolved.configured)
        return new Response('Not found', { status: 404 });
    const raw = await request.text();
    if (!validDiscordSignature(settings, request, raw, now))
        return new Response('Unauthorized', { status: 401 });
    let payload;
    try {
        payload = JSON.parse(raw);
    }
    catch {
        return new Response('Bad Request', { status: 400 });
    }
    const record = (payload && typeof payload === 'object' ? payload : {});
    if (record.type === 1)
        return Response.json({ type: 1 }); // Discord PING, only after signature verification.
    const data = (record.data && typeof record.data === 'object' ? record.data : {});
    const options = Array.isArray(data.options) ? data.options : null;
    const code = record.type === 2 && data.name === settings.commandName && options !== null
        ? options.find((item) => item?.name === 'code' && typeof item.value === 'string')?.value : null;
    if (typeof code !== 'string')
        return interactionReply('Unknown command.');
    const member = (record.member && typeof record.member === 'object' ? record.member : {});
    const user = (member.user && typeof member.user === 'object' ? member.user : {});
    if (!memberAdmitted(settings, record.guild_id, member, user.id))
        return interactionReply('Current guild membership and the required role are needed.');
    if (db === null)
        return interactionReply('Login is temporarily unavailable.');
    const approved = await approveChallenge(settings, db, code, user.id, now);
    return interactionReply(approved ? 'Login confirmed. Return to the site in this browser.' : 'That login code is expired, invalid, or already used.');
}
export const defaultBotCalls = Object.freeze({
    async member(userId, settings) {
        const response = await fetch(`https://discord.com/api/v10/guilds/${encodeURIComponent(settings.guildId)}/members/${encodeURIComponent(userId)}`, {
            headers: { authorization: `Bot ${settings.botToken}`, 'user-agent': 'DiscordBot (https://561.group, 1.1.0)' },
        });
        if (response.status === 200) {
            try {
                return { status: 200, member: await response.json() };
            }
            catch {
                return { status: 502 };
            }
        }
        let retryAfter = Number(response.headers.get('retry-after'));
        if (response.status === 429) {
            try {
                retryAfter = Number((await response.json()).retry_after) || retryAfter;
            }
            catch { /* Header fallback below. */ }
        }
        return { status: response.status, retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : 1 };
    },
});
/** The identity behind a command-login session, re-observed through the bot on every call. */
export async function identifyDiscordCommandSession(settings, db, request, now = Date.now, calls = defaultBotCalls) {
    const resolved = resolveDiscordCommandSettings(settings);
    const cookie = cookieValue(request, resolved.sessionCookie);
    if (!resolved.gatewayConfigured || db === null || typeof cookie !== 'string')
        return null;
    const sessionHash = sha256Hex(cookie);
    const forget = () => db.prepare('DELETE FROM discord_interaction_sessions WHERE session_hash = ?').bind(sessionHash).run();
    const row = await db.prepare('SELECT subject_hash, discord_user_ciphertext, session_expires_at FROM discord_interaction_sessions WHERE session_hash = ?')
        .bind(sessionHash).first();
    if (row === null || row === undefined)
        return null;
    if (row.session_expires_at < nowSeconds(now)) {
        await forget();
        return null;
    }
    const identity = unsealConfidential(row.discord_user_ciphertext, settings.sessionSecret);
    if (typeof identity?.id !== 'string' || !SNOWFLAKE.test(identity.id)) {
        await forget();
        return null;
    }
    let observed;
    try {
        observed = await calls.member(identity.id, settings);
    }
    catch {
        return { unavailable: true, retryAfter: 1 };
    }
    const status = Number(observed?.status);
    if (status === 429 || status === 401 || status === 403 || status >= 500 || !Number.isFinite(status)) {
        return { unavailable: true, retryAfter: Math.max(1, Math.min(60, Number(observed?.retryAfter) || 1)) };
    }
    if (status !== 200 || observed.member?.pending === true || !Array.isArray(observed.member?.roles) || !observed.member.roles.includes(settings.roleId)) {
        await forget();
        return null;
    }
    return Object.freeze({ provider: 'discord', subjectHash: row.subject_hash, label: 'Discord member' });
}

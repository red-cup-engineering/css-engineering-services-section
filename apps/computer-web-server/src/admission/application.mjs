// The admission application: one HTTP application, mounted in a website's
// runtime, that owns who may read what.
//
// Its middleware is the gate. For every request it identifies the principal
// through whichever providers the deployment configured, witnesses the
// admitted principal on the request trace as claims (the same shape the edge's
// auth writes), and refuses anything outside the anonymous surface with 401
// when nobody is admitted. Its resources are the logins, callbacks, logouts,
// the command login, and the identity the browser asks for. Rendering never
// grants authority: the admitted application is selected here, from a verified
// principal, and reported; a browser cannot choose it.
import { toWebRequest } from '@red-cup-engineering/http-services-section/web-bridge';
import { DISCORD_CALLBACK_PATH, DISCORD_LOGIN_PATH, beginDiscordLogin, completeDiscordLogin, defaultDiscordCalls, identifyDiscord, logoutDiscord } from './discord.mjs';
import { acceptDiscordGatewayCommand, acceptDiscordInteraction, createDiscordCommandChallenge, defaultBotCalls, identifyDiscordCommandSession, pollDiscordCommandChallenge } from './discord-command.mjs';
import { HIVE_CALLBACK_PATH, HIVE_LOGIN_PATH, createHiveLogin } from './hive.mjs';
import { admissionPage } from './page.mjs';
import { safeReturnTo } from './session.mjs';
import { PASSWORD_LOGIN_PATH, createPasswordLogin } from './password.mjs';
import { GOOGLE_CALLBACK_PATH, GOOGLE_LOGIN_PATH, GOOGLE_LOGOUT_PATH, beginGoogleLogin, completeGoogleLogin, defaultGoogleCalls, googleLogout, identifyGoogle } from './google.mjs';
export const DISCORD_COMMAND_CHALLENGE_PATH = '/api/v1/discord/command-challenge';
export const DISCORD_INTERACTION_PATH = '/api/v1/discord/interactions';
export const DISCORD_GATEWAY_COMMAND_PATH = '/api/v1/discord/gateway-command';
export const IDENTITY_PATH = '/api/v1/me';
export const APPLICATION_PATH = '/api/v1/application';
/** Where a visitor is sent to sign in, with `return_to`: the one configured provider, or a choice of them. */
export const SIGN_IN_PATH = '/sign-in';
/** The claims the gate witnesses on the request trace, as `auth.claims.<name>`. */
export const CLAIMS_ATTRIBUTE = 'auth.claims';
export const CLAIM_SUBJECT = `${CLAIMS_ATTRIBUTE}.subject`;
export const CLAIM_PROVIDER = `${CLAIMS_ATTRIBUTE}.provider`;
export const CLAIM_LABEL = `${CLAIMS_ATTRIBUTE}.label`;
export const CLAIM_EMAIL = `${CLAIMS_ATTRIBUTE}.email`;
export const CLAIM_AUTHOR = `${CLAIMS_ATTRIBUTE}.author`;
const JSON_TYPE = 'application/json; charset=utf-8';
const REQUESTS = new WeakMap();
export function requestOf(context) {
    const known = REQUESTS.get(context);
    if (known)
        return known;
    const formed = context.request instanceof Request
        ? context.request
        : toWebRequest(context.req, { url: context.url, ...(context.signal ? { signal: context.signal } : {}) });
    REQUESTS.set(context, formed);
    return formed;
}
/**
 * The request as the gate reads it: method, URL and headers, never the body, so a native
 * resource behind the gate still reads its own request stream.
 */
const HEADERS = new WeakMap();
function headersOf(context) {
    if (context.request instanceof Request)
        return context.request;
    const known = HEADERS.get(context);
    if (known)
        return known;
    const formed = toWebRequest(context.req, { url: context.url, body: false, ...(context.signal ? { signal: context.signal } : {}) });
    HEADERS.set(context, formed);
    return formed;
}
const CONTENT_ADDRESS = /^[a-f0-9]{64}$/u;
const BROWSER_MODULE = /^\/js\/[a-z0-9-]+(?:\.[a-z0-9]+)?\.mjs$/u;
const FINGERPRINTED = (name, extension) => new RegExp(`^/${name}(?:\\.[a-z0-9]+)?\\.${extension}$`, 'u');
const APP_MODULE = FINGERPRINTED('app', 'js');
const APP_STYLES = /^\/(?:vaultmaze|styles)(?:\.[a-z0-9]+)?\.css$/u;
const PUBLIC_ROOM = /^\/vault\/public\/rooms\/([a-f0-9]{64})\.json$/u;
const PUBLIC_EXACT = new Set([
    '/', '/index.html', SIGN_IN_PATH, '/healthz', '/livez', '/readyz', '/robots.txt', '/favicon.ico', '/404.html', '/sitemap.xml',
    '/vault/public/surface.json', '/vault/public/index.json', '/vault/public/feed.xml', '/vault/public/feed.atom', '/vault/public/feed.json', '/vault/public/glossary.jsonld',
    GOOGLE_LOGIN_PATH, GOOGLE_CALLBACK_PATH, GOOGLE_LOGOUT_PATH, DISCORD_LOGIN_PATH, DISCORD_CALLBACK_PATH, PASSWORD_LOGIN_PATH, HIVE_LOGIN_PATH,
]);
/**
 * The default anonymous surface. Exact shell paths, never a prefix, so an
 * authenticated tree cannot leak by spelling; content-addressed public rooms
 * under their own tree; the dereferenceable `/ns/` vocabulary, which is public
 * by doctrine and read-only.
 */
export const defaultPublicRoute = (pathname, method) => {
    if (method !== 'GET' && method !== 'HEAD')
        return false;
    if (PUBLIC_EXACT.has(pathname))
        return true;
    if (APP_MODULE.test(pathname) || APP_STYLES.test(pathname) || BROWSER_MODULE.test(pathname))
        return true;
    const room = PUBLIC_ROOM.exec(pathname);
    if (room !== null && CONTENT_ADDRESS.test(room[1]))
        return true;
    return pathname === '/ns' || pathname.startsWith('/ns/');
};
/**
 * A request path reduced to one spelling, or null when it cannot be one. Dot
 * segments, backslashes, and encoded separators are not spellings of a public
 * route; they are attempts to reach past it.
 */
export function canonicalPath(pathname) {
    let decoded;
    try {
        decoded = decodeURIComponent(pathname);
    }
    catch {
        return null;
    }
    if (decoded.includes('\\') || decoded.includes('\0'))
        return null;
    const segments = decoded.split('/');
    if (segments.some((segment) => segment === '.' || segment === '..'))
        return null;
    return decoded;
}
function json(status, value, headers = []) {
    return new Response(JSON.stringify(value), { status, headers: [['content-type', JSON_TYPE], ...headers] });
}
function authResponse(result) {
    if (result.status === 302 && 'redirect' in result) {
        return new Response(null, { status: 302, headers: [['location', result.redirect], ...(result.cookies ?? []).map((cookie) => ['set-cookie', cookie])] });
    }
    const { status, cookies, ...body } = result;
    const headers = [['content-type', JSON_TYPE]];
    if (typeof body.retryAfter === 'number')
        headers.push(['retry-after', String(body.retryAfter)]);
    // Cookies are credentials. They travel only in Set-Cookie, never in a body.
    for (const cookie of cookies ?? [])
        headers.push(['set-cookie', cookie]);
    return new Response(JSON.stringify(body), { status, headers });
}
function resource(id, match, methods, handler) {
    return Object.freeze({ id, match, methods, handler });
}
async function readJsonObject(request) {
    try {
        const value = await request.json();
        return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    }
    catch {
        return null;
    }
}
export function createWebAdmissionApplication(options) {
    const { providers, database = null, authorEmail, realm = 'web', title = realm } = options;
    const isPublic = options.publicRoute ?? defaultPublicRoute;
    const isAuthorRoute = options.authorRoute ?? (() => false);
    const applications = options.applications ?? { default: 'vaultmaze', authority: 'geode' };
    const now = options.now ?? Date.now;
    const googleCalls = options.calls?.google ?? defaultGoogleCalls;
    const discordCalls = options.calls?.discord ?? defaultDiscordCalls;
    const botCalls = options.calls?.bot ?? defaultBotCalls;
    const password = providers.password ? createPasswordLogin(providers.password, { title, now }) : null;
    const hive = providers.hive ? createHiveLogin(providers.hive, { now, title }) : null;
    const normalizedAuthor = typeof authorEmail === 'string' ? authorEmail.trim().toLowerCase() : null;
    const isAuthor = (session) => normalizedAuthor !== null && session.email.trim().toLowerCase() === normalizedAuthor;
    const authors = new Set(options.authors ?? []);
    // The two paths are alternatives, not an identity guess. An allowlisted Google
    // principal enters through Google; a current Discord member holding the exact
    // role enters through Discord. Accounts are never linked by email or name.
    async function identify(request) {
        const bearer = /^Bearer\s+(.+)$/iu.exec(request.headers.get('authorization') ?? '')?.[1]?.trim();
        if (bearer && typeof options.verifyBearer === 'function') {
            // A token this deployment issued stands for the principal it was issued to.
            const principal = await options.verifyBearer(bearer).catch(() => null);
            if (principal)
                return Object.freeze({ provider: 'bearer', author: false, ...principal });
        }
        if (providers.google) {
            const google = identifyGoogle(providers.google, request, now);
            if (google !== null)
                return Object.freeze({ provider: 'google', subjectHash: google.subjectHash, label: google.label, email: google.email, author: isAuthor(google) });
        }
        for (const local of [password, hive]) {
            const identity = local?.identify(request) ?? null;
            if (identity !== null) {
                // A local subject (`password:<username>`, `hive:<account>`) is the author when the deployment names it.
                const { subject, ...visible } = identity;
                return Object.freeze({ ...visible, author: authors.has(subject) });
            }
        }
        if (providers.discordCommand) {
            const command = await identifyDiscordCommandSession(providers.discordCommand, database, request, now, botCalls);
            if (command !== null && 'unavailable' in command)
                return command;
            if (command !== null)
                return Object.freeze({ provider: 'discord', subjectHash: command.subjectHash, label: command.label, author: false });
        }
        if (providers.discord) {
            const discord = await identifyDiscord(providers.discord, database, request, now, discordCalls);
            if (discord !== null && 'unavailable' in discord)
                return discord;
            if (discord !== null)
                return Object.freeze({ provider: 'discord', subjectHash: discord.subjectHash, label: discord.label, author: false });
        }
        return null;
    }
    const accessRequired = () => json(401, {
        error: 'access-required',
        ...(providers.google ? { login: GOOGLE_LOGIN_PATH } : {}),
        ...(providers.discord ? { discordLogin: DISCORD_LOGIN_PATH } : {}),
    }, [['www-authenticate', `Bearer realm="${realm}"`]]);
    function principalOf(context) {
        const stored = context.locals.principal;
        return stored && typeof stored === 'object' ? stored : null;
    }
    const gate = async (context) => {
        const path = canonicalPath(context.url.pathname);
        const request = headersOf(context);
        const method = request.method.toUpperCase();
        const principal = await identify(request);
        if (principal !== null && 'unavailable' in principal) {
            return json(503, { error: 'authorization-temporarily-unavailable' }, [['retry-after', String(principal.retryAfter)]]);
        }
        if (principal === null) {
            if (path !== null && isPublic(path, method))
                return undefined;
            // A person navigating to a page is sent to sign in and brought back; a program gets the 401.
            const accept = request.headers.get('accept') ?? '';
            if (method === 'GET' && path !== null && /text\/html/iu.test(accept) && !request.headers.has('authorization'))
                return new Response(null, { status: 302, headers: [['location', `${SIGN_IN_PATH}?return_to=${encodeURIComponent(path + context.url.search)}`], ['cache-control', 'no-store']] });
            return accessRequired();
        }
        if (path === null)
            return json(404, { error: 'not-found' });
        if (isAuthorRoute(path, method) && !principal.author)
            return json(403, { error: 'authoring-authority-required' });
        context.locals.principal = principal;
        const t = String(now());
        const claims = [
            [CLAIM_SUBJECT, principal.subjectHash], [CLAIM_PROVIDER, principal.provider], [CLAIM_LABEL, principal.label],
            ...(principal.email === undefined ? [] : [[CLAIM_EMAIL, principal.email]]),
            [CLAIM_AUTHOR, String(principal.author)],
        ];
        return claims.map(([a, v]) => Object.freeze({ e: context.trace.id, a, v, t }));
    };
    const signIn = async (context) => {
        const returnTo = safeReturnTo(context.url.searchParams.get('return_to'));
        const principal = await identify(requestOf(context));
        const choices = [
            ...(providers.google ? [['Continue with Google', GOOGLE_LOGIN_PATH]] : []),
            ...(providers.discord ? [['Continue with Discord', DISCORD_LOGIN_PATH]] : []),
            ...(password ? [['Username and password', PASSWORD_LOGIN_PATH]] : []),
            ...(hive ? [['Hive Keychain', HIVE_LOGIN_PATH]] : []),
        ].map(([label, path]) => {
            const login = `${path}?return_to=${encodeURIComponent(returnTo)}`;
            return [label, principal === null ? login : `${GOOGLE_LOGOUT_PATH}?return_to=${encodeURIComponent(login)}`];
        });
        if (choices.length === 0)
            return json(503, { error: 'login-unconfigured' });
        if (choices.length === 1)
            return new Response(null, { status: 302, headers: [['location', choices[0][1]], ['cache-control', 'no-store']] });
        const escape = (value) => value.replace(/[&<>"']/gu, (character) => `&#${character.charCodeAt(0)};`);
        const links = choices.map(([label, href]) => `<li><a href="${escape(href)}">${escape(label)}</a></li>`).join('');
        const account = principal === null ? '' : `<p>Signed in as <strong>${escape(principal.label)}</strong>. Choose a sign-in method to switch accounts.</p>`;
        return new Response(admissionPage({ title: `Sign in to ${title}`, place: title, body: `<h1>Sign in</h1>${account}<ul class="choices">${links}</ul><p class="aside"><a href="/">Back</a></p>` }), { status: 200, headers: [['content-type', 'text/html; charset=utf-8'], ['cache-control', 'no-store'], ['x-frame-options', 'DENY']] });
    };
    const resources = [
        resource('web-admission-sign-in', SIGN_IN_PATH, ['GET'], signIn),
        resource('web-admission-identity', IDENTITY_PATH, ['GET'], (context) => {
            const principal = principalOf(context);
            if (principal === null)
                return accessRequired();
            return json(200, {
                provider: principal.provider,
                label: principal.label,
                ...(principal.email === undefined ? {} : { email: principal.email }),
                ...(principal.author ? { canAuthor: true } : {}),
                application: principal.author ? applications.authority : applications.default,
            });
        }),
        resource('web-admission-application', APPLICATION_PATH, ['GET'], (context) => {
            const principal = principalOf(context);
            if (principal === null)
                return accessRequired();
            return json(200, { schemaVersion: 'web-admission-application-surface/v1', application: principal.author ? applications.authority : applications.default });
        }),
    ];
    if (providers.google) {
        const google = providers.google;
        resources.push(resource('web-admission-google-login', GOOGLE_LOGIN_PATH, ['GET'], (context) => authResponse(beginGoogleLogin(google, context.url, now))), resource('web-admission-google-callback', google.callbackPath ?? GOOGLE_CALLBACK_PATH, ['GET'], async (context) => authResponse(await completeGoogleLogin(google, requestOf(context), context.url, now, googleCalls))));
    }
    if (providers.discord) {
        const discord = providers.discord;
        resources.push(resource('web-admission-discord-login', DISCORD_LOGIN_PATH, ['GET'], (context) => authResponse(beginDiscordLogin(discord, context.url, now))), resource('web-admission-discord-callback', DISCORD_CALLBACK_PATH, ['GET'], async (context) => authResponse(await completeDiscordLogin(discord, database, requestOf(context), context.url, now, discordCalls))));
    }
    if (password)
        resources.push(resource('web-admission-password-login', PASSWORD_LOGIN_PATH, ['GET', 'POST'], (context) => password.handle(requestOf(context), context.url)));
    if (hive)
        resources.push(...hive.resources);
    if (providers.google || providers.discord || password || hive) {
        resources.push(resource('web-admission-logout', GOOGLE_LOGOUT_PATH, ['GET', 'POST'], async (context) => {
            const cookies = [];
            if (providers.google)
                cookies.push(...(googleLogout(providers.google).cookies ?? []));
            if (providers.discord)
                cookies.push(...((await logoutDiscord(providers.discord, database, requestOf(context), discordCalls)).cookies ?? []));
            for (const local of [password, hive])
                cookies.push(...(local?.logoutCookies() ?? []));
            return authResponse({ status: 302, redirect: safeReturnTo(context.url.searchParams.get('return_to')), cookies });
        }));
    }
    if (providers.discordCommand) {
        const command = providers.discordCommand;
        resources.push(resource('web-admission-discord-command-challenge', DISCORD_COMMAND_CHALLENGE_PATH, ['POST'], async (context) => {
            const body = await readJsonObject(requestOf(context));
            if (body === null)
                return json(400, { error: 'invalid-json' });
            if (body.action === 'create')
                return commandResponse(await createDiscordCommandChallenge(command, database, requestOf(context), now));
            if (body.action === 'poll')
                return commandResponse(await pollDiscordCommandChallenge(command, database, requestOf(context), body.challenge, now));
            return json(400, { error: 'invalid-discord-command-challenge-request' });
        }), resource('web-admission-discord-interactions', DISCORD_INTERACTION_PATH, ['POST'], (context) => acceptDiscordInteraction(command, database, requestOf(context), now)), resource('web-admission-discord-gateway-command', DISCORD_GATEWAY_COMMAND_PATH, ['POST'], (context) => acceptDiscordGatewayCommand(command, database, requestOf(context), now)));
    }
    // The command-login routes are part of the anonymous surface by construction:
    // a challenge is how an anonymous reader becomes admitted.
    const commandPaths = new Set([
        ...(providers.discordCommand ? [DISCORD_COMMAND_CHALLENGE_PATH, DISCORD_INTERACTION_PATH, DISCORD_GATEWAY_COMMAND_PATH] : []),
        ...(password ? [PASSWORD_LOGIN_PATH] : []),
        ...(hive ? [HIVE_CALLBACK_PATH] : []),
    ]);
    const publicWithCommands = (pathname, method) => (method === 'POST' && commandPaths.has(pathname)) || isPublic(pathname, method);
    return Object.freeze({
        middlewares: Object.freeze([withPublic(gate, publicWithCommands, isPublic)]),
        resources: Object.freeze(resources),
        identify,
        /** The admitted principal of a request, or null: for applications that decide on their own routes. */
        identifyContext: async (context) => {
            const principal = context.locals?.principal ?? await identify(headersOf(context));
            return principal !== null && !('unavailable' in principal) ? principal : null;
        },
        subjectOf: (context) => principalOf(context)?.subjectHash ?? null,
        isPublic: publicWithCommands,
    });
}
// The gate consults the public route including the command-login routes.
function withPublic(gate, isPublic, _base) {
    return async (context) => {
        const path = canonicalPath(context.url.pathname);
        const method = headersOf(context).method.toUpperCase();
        if (path !== null && isPublic(path, method) && !(context.locals.principal)) {
            // Public routes still learn who is asking when someone is; the gate
            // decides that. It refuses nothing on a public route.
            const result = await gate(context);
            return result instanceof Response && result.status === 401 ? undefined : result;
        }
        return gate(context);
    };
}
function commandResponse(result) {
    const { status } = result;
    const headers = [['content-type', JSON_TYPE]];
    if ('retryAfter' in result && typeof result.retryAfter === 'number')
        headers.push(['retry-after', String(result.retryAfter)]);
    const cookies = 'cookies' in result ? result.cookies : [];
    for (const cookie of cookies)
        headers.push(['set-cookie', cookie]);
    const { cookies: _cookies, ...body } = result;
    return new Response(JSON.stringify(body), { status, headers });
}

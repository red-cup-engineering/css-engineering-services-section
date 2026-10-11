import { createHmac, timingSafeEqual } from "node:crypto";
import { TellingLog, tellSides } from "@red-cup-engineering/signchain/log";
import { parseCookieHeader, serializeSetCookie } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/cookie";
import { signCookieValue, unsignCookieValue } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/signed-cookie";
import { appendSetCookie } from "@red-cup-engineering/http-services-section/cookies";
function fnv1a(s) {
    let h = 0x811c9dc5;
    for(let i = 0; i < s.length; i++){
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
}
function selectBucket(buckets, hash) {
    const total = buckets.reduce((s, b)=>s + b.weight, 0);
    if (!Number.isFinite(total) || total <= 0) throw new Error("abTest: bucket weights must sum to a positive number");
    let r = hash % total;
    for (const b of buckets){
        r -= b.weight;
        if (r < 0) return b.name;
    }
    return buckets[buckets.length - 1].name;
}
function cookieSet(name, value, maxAge, signed) {
    const v = signed ? `${value}.${signed}` : value;
    return serializeSetCookie(name, v, {
        path: "/",
        maxAge,
        sameSite: "Lax",
        httpOnly: true
    });
}
function parseCookie(header, name) {
    return parseCookieHeader(header)[name] ?? null;
}
function signedBucket(value, secret, cookieName) {
    return signCookieValue(value, secret, cookieName);
}
function verifiedBucket(raw, secret, cookieName) {
    const current = unsignCookieValue(raw, secret, cookieName);
    if (current !== null) return current;
    const [value, legacySignature] = raw.split(".", 2);
    if (!value || !legacySignature) return "";
    return verifyLegacySignature(value, legacySignature, secret) ? value : "";
}
function verifyLegacySignature(value, signature, secret) {
    const expected = createHmac("sha256", secret).update(value).digest("base64url");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}
export function abTest(experiment) {
    if (!experiment.id) throw new Error("abTest: experiment id is required");
    if (!experiment.buckets.length) throw new Error("abTest: buckets must be non-empty");
    for (const bucket of experiment.buckets){
        if (!bucket.name) throw new Error("abTest: bucket name is required");
        if (!Number.isFinite(bucket.weight) || bucket.weight <= 0) throw new Error("abTest: bucket weights must be positive");
    }
    const store = new TellingLog();
    const cookieName = experiment.cookieName ?? `ab_${experiment.id}`;
    const localsKey = experiment.localsKey ?? experiment.id;
    const maxAge = experiment.maxAge ?? 86400;
    return (ctx)=>{
        const cookieRaw = parseCookie(ctx.req.headers["cookie"], cookieName);
        if (cookieRaw) {
            let bucketName = cookieRaw;
            if (experiment.secret) {
                bucketName = verifiedBucket(cookieRaw, experiment.secret, cookieName);
            }
            if (bucketName && experiment.buckets.some((b)=>b.name === bucketName)) {
                ctx.locals[localsKey] = bucketName;
                return Promise.resolve(undefined);
            }
        }
        const userId = experiment.userId ? experiment.userId(ctx) : ctx.req.socket?.remoteAddress ?? "anon";
        const hash = fnv1a(`${experiment.id}:${userId}`);
        const bucket = selectBucket(experiment.buckets, hash);
        tellSides(store, {
            subject: experiment.id,
            predicate: "ab",
            object: bucket
        }, [
            true,
            false
        ]);
        ctx.locals[localsKey] = bucket;
        const signed = experiment.secret ? signedBucket(bucket, experiment.secret, cookieName) : undefined;
        appendSetCookie(ctx.res, signed ? cookieSet(cookieName, signed, maxAge) : cookieSet(cookieName, bucket, maxAge));
        return Promise.resolve(undefined);
    };
}
export function getBucket(ctx, experimentId) {
    return ctx.locals[experimentId];
}

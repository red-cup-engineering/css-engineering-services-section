import { TellingLog, tellSides } from "@red-cup-engineering/signchain/log";
export function acme(opts) {
    if (typeof opts.now !== "function") throw new TypeError("acme: opts.now (a clock function) is required");
    const clock = opts.now;
    const renewDays = opts.renewDaysBeforeExpiry ?? 30;
    const checkInterval = opts.checkIntervalMs ?? 86_400_000;
    const store = new TellingLog();
    const challenges = new Map();
    let certState = null;
    let timer = null;
    function storeCertMeme(state) {
        tellSides(store, {
            subject: opts.domains[0] ?? "acme",
            predicate: "cert",
            object: state
        }, state === "valid" ? [
            true,
            false
        ] : [
            false,
            true
        ]);
    }
    const challengeRespond = (token, keyAuth)=>{
        challenges.set(token, keyAuth);
    };
    async function doRenew() {
        storeCertMeme("renewing");
        try {
            const { cert, key } = await opts.order(opts.domains, opts.email, challengeRespond);
            const expiresAt = clock() + 90 * 24 * 3600 * 1000;
            certState = {
                cert,
                key,
                expiresAt
            };
            storeCertMeme("valid");
            opts.onRenew?.(opts.domains);
        } catch (err) {
            storeCertMeme("expired");
            opts.onError?.(err);
        } finally{
            challenges.clear();
        }
    }
    function shouldRenew() {
        if (!certState) return true;
        const renewThreshold = renewDays * 24 * 3600 * 1000;
        return certState.expiresAt - clock() <= renewThreshold;
    }
    timer = setInterval(async ()=>{
        if (shouldRenew()) await doRenew();
    }, checkInterval);
    if (timer.unref) timer.unref();
    const challengeMiddleware = (ctx)=>{
        const { req, res } = ctx;
        if (!req.url?.startsWith("/.well-known/acme-challenge/")) return Promise.resolve(undefined);
        const token = req.url.split("/").pop() ?? "";
        const keyAuth = challenges.get(token);
        if (!keyAuth) {
            res.writeHead(404).end();
            return Promise.resolve(true);
        }
        res.setHeader("Content-Type", "text/plain");
        res.writeHead(200).end(keyAuth);
        return Promise.resolve(true);
    };
    return {
        challengeMiddleware,
        credentials () {
            return certState ? {
                cert: certState.cert,
                key: certState.key
            } : null;
        },
        async renew () {
            await doRenew();
        },
        stop () {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
        }
    };
}
export function withAcme(app, manager) {
    const base = {
        ...app,
        middlewares: [
            manager.challengeMiddleware,
            ...app.middlewares ?? []
        ]
    };
    Object.defineProperty(base, "tls", {
        get () {
            const creds = manager.credentials();
            return creds ? {
                cert: creds.cert,
                key: creds.key
            } : app.tls;
        },
        enumerable: true,
        configurable: true
    });
    return base;
}

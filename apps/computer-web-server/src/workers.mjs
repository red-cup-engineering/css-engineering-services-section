export function createWorkerFetch(platformFor) {
    const platforms = new WeakMap();
    return Object.freeze({
        fetch (request, env) {
            let platform = platforms.get(env);
            if (!platform) {
                platform = platformFor(env);
                platforms.set(env, platform);
            }
            return platform.fetch(request);
        }
    });
}

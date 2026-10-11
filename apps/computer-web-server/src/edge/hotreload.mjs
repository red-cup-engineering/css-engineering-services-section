import { watch } from "node:fs";
import { readFile } from "node:fs/promises";
import { TellingLog, tellSides } from "@red-cup-engineering/signchain/log";
export function hotReload(opts) {
    const store = new TellingLog();
    let version = 0;
    let currentApp = {
        resources: []
    };
    let watcher = null;
    async function loadApp(manifest) {
        const mod = await import(`${manifest.module}?v=${++version}`);
        return mod.default ?? mod.app ?? {};
    }
    async function doReload() {
        const v = version + 1;
        try {
            const raw = await readFile(opts.manifestPath, "utf8");
            const manifest = JSON.parse(raw);
            const newApp = await loadApp(manifest);
            tellSides(store, {
                subject: "app",
                predicate: "reload",
                object: String(v)
            }, [
                true,
                false
            ]);
            currentApp = newApp;
            opts.onReload?.(newApp, v);
        } catch (err) {
            opts.onError?.(err, v) ?? console.error("[hotreload] failed:", err);
        }
    }
    if (opts.watch !== false) {
        try {
            watcher = watch(opts.manifestPath, ()=>void doReload());
        } catch  {}
    }
    if (opts.sighup !== false) {
        process.on("SIGHUP", ()=>void doReload());
    }
    const middleware = async (ctx)=>{
        const app = currentApp;
        for (const mw of app.middlewares ?? []){
            const result = await mw(ctx);
            if (result === true) return true;
        }
        return;
    };
    return {
        current () {
            return currentApp;
        },
        middleware,
        async reload () {
            await doReload();
        },
        stop () {
            if (watcher) {
                watcher.close();
                watcher = null;
            }
        }
    };
}

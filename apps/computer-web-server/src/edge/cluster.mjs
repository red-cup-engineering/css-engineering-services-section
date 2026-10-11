import { TellingLog, tellSides } from "@red-cup-engineering/signchain/log";
export async function clusterStart(app, port, startFn, opts = {}) {
    const cluster = await import("node:cluster");
    const os = await import("node:os");
    if (!cluster.default.isPrimary) {
        return startFn(app, port);
    }
    const numWorkers = opts.workers ?? os.default.cpus().length;
    const restartDelay = opts.restartDelay ?? 1000;
    const gracefulTimeoutMs = opts.gracefulTimeoutMs ?? 10_000;
    const store = new TellingLog();
    function forkWorker() {
        const w = cluster.default.fork();
        const pid = w.process.pid ?? 0;
        tellSides(store, {
            subject: String(pid),
            predicate: "worker",
            object: "alive"
        }, [
            true,
            false
        ]);
        opts.onWorkerStart?.(pid);
        w.on("exit", (code, signal)=>{
            tellSides(store, {
                subject: String(pid),
                predicate: "worker",
                object: "alive"
            }, [
                false,
                true
            ]);
            opts.onWorkerExit?.(pid, code, signal);
            setTimeout(()=>forkWorker(), restartDelay);
        });
    }
    for(let i = 0; i < numWorkers; i++)forkWorker();
    return {
        server: null,
        port,
        address: null,
        close: async ()=>{
            const workers = Object.values(cluster.default.workers ?? {});
            const killTimer = setTimeout(()=>{
                for (const w of workers)w?.process.kill("SIGKILL");
            }, gracefulTimeoutMs);
            await Promise.all(workers.map((w)=>new Promise((resolve)=>{
                    if (!w) {
                        resolve();
                        return;
                    }
                    w.disconnect();
                    w.once("exit", ()=>resolve());
                })));
            clearTimeout(killTimer);
        }
    };
}

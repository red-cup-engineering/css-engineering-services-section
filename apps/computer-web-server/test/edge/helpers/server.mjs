import { createHttpServer } from "@red-cup-engineering/http-services-section/node-server";

export function makeContext(req, res) {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    return {
        req,
        res,
        app: {
            resources: []
        },
        url,
        params: {},
        locals: {},
        nonce: "test-nonce",
        signal: new AbortController().signal,
        trace: {
            entries: []
        },
        startedAt: Date.now()
    };
}
export async function startMiddlewareServer(middlewares, opts = {}) {
    const chain = Array.isArray(middlewares) ? middlewares : [
        middlewares
    ];
    const server = createHttpServer({ handle: (req, res)=>{
        void (async ()=>{
            const ctx = makeContext(req, res);
            try {
                for (const middleware of chain){
                    const result = await middleware(ctx);
                    if (result === true || res.writableEnded) break;
                }
            } catch (error) {
                opts.onUncaught?.(error);
                if (!res.headersSent) res.writeHead(500).end(String(error));
            }
            if (!res.writableEnded) res.end();
        })();
    } });
    await new Promise((resolve, reject)=>{
        server.once("error", reject);
        server.listen(0, "127.0.0.1", ()=>resolve());
    });
    await new Promise((resolve)=>setTimeout(resolve, 30));
    const { port } = server.address();
    return {
        url: `http://127.0.0.1:${port}`,
        server,
        close: ()=>new Promise((resolve, reject)=>{
                server.close((error)=>error ? reject(error) : resolve());
            })
    };
}

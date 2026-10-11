import { jsonRepr } from "@red-cup-engineering/http-services-section/representation";
export function serveScripts(scripts) {
    const names = Object.keys(scripts);
    return {
        resources: [
            {
                match: "/health",
                methods: [
                    "GET"
                ],
                produces: [
                    "application/json"
                ],
                handler: ()=>jsonRepr({
                        status: "ok",
                        scripts: names
                    })
            },
            ...names.map((name)=>({
                    match: `/${name}`,
                    methods: [
                        "GET"
                    ],
                    produces: [
                        "application/json"
                    ],
                    handler: async (ctx)=>{
                        const params = Object.fromEntries(ctx.url.searchParams.entries());
                        try {
                            return jsonRepr(await scripts[name](params));
                        } catch (err) {
                            return jsonRepr({
                                error: err instanceof Error ? err.message : String(err)
                            }, 500);
                        }
                    }
                }))
        ]
    };
}

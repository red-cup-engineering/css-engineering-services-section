import { createCapabilityPlatform, isCapabilityPlatform } from "@red-cup-engineering/computer-system-platform/capability-lifecycle";
import { createWebServer } from "@red-cup-engineering/computer-web-server";

export function createWebPlatform(specification = {}) {
    const platform = isCapabilityPlatform(specification.platform) ? specification.platform : createCapabilityPlatform(specification.platform ?? {});
    const releases = new WeakMap();
    const { platform: _platform, ...web } = specification;
    const application = {
        ...web,
        onRequest: async (context)=>{
            let capabilities;
            try {
                capabilities = await platform.start();
            } catch  {
                return Response.json({
                    type: "about:blank",
                    status: 503,
                    title: "Platform unavailable"
                }, {
                    status: 503
                });
            }
            if (platform.closed()) return new Response("Platform unavailable", {
                status: 503
            });
            releases.set(context, platform.acquire());
            context.capabilities = Object.freeze({
                ...context.capabilities,
                ...capabilities
            });
            context.platform = platform;
            return specification.onRequest?.(context);
        },
        onComplete: (context)=>{
            releases.get(context)?.();
            releases.delete(context);
            specification.onComplete?.(context);
        }
    };
    return Object.freeze({
        specification,
        fetch: createWebServer(application).fetch,
        platform,
        start: async ()=>{
            await platform.start();
        },
        close: ()=>platform.close()
    });
}

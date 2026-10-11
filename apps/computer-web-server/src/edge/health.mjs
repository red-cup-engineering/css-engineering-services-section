import { compress, decompress, supportedCompressionCodings } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/content-coding";
import { readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";
export function healthResource(options = {}) {
    if (typeof options.now !== "function") throw new TypeError("healthResource: options.now (a clock function returning a Date) is required");
    const clock = options.now;
    const match = options.match ?? "/healthz";
    const probeName = options.name ?? (match.replace(/^\//, "") || "health");
    return {
        match,
        id: options.id ?? `health.${probeName}`,
        name: options.name ?? "Health",
        methods: [
            "GET"
        ],
        produces: [
            "application/health+json",
            "application/json"
        ],
        handler: async (ctx)=>{
            const report = await healthReport(ctx, probeName, options.checks ?? [], clock, options.includeReading ?? false);
            const repr = {
                status: report.status === "fail" ? 503 : 200,
                type: "application/health+json; charset=utf-8",
                cacheControl: {
                    noStore: true
                },
                body: JSON.stringify(report)
            };
            return repr;
        }
    };
}
export function healthResources(options = {}) {
    if (typeof options.now !== "function") throw new TypeError("healthResources: options.now (a clock function returning a Date) is required");
    const now = options.now;
    const includeReading = options.includeReading ?? false;
    const resources = [];
    if (options.healthPath !== false) {
        resources.push(healthResource({
            match: options.healthPath ?? "/healthz",
            name: "health",
            checks: options.health ?? [],
            includeReading,
            now
        }));
    }
    if (options.livePath !== false) {
        resources.push(healthResource({
            match: options.livePath ?? "/livez",
            name: "live",
            checks: options.live ?? [],
            includeReading,
            now
        }));
    }
    if (options.readyPath !== false) {
        resources.push(healthResource({
            match: options.readyPath ?? "/readyz",
            name: "ready",
            checks: options.ready ?? [],
            includeReading,
            now
        }));
    }
    if (options.startupPath !== false && options.startup !== undefined) {
        resources.push(healthResource({
            match: options.startupPath ?? "/startupz",
            name: "startup",
            checks: options.startup,
            includeReading,
            now
        }));
    }
    return resources;
}
export function shutdownReadinessCheck(shutdown, options = {}) {
    const name = options.name ?? "shutdown";
    return {
        name,
        check: ()=>{
            const state = shutdown.state;
            if (state.phase === "running") {
                return {
                    status: "pass",
                    evidence: [
                        `${name}:running`
                    ],
                    data: {
                        phase: state.phase
                    }
                };
            }
            return {
                status: "fail",
                detail: state.phase === "draining" ? "server is draining" : `server is ${state.phase}`,
                evidence: [
                    `${name}:${state.phase}`
                ],
                data: {
                    phase: state.phase,
                    ...state.reason !== undefined ? {
                        reason: state.reason
                    } : {},
                    ...state.signal !== undefined ? {
                        signal: state.signal
                    } : {},
                    ...state.startedAt !== undefined ? {
                        startedAt: state.startedAt
                    } : {},
                    ...state.closedAt !== undefined ? {
                        closedAt: state.closedAt
                    } : {},
                    ...state.error !== undefined ? {
                        error: state.error
                    } : {}
                }
            };
        }
    };
}
export function transferCodingHealthCheck(options = {}) {
    const name = options.name ?? "transfer-coding";
    return {
        name,
        check: async ()=>{
            const codings = supportedCompressionCodings();
            const body = Buffer.from("@red-cup-engineering/web-server transfer coding probe");
            const passed = [];
            for (const coding of codings){
                const compressed = await compress(body, coding);
                const restored = await decompress(compressed, coding);
                if (!restored.equals(body)) {
                    return {
                        status: "fail",
                        detail: `${coding} did not round-trip`,
                        evidence: [
                            `${name}:${coding}:failed`
                        ],
                        data: {
                            codings,
                            passed
                        }
                    };
                }
                passed.push(coding);
            }
            return {
                status: "pass",
                evidence: codings.map((coding)=>`${name}:${coding}:available`),
                data: {
                    codings
                }
            };
        }
    };
}
async function healthReport(ctx, probeName, checks, now, includeReading) {
    const started = now().getTime();
    const normalized = [];
    for (const healthCheck of checks){
        const result = await runCheck(ctx, healthCheck);
        normalized.push({
            name: healthCheck.name,
            status: result.status,
            ...includeReading ? {
                reading: String(healthReading(result.status))
            } : {},
            evidence: result.evidence,
            ...result.detail !== undefined ? {
                detail: result.detail
            } : {},
            ...result.data !== undefined ? {
                data: result.data
            } : {}
        });
    }
    const status = aggregateStatus(normalized);
    return {
        status,
        ...includeReading ? {
            reading: String(healthReading(status))
        } : {},
        checkedAt: now().toISOString(),
        durationMs: Math.max(0, now().getTime() - started),
        checks: normalized
    };
}
async function runCheck(ctx, healthCheck) {
    try {
        return normalizeResult(await healthCheck.check(ctx), healthCheck.name);
    } catch (error) {
        return {
            status: "fail",
            detail: error instanceof Error ? error.message : String(error),
            evidence: [
                `${healthCheck.name}:threw`
            ]
        };
    }
}
function normalizeResult(result, name) {
    if (typeof result === "boolean") {
        return {
            status: result ? "pass" : "fail",
            evidence: [
                `${name}:${result ? "pass" : "fail"}`
            ]
        };
    }
    if (result === "pass" || result === "warn" || result === "fail") {
        return {
            status: result,
            evidence: [
                `${name}:${result}`
            ]
        };
    }
    const status = result.status ?? (result.ok === undefined ? "pass" : result.ok ? "pass" : "fail");
    return {
        status,
        evidence: [
            ...result.evidence ?? [
                `${name}:${status}`
            ]
        ],
        ...result.detail !== undefined ? {
            detail: result.detail
        } : {},
        ...result.data !== undefined ? {
            data: result.data
        } : {}
    };
}
function aggregateStatus(checks) {
    if (checks.some((check)=>check.status === "fail")) return "fail";
    if (checks.some((check)=>check.status === "warn")) return "warn";
    return "pass";
}
function healthReading(status) {
    return readingOfSides("knowledge", status === "pass" || status === "warn", status === "fail" || status === "warn");
}

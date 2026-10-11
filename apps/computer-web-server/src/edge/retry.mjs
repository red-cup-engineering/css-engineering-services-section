import { retryWithBackoff } from "@red-cup-engineering/javascript-node-services-section/retry";
import { TellingLog, tellSides } from "@red-cup-engineering/signchain/log";
import { readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";
export async function withRetries(fn, opts = {}) {
    const maxAttempts = opts.maxAttempts ?? 3;
    const baseDelayMs = opts.baseDelayMs ?? 100;
    const maxDelayMs = opts.maxDelayMs ?? 10_000;
    const jitter = opts.jitter !== false;
    const retryOn = opts.retryOn ?? ((_err, status)=>status == null || status >= 500);
    const result = await retryWithBackoff({
        operation: async ()=>{
            try {
                return {
                    ok: true,
                    value: await fn()
                };
            } catch (err) {
                return {
                    ok: false,
                    refusal: err
                };
            }
        },
        isRetryable (refusal, attempt) {
            const shouldRetry = retryOn(refusal, undefined);
            if (shouldRetry) opts.onRetry?.(attempt, refusal);
            return shouldRetry;
        },
        maxAttempts,
        baseDelayMs,
        backoffFactor: 2,
        maxDelayMs,
        jitter: jitter ? 0.25 : false
    });
    if (result.ok) return result.value;
    throw result.refusal.refusal;
}
export class OutlierEjector {
    store = new TellingLog();
    states = new Map();
    opts;
    constructor(opts = {}){
        if (typeof opts.now !== "function") throw new TypeError("OutlierEjector: opts.now (a clock function) is required");
        this.opts = {
            now: opts.now,
            consecutiveThreshold: opts.consecutiveThreshold ?? 5,
            windowMs: opts.windowMs ?? 60_000,
            failureRateThreshold: opts.failureRateThreshold ?? 0.5,
            ejectMs: opts.ejectMs ?? 30_000,
            probeSuccesses: opts.probeSuccesses ?? 1,
            onEject: opts.onEject ?? (()=>{}),
            onReadmit: opts.onReadmit ?? (()=>{})
        };
    }
    state(id) {
        if (!this.states.has(id)) this.states.set(id, {
            consecutive: 0,
            events: [],
            ejectedAt: null,
            probeSuccesses: 0
        });
        return this.states.get(id);
    }
    record(id, ok) {
        const s = this.state(id);
        const now = this.opts.now();
        if (ok) {
            s.consecutive = 0;
            if (s.ejectedAt !== null) {
                s.probeSuccesses++;
                if (s.probeSuccesses >= this.opts.probeSuccesses) {
                    s.ejectedAt = null;
                    s.probeSuccesses = 0;
                    tellSides(this.store, {
                        subject: id,
                        predicate: "outlier",
                        object: "readmit"
                    }, [
                        true,
                        false
                    ]);
                    this.opts.onReadmit(id);
                }
            }
        } else {
            s.consecutive++;
            s.probeSuccesses = 0;
        }
        s.events.push({
            ts: now,
            ok
        });
        s.events = s.events.filter((e)=>now - e.ts < this.opts.windowMs);
        const alreadyEjected = s.ejectedAt !== null && now - s.ejectedAt < this.opts.ejectMs;
        if (!alreadyEjected) {
            const triggerConsecutive = s.consecutive >= this.opts.consecutiveThreshold;
            const windowEvents = s.events;
            const failRate = windowEvents.length > 0 ? windowEvents.filter((e)=>!e.ok).length / windowEvents.length : 0;
            const triggerRate = failRate >= this.opts.failureRateThreshold && windowEvents.length >= 5;
            if (triggerConsecutive || triggerRate) {
                s.ejectedAt = now;
                tellSides(this.store, {
                    subject: id,
                    predicate: "outlier",
                    object: "eject"
                }, [
                    false,
                    true
                ]);
                this.opts.onEject(id);
            }
        }
    }
    isAdmissible(id) {
        const s = this.state(id);
        const now = this.opts.now();
        const g = readingOfSides("knowledge", s.ejectedAt === null || now - s.ejectedAt >= this.opts.ejectMs, s.ejectedAt !== null);
        return g === "potential" || g === "stable";
    }
    isProbing(id) {
        const s = this.state(id);
        if (s.ejectedAt === null) return false;
        return this.opts.now() - s.ejectedAt >= this.opts.ejectMs;
    }
}

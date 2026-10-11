import { TellingLog, tellSides } from "@red-cup-engineering/signchain/log";
import { realClock } from "./clock.mjs";
import { cronRuleOf, nextScheduledAfter } from "@red-cup-engineering/cron-services-section/schedule";
// The emulated platform keeps its host's wall clock, so a cron job reads in the process's own time
// zone. The rule itself is the house's one cron reading (cron-services-section).
const LOCAL_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
export const parseCron = (expr) => cronRuleOf(expr);
export function nextRun(expr, afterMs = Date.now()) {
    return nextScheduledAfter(expr, LOCAL_ZONE, afterMs) ?? null;
}
let jobCounter = 0;
export class PlatformScheduler {
    store = new TellingLog();
    timers = new Map();
    jobs = new Map();
    states = new Map();
    names = new Map();
    clock;
    persistentStore;
    persistTail = Promise.resolve();
    ready;
    constructor(opts = {}){
        this.clock = opts.clock ?? realClock();
        this.persistentStore = opts.store ?? null;
        this.ready = this.loadPersisted();
    }
    register(opts) {
        this.validate(opts);
        const existing = this.existingStateFor(opts);
        const id = opts.id ?? existing?.id ?? `job-${++jobCounter}-${opts.name}`;
        const state = this.stateFor(id, opts, existing);
        this.persist(state);
        this.jobs.set(id, opts);
        this.record(id, "scheduled", true);
        this.arm(id, opts, state.nextAt);
        return id;
    }
    cancel(id) {
        this.clearTimer(id);
        this.jobs.delete(id);
        const state = this.states.get(id);
        if (state) {
            this.states.delete(id);
            this.names.delete(state.name);
            this.deletePersisted(id);
        }
        this.record(id, "cancelled", false);
    }
    validate(opts) {
        if (!opts.name) throw new TypeError("scheduler: job name is required");
        if (typeof opts.handler !== "function") throw new TypeError("scheduler: job handler is required");
        if (opts.cron) parseCron(opts.cron);
        if (opts.intervalMs !== undefined && opts.intervalMs <= 0) throw new RangeError("scheduler: intervalMs must be > 0");
        if (opts.delayMs !== undefined && opts.delayMs < 0) throw new RangeError("scheduler: delayMs must be >= 0");
    }
    async loadPersisted() {
        if (!this.persistentStore) return;
        try {
            for await (const [id, state] of this.persistentStore.entries()){
                if (!state || state.id !== id) continue;
                this.states.set(id, structuredClone(state));
                this.names.set(state.name, id);
            }
        } catch  {}
    }
    persist(state) {
        const cloned = structuredClone(state);
        this.states.set(cloned.id, cloned);
        this.names.set(cloned.name, cloned.id);
        if (!this.persistentStore) return;
        this.persistTail = this.persistTail.then(()=>this.persistentStore.set(cloned.id, cloned)).then(()=>undefined, ()=>undefined);
    }
    deletePersisted(id) {
        if (!this.persistentStore) return;
        this.persistTail = this.persistTail.then(()=>this.persistentStore.delete(id)).then(()=>undefined, ()=>undefined);
    }
    flush() {
        return this.persistTail;
    }
    kindOf(opts) {
        if (opts.delayMs !== undefined) return "delay";
        if (opts.intervalMs !== undefined) return "interval";
        if (opts.cron !== undefined) return "cron";
        return "manual";
    }
    existingStateFor(opts) {
        if (opts.id && this.states.has(opts.id)) return this.states.get(opts.id);
        const namedId = this.names.get(opts.name);
        return namedId ? this.states.get(namedId) : undefined;
    }
    sameSchedule(state, opts) {
        if (!state) return false;
        const kind = this.kindOf(opts);
        if (state.kind !== kind) return false;
        if (kind === "cron") return state.cron === opts.cron;
        if (kind === "interval") return state.intervalMs === opts.intervalMs;
        return state.delayMs === opts.delayMs;
    }
    nextAtFor(opts, existing) {
        if (this.sameSchedule(existing, opts) && existing.nextAt !== null) return existing.nextAt;
        if (opts.delayMs !== undefined) return this.clock.now() + opts.delayMs;
        if (opts.intervalMs !== undefined) return this.clock.now() + opts.intervalMs;
        if (opts.cron) return nextRun(opts.cron, this.clock.now());
        return null;
    }
    stateFor(id, opts, existing) {
        const kind = this.kindOf(opts);
        const state = {
            id,
            name: opts.name,
            kind,
            nextAt: this.nextAtFor(opts, existing)
        };
        if (opts.cron !== undefined) state.cron = opts.cron;
        if (opts.intervalMs !== undefined) state.intervalMs = opts.intervalMs;
        if (opts.delayMs !== undefined) state.delayMs = opts.delayMs;
        if (opts.payload !== undefined) state.payload = structuredClone(opts.payload);
        if (opts.maxAttempts !== undefined) state.maxAttempts = opts.maxAttempts;
        if (opts.retryDelayMs !== undefined) state.retryDelayMs = opts.retryDelayMs;
        return state;
    }
    record(id, state, positive) {
        tellSides(this.store, {
            subject: id,
            predicate: "job",
            object: state
        }, positive ? [
            true,
            false
        ] : [
            false,
            true
        ]);
    }
    clearTimer(id) {
        const timer = this.timers.get(id);
        if (timer !== undefined) {
            this.clock.cancel(timer);
            this.timers.delete(id);
        }
    }
    setTimer(id, timer) {
        this.clearTimer(id);
        this.timers.set(id, timer);
    }
    arm(id, _opts, nextAt) {
        if (nextAt !== null) this.setTimer(id, this.clock.schedule(nextAt, ()=>void this.run(id)));
    }
    jobCancelled(id) {
        const memes = this.store.where({
            subject: id,
            predicate: "job"
        });
        return this.store.readingWhere({
            subject: id,
            predicate: "job"
        }) === "active";
    }
    retry(id, attempt) {
        const opts = this.jobs.get(id);
        if (!opts) return;
        const delay = opts.retryDelayMs ?? 5000;
        this.setTimer(id, this.clock.schedule(this.clock.now() + delay, ()=>void this.run(id, attempt)));
    }
    rearmAfterRun(id, opts, firedAt) {
        if (!this.jobs.has(id)) return;
        const state = this.states.get(id);
        if (opts.delayMs !== undefined) {
            if (state) {
                state.nextAt = null;
                this.persist(state);
            }
            this.clearTimer(id);
            return;
        }
        if (opts.intervalMs !== undefined) {
            const next = firedAt + opts.intervalMs;
            if (state) {
                state.nextAt = next;
                this.persist(state);
            }
            this.setTimer(id, this.clock.schedule(next, ()=>void this.run(id)));
            return;
        }
        if (opts.cron) {
            const next = nextRun(opts.cron, firedAt);
            if (state) {
                state.nextAt = next;
                this.persist(state);
            }
            if (next !== null) this.setTimer(id, this.clock.schedule(next, ()=>void this.run(id)));
        }
    }
    async run(id, attempt = 1) {
        const opts = this.jobs.get(id);
        if (!opts) return;
        if (this.jobCancelled(id)) return;
        const firedAt = this.clock.now();
        this.record(id, "running", true);
        const record = {
            id,
            name: opts.name,
            payload: opts.payload,
            scheduledAt: firedAt,
            attempts: attempt
        };
        try {
            await opts.handler(record);
            this.record(id, "done", true);
            opts.onSuccess?.(record);
            this.rearmAfterRun(id, opts, firedAt);
        } catch (err) {
            const maxAttempts = opts.maxAttempts ?? 3;
            if (attempt < maxAttempts) {
                this.record(id, "retry", true);
                this.retry(id, attempt + 1);
            } else {
                this.record(id, "failed", false);
                opts.onFailure?.(record, err);
                this.rearmAfterRun(id, opts, firedAt);
            }
        }
    }
    status(id) {
        const memes = this.store.where({
            subject: id,
            predicate: "job"
        });
        if (!memes.length) return "unknown";
        return String((memes[memes.length - 1])?.object);
    }
    stop() {
        for (const id of [
            ...this.timers.keys()
        ])this.clearTimer(id);
    }
    stopAll() {
        for (const id of [
            ...this.jobs.keys()
        ])this.cancel(id);
    }
}
export function platformScheduler(opts = {}) {
    return new PlatformScheduler(opts);
}
export function schedulerResource(scheduler, jobIds) {
    return {
        match: "/platform/jobs",
        methods: [
            "GET"
        ],
        handler: (ctx)=>{
            const statuses = Object.fromEntries(jobIds.map((id)=>[
                    id,
                    scheduler.status(id)
                ]));
            ctx.res.setHeader("Content-Type", "application/json");
            ctx.res.writeHead(200).end(JSON.stringify(statuses));
            return Promise.resolve();
        }
    };
}

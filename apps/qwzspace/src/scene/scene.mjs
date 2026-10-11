/**
 * The scene kernel — the authoritative single-writer simulation.
 *
 * A scene is the three substrate commitments composed:
 *
 *   - SPACE is the icosahedral quasicrystal. A body occupies a lattice site;
 *     it may only ever stand on a *realized* place (one the acceptance window
 *     admits). Movement is constrained to the model set — you cannot walk off
 *     the quasicrystal. Render positions are the float boundary read of the
 *     exact cut.
 *   - EXISTENCE is a bilattice reading. A body does not have a boolean alive; it
 *     has accumulated `alive`/`slain` evidence whose knowledge-join is its
 *     four-valued existence (existence.mts). Visibility *is* that reading, and
 *     paraconsistent death (alive ∧ slain = ⊤, the undead) is the headline.
 *   - TIME is the tick — a single-writer monotone settling. State only
 *     accumulates per tick; nothing is mutated backward. Each existence change
 *     is a firing event, and the events carry a causal order (time.mts) that
 *     realizes meme-geometry's temporal geometry over the scene.
 *
 * The kernel exposes exactly the surface web-qwzspace drives: `runTick`,
 * `subjectsOf`, `snapOf`. web-qwzspace owns snapshot caching, interest
 * filtering, and delta diffing; the scene owns *what a body's render state is*.
 */
import { defaultWindow, internalFloat, latticeSite6, modelSet, physicalFloat, sameSite, translateSite6, } from "@red-cup-engineering/metrologic/articulation/predicating/geometry/spatial/icosahedral";
import { existenceGlyph, isDeathRule, isUnmadeUnder, noEvidence, rendersUnder, witnessAlive, witnessSlain, } from "./existence.mjs";
import { isIntentLike } from "./protocol.mjs";
export class Scene {
    window;
    worldRadius;
    places;
    originSite;
    bodies = new Map();
    events = [];
    eventCapacity;
    currentTick = 0;
    constructor(options = {}) {
        this.window = options.window ?? defaultWindow();
        this.worldRadius = Math.max(1, options.worldRadius ?? 2);
        this.eventCapacity = Math.max(1, options.eventCapacity ?? 4096);
        const world = modelSet(this.window, this.worldRadius);
        this.places = new Set(world.realized.map((r) => r.site.coords.join(",")));
        // The origin is the Settled Reach — guaranteed realized (internal 0 ∈ window).
        this.originSite = latticeSite6(0, 0, 0, 0, 0, 0);
    }
    tick() {
        return this.currentTick;
    }
    /** Whether a site is a realized place a body may occupy. */
    isPlace(site) {
        return this.places.has(site.coords.join(","));
    }
    bodyCount() {
        return this.bodies.size;
    }
    bodyOf(id) {
        return this.bodies.get(id);
    }
    firingEvents() {
        return Object.freeze([...this.events]);
    }
    record(event) {
        this.events.push(event);
        if (this.events.length > this.eventCapacity)
            this.events.splice(0, this.events.length - this.eventCapacity);
    }
    /**
     * Advance one tick: fold the tick's intents into the scene and return the
     * subjects whose render state changed (web-qwzspace diffs them into deltas)
     * plus the firing events. This is the settling step — state accumulates.
     */
    runTick(tick, intents) {
        this.currentTick = tick;
        const dirty = new Set();
        const events = [];
        for (const intent of intents) {
            const event = this.applyIntent(intent, tick, dirty);
            if (event) {
                events.push(event);
                this.record(event);
            }
        }
        return Object.freeze({ dirty: Object.freeze([...dirty]), events: Object.freeze(events) });
    }
    applyIntent(intent, tick, dirty) {
        switch (intent.k) {
            case "spawn": {
                const site = intent.site ? latticeSite6(...intent.site) : this.originSite;
                if (!this.isPlace(site))
                    return null; // cannot spawn off the quasicrystal
                const deathRule = isDeathRule(intent.deathRule) ? intent.deathRule : "mortal";
                const body = {
                    id: intent.id,
                    kind: intent.bodyKind,
                    site,
                    yaw: 0,
                    deathRule,
                    existence: witnessAlive(noEvidence()),
                };
                this.bodies.set(intent.id, body);
                dirty.add(intent.id);
                return Object.freeze({ kind: "qwzspace.scene.firingEvent", subject: intent.id, tick, what: "spawn" });
            }
            case "move": {
                const body = this.bodies.get(intent.id);
                if (!body)
                    return null;
                const next = translateSite6(body.site, ...intent.step);
                if (!this.isPlace(next) || sameSite(next, body.site))
                    return null;
                body.site = next;
                dirty.add(intent.id);
                return null; // movement is not an existence event — space, not time
            }
            case "face": {
                const body = this.bodies.get(intent.id);
                if (!body)
                    return null;
                body.yaw = Number.isFinite(intent.yaw) ? intent.yaw : body.yaw;
                dirty.add(intent.id);
                return null;
            }
            case "strike": {
                const target = this.bodies.get(intent.target);
                if (!target)
                    return null;
                target.existence = witnessSlain(target.existence);
                dirty.add(intent.target);
                if (isUnmadeUnder(target.deathRule, target.existence)) {
                    // construct un-made: returns to the void cone, removed from the world.
                    this.bodies.delete(intent.target);
                    return Object.freeze({ kind: "qwzspace.scene.firingEvent", subject: intent.target, tick, what: "unmade" });
                }
                return Object.freeze({ kind: "qwzspace.scene.firingEvent", subject: intent.target, tick, what: "strike" });
            }
            case "revive": {
                const body = this.bodies.get(intent.id);
                if (!body)
                    return null;
                body.existence = witnessAlive(body.existence);
                dirty.add(intent.id);
                return Object.freeze({ kind: "qwzspace.scene.firingEvent", subject: intent.id, tick, what: "revive" });
            }
        }
    }
    /** Every body id — web-qwzspace's bootstrap pass. */
    subjectsOf() {
        return Object.freeze([...this.bodies.keys()]);
    }
    /**
     * A body's render entry, or null when it must not render. Visibility is the
     * existence reading: real (t) and the undead contradiction (⊤) render; the
     * truly dead (f) and the unevidenced (⊥) are culled. The death-rule decides
     * what ⊤ means.
     */
    snapOf(id) {
        const body = this.bodies.get(id);
        if (!body)
            return null;
        if (!rendersUnder(body.deathRule, body.existence))
            return null;
        const physical = physicalFloat(body.site);
        const internal = internalFloat(body.site);
        return Object.freeze({
            id: body.id,
            kind: body.kind,
            x: physical.x,
            y: physical.y,
            z: physical.z,
            yaw: body.yaw,
            reading: existenceGlyph(body.existence),
            site: body.site.coords,
            depth: Math.hypot(internal.x, internal.y, internal.z),
        });
    }
}
/** Validate a raw wire value into an Intent, or null. web-qwzspace calls this
 *  on every inbound message before it reaches the tick. */
export const validateIntent = (raw) => {
    if (!isIntentLike(raw))
        return null;
    const value = raw;
    const str = (key) => (typeof value[key] === "string" ? value[key] : null);
    const six = (key) => {
        const v = value[key];
        if (!Array.isArray(v) || v.length !== 6 || !v.every((n) => Number.isSafeInteger(n)))
            return null;
        return v;
    };
    switch (value["k"]) {
        case "spawn": {
            const id = str("id");
            const bodyKind = str("bodyKind");
            if (!id || !bodyKind)
                return null;
            const site = six("site");
            const deathRule = str("deathRule");
            return Object.freeze({
                k: "spawn", id, bodyKind,
                ...(isDeathRule(deathRule) ? { deathRule } : {}),
                ...(site ? { site } : {}),
            });
        }
        case "move": {
            const id = str("id");
            const step = six("step");
            return id && step ? Object.freeze({ k: "move", id, step }) : null;
        }
        case "face": {
            const id = str("id");
            return id && typeof value["yaw"] === "number" ? Object.freeze({ k: "face", id, yaw: value["yaw"] }) : null;
        }
        case "strike": {
            const by = str("by");
            const target = str("target");
            return by && target ? Object.freeze({ k: "strike", by, target }) : null;
        }
        case "revive": {
            const id = str("id");
            return id ? Object.freeze({ k: "revive", id }) : null;
        }
        default:
            return null;
    }
};

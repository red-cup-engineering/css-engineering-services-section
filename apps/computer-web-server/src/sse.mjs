import { TellingLog, tellSides } from "@red-cup-engineering/signchain/log";
import { sse } from "@red-cup-engineering/http-services-section/sse";
import { writeSseComment, writeSseEvent } from "./events/publish-projected-events.mjs";
export { createProjectedEventHub, writeSseComment, writeSseEvent } from "./events/publish-projected-events.mjs";
export function createSseHub(opts = {}) {
    const store = new TellingLog();
    const heartbeatMs = opts.heartbeatMs ?? 30_000;
    const subs = new Map();
    let subCounter = 0;
    let eventCounter = 0;
    let heartbeat;
    function stopHeartbeat() {
        if (!heartbeat) return;
        clearInterval(heartbeat);
        heartbeat = undefined;
    }
    function startHeartbeat() {
        if (heartbeat || heartbeatMs <= 0) return;
        heartbeat = setInterval(()=>{
            const dead = [];
            for (const [id, { writer }] of subs){
                try {
                    writer.comment("heartbeat");
                } catch  {
                    dead.push(id);
                }
            }
            for (const id of dead)reap(id);
        }, heartbeatMs);
        heartbeat.unref?.();
    }
    function reap(id) {
        if (!subs.delete(id)) return;
        tellSides(store, {
            subject: id,
            predicate: "status",
            object: "closed"
        }, [
            false,
            true
        ]);
        if (!subs.size) stopHeartbeat();
    }
    return {
        get subscribers () {
            return subs.size;
        },
        get size () {
            return subs.size;
        },
        subscribe (req, res, subOpts = {}) {
            const id = `sub-${++subCounter}`;
            const topics = subOpts.topics?.length ? new Set(subOpts.topics) : null;
            tellSides(store, {
                subject: id,
                predicate: "status",
                object: "open"
            }, [
                true,
                false
            ]);
            if (topics) {
                for (const topic of topics){
                    tellSides(store, {
                        subject: id,
                        predicate: "topic",
                        object: topic
                    }, [
                        true,
                        false
                    ]);
                }
            }
            const writer = sse(req, res, ()=>reap(id));
            subs.set(id, {
                writer,
                topics
            });
            startHeartbeat();
            return writer;
        },
        publish (event, data, pubOpts = {}) {
            const { topic, id } = pubOpts;
            const eventId = `event-${++eventCounter}`;
            tellSides(store, {
                subject: eventId,
                predicate: "event",
                object: event
            }, [
                true,
                false
            ]);
            if (topic) {
                tellSides(store, {
                    subject: eventId,
                    predicate: "topic",
                    object: topic
                }, [
                    true,
                    false
                ]);
            }
            const dead = [];
            for (const [subId, sub] of subs){
                if (sub.topics && (topic == null || !sub.topics.has(topic))) continue;
                try {
                    sub.writer.send(event, data, id);
                } catch  {
                    dead.push(subId);
                }
            }
            for (const d of dead)reap(d);
        },
        close () {
            for (const id of [
                ...subs.keys()
            ]){
                const sub = subs.get(id);
                try {
                    sub?.writer.close();
                } catch  {}
                reap(id);
            }
            stopHeartbeat();
        }
    };
}

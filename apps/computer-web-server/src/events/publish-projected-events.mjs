import { sseCommentFrame, sseFrame } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/server-sent-event";
export function writeSseEvent(sink, name, data, id) {
    try {
        sink.write(sseFrame(name, data, id));
        return true;
    } catch  {
        return false;
    }
}
export function writeSseComment(sink, text = "") {
    try {
        sink.write(sseCommentFrame(text));
        return true;
    } catch  {
        return false;
    }
}
export function createProjectedEventHub() {
    const subscribers = new Set();
    const topicSet = (topics)=>{
        if (topics === undefined) return new Set();
        if (typeof topics === "string") return new Set(topics.split(",").map((item)=>item.trim()).filter(Boolean));
        return new Set([
            ...topics
        ].map((item)=>String(item).trim()).filter(Boolean));
    };
    const accepts = (sub, event)=>sub.topics.size === 0 || event.topic !== undefined && sub.topics.has(String(event.topic)) || event.type !== undefined && sub.topics.has(String(event.type));
    return {
        subscribe (sink, opts = {}) {
            const sub = {
                sink,
                topics: topicSet(opts.topics)
            };
            subscribers.add(sub);
            writeSseComment(sink, "ok");
            return ()=>{
                subscribers.delete(sub);
            };
        },
        publish (events) {
            const list = Array.isArray(events) ? events : [
                events
            ];
            const dead = [];
            for (const sub of subscribers){
                for (const event of list){
                    if (!accepts(sub, event)) continue;
                    if (!writeSseEvent(sub.sink, String(event.type ?? "message"), event)) {
                        dead.push(sub);
                        break;
                    }
                }
            }
            for (const sub of dead)subscribers.delete(sub);
        },
        keepAlive () {
            const dead = [];
            for (const sub of subscribers)if (!writeSseComment(sub.sink, "ka")) dead.push(sub);
            for (const sub of dead)subscribers.delete(sub);
            return subscribers.size;
        },
        size: ()=>subscribers.size
    };
}

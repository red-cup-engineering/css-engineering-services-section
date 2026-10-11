import { TellingLog, tellSides } from "@red-cup-engineering/signchain/log";
import { wsUpgrade } from "@red-cup-engineering/computer-web-server/edge/ws";
let connectionCounter = 0;
function nowEvidence() {
    return String(Date.now());
}
function normalizeTopics(topics) {
    if (topics === undefined) return [];
    return typeof topics === "string" ? [
        topics
    ] : [
        ...topics
    ];
}
function asPublishOptions(fromOrOptions) {
    if (fromOrOptions === undefined || fromOrOptions === null) return {};
    return typeof fromOrOptions === "string" ? {
        from: fromOrOptions
    } : fromOrOptions;
}
export class WsPubSub {
    store = new TellingLog();
    subscribers = new Map();
    topicIndex = new Map();
    backlogs = new Map();
    maxPerTopic;
    echo;
    heartbeatMs;
    backlog;
    wire;
    encode;
    decode;
    onConnection;
    authorize;
    heartbeat = null;
    upgradeHandler;
    constructor(opts = {}){
        this.maxPerTopic = opts.maxPerTopic ?? 10_000;
        this.echo = opts.echo ?? false;
        this.heartbeatMs = opts.heartbeatMs ?? 30_000;
        this.backlog = opts.backlog ?? 0;
        this.wire = opts.wire ?? true;
        this.encode = opts.encode ?? ((frame)=>JSON.stringify(frame));
        this.decode = opts.decode ?? ((text)=>JSON.parse(text));
        this.onConnection = opts.onConnection;
        this.authorize = opts.authorize;
        const upgrade = wsUpgrade({
            path: opts.path ?? "/",
            ...opts.admit ? {
                admit: opts.admit
            } : {},
            ...opts.maxMessageBytes !== undefined ? {
                maxMessageBytes: opts.maxMessageBytes
            } : {},
            onSession: async (session)=>{
                const conn = this.connect(session);
                await this.onConnection?.(conn, session.req);
            }
        });
        this.upgradeHandler = upgrade.handler;
    }
    subscribe(session, topics = []) {
        this.connect(session);
        for (const topic of normalizeTopics(topics))this.addTopic(session.id, topic);
        return ()=>this.unsubscribe(session.id);
    }
    connect(session) {
        const id = session.id || `ws-pubsub-${++connectionCounter}`;
        let sub = this.subscribers.get(id);
        if (sub) return sub.session;
        const conn = Object.assign(session, {
            topics: new Set(),
            pubsend: (frame)=>{
                const encoded = this.encode(frame);
                session.send(typeof encoded === "string" || Buffer.isBuffer(encoded) ? encoded : String(encoded));
            }
        });
        sub = {
            session: conn,
            topics: conn.topics,
            alive: true
        };
        this.subscribers.set(id, sub);
        conn.on("message", (message)=>{
            if (message.type === "pong" || message.type === "ping") {
                const current = this.subscribers.get(id);
                if (current) current.alive = true;
            }
            void this.onMessage(conn, message);
        });
        conn.on("close", ()=>this.unsubscribe(id));
        conn.on("error", ()=>this.unsubscribe(id));
        this.startHeartbeat();
        return conn;
    }
    addTopic(sessionId, topic) {
        const sub = this.subscribers.get(sessionId);
        if (!sub || !topic) return 0;
        const current = this.topicIndex.get(topic) ?? new Set();
        if (!current.has(sessionId) && current.size >= this.maxPerTopic) return current.size;
        const already = current.has(sessionId);
        current.add(sessionId);
        this.topicIndex.set(topic, current);
        sub.topics.add(topic);
        tellSides(this.store, {
            subject: sessionId,
            predicate: "topic",
            object: topic
        }, [
            true,
            false
        ]);
        if (!already && this.backlog > 0) {
            for (const data of this.backlogs.get(topic) ?? [])this.push(sub, topic, data, null, true);
        }
        return current.size;
    }
    join(session, topic) {
        this.connect(session);
        return this.addTopic(session.id, topic);
    }
    removeTopic(sessionId, topic) {
        const sub = this.subscribers.get(sessionId);
        const current = this.topicIndex.get(topic);
        const existed = Boolean(current?.delete(sessionId));
        if (sub) sub.topics.delete(topic);
        if (current && current.size === 0) this.topicIndex.delete(topic);
        tellSides(this.store, {
            subject: sessionId,
            predicate: "topic",
            object: topic
        }, [
            false,
            true
        ]);
        return existed;
    }
    unsubscribe(sessionId, topic) {
        const id = typeof sessionId === "string" ? sessionId : sessionId.id;
        if (topic !== undefined) {
            this.removeTopic(id, topic);
            return;
        }
        const sub = this.subscribers.get(id);
        if (!sub) return;
        for (const joined of [
            ...sub.topics
        ])this.removeTopic(id, joined);
        this.subscribers.delete(id);
        if (this.subscribers.size === 0) this.stopHeartbeat();
    }
    publish(topic, data, fromOrOptions) {
        if (!topic) return 0;
        const options = asPublishOptions(fromOrOptions);
        this.recordBacklog(topic, data);
        const ids = this.topicIndex.get(topic);
        if (!ids?.size) return 0;
        let count = 0;
        for (const id of [
            ...ids
        ]){
            if (!(options.echo ?? this.echo) && id === options.from) continue;
            const sub = this.subscribers.get(id);
            if (!sub || !this.membershipAdmitted(id, topic)) continue;
            if (this.push(sub, topic, data, options.from ?? null, true)) count++;
        }
        return count;
    }
    broadcast(data, fromOrOptions) {
        const options = asPublishOptions(fromOrOptions);
        let count = 0;
        for (const [id, sub] of [
            ...this.subscribers
        ]){
            if (!(options.echo ?? this.echo) && id === options.from) continue;
            if (this.pushRaw(sub, data)) count++;
        }
        return count;
    }
    topics() {
        return [
            ...this.topicIndex.keys()
        ];
    }
    topicsFor(sessionId) {
        return [
            ...this.subscribers.get(sessionId)?.topics ?? []
        ];
    }
    presence(topic) {
        const members = [
            ...this.topicIndex.get(topic) ?? []
        ].filter((id)=>this.subscribers.has(id));
        return {
            topic,
            count: members.length,
            members
        };
    }
    subscriberCount(topic) {
        return this.presence(topic).count;
    }
    connections() {
        return [
            ...this.subscribers.values()
        ].map((sub)=>sub.session);
    }
    get totalSubscribers() {
        return this.subscribers.size;
    }
    handleUpgrade(req, socket, head) {
        this.upgradeHandler?.(req, socket, head);
    }
    toUpgrade(match) {
        const entry = {
            handleUpgrade: (req, socket, head)=>this.handleUpgrade(req, socket, head)
        };
        if (match !== undefined) entry.match = match;
        return entry;
    }
    close(code = 1001, reason = "shutdown") {
        for (const sub of [
            ...this.subscribers.values()
        ]){
            try {
                sub.session.close(code, reason);
            } catch  {}
        }
        this.subscribers.clear();
        this.topicIndex.clear();
        this.backlogs.clear();
        this.stopHeartbeat();
    }
    recordBacklog(topic, data) {
        if (this.backlog <= 0) return;
        const ring = this.backlogs.get(topic) ?? [];
        ring.push(data);
        if (ring.length > this.backlog) ring.splice(0, ring.length - this.backlog);
        this.backlogs.set(topic, ring);
    }
    membershipAdmitted(sessionId, topic) {
        const memes = this.store.where({
            subject: sessionId,
            predicate: "topic",
            object: topic
        });
        const charge = this.store.readingWhere({
            subject: sessionId,
            predicate: "topic",
            object: topic
        });
        return charge === "potential" || charge === "stable";
    }
    push(sub, topic, data, from, wireFrame) {
        try {
            if (this.wire && wireFrame) {
                sub.session.pubsend({
                    op: "message",
                    topic,
                    data,
                    from
                });
            } else {
                this.pushRaw(sub, data);
            }
            return true;
        } catch  {
            this.unsubscribe(sub.session.id);
            return false;
        }
    }
    pushRaw(sub, data) {
        try {
            if (typeof data === "string" || Buffer.isBuffer(data)) sub.session.send(data);
            else sub.session.send(this.encode(data));
            return true;
        } catch  {
            this.unsubscribe(sub.session.id);
            return false;
        }
    }
    async onMessage(conn, message) {
        if (!this.wire || message.type !== "text") return;
        let raw;
        try {
            raw = this.decode(message.data);
        } catch  {
            return;
        }
        if (!raw || typeof raw !== "object") return;
        const msg = raw;
        const op = msg.op;
        const topic = msg.topic;
        if (typeof topic !== "string") return;
        if (op === "subscribe" || op === "unsubscribe" || op === "presence") {
            if (!await this.allowed(conn, {
                type: op,
                topic
            })) return;
            if (op === "subscribe") this.addTopic(conn.id, topic);
            else if (op === "unsubscribe") this.removeTopic(conn.id, topic);
            else conn.pubsend({
                op: "presence",
                ...this.presence(topic)
            });
        } else if (op === "publish") {
            const data = "data" in msg ? msg.data : null;
            if (!await this.allowed(conn, {
                type: "publish",
                topic,
                data
            })) return;
            this.publish(topic, data, {
                from: conn.id,
                echo: true
            });
        }
    }
    async allowed(conn, op) {
        if (!this.authorize) return true;
        try {
            return await this.authorize(conn, op);
        } catch  {
            return false;
        }
    }
    startHeartbeat() {
        if (this.heartbeat || this.heartbeatMs <= 0) return;
        this.heartbeat = setInterval(()=>{
            for (const [id, sub] of [
                ...this.subscribers
            ]){
                if (!sub.alive) {
                    try {
                        sub.session.close(1001, "idle");
                    } catch  {}
                    this.unsubscribe(id);
                    continue;
                }
                sub.alive = false;
                try {
                    sub.session.ping();
                } catch  {
                    this.unsubscribe(id);
                }
            }
        }, this.heartbeatMs);
        this.heartbeat.unref?.();
    }
    stopHeartbeat() {
        if (!this.heartbeat) return;
        clearInterval(this.heartbeat);
        this.heartbeat = null;
    }
}
export function wsPubSub(opts = {}) {
    return new WsPubSub(opts);
}

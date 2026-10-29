import {
  sseCommentFrame,
  sseFrame,
} from "@red-cup-engineering/code-server-sent-event-service";

export type SseSink = {
  write(chunk: string): unknown;
};

export type TopicEvent = Readonly<{
  type?: string;
  topic?: string;
  [key: string]: unknown;
}>;

export function writeSseEvent(sink: SseSink, name: string, data: unknown, id?: string): boolean {
  try {
    sink.write(sseFrame(name, data, id));
    return true;
  } catch {
    return false;
  }
}

export function writeSseComment(sink: SseSink, text = ""): boolean {
  try {
    sink.write(sseCommentFrame(text));
    return true;
  } catch {
    return false;
  }
}

export function createProjectedEventHub(): {
  subscribe(sink: SseSink, opts?: { topics?: Iterable<string> | string }): () => void;
  publish(events: TopicEvent | readonly TopicEvent[]): void;
  keepAlive(): number;
  size(): number;
} {
  type Sub = { sink: SseSink; topics: Set<string> };
  const subscribers = new Set<Sub>();
  const topicSet = (topics: Iterable<string> | string | undefined): Set<string> => {
    if (topics === undefined) return new Set();
    if (typeof topics === "string") return new Set(topics.split(",").map((item) => item.trim()).filter(Boolean));
    return new Set([...topics].map((item) => String(item).trim()).filter(Boolean));
  };
  const accepts = (sub: Sub, event: TopicEvent): boolean =>
    sub.topics.size === 0 ||
    (event.topic !== undefined && sub.topics.has(String(event.topic))) ||
    (event.type !== undefined && sub.topics.has(String(event.type)));

  return {
    subscribe(sink, opts = {}) {
      const sub = { sink, topics: topicSet(opts.topics) };
      subscribers.add(sub);
      writeSseComment(sink, "ok");
      return () => { subscribers.delete(sub); };
    },
    publish(events) {
      const list = Array.isArray(events) ? events : [events];
      const dead: Sub[] = [];
      for (const sub of subscribers) {
        for (const event of list) {
          if (!accepts(sub, event)) continue;
          if (!writeSseEvent(sub.sink, String(event.type ?? "message"), event)) {
            dead.push(sub);
            break;
          }
        }
      }
      for (const sub of dead) subscribers.delete(sub);
    },
    keepAlive() {
      const dead: Sub[] = [];
      for (const sub of subscribers) if (!writeSseComment(sub.sink, "ka")) dead.push(sub);
      for (const sub of dead) subscribers.delete(sub);
      return subscribers.size;
    },
    size: () => subscribers.size,
  };
}

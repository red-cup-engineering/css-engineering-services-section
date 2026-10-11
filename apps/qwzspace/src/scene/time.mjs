/**
 * Temporal geometry of the scene — the causal order of its settling.
 *
 * This realizes meme-geometry's `temporal` construction (which defines the
 * causal order of a meme-topology settling) over the scene's own firing
 * events, so the engine's time has the same Lorentzian-like causal structure
 * the substrate proves: time is the settling, two events are causally ordered
 * when an evidence path runs from one to the other, and events with no such
 * path are spacelike — a fact about the scene, not a metric assertion.
 *
 * An event is one body's existence change at a tick. Two events are adjacent
 * when they share a subject (the same body). Causal precedence is tick-increasing
 * adjacency — a strict partial order, acyclic because ticks strictly increase
 * along every edge. The cone at an event is its causal past and future; what
 * lies in neither is elsewhere.
 *
 * Same-subject strict tick order is already transitive. Grouping the events
 * by subject produces the causal successors directly, without a dense
 * adjacency matrix or cubic closure pass.
 */
export const causalOrder = (events) => {
    const subjects = new Map();
    events.forEach((event, index) => {
        if (!subjects.has(event.subject)) subjects.set(event.subject, []);
        subjects.get(event.subject).push(index);
    });
    return Object.freeze({
        kind: "qwzspace.time.causalOrder",
        events: Object.freeze([...events]),
        precedes: Object.freeze(events.map(event => Object.freeze(
            subjects.get(event.subject).filter(index => event.tick < events[index].tick)
        ))),
    });
};
/** The cone at the event at `index`: everything causally before and after it. */
export const causalCone = (order, index) => {
    const apex = order.events[index];
    if (!apex)
        return null;
    const past = order.events.filter((_, i) => order.precedes[i].includes(index));
    const future = order.precedes[index].map((i) => order.events[i]);
    return Object.freeze({
        kind: "qwzspace.time.cone",
        apex,
        past: Object.freeze(past),
        future: Object.freeze(future),
    });
};
/** How two events are separated: timelike when one causally precedes the
 *  other, spacelike when neither does. */
export const separation = (order, left, right) => order.precedes[left]?.includes(right) || order.precedes[right]?.includes(left) ? "timelike" : "spacelike";

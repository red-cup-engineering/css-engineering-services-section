import assert from "node:assert/strict";
import test from "node:test";
import { createProjectedEventHub } from "../../src/events/publish-projected-events.mjs";
test("publishes only selected topics", ()=>{
    const chunks = [];
    const hub = createProjectedEventHub();
    hub.subscribe({
        write: (x)=>chunks.push(x)
    }, {
        topics: [
            "news"
        ]
    });
    hub.publish([
        {
            type: "update",
            topic: "other"
        },
        {
            type: "update",
            topic: "news"
        }
    ]);
    assert.equal(chunks.filter((x)=>x.includes("event: update")).length, 1);
});

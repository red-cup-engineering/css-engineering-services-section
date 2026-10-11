import assert from "node:assert/strict";
import test from "node:test";
import { WsPubSub } from "../../src/emulation/ws-pubsub.mjs";
test("published platform entrypoint loads its compiled edge dependency", ()=>{
    assert.equal(typeof WsPubSub, "function");
});

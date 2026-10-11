import assert from "node:assert/strict";
import test from "node:test";
import { wsUpgrade } from "../../src/edge/ws.mjs";
import { acceptKey, encodeFrame, FrameDecoder } from "@red-cup-engineering/code-websocket-frame-service";
test("published edge and WebSocket frame entrypoints are executable JavaScript", ()=>{
    assert.equal(typeof wsUpgrade, "function");
    assert.equal(acceptKey("dGhlIHNhbXBsZSBub25jZQ=="), "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=");
    const [decoded] = new FrameDecoder().push(encodeFrame(1, Buffer.from("edge")));
    assert.equal(decoded?.payload.toString(), "edge");
});

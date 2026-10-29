import assert from "node:assert/strict";
import test from "node:test";

import { WsPubSub } from "@red-cup-engineering/http-platform-emulation-service";

test("published platform entrypoint loads its compiled edge dependency", () => {
  assert.equal(typeof WsPubSub, "function");
});

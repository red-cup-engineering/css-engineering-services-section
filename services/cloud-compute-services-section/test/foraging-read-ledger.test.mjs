import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { foragingReadLedger } from "../src/improvement-board-forager-service.mjs";

test("the public ActivityPub projection can read an empty trajectory without selecting a settlement account", () => {
  const dataRoot = mkdtempSync(join(tmpdir(), "free-compute-public-ledger-"));
  try {
    const ledger = foragingReadLedger({ dataRoot });
    assert.deepEqual(ledger.read(), []);
    assert.equal(Object.hasOwn(ledger, "append"), false);
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

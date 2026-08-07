import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createContentAddressedDirectory } from "../src/content-addressed-directory.mjs";
import { createPaidDataEndpointActor } from "../src/paid-data-endpoint.mjs";
import { canonicalEavtDatomJsonl, EAVT_DATOM_JSONL_MEDIA_TYPE } from "../src/eavt-datom-carrier.mjs";

const INVOCATION = `sha256:${"ab".repeat(32)}`;

function actor(operation, overrides = {}) {
  let settle;
  const records = [];
  const formed = createPaidDataEndpointActor({
    operation,
    basePath: `/x402/data/${operation}`,
    offer: { type: "DataEndpointOffer", operation },
    priceTerms: {
      network: "eip155:5615610",
      amount: "7",
      asset: `0x${"11".repeat(20)}`,
      payTo: `0x${"22".repeat(20)}`,
    },
    admit: async () => ({ admitted: true }),
    append: async (record) => records.push(record),
    execute: async ({ intent }) => ({ delivered: intent.request }),
    recoveredRecords: {
      intents: new Map([[INVOCATION, { invocation: INVOCATION, request: { digest: "x" } }]]),
      terminals: new Map(),
    },
    paymentIdentity: () => INVOCATION,
    settlementProjection: () => ({
      invocation: INVOCATION,
      success: true,
      network: "eip155:5615610",
      transaction: `0x${"33".repeat(32)}`,
      amount: "7",
    }),
    paymentBoundaryFactory: ({ afterSettle }) => {
      settle = afterSettle;
      return { middleware: (_request, _response, next) => next() };
    },
    ...overrides,
  });
  return { formed, records, settle: (...args) => settle(...args) };
}

for (const operation of ["read-data", "write-data", "trade-data-rights"]) {
  test(`${operation} forms one independently priced actor with one terminal`, async () => {
    let executions = 0;
    const { formed, records, settle } = actor(operation, {
      execute: async () => ({ executions: ++executions }),
    });
    assert.equal(formed.operation, operation);
    const [left, right] = await Promise.all([settle({}), settle({})]);
    assert.deepEqual(left, right);
    assert.equal(executions, 1);
    assert.equal(records.length, 1);
    assert.equal(records[0].operation, operation);
  });
}

test("disk fallback creates one SHA-256 object and verifies every read", async () => {
  const root = await mkdtemp(join(tmpdir(), "union-paid-data-"));
  try {
    const storage = createContentAddressedDirectory({ root });
    const first = await storage.write({ body: Buffer.from("semiotic foam"), mediaType: "text/plain" });
    const second = await storage.write({ body: Buffer.from("semiotic foam"), mediaType: "text/plain" });
    assert.deepEqual(first, second);
    const observed = await storage.read({ sha256: first.sha256 });
    assert.equal(observed.body.toString("utf8"), "semiotic foam");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("one actor cannot aggregate read, write, and trade", () => {
  assert.throws(() => actor("read-write-trade"), /operation must be/u);
});

test("paid chain writes admit only canonical EAVT Datom JSONL/RDF", () => {
  const body = `${JSON.stringify({ e: "urn:example:ledger", a: "urn:example:records", v: { kind: "literal", value: "settled", datatype: "urn:example:text" }, tx: "2026-07-27T00:00:00.000Z", op: "assert" })}\n`;
  assert.deepEqual(canonicalEavtDatomJsonl({ mediaType: EAVT_DATOM_JSONL_MEDIA_TYPE, body }), { mediaType: EAVT_DATOM_JSONL_MEDIA_TYPE, body, datomCount: 1 });
  assert.throws(() => canonicalEavtDatomJsonl({ mediaType: "text/plain", body }), /mediaType must be/u);
  assert.throws(() => canonicalEavtDatomJsonl({ mediaType: EAVT_DATOM_JSONL_MEDIA_TYPE, body: `${JSON.stringify({ e: "urn:example:ledger", a: "urn:example:records", v: "arbitrary", tx: "2026-07-27T00:00:00.000Z", op: "assert" })}\n` }), /RDF object/u);
  assert.throws(() => canonicalEavtDatomJsonl({ mediaType: EAVT_DATOM_JSONL_MEDIA_TYPE, body: body.trimEnd() }), /end with one newline/u);
});

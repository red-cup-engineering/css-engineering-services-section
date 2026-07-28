import assert from "node:assert/strict";
import test from "node:test";
import { deriveOperationsManifoldForest } from "../src/forest.mjs";

const manifolds = [
  {
    package: "@test/producer", protocol: "stdio",
    extrema: { domains: [], codomains: [{ carrier: "carrier/shared", actions: ["emit"] }] },
  },
  {
    package: "@test/consumer", protocol: "stdio",
    extrema: {
      domains: [
        { carrier: "carrier/shared", actions: ["accept"] },
        { carrier: "carrier/unserved", actions: ["wait"] },
      ],
      codomains: [],
    },
  },
];

test("buys every bond judgment and retains pressure frontiers", async () => {
  const calls = [];
  const forest = await deriveOperationsManifoldForest(manifolds, {
    purchase: async (producer, consumer) => {
      calls.push({ producer, consumer });
      return producer.codomain === consumer.domain
        ? { type: "CarrierCompositionWitness", composes: true, relation: "codomain-domain", locus: producer.codomain, judgmentProvider: "urn:test:atom", judgmentReceipt: { outputNi: "ni:///sha-256;test" } }
        : { type: "CarrierCompositionObstruction", composes: false, reason: "carrier-identity-mismatch", produced: producer.codomain, consumed: consumer.domain };
    },
  });
  assert.equal(calls.length, 2);
  assert.equal(forest.edges.length, 1);
  assert.equal(forest.edges[0].provider, "urn:test:atom");
  assert.equal(forest.obstructions.length, 1);
  assert.deepEqual(forest.frontier.incoming.map(({ carrier }) => carrier), ["carrier/unserved"]);
  assert.deepEqual(forest.frontier.outgoing, []);
});

test("buys intra-package judgments instead of inferring local bonds", async () => {
  const calls = [];
  const forest = await deriveOperationsManifoldForest([{
    package: "@test/cell",
    protocol: "stdio",
    extrema: {
      domains: [{ carrier: "carrier/internal", actions: ["consume"] }],
      codomains: [{ carrier: "carrier/internal", actions: ["produce"] }],
    },
  }], {
    purchase: async (producer, consumer) => {
      calls.push({ producer, consumer });
      return {
        type: "CarrierCompositionWitness",
        composes: true,
        relation: "codomain-domain",
        locus: producer.codomain,
        judgmentProvider: "urn:test:atom",
        judgmentReceipt: { outputNi: "ni:///sha-256;local" },
      };
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(forest.edges.length, 1);
  assert.equal(forest.edges[0].fromPackage, "@test/cell");
  assert.equal(forest.edges[0].toPackage, "@test/cell");
  assert.equal(forest.edges[0].receipt.outputNi, "ni:///sha-256;local");
});

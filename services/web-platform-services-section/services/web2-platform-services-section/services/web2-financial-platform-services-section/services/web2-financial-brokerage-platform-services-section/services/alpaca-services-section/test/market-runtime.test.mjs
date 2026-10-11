import assert from "node:assert/strict";
import test from "node:test";
import { createBrokerageProductProviders, indexBrokerageProvidersByService } from "../src/market-runtime.mjs";

const source = { uri: "https://example.invalid/filing", observedAt: "2026-07-22T20:00:00.000Z", digest: "sha256:filing" };
test("market runtime wires research and reconciliation to actual sovereign providers", async () => {
  const providers = createBrokerageProductProviders();
  const packet = await providers.issuer({ ticker: "NVDA", issuer: "NVIDIA Corporation", asOf: "2026-07-22T22:20:00.000Z", sources: [source], claims: [{ statement: "Sourced observation", sourceDigests: [source.digest] }] });
  assert.equal(packet.type, "IssuerEvidencePacket"); assert.equal(providers.alpacaRead, undefined);
  const base = { accountReference: "account-1", observedAt: "2026-07-22T22:20:00.000Z", source, account: { cash: 100, equity: 100, buying_power: 100 }, positions: [] };
  const reconciliation = await providers.reconcile({ expected: base, observed: { ...base, source: { ...source, digest: "sha256:second" }, account: { cash: 99, equity: 100, buying_power: 99 } } });
  assert.equal(reconciliation.disposition, "mismatch"); assert.equal(reconciliation.mismatchCount, 2);
  const markets = indexBrokerageProvidersByService(providers);
  assert.equal(markets["issuer-evidence-packet"], providers.issuer); assert.equal(markets["venue-adapter-read"], undefined);
});

test("market runtime sells the same BLK topological strategy used by Esther", async () => {
  const start = Date.parse("2026-01-01T21:00:00.000Z");
  const bars = (rate) => Array.from({ length: 130 }, (_, index) => ({
    at: new Date(start + index * 86_400_000).toISOString(),
    close: 100 * Math.exp(rate * index),
  }));
  const providers = createBrokerageProductProviders({
    marketDataService: {
      readDailyBars: async () => ({
        id: "ni:///sha-256;marketDataObservation00000000000000000000000",
        bars: { BLK: bars(0.004), SPY: bars(0.001) },
      }),
    },
  });
  const reading = await providers.blkStrategy({
    asOf: "2026-07-22T23:00:00.000Z",
    cash: 100,
    currentBlkMarketValue: 0,
    scheduledContribution: 10,
    maximumOrderFraction: 0.25,
    volatilityTarget: 0.18,
    maximumDrawdown: 0.30,
  });
  assert.equal(reading.type, "ObsmetrologiaBlkAccumulationStrategyReading");
  assert.equal(reading.instrument, "BLK");
  assert.equal(reading.proposedNotional, 10);
  assert.equal(reading.orderEffect, false);
});

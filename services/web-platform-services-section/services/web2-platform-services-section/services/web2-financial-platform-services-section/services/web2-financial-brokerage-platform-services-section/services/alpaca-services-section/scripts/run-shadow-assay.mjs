#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createAgentSectionDescentAssay } from "./agent-section-descent-assay.mjs";
import { createAlpacaHistoricalBarsService } from "./historical-bars.mjs";
import { createBrokerageMarketEventRecorder } from "@red-cup-engineering/brokerage-independent-witness-and-books";
import { assayCausalPanel } from "./causal-market-panel-assay.mjs";
import { createCausalPortfolioLearningCircuit } from "./circuit.mjs";
import { measureCausalPatchNovelty } from "./causal-tiling-novelty-measure.mjs";
import { measureCorrelationGraph } from "./correlation-graph-measure.mjs";
import { createContentAddressedDatasetStore } from "@red-cup-engineering/content-addressed-dataset-store-service";
import { fitDeterministicRidge, predictDeterministicRidge } from "./ridge.mjs";
import { allocateMandatePortfolio } from "@red-cup-engineering/mandate-portfolio-allocation-service";
import { selectModelCandidate } from "@red-cup-engineering/model-tournament-service";
import { formPurgedWalkForwardFolds } from "@red-cup-engineering/purged-walk-forward-fold-service";
import { measureReturnRiskFeatures } from "./return-risk-feature-measure.mjs";
import { startLocalWitnessJournalProviderProcess } from "@red-cup-engineering/witness-journal-document-service/local-provider";
import { measureSheafLaplacian } from "./sheaf-laplacian-measure.mjs";
import { measureTechnicalAnalysisFeatures } from "./technical-analysis-feature-measure.mjs";
import { simulateEventDrivenExecution } from "./simulate.mjs";

const required = (value, label) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  return value;
};
const apiKey = required(process.env.ALPACA_ACCOUNT_ESTHER_TRADING_KEY ?? process.env.ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_KEY ?? process.env.APCA_API_KEY_ID, "an Esther Alpaca API key");
const apiSecret = required(process.env.ALPACA_ACCOUNT_ESTHER_TRADING_SECRET ?? process.env.ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_SECRET ?? process.env.APCA_API_SECRET_KEY, "an Esther Alpaca API secret");
const tradingEnvironment = process.env.ALPACA_ACCOUNT_ENVIRONMENT ?? "live";
if (!["live", "paper"].includes(tradingEnvironment)) throw new Error("ALPACA_ACCOUNT_ENVIRONMENT must be live or paper");
const tradingOrigin = tradingEnvironment === "live" ? "https://api.alpaca.markets" : "https://paper-api.alpaca.markets";
const SERVICE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeEnv = Object.freeze({
  ...process.env,
  ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_KEY: apiKey,
  ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_SECRET: apiSecret,
  BROKERAGE_BOOKS_DATA_ROOT: process.env.BROKERAGE_BOOKS_DATA_ROOT ?? join(SERVICE_ROOT, "data", "books"),
  BROKERAGE_BOOKS_ACCOUNT: process.env.BROKERAGE_BOOKS_ACCOUNT ?? "institutional-shadow",
  BROKERAGE_DATASET_STORE_ROOT: process.env.BROKERAGE_DATASET_STORE_ROOT ?? join(SERVICE_ROOT, "data", "datasets"),
});
mkdirSync(runtimeEnv.BROKERAGE_BOOKS_DATA_ROOT, { recursive: true });
mkdirSync(runtimeEnv.BROKERAGE_DATASET_STORE_ROOT, { recursive: true });
const symbols = [...new Set((process.env.BROKERAGE_SHADOW_UNIVERSE ?? "BLK,QQQ,SPY,TLT,GLD").split(",").map((value) => value.trim().toUpperCase()).filter(Boolean))].sort();
if (!symbols.includes("SPY") || symbols.length < 3) throw new Error("BROKERAGE_SHADOW_UNIVERSE must contain SPY and at least three symbols");

async function readAccountState() {
  const read = async (pathname) => {
    const url = new URL(pathname, tradingOrigin);
    if (url.origin !== tradingOrigin || url.protocol !== "https:") throw new Error("Alpaca account-read origin refused");
    const response = await fetch(url, { method: "GET", headers: { "APCA-API-KEY-ID": apiKey, "APCA-API-SECRET-KEY": apiSecret, Accept: "application/json" } });
    if (!response.ok) throw new Error(`Alpaca account read refused: ${pathname} status ${response.status}`);
    return response.json();
  };
  const [account, positions] = await Promise.all([read("/v2/account"), read("/v2/positions")]);
  const equity = Number(account.equity);
  if (!Number.isFinite(equity) || equity <= 0 || !Array.isArray(positions)) throw new Error("Alpaca account state invalid");
  return Object.freeze({
    equity,
    cash: Number(account.cash),
    buyingPower: Number(account.buying_power),
    positions: Object.freeze(positions),
    currentWeights: Object.freeze(Object.fromEntries(positions
      .filter((position) => symbols.includes(position.symbol))
      .map((position) => [position.symbol, Number(position.market_value) / equity]))),
  });
}

const witnessJournal = await startLocalWitnessJournalProviderProcess({ port: Number(process.env.WITNESS_JOURNAL_LOCAL_PORT ?? 19764) });
try {
  const env = { ...runtimeEnv, WITNESS_JOURNAL_RDF_AGENT: witnessJournal.agentCardUrl };
  const recordMarketManifest = createBrokerageMarketEventRecorder({ originatingActor: "urn:ame:alpaca-market-data-read-service", nodeId: "alpaca-market-data-read-service" }, env);
  const datasetStore = createContentAddressedDatasetStore({ root: env.BROKERAGE_DATASET_STORE_ROOT });
  const marketRecorder = async (event) => {
    const value = event?.value;
    const manifest = await datasetStore.storeDataset({ dataset: value, observedAt: event.recordedAt, provenance: [`urn:alpaca:request:${value.venueRequestId ?? "unavailable"}`] });
    const counts = Object.fromEntries(Object.entries(value.bars ?? {}).map(([symbol, bars]) => [symbol, bars.length]));
    return recordMarketManifest({ ...event, value: { type: "AlpacaHistoricalBarsDatasetManifestObservation", version: 1, dataset: manifest, symbols: value.symbols, start: value.start, end: value.end, feed: value.feed, adjustment: value.adjustment, venueRequestId: value.venueRequestId, counts, orderEffect: false } });
  };
  const resultRecorder = createBrokerageMarketEventRecorder({ originatingActor: "urn:ame:causal-portfolio-learning-service", nodeId: "causal-portfolio-learning-service" }, env);
  const marketData = createAlpacaHistoricalBarsService(env, { recordObservation: marketRecorder });
  const accountState = await readAccountState();
  const asOf = new Date(process.env.BROKERAGE_SHADOW_AS_OF ?? new Date().toISOString()).toISOString();
  const years = Number(process.env.BROKERAGE_SHADOW_HISTORY_YEARS ?? 5);
  if (!Number.isFinite(years) || years < 2 || years > 10) throw new Error("BROKERAGE_SHADOW_HISTORY_YEARS must be between 2 and 10");
  const start = new Date(Date.parse(asOf) - years * 365.25 * 86_400_000).toISOString();
  const observation = await marketData.readDailyBars({ symbols, start, end: asOf, feed: process.env.BROKERAGE_SHADOW_FEED ?? "iex", adjustment: "all" });
  const assayAgentSectionDescent = createAgentSectionDescentAssay({ measureSheafLaplacian });
  const providers = { assayAgentSectionDescent, assayCausalPanel, measureCausalPatchNovelty, measureCorrelationGraph, fitDeterministicRidge, predictDeterministicRidge, allocateMandatePortfolio, selectModelCandidate, formPurgedWalkForwardFolds, measureReturnRiskFeatures, measureTechnicalAnalysisFeatures, measureSheafLaplacian, simulateEventDrivenExecution };
  const circuit = createCausalPortfolioLearningCircuit({ providers, recordResult: resultRecorder });
  const result = await circuit({
    barsBySymbol: observation.bars,
    benchmark: "SPY",
    asOf,
    mandate: {
      type: "PortfolioAllocationMandate",
      id: "urn:mandate:esther-paper-shadow-diversified-v1",
      maximumWeight: Number(process.env.BROKERAGE_SHADOW_MAXIMUM_WEIGHT ?? 0.5),
      grossLimit: 1,
      leverageLimit: 1,
      shorting: false,
      maximumDrawdown: Number(process.env.BROKERAGE_SHADOW_MAXIMUM_DRAWDOWN ?? 0.35),
    },
    currentWeights: accountState.currentWeights,
    config: {
      horizon: 5,
      cadence: 5,
      warmup: 252,
      trainingWindow: 504,
      graphWindow: 60,
      patchSize: 5,
      ridge: 1,
      initialCapital: accountState.equity,
      spreadBps: Number(process.env.BROKERAGE_SHADOW_SPREAD_BPS ?? 4),
      impactBpsAtFullParticipation: Number(process.env.BROKERAGE_SHADOW_IMPACT_BPS ?? 25),
      maximumParticipationRate: Number(process.env.BROKERAGE_SHADOW_MAXIMUM_PARTICIPATION_RATE ?? 0.1),
      latencyFractionOfBar: Number(process.env.BROKERAGE_SHADOW_LATENCY_FRACTION_OF_BAR ?? 0.1),
    },
  });
  console.log(JSON.stringify({
    type: "InstitutionalInvestmentShadowAssaySummary",
    asOf: result.asOf,
    account: { environment: tradingEnvironment, equity: accountState.equity, cash: accountState.cash, buyingPower: accountState.buyingPower, currentWeights: accountState.currentWeights },
    symbols: result.entities,
    marketObservation: observation.id,
    marketRecord: observation.independentBooksReceipt.graph ?? observation.independentBooksReceipt.id,
    learningRecord: result.independentRecordReceipt.graph ?? result.independentRecordReceipt.id,
    folds: result.folds,
    selected: result.tournament.selectedUsingValidationOnly,
    evaluations: result.evaluations,
    currentDecision: result.currentDecision,
    claims: result.claims,
    orderEffect: false,
  }, null, 2));
} finally {
  await witnessJournal.close();
}

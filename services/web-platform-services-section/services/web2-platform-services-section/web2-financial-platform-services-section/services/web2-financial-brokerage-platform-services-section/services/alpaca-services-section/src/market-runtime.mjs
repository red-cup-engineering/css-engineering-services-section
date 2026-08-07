import { createBrokerageX402Server } from "@rsc-quiescent/coinbase-x402-bazaar-border/server";
import { formIssuerEvidencePacket, validateIssuerEvidenceRequest } from "@rsc-quiescent/issuer-research-media-service";
import { normalizeAlpacaSnapshot, reconcileSnapshots, validateReconciliationRequest } from "@rsc-quiescent/account-evidence-reconciliation-service";
import { formAggressivePortfolioIntent, validateAggressivePortfolioIntentRequest } from "@rsc-quiescent/alpha-portfolio-order-intent-service";
import { createExecutionTransportProvider } from "@rsc-quiescent/brokerage-execution-transport-service";
import { evaluateBlkAccumulationStrategy } from "@rsc-quiescent/obsmetrologia-blk-accumulation-strategy-service";
import { createAlpacaHistoricalBarsService } from "@rsc-quiescent/alpaca-market-data-read-service";
import { createBrokerageMarketEventRecorder } from "@rsc-quiescent/brokerage-independent-witness-and-books";

function offeredProvider({ actor, preflight, execute, externalEvidence }) {
  const callable = async (request) => execute(request);
  Object.defineProperties(callable, {
    originatingActor: { value: actor, enumerable: true }, preflight: { value: preflight, enumerable: true }, externalEvidence: { value: externalEvidence, enumerable: true },
  });
  return Object.freeze(callable);
}
const packets = (request) => (request.evidencePackets ?? []).map((packet) => packet.type === "IssuerEvidencePacket" ? packet : formIssuerEvidencePacket(packet));
const normalizeReconciliation = ({ expected, observed, tolerances } = {}) => ({ expected: normalizeAlpacaSnapshot(expected), observed: normalizeAlpacaSnapshot(observed), tolerances });
const packetEvidence = (request) => packets(request).flatMap((packet) => packet.sources.map(({ uri, digest }) => ({ uri, digest })));

export function createBrokerageProductProviders({ alpacaRead, alpacaReadPreflight, paperReadService, marketDataService, resolveExecutionRecords, executionAdapter, executionClock } = {}) {
  const issuer = offeredProvider({ actor: "urn:ame:issuer-research-media-service", preflight: validateIssuerEvidenceRequest,
    execute: formIssuerEvidencePacket, externalEvidence: (request) => request.sources.map(({ uri, digest }) => ({ uri, digest })) });
  const aggressive = offeredProvider({ actor: "urn:ame:alpha-portfolio-order-intent-service",
    preflight: (request) => validateAggressivePortfolioIntentRequest({ ...request, evidencePackets: packets(request) }),
    execute: (request) => formAggressivePortfolioIntent({ ...request, evidencePackets: packets(request) }), externalEvidence: packetEvidence });
  const reconciliation = offeredProvider({ actor: "urn:ame:account-evidence-reconciliation-service",
    preflight: (request) => validateReconciliationRequest(normalizeReconciliation(request)),
    execute: (request) => reconcileSnapshots(normalizeReconciliation(request)),
    externalEvidence: ({ expected, observed }) => [expected.source, observed.source].map(({ uri, digest }) => ({ uri, digest })) });
  const providers = {
    issuer,
    alpha: aggressive,
    paperIntent: aggressive,
    reconcile: reconciliation,
  };
  if (typeof marketDataService?.readDailyBars === "function") {
    const preflightBlk = (request = {}) => {
      const at = Date.parse(request.asOf);
      const numeric = ["cash", "currentBlkMarketValue", "scheduledContribution", "maximumOrderFraction", "volatilityTarget", "maximumDrawdown"];
      if (!Number.isFinite(at) || numeric.some((field) => request[field] != null && !Number.isFinite(Number(request[field])))) throw new TypeError("blk-strategy-request-invalid");
    };
    providers.blkStrategy = offeredProvider({
      actor: "urn:ame:obsmetrologia-blk-accumulation-strategy-service",
      preflight: preflightBlk,
      execute: async (request) => {
        preflightBlk(request);
        const asOf = new Date(request.asOf).toISOString();
        const start = new Date(Date.parse(asOf) - 370 * 86_400_000).toISOString();
        const observation = await marketDataService.readDailyBars({ symbols: ["BLK", "SPY"], start, end: asOf, feed: request.feed ?? "iex", adjustment: "all" });
        return evaluateBlkAccumulationStrategy({ ...request, blkBars: observation.bars.BLK, spyBars: observation.bars.SPY, marketDataObservation: observation.id });
      },
      externalEvidence: (_request, output) => [{ uri: `urn:alpaca:historical-bars:${encodeURIComponent(output.marketDataObservation)}`, digest: output.marketDataObservation }],
    });
  }
  const seatedRead = paperReadService ? paperReadService.observeEstherPaperAccount : alpacaRead, seatedPreflight = paperReadService ? paperReadService.preflight : alpacaReadPreflight;
  if (typeof seatedRead === "function" && typeof seatedPreflight === "function") providers.alpacaRead = offeredProvider({ actor: paperReadService?.originatingActor ?? "urn:ame:pluggable-venue-adapter-service",
    preflight: seatedPreflight, execute: seatedRead,
    externalEvidence: (_request, output) => [{ uri: `urn:alpaca:venue-operation:${output.venueRequestId ?? output.id}`, digest: output.id }] });
  if (typeof resolveExecutionRecords === "function" && typeof executionAdapter?.placeOrder === "function") providers.execution = createExecutionTransportProvider({ resolveExecutionRecords, adapter: executionAdapter, clock: executionClock });
  return Object.freeze(providers);
}

export function indexBrokerageProvidersByService(providers) {
  const indexed = {
    "issuer-evidence-packet": providers.issuer,
    "aggressive-alpha-research-packet": providers.alpha,
    ...(providers.blkStrategy ? { "obsmetrologia-blk-topological-accumulation": providers.blkStrategy } : {}),
    "paper-portfolio-and-order-intents": providers.paperIntent,
    "account-normalization-and-reconciliation": providers.reconcile,
    ...(providers.alpacaRead ? { "venue-adapter-read": providers.alpacaRead } : {}),
    ...(providers.execution ? { "execution-transport": providers.execution } : {}),
  };
  return Object.freeze(indexed);
}

export function createBrokerageMarketRuntime(env = process.env, dependencies = {}) {
  let marketDataService = dependencies.marketDataService;
  if (!marketDataService && env.ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_KEY && env.ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_SECRET &&
      env.WITNESS_JOURNAL_RDF_AGENT && env.BROKERAGE_BOOKS_DATA_ROOT && env.BROKERAGE_BOOKS_ACCOUNT) {
    const recordObservation = dependencies.recordMarketDataObservation ?? createBrokerageMarketEventRecorder({
      originatingActor: "urn:ame:alpaca-market-data-read-service",
      nodeId: "alpaca-market-data-read-service",
    }, env, dependencies.marketDataRecordDependencies);
    marketDataService = createAlpacaHistoricalBarsService(env, { recordObservation });
  }
  const providers = dependencies.providers ?? createBrokerageProductProviders({ alpacaRead: dependencies.alpacaRead, alpacaReadPreflight: dependencies.alpacaReadPreflight, paperReadService: dependencies.paperReadService, marketDataService,
    resolveExecutionRecords: dependencies.resolveExecutionRecords, executionAdapter: dependencies.executionAdapter, executionClock: dependencies.executionClock });
  return createBrokerageX402Server(env, { ...dependencies, providers });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const runtime = createBrokerageMarketRuntime();
  runtime.app.listen(runtime.port, "0.0.0.0", () => console.log(`brokerage-control market runtime listening on 0.0.0.0:${runtime.port}`));
}

import { formIssuerEvidencePacket, validateIssuerEvidenceRequest } from "@red-cup-engineering/alpaca-services-section/evidence-packet";
import { normalizeAlpacaSnapshot, reconcileSnapshots, validateReconciliationRequest } from "@red-cup-engineering/account-evidence-reconciliation-service";
import { formAggressivePortfolioIntent, validateAggressivePortfolioIntentRequest } from "@red-cup-engineering/alpha-portfolio-order-intent-service";
import { evaluateBlkAccumulationStrategy } from "@red-cup-engineering/alpaca-services-section/strategy";

/**
 * market-runtime.mjs composes this seller's product operations -- pure
 * research/intent/reconciliation compute, plus the principal-authenticated
 * alpacaRead venue read and the BLK
 * accumulation strategy provider -- and nothing else. It carries no x402
 * selling concern of its own (2026-09-11 founder ruling: one x402 market,
 * market.561.group; no per-compute seller keeps a transport, facilitator
 * selection, or settlement witness of its own): `createBrokerageX402Server`
 * and its `createBrokerageMarketRuntime` composition were deleted from here.
 * The four products every offer here can serve anonymously and statelessly
 * (issuer, alpha, paperIntent, reconcile) are sold from market.561.group's
 * own catalog, bound directly to their owning packages. alpacaRead and
 * blkStrategy are principal-authenticated (they act on one
 * specific, already-authorized customer account) and are not catalog
 * candidates; account reads remain sold only through the Union and Virtuals
 * non-x402 distribution channels (see union-runtime.mjs, virtuals-runtime.mjs),
 * which call these operations directly. Brokerage writes are intentionally not
 * exposed here: they use the mode-specific reconciled execution provider.
 */

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

export function createBrokerageProductProviders({ alpacaRead, alpacaReadPreflight, paperReadService, marketDataService } = {}) {
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
  };
  return Object.freeze(indexed);
}

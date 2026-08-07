import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

const semanticId = (value) => identifyJsonSemanticContent({ objectKind: "brokerage.alpha-portfolio-order-intent.record", value, witnessRoot: EMPTY_WITNESS_ROOT }).id;
const canonical = (v) => v === null || typeof v !== "object" ? JSON.stringify(v) : Array.isArray(v) ? `[${v.map(canonical).join(",")}]` : `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
const id = (v) => semanticId(v);
const positive = (v, label) => { const n = Number(v); if (!Number.isFinite(n) || n <= 0) throw new TypeError(`${label}-invalid`); return n; };
export function validateAggressivePortfolioIntentRequest({ contract, evidencePackets, symbol, side = "buy", notional, maximumLoss, thesis, falsifier, liquidityPremise, executionPremise, scenarios, strategyCandidate, promotionCertificate } = {}) {
  if (contract?.type !== "PrincipalBrokerageServiceContract" || !contract.scopes?.includes("orders:intent")) throw new TypeError("order-intent-contract-required");
  if (!Array.isArray(evidencePackets) || evidencePackets.length === 0 || evidencePackets.some((p) => p?.type !== "IssuerEvidencePacket")) throw new TypeError("issuer-evidence-required");
  const n = positive(notional, "notional"), loss = positive(maximumLoss, "maximum-loss");
  if (n > contract.risk.maximumOrderNotional || loss > contract.risk.maximumLossAmount || n / contract.capital.amount > contract.risk.concentrationLimit) throw new RangeError("contract-risk-boundary-exceeded");
  if (typeof symbol !== "string" || symbol.trim() === "" || ![thesis, falsifier, liquidityPremise, executionPremise].every((x) => typeof x === "string" && x.trim()) || !Array.isArray(scenarios) || scenarios.length < 2 || scenarios.some((s) => !Number.isFinite(Number(s.pnl)))) throw new TypeError("aggressive-analysis-incomplete");
  const proofGoverned = contract.scopes.includes("strategy:obsmetrologia-paper-promotion");
  if (proofGoverned && (
    typeof strategyCandidate !== "string" ||
    promotionCertificate?.type !== "ObsmetrologiaPaperPromotionCertificate" ||
    promotionCertificate.candidate !== strategyCandidate ||
    promotionCertificate.paperPromotionEstablished !== true ||
    promotionCertificate.liveReadinessEstablished !== false
  )) throw new TypeError("obsmetrologia-paper-promotion-required");
  const worstScenarioLoss = Math.max(0, ...scenarios.map((s) => -Number(s.pnl))); if (worstScenarioLoss > loss) throw new RangeError("scenario-loss-exceeds-declared-loss");
  return Object.freeze({ contract, evidencePackets, symbol, side, notional: n, maximumLoss: loss, thesis, falsifier, liquidityPremise, executionPremise, scenarios, strategyCandidate: strategyCandidate ?? null, promotionCertificate: promotionCertificate ?? null });
}
export function formAggressivePortfolioIntent(input) {
  const { contract, evidencePackets, symbol, side, notional: n, maximumLoss: loss, thesis, falsifier, liquidityPremise, executionPremise, scenarios, strategyCandidate, promotionCertificate } = validateAggressivePortfolioIntentRequest(input);
  const body = { type: "AggressiveBrokerageOrderIntent", version: 1, contract: contract.id, evidence: evidencePackets.map((p) => p.id).sort(), symbol: String(symbol).toUpperCase(), side: side === "sell" ? "sell" : "buy", notional: n,
    currency: contract.capital.currency, maximumLoss: loss, concentration: n / contract.capital.amount, thesis, falsifier, liquidityPremise, executionPremise, scenarios,
    strategyCandidate, promotionCertificate,
    effect: "intent-only", liveVenueEffect: false, policyDigest: id({ risk: contract.risk, scenarios, liquidityPremise, executionPremise, strategyCandidate, promotionCertificate: promotionCertificate?.id ?? null }) };
  return Object.freeze({ id: id(body), ...body });
}

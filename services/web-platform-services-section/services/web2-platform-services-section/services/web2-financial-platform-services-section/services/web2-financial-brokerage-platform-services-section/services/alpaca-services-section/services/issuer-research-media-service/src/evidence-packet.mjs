import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

const semanticId = (value) => identifyJsonSemanticContent({ objectKind: "brokerage.issuer-research-media.record", value, witnessRoot: EMPTY_WITNESS_ROOT }).id;
const canonical = (v) => v === null || typeof v !== "object" ? JSON.stringify(v) : Array.isArray(v) ? `[${v.map(canonical).join(",")}]` : `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
const id = (v) => semanticId(v);
export function validateIssuerEvidenceRequest({ ticker, issuer, asOf, sources, claims, events = [], license = "single-customer-analysis" } = {}) {
  if (typeof ticker !== "string" || ticker.trim() === "" || typeof issuer !== "string" || issuer.trim() === "") throw new TypeError("ticker-and-issuer-required");
  if (!Number.isFinite(Date.parse(asOf)) || !Array.isArray(sources) || sources.length === 0 || sources.some((s) => !s.uri || !s.observedAt || !s.digest)) throw new TypeError("dated-content-addressed-sources-required");
  if (!Array.isArray(claims) || claims.length === 0 || claims.some((c) => !c.statement || !Array.isArray(c.sourceDigests) || c.sourceDigests.length === 0)) throw new TypeError("source-bound-claims-required");
  const sourceIds = new Set(sources.map((s) => s.digest)); if (claims.some((c) => c.sourceDigests.some((d) => !sourceIds.has(d)))) throw new TypeError("claim-cites-unknown-source");
  if (!Array.isArray(events) || typeof license !== "string" || license.trim() === "") throw new TypeError("events-or-license-invalid");
  return Object.freeze({ ticker, issuer, asOf, sources, claims, events, license });
}
export function formIssuerEvidencePacket(input) {
  const { ticker, issuer, asOf, sources, claims, events, license } = validateIssuerEvidenceRequest(input);
  const body = { type: "IssuerEvidencePacket", version: 1, ticker: String(ticker).toUpperCase(), issuer: String(issuer), asOf, sources, claims, events, license,
    proofStatus: "research-evidence-not-mathematical-proof", brokerageEffect: false };
  return Object.freeze({ id: id(body), ...body });
}

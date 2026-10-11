import { join } from "node:path";
import { querySettlementRecords } from "@red-cup-engineering/witness-journal-document-service";
import { ACTOR, NODE_ROOT, contentId, witnessJournalBinding } from "./broker.mjs";
export const MARKET = "urn:ame:curiosity-research-market-enterprise";
export const CHANNEL = "urn:ame:youtube-channel-enterprise";
export const OFFER_CATEGORY = "channel-analytics.curiosity-candidate-offer";
function exact(value) { if (!value || typeof value !== "object") return false; const { id, ...body } = value; return id === contentId(body); }
export async function pickupCuriosityOffer(request, options = {}) {
  if (!exact(request)
    || request.type !== "AnalyticsCuriosityOfferPickupRequest"
    || ![MARKET, CHANNEL].includes(request.requester)
    || request.broker !== ACTOR
    || !/^urn:sha256:[a-f0-9]{64}$/u.test(request.candidate ?? "")) {
    throw new TypeError("curiosity offer pickup is not exact for this broker and an admitted customer");
  }
  const dataRoot = options.dataRoot ?? join(NODE_ROOT, "data");
  const row = (options.records ?? (await querySettlementRecords(OFFER_CATEGORY, await witnessJournalBinding(options)))).find((entry) => entry.object?.id === request.candidate);
  if (!row || !exact(row) || row.type !== "Offer" || row.actor !== ACTOR || !exact(row.object) || row.object.id !== request.candidate || row.object.type !== "CuriosityCandidate" || row.object.evidenceStatus !== "demand-signal-not-research-evidence" || row.object.bidStatus !== "not-a-bid" || row.object.spendingAuthority !== "none") throw new TypeError("requested curiosity offer is unavailable or changed");
  if (request.requester === CHANNEL) {
    const interpretations = options.interpretations ?? (await querySettlementRecords("channel-analytics.interpretation-admission", await witnessJournalBinding(options)));
    const interpretation = interpretations.find((entry) => entry.id === row.object.motivatingInterpretation);
    if (!interpretation || interpretation.customer !== CHANNEL || interpretation.provider !== ACTOR) throw new TypeError("channel may retrieve only a curiosity induced by its own commissioned observation");
  }
  const offer = row;
  return { type: "AnalyticsCuriosityOfferPickupResult", provider: ACTOR, customer: request.requester, request: request.id, candidate: request.candidate, disposition: "delivered", offer };
}

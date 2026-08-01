import { materializeRmnActivity } from "@red-cup-engineering/activitypub-services-section/rmn-activity";
import { semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { relationalWitnessJournalDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { ACTOR, CONTEXT } from "./improvement-board-forager.mjs";
import { PUBLIC } from "./supplier-investment-decision.mjs";

function activityBytes(activity) { return semanticBytes(relationalWitnessJournalDocument(activity)); }
function exact(value) { return value?.id === semanticId(relationalWitnessJournalDocument(Object.fromEntries(Object.entries(value ?? {}).filter(([key]) => key !== "id")))); }

export function createSupplierActivityPubCallbacks({ origin, identifier, agentCard, ledger, pageSize = 50 }) {
  if (!ledger?.read || typeof origin !== "string" || !origin || typeof identifier !== "string" || !identifier || typeof agentCard !== "string" || !agentCard || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new Error("supplier ActivityPub face requires its exact origin, identifier, Agent Card, ledger, and bounded page size");
  }
  return Object.freeze({
    async listOutbox({ cursor }) {
      const offset = cursor === undefined ? 0 : Number(cursor);
      if (!Number.isSafeInteger(offset) || offset < 0) throw new Error("supplier outbox cursor is invalid");
      const rows = ledger.read().filter((row) => row?.["@context"] === CONTEXT && row.type === "Offer" && row.actor === ACTOR && row.target === PUBLIC && row.object?.type === "SupplierSelfImprovementWorkLot" && exact(row) && exact(row.object));
      const page = rows.slice(offset, offset + pageSize);
      const items = await Promise.all(page.map((activity) => materializeRmnActivity({ type: activity.type, origin, identifier, recipient: PUBLIC, objectBytes: activityBytes(activity), agentCard })));
      return Object.freeze({ items, ...(offset + page.length >= rows.length ? {} : { nextCursor: String(offset + page.length) }) });
    },
    async onActivity() {
      throw new Error("supplier self-improvement ingress has no admitted provider treaty; public discovery does not grant proposal, award, spend, or mutation authority");
    },
  });
}

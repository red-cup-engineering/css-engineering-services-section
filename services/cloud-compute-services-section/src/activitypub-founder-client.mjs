import { deliverFromEnvironment } from "@red-cup-engineering/activitypub-services-section/deliver";
import { projectRmnActivity } from "@red-cup-engineering/activitypub-services-section/rmn-activity";
import { semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { relationalRwilDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { activityPubSenderFromEnvironment } from "./activitypub-board-client.mjs";
import { ACTOR, CONTEXT } from "./improvement-board-forager.mjs";

function rmnId(value) { return semanticId(relationalRwilDocument(value)); }
function record(body) { return Object.freeze({ id: rmnId(body), ...body }); }
function exact(value) { return value?.id === rmnId(Object.fromEntries(Object.entries(value ?? {}).filter(([key]) => key !== "id"))); }
function validHttps(value) { try { return new URL(value).protocol === "https:"; } catch { return false; } }

export function founderLeadActivity(signal, founder) {
  if (!exact(signal) || signal.type !== "FounderEnterpriseFormationMarketLead" || signal.supplier !== ACTOR || typeof founder?.actor !== "string" || !founder.actor) throw new Error("exact supplier formation lead and founder semantic actor are required");
  return record({ "@context": CONTEXT, type: "Create", actor: ACTOR, target: founder.actor, object: signal });
}

export async function deliverFounderFormationLead(founder, signal, { sender, deliver = deliverFromEnvironment } = {}) {
  if (!validHttps(founder?.activityPubActor) || typeof founder.activityPubInbox !== "string" || !founder.activityPubInbox || !validHttps(founder.agentCard)) throw new Error("founder boundary must name its exact HTTPS actor and Agent Card plus contracted inbox");
  const exactSender = sender ?? activityPubSenderFromEnvironment();
  if (exactSender?.actor !== ACTOR || typeof exactSender.origin !== "string" || typeof exactSender.identifier !== "string" || !validHttps(exactSender.agentCard)) throw new Error("founder lead delivery requires this supplier's exact ActivityPub sender");
  const activity = founderLeadActivity(signal, founder);
  const projection = projectRmnActivity({ type: activity.type, origin: exactSender.origin, identifier: exactSender.identifier, recipient: founder.activityPubActor, objectBytes: semanticBytes(relationalRwilDocument(activity)), agentCard: exactSender.agentCard });
  const receipt = await deliver(projection, { ...exactSender, recipient: founder.activityPubActor, inbox: founder.activityPubInbox });
  return Object.freeze({ activity, receipt });
}

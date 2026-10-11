import { createHmac } from "node:crypto";
import path from "node:path";
import { evaluateReactionRoleBinding, normalizeReactionRoleBinding } from "@red-cup-engineering/discord-community-automation-service";
import { writeFileText } from "@red-cup-engineering/computer-file-engineering-services-section/write-file";

export async function planZeloShadowReaction(event, config, readState, now = new Date()) {
  if (config.mode === "disabled") return Object.freeze([]);
  const state = await readState(), observations = [];
  for (const rawBinding of config.bindings) {
    const binding = normalizeReactionRoleBinding(rawBinding), decision = evaluateReactionRoleBinding(event, binding, state, now);
    if (decision.kind === "ignore") continue;
    const planIds = decision.kind === "propose" ? decision.plans.map((plan) => plan.id) : [];
    const actorPseudonym = createHmac("sha256", config.projectionKey).update(`v1\0${event.guildId}\0${event.actorId}`).digest("hex");
    observations.push(Object.freeze({ type: "ZeloShadowReactionObservation", version: 1, observedAt: now.toISOString(), decision: decision.kind, planIds: Object.freeze(planIds), actorPseudonym: `urn:zelo:actor:${actorPseudonym}` }));
  }
  return Object.freeze(observations);
}
export async function writeZeloShadowObservations(file, observations) {
  await writeFileText(file, `${JSON.stringify({ type: "ZeloShadowReactionObservationLog", version: 1, observations })}\n`, { mode: 0o600 });
}

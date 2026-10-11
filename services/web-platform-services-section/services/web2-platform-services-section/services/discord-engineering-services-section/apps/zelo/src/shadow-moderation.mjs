import { planModeration, projectModerationReceipt } from "@red-cup-engineering/discord-community-moderation-planning-service";

/** Creates a privacy projection only. Reader results are validated by the upstream planner and stale/revoked state rejects. */
export async function planZeloShadowModeration(interaction, config, readAuthority, readState, now = new Date()) {
  if (config.mode === "disabled" || config.moderation === undefined) return undefined;
  const authority = await readAuthority(Object.freeze({ guildId: interaction.guildId, actorId: interaction.actorId, action: interaction.action }));
  const state = await readState(Object.freeze({ guildId: interaction.guildId, subjectId: interaction.subjectId, action: interaction.action, arguments: interaction.arguments }));
  const proposal = planModeration({ case: { type: "DiscordModerationCase", version: 1, id: interaction.caseId, guildId: interaction.guildId, subjectId: interaction.subjectId, openedAt: now.toISOString(), severity: interaction.severity, reasonCode: interaction.reasonCode, evidenceDigest: interaction.evidenceDigest, ...(interaction.appealOf === undefined ? {} : { appealOf: interaction.appealOf }) }, authority, state, action: interaction.action, arguments: interaction.arguments, now, maxStateAgeMs: config.moderation.maxStateAgeMs });
  return Object.freeze({ ...projectModerationReceipt(proposal, { pseudonymKey: config.projectionKey, purpose: config.moderation.purpose }), executable: false, delivery: "forbidden" });
}

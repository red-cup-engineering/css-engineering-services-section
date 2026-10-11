import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { acquireZeloProcessLease } from "../src/lease.mjs";
import { appendZeloShadowEvidence, createZeloShadowEvidenceEntry, parseZeloShadowEvidenceLines, readZeloShadowEvidence, validateZeloShadowEvidence } from "../src/shadow-evidence-journal.mjs";
import { normalizeDiscordCommunityResponseDispatch } from "../src/gateway-community-responses.mjs";
import { normalizeDiscordGatewayReactionDispatch } from "../src/gateway-reactions.mjs";
import { normalizeDiscordModerationInteraction } from "../src/gateway-moderation.mjs";
import { normalizeJson, reconcileCommunityConfiguration, validateCommunityConfigurationReconciliation } from "../src/reconciliation.mjs";
import { parseZeloRuntimeConfig } from "../src/config.mjs";
import { planZeloShadowCommunityResponse } from "../src/shadow-community-responses.mjs";
import { planZeloShadowModeration } from "../src/shadow-moderation.mjs";
import { planZeloShadowReaction, writeZeloShadowObservations } from "../src/shadow-runtime.mjs";

const config = (mode = "shadow") => parseZeloRuntimeConfig({ type: "ZeloRuntimeConfig", version: 1, mode, projectionKey: "a sufficiently long projection key with no production value", bindings: [{ type: "DiscordReactionRoleBinding", version: 1, id: "arrival", revision: 1, guildId: "g", channelId: "c", messageId: "m", emoji: { name: "wave" }, onAdd: ["add-role"], onRemove: ["remove-role"], roleId: "r" }] });
const state = { type: "DiscordReactionPolicyState", version: 1, observedAt: "2026-08-29T00:00:00.000Z", sourceRevision: "s1", messagePresent: true, role: { exists: true, managed: false, position: 1, botHighestPosition: 2 }, actorRoleIds: [] };
const communityConfig = (mode = "shadow") => parseZeloRuntimeConfig({ type: "ZeloRuntimeConfig", version: 1, mode, projectionKey: "a sufficiently long projection key with no production value", bindings: [], communityResponse: { type: "ZeloCommunityResponseShadowConfig", version: 1, program: { type: "ProgrammableCommunityResponseProgram", version: 1, id: "generic-community", revision: "r1", commands: [{ id: "acknowledge", revision: "r1", triggers: [{ kind: "exact-text", value: "!ack" }], variables: [], template: "Acknowledged.", visibility: "ephemeral", authority: "everyone", rateBudget: { maxResponses: 1, window: "minute" }, provenance: { sourceId: "generic-handbook", revision: "r1" } }] }, rateBudgetObservationProvider: { type: "ZeloRateBudgetObservationProviderConfig", version: 1, id: "bounded-observation", maxObservationAgeMs: 60_000 } } });
const communityEvent = () => normalizeDiscordCommunityResponseDispatch({ t: "MESSAGE_CREATE", d: { id: "1001", guild_id: "2001", channel_id: "3001", author: { id: "4001" }, content: "!ack" } });
const communityObservation = (overrides = {}) => ({ type: "CommunityResponseRateBudgetObservation", version: 1, observedAt: "2026-08-29T00:00:00.000Z", sourceRevision: "ledger-1", commandId: "acknowledge", scopeId: "discord-channel:3001", window: "minute", responseCount: 0, ...overrides });
const moderationConfig = () => parseZeloRuntimeConfig({ type: "ZeloRuntimeConfig", version: 1, mode: "shadow", projectionKey: "a sufficiently long projection key with no production value", bindings: [], moderation: { type: "ZeloModerationShadowConfig", version: 1, purpose: "review", maxStateAgeMs: 60_000 } });
const moderationInteraction = () => normalizeDiscordModerationInteraction({ t: "INTERACTION_CREATE", d: { guild_id: "guild-1", member: { user: { id: "actor-1" } }, data: { kind: "moderation-review", case_id: "case-1", subject_id: "subject-1", action: "timeout", severity: "moderate", reason_code: "rule", evidence_digest: "a".repeat(64), arguments: { durationSeconds: 600 } } } });
const moderationAuthority = (overrides = {}) => ({ type: "DiscordHumanModerationAuthority", version: 1, guildId: "guild-1", actorId: "actor-1", grantedAt: "2026-08-01T00:00:00.000Z", expiresAt: "2026-09-01T00:00:00.000Z", capabilities: ["timeout"], ...overrides });
const moderationState = (overrides = {}) => ({ type: "DiscordModerationState", version: 1, guildId: "guild-1", observedAt: "2026-08-29T00:00:00.000Z", sourceRevision: "state-1", subjectProtected: false, moderatorHighestRolePosition: 10, ...overrides });
const posixTemp = async (t, prefix) => { const root = await mkdtemp(path.join(process.cwd(), prefix)); t.after(() => rm(root, { recursive: true, force: true })); return root; };
test("normalizes reaction dispatches only", () => {
  const event = normalizeDiscordGatewayReactionDispatch({ t: "MESSAGE_REACTION_ADD", s: 4, d: { guild_id: "g", channel_id: "c", message_id: "m", user_id: "u", emoji: { name: "wave" } } }, "2026-08-29T00:00:00.000Z");
  assert.equal(event?.kind, "add"); assert.equal(normalizeDiscordGatewayReactionDispatch({ t: "MESSAGE_CREATE" }, "2026-08-29T00:00:00.000Z"), undefined);
});
test("configuration refuses any active executor mode", () => {
  assert.throws(() => config("active"));
});
test("normalizes Discord messages and interactions without a transport", () => {
  const message = communityEvent();
  assert.deepEqual(message, { type: "CommunityResponseEvent", version: 1, id: "discord-message:1001", scopeId: "discord-channel:3001", content: "!ack", actorAuthority: "everyone" });
  const interaction = normalizeDiscordCommunityResponseDispatch({ t: "INTERACTION_CREATE", d: { id: "1002", guild_id: "2001", channel_id: "3001", data: { name: "help" } } });
  assert.equal(interaction?.content, "/help");
  assert.equal(normalizeDiscordCommunityResponseDispatch({ t: "MESSAGE_CREATE", d: { id: "1001" } }), undefined);
});
test("community-response shadow evidence is non-executable and privacy-minimized", async () => {
  const event = communityEvent();
  assert.ok(event);
  const evidence = await planZeloShadowCommunityResponse(event, communityConfig(), async (request) => {
    assert.deepEqual(request, { type: "ZeloRateBudgetObservationRequest", version: 1, providerId: "bounded-observation", commandId: "acknowledge", scopeId: "discord-channel:3001", window: "minute" });
    return communityObservation();
  }, new Date("2026-08-29T00:00:01.000Z"));
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0]?.executable, false);
  assert.equal(evidence[0]?.allowedMentions, "none");
  const projected = JSON.stringify(evidence);
  for (const privateValue of ["1001", "2001", "3001", "4001", "!ack", "Acknowledged.", "acknowledge", "generic-handbook"]) assert.equal(projected.includes(privateValue), false);
});
test("community-response shadow planning fails closed for stale budgets and disabled mode", async () => {
  const event = communityEvent();
  assert.ok(event);
  await assert.rejects(planZeloShadowCommunityResponse(event, communityConfig(), async () => communityObservation({ observedAt: "2026-08-28T00:00:00.000Z" }), new Date("2026-08-29T00:00:01.000Z")), /stale/);
  let called = false;
  const evidence = await planZeloShadowCommunityResponse(event, communityConfig("disabled"), async () => { called = true; return communityObservation(); }, new Date("2026-08-29T00:00:01.000Z"));
  assert.deepEqual(evidence, []);
  assert.equal(called, false);
});
test("moderation shadow binds actor guild subject and projects non-executable private evidence", async () => {
  const interaction = moderationInteraction(); assert.ok(interaction);
  const receipt = await planZeloShadowModeration(interaction, moderationConfig(), async (binding) => { assert.deepEqual(binding, { guildId: "guild-1", actorId: "actor-1", action: "timeout" }); return moderationAuthority(); }, async (binding) => { assert.equal(binding.subjectId, "subject-1"); return moderationState(); }, new Date("2026-08-29T00:00:00.000Z"));
  const serialized = JSON.stringify(receipt);
  for (const raw of ["guild-1", "actor-1", "subject-1", "case-1", "rule"]) assert.equal(serialized.includes(raw), false);
  assert.equal(receipt?.action, "timeout");
});
test("moderation shadow fails closed for revoked stale protected hierarchy appeal and tampered inputs", async () => {
  const interaction = moderationInteraction(); assert.ok(interaction); const now = new Date("2026-08-29T00:00:00.000Z"), config = moderationConfig();
  await assert.rejects(planZeloShadowModeration(interaction, config, async () => moderationAuthority({ revokedAt: "2026-08-28T00:00:00.000Z" }), async () => moderationState(), now), /inactive/);
  await assert.rejects(planZeloShadowModeration(interaction, config, async () => moderationAuthority({ guildId: "other-guild" }), async () => moderationState(), now), /same guild/);
  await assert.rejects(planZeloShadowModeration(interaction, config, async () => moderationAuthority(), async () => moderationState({ observedAt: "2026-08-20T00:00:00.000Z" }), now), /stale/);
  await assert.rejects(planZeloShadowModeration(interaction, config, async () => moderationAuthority(), async () => moderationState({ subjectProtected: true }), now), /protected/);
  const role = normalizeDiscordModerationInteraction({ t: "INTERACTION_CREATE", d: { guild_id: "guild-1", member: { user: { id: "actor-1" } }, data: { kind: "moderation-review", case_id: "case-1", subject_id: "subject-1", action: "remove-role", severity: "moderate", reason_code: "rule", evidence_digest: "a".repeat(64), arguments: { targetRoleId: "role-1" } } } }); assert.ok(role);
  await assert.rejects(planZeloShadowModeration(role, config, async () => moderationAuthority({ capabilities: ["remove-role"] }), async () => moderationState({ targetRole: { id: "role-1", managed: true, position: 2 } }), now), /managed-role/);
  const restoration = { ...role, action: "restore-role" };
  await assert.rejects(planZeloShadowModeration(restoration, config, async () => moderationAuthority({ capabilities: ["restore-role"] }), async () => moderationState({ targetRole: { id: "role-1", managed: false, position: 2 }, appealDisposition: "upheld" }), now), /upheld appeal/);
  const restored = await planZeloShadowModeration({ ...restoration, appealOf: "case-original" }, config, async () => moderationAuthority({ capabilities: ["restore-role"] }), async () => moderationState({ targetRole: { id: "role-1", managed: false, position: 2 }, appealDisposition: "upheld" }), now);
  assert.equal(restored?.delivery, "forbidden"); assert.equal(restored?.executable, false);
  assert.equal(normalizeDiscordModerationInteraction({ t: "INTERACTION_CREATE", d: { guild_id: "guild-1", member: { user: { id: "actor-1" } }, data: { kind: "moderation-review", case_id: "case-1", subject_id: "actor-1" } } }), undefined);
  assert.equal(normalizeDiscordModerationInteraction({ t: "INTERACTION_CREATE", d: { guild_id: "guild-1", member: { user: { id: "actor-1" } }, data: { kind: "moderation-review", case_id: "case-1", appeal_of: "case-1", subject_id: "subject-1", action: "warn", severity: "low", reason_code: "rule", evidence_digest: "a".repeat(64), arguments: {} } } }), undefined);
  assert.equal(normalizeDiscordModerationInteraction({ t: "INTERACTION_CREATE", d: { guild_id: "guild-1", member: { user: { id: "actor-1" } }, data: { kind: "moderation-review", case_id: "case-1", subject_id: "subject-1", action: "warn", severity: "low", reason_code: "rule", evidence_digest: "tampered", arguments: {} } } }), undefined);
});
test("disabled moderation never invokes injected readers", async () => {
  const interaction = moderationInteraction(); assert.ok(interaction); let reads = 0;
  const result = await planZeloShadowModeration(interaction, parseZeloRuntimeConfig({ type: "ZeloRuntimeConfig", version: 1, mode: "disabled", projectionKey: "a sufficiently long projection key with no production value", bindings: [], moderation: { type: "ZeloModerationShadowConfig", version: 1, purpose: "review", maxStateAgeMs: 60_000 } }), async () => { reads += 1; return moderationAuthority(); }, async () => { reads += 1; return moderationState(); });
  assert.equal(result, undefined); assert.equal(reads, 0);
});
test("shadow planning emits private projections and has no execution surface", async () => {
  const event = normalizeDiscordGatewayReactionDispatch({ t: "MESSAGE_REACTION_ADD", d: { guild_id: "g", channel_id: "c", message_id: "m", user_id: "u", emoji: { name: "wave" } } }, "2026-08-29T00:00:00.000Z");
  const observations = await planZeloShadowReaction(event, config(), async () => state, new Date("2026-08-29T00:00:00.000Z"));
  assert.equal(observations[0]?.decision, "propose"); assert.equal(JSON.stringify(observations).includes("\"u\""), false);
  const file = path.join(await mkdtemp(path.join(os.tmpdir(), "zelo-shadow-")), "observations.json"); await writeZeloShadowObservations(file, observations);
  assert.equal((await readFile(file, "utf8")).includes("\"u\""), false);
  assert.equal((await planZeloShadowReaction(event, config("disabled"), async () => state, new Date("2026-08-29T00:00:00.000Z"))).length, 0);
});
test("process lease excludes a second owner and can be released", async () => {
  const file = path.join(await mkdtemp(path.join(os.tmpdir(), "zelo-lease-")), "owner");
  const lease = await acquireZeloProcessLease(file, "first"); await assert.rejects(acquireZeloProcessLease(file, "second")); await lease.release();
  await (await acquireZeloProcessLease(file, "second")).release();
});
test("reconciles desired and observed configuration without Discord identifiers", () => {
  const desired = { type: "DiscordCommunityDesiredConfiguration", version: 1, revision: "desired-1", resources: [{ key: "welcome-surface", kind: "channel-policy", specification: { read: "arrival" } }, { key: "member-lane", kind: "channel-policy", specification: { read: "member" } }] };
  const observed = { type: "DiscordCommunityObservedConfiguration", version: 1, observedAt: "2026-08-29T00:00:00.000Z", sourceRevision: "observed-1", resources: [{ key: "welcome-surface", kind: "channel-policy", specification: { read: "public" } }, { key: "old-lane", kind: "channel-policy", specification: {} }] };
  const result = reconcileCommunityConfiguration(desired, observed, { now: new Date("2026-08-29T00:00:00.000Z") });
  assert.deepEqual(result.changes.map((change) => [change.resourceKey, change.action]), [["member-lane", "create"], ["old-lane", "remove"], ["welcome-surface", "update"]]);
  assert.equal(JSON.stringify(result).includes("arrival"), false);
});
test("creates and verifies a hash-chained shadow evidence journal entry", () => {
  const options = { now: new Date("2026-08-29T00:00:03.000Z") }, reconciliation = reconcileCommunityConfiguration({ type: "DiscordCommunityDesiredConfiguration", version: 1, revision: "d1", resources: [] }, { type: "DiscordCommunityObservedConfiguration", version: 1, observedAt: "2026-08-29T00:00:00.000Z", sourceRevision: "o1", resources: [] }, options);
  const first = createZeloShadowEvidenceEntry([], reconciliation, "2026-08-29T00:00:01.000Z", options);
  const second = createZeloShadowEvidenceEntry([first], reconciliation, "2026-08-29T00:00:02.000Z", options);
  const entries = validateZeloShadowEvidence([first, second], options);
  assert.equal(entries.length, 2); assert.equal(second.previousHash, first.hash);
});
test("strictly normalizes JSON specifications and freezes their result", () => {
  const value = { b: [true, { a: "value" }], a: 1 }, normalized = normalizeJson(value);
  value.b[1].a = "changed";
  assert.equal(JSON.stringify(normalized), "{\"a\":1,\"b\":[true,{\"a\":\"value\"}]}");
  for (const invalid of [undefined, () => {}, Symbol("x"), 1n, Infinity, new Date()]) assert.throws(() => normalizeJson(invalid));
});
test("review proposals validate freshness, action digests, and deterministic identifiers", () => {
  const now = new Date("2026-08-29T00:00:01.000Z"), desired = { type: "DiscordCommunityDesiredConfiguration", version: 1, revision: "d1", resources: [{ key: "x", kind: "policy", specification: { value: 1 } }] }, observed = { type: "DiscordCommunityObservedConfiguration", version: 1, observedAt: "2026-08-29T00:00:00.000Z", sourceRevision: "o1", resources: [] }, reconciliation = reconcileCommunityConfiguration(desired, observed, { now });
  assert.throws(() => reconcileCommunityConfiguration(desired, observed, { now, maxObservedAgeMs: -1 }));
  assert.throws(() => validateCommunityConfigurationReconciliation({ ...reconciliation, changes: [{ ...reconciliation.changes[0], id: "discord-community-review:".concat("0".repeat(64)) }] }, { now }));
  assert.throws(() => validateCommunityConfigurationReconciliation({ ...reconciliation, changes: [{ ...reconciliation.changes[0], observedDigest: "0".repeat(64) }] }, { now }));
});
test("evidence journal appends private durable entries and rejects tampering, gaps, stale/future times, and nonprivate files", async (t) => {
  const root = await posixTemp(t, ".zelo-invalid-evidence-"), file = path.join(root, "evidence.jsonl"), options = { now: new Date("2026-08-29T00:00:03.000Z") };
  const reconciliation = reconcileCommunityConfiguration({ type: "DiscordCommunityDesiredConfiguration", version: 1, revision: "d1", resources: [] }, { type: "DiscordCommunityObservedConfiguration", version: 1, observedAt: "2026-08-29T00:00:00.000Z", sourceRevision: "o1", resources: [] }, options);
  assert.throws(() => createZeloShadowEvidenceEntry([], reconciliation, "2026-08-30T00:00:00.000Z", options));
  const entry = await appendZeloShadowEvidence(file, reconciliation, "2026-08-29T00:00:01.000Z", options);
  assert.equal((await stat(file)).mode & 0o777, 0o600); assert.equal((await readZeloShadowEvidence(file, options)).length, 1);
  assert.throws(() => validateZeloShadowEvidence([{ ...entry, sequence: 3 }], options), /structurally invalid/);
  assert.throws(() => validateZeloShadowEvidence([{ ...entry, hash: "0".repeat(64) }], options), /hash mismatch/);
  assert.throws(() => validateZeloShadowEvidence([{ ...entry, reconciliation: { ...reconciliation, changes: [{ type: "DiscordCommunityConfigurationReviewProposal", version: 1, id: "discord-community-review:0000000000000000000000000000000000000000000000000000000000000000", executable: true, authority: "review-required", action: "create", resourceKey: "x", resourceKind: "x" }] } }], options));
  assert.throws(() => parseZeloShadowEvidenceLines("{bad json}\n", options), /line 1/);
  await writeFile(file, "{bad json}\n", { mode: 0o600 }); await assert.rejects(readZeloShadowEvidence(file, options), /0600|line 1/);
  await writeFile(file, `${JSON.stringify(entry)}\n`, { mode: 0o600 }); await chmod(file, 0o644); await assert.rejects(readZeloShadowEvidence(file, options), /0600/);
});

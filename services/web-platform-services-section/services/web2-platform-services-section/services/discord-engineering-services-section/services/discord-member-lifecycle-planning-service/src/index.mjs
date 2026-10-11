import { createHmac } from "node:crypto";
import { semanticHex } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";

const KINDS = new Set(["arrival", "leave", "milestone", "reengagement"]);
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

function exact(value, keys, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError(`${name} must be a plain object`);
  const actual = Object.keys(value).sort(), expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) throw new TypeError(`${name} fields invalid`);
  return value;
}
function id(value, name) { if (typeof value !== "string" || !ID.test(value)) throw new TypeError(`${name} invalid`); return value; }
function time(value, name) { if (typeof value !== "string" || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw new TypeError(`${name} invalid timestamp`); return Date.parse(value); }
function freeze(value) { const copy = structuredClone(value); const visit = (item) => { if (item && typeof item === "object") { Object.values(item).forEach(visit); Object.freeze(item); } }; visit(copy); return copy; }
function toNow(value) { return value instanceof Date && Number.isFinite(value.getTime()) ? value.getTime() : time(value, "now"); }

function validatePolicy(policy) {
  exact(policy, ["cooldownHours", "maxStateAgeMinutes", "provenance", "quietInterval", "sourceRevision", "templates"], "policy");
  id(policy.sourceRevision, "policy sourceRevision");
  for (const name of ["cooldownHours", "maxStateAgeMinutes"]) if (!Number.isSafeInteger(policy[name]) || policy[name] < 0 || policy[name] > (name === "cooldownHours" ? 8760 : 60)) throw new TypeError(`policy ${name} invalid`);
  exact(policy.provenance, ["observedAt", "source", "sourceRevision"], "provenance");
  id(policy.provenance.source, "provenance source"); time(policy.provenance.observedAt, "provenance observedAt");
  if (policy.provenance.sourceRevision !== policy.sourceRevision) throw new TypeError("provenance revision mismatch");
  exact(policy.quietInterval, ["endMinute", "startMinute", "utcOffsetMinutes"], "quiet interval");
  for (const name of ["startMinute", "endMinute"]) if (!Number.isSafeInteger(policy.quietInterval[name]) || policy.quietInterval[name] < 0 || policy.quietInterval[name] > 1439) throw new TypeError("quiet minute invalid");
  if (policy.quietInterval.startMinute === policy.quietInterval.endMinute || !Number.isSafeInteger(policy.quietInterval.utcOffsetMinutes) || Math.abs(policy.quietInterval.utcOffsetMinutes) > 840) throw new TypeError("quiet interval invalid");
  exact(policy.templates, ["arrival", "digest", "leave", "milestone", "reengagement"], "templates");
  for (const kind of KINDS) if (typeof policy.templates[kind] !== "string" || policy.templates[kind].length < 1 || policy.templates[kind].length > 500 || /(?:<@|@everyone|@here)/u.test(policy.templates[kind])) throw new TypeError("template invalid or mentions people");
  if (policy.templates.digest !== semanticHex(Object.fromEntries([...KINDS].map((kind) => [kind, policy.templates[kind]])))) throw new TypeError("template digest mismatch");
  return policy;
}
function validateState(state, policy, now) {
  exact(state, ["lastContactAt", "observedAt", "priorReceipts", "sourceRevision"], "state");
  if (state.sourceRevision !== policy.sourceRevision) throw new TypeError("state revision mismatch");
  const observed = time(state.observedAt, "state observedAt");
  if (observed > now || now - observed > policy.maxStateAgeMinutes * 60_000) throw new TypeError("state not fresh");
  if (state.lastContactAt !== null) time(state.lastContactAt, "lastContactAt");
  if (!Array.isArray(state.priorReceipts) || state.priorReceipts.length > 64) throw new TypeError("prior receipts unbounded");
  for (const receipt of state.priorReceipts) { exact(receipt, ["dedupeKey", "kind"], "prior receipt"); id(receipt.dedupeKey, "dedupeKey"); if (!KINDS.has(receipt.kind)) throw new TypeError("prior receipt kind invalid"); }
  return state;
}
function validateEvent(event, kind, revision, now) {
  exact(event, ["completedParticipation", "eventId", "explicitOptIn", "occurredAt", "sourceRevision", "tenureStartedAt"], "event");
  id(event.eventId, "eventId"); id(event.sourceRevision, "event sourceRevision");
  if (event.sourceRevision !== revision) throw new TypeError("event revision mismatch");
  const occurred = time(event.occurredAt, "occurredAt"); if (occurred > now) throw new TypeError("future event");
  if (kind === "milestone") { if (event.completedParticipation !== true || event.tenureStartedAt === null || time(event.tenureStartedAt, "tenureStartedAt") >= occurred) throw new TypeError("milestone needs completed participation and elapsed tenure"); }
  else if (event.completedParticipation !== null || event.tenureStartedAt !== null) throw new TypeError("non-milestone fields invalid");
  if (kind === "reengagement") { if (event.explicitOptIn !== true) throw new TypeError("reengagement needs explicit opt-in"); }
  else if (event.explicitOptIn !== null) throw new TypeError("non-reengagement opt-in invalid");
  return event;
}
function quiet(now, interval) { const minute = ((Math.floor(now / 60_000) + interval.utcOffsetMinutes) % 1440 + 1440) % 1440; return interval.startMinute < interval.endMinute ? minute >= interval.startMinute && minute < interval.endMinute : minute >= interval.startMinute || minute < interval.endMinute; }

/** Deterministically plans, but cannot deliver, a lifecycle contact. */
export function planMemberLifecycle(input) {
  exact(input, ["communityId", "event", "kind", "memberId", "now", "policy", "state"], "input");
  const now = toNow(input.now), communityId = id(input.communityId, "communityId"), memberId = id(input.memberId, "memberId");
  if (!KINDS.has(input.kind)) throw new TypeError("kind invalid");
  const policy = validatePolicy(input.policy), state = validateState(input.state, policy, now), event = validateEvent(input.event, input.kind, state.sourceRevision, now);
  if (quiet(now, policy.quietInterval)) throw new TypeError("quiet interval");
  const dedupeKey = semanticHex({ communityId, memberId, kind: input.kind, eventId: event.eventId });
  if (state.priorReceipts.some((receipt) => receipt.dedupeKey === dedupeKey)) throw new TypeError("once-only duplicate");
  if (input.kind === "reengagement" && (state.lastContactAt === null || now - time(state.lastContactAt, "lastContactAt") < policy.cooldownHours * 3_600_000)) throw new TypeError("authoritative cooldown");
  const eventDigest = semanticHex(event), stateDigest = semanticHex(state);
  const material = { communityId, memberId, kind: input.kind, eventId: event.eventId, sourceRevision: state.sourceRevision, policyDigest: policy.templates.digest, eventDigest, stateDigest };
  return freeze({ type: "DiscordMemberLifecycleProposal", version: 1, proposalId: `lifecycle:${semanticHex(material)}`, communityId, memberId, kind: input.kind, eventId: event.eventId, sourceRevision: state.sourceRevision, policyDigest: policy.templates.digest, eventDigest, stateDigest, dedupeKey, allowedMentions: "none", delivery: "forbidden", executable: false });
}
export function validateLifecyclePlan(plan) {
  exact(plan, ["allowedMentions", "communityId", "dedupeKey", "delivery", "eventDigest", "eventId", "executable", "kind", "memberId", "policyDigest", "proposalId", "sourceRevision", "stateDigest", "type", "version"], "plan");
  if (plan.type !== "DiscordMemberLifecycleProposal" || plan.version !== 1 || plan.delivery !== "forbidden" || plan.executable !== false || plan.allowedMentions !== "none" || !KINDS.has(plan.kind)) throw new TypeError("plan controls invalid");
  for (const name of ["communityId", "memberId", "eventId", "sourceRevision"]) id(plan[name], name);
  for (const name of ["policyDigest", "eventDigest", "stateDigest", "dedupeKey"]) if (!/^[a-f0-9]{64}$/u.test(plan[name])) throw new TypeError(`plan ${name} invalid`);
  if (plan.dedupeKey !== semanticHex({ communityId: plan.communityId, memberId: plan.memberId, kind: plan.kind, eventId: plan.eventId })) throw new TypeError("dedupe tampered");
  const material = { communityId: plan.communityId, memberId: plan.memberId, kind: plan.kind, eventId: plan.eventId, sourceRevision: plan.sourceRevision, policyDigest: plan.policyDigest, eventDigest: plan.eventDigest, stateDigest: plan.stateDigest };
  if (plan.proposalId !== `lifecycle:${semanticHex(material)}`) throw new TypeError("proposal tampered");
  return freeze(plan);
}
export function projectLifecycleReceipt(plan, options) {
  const valid = validateLifecyclePlan(plan);
  exact(options, ["key", "purpose", "recordedAt"], "receipt options");
  if (typeof options.key !== "string" || options.key.length < 32) throw new TypeError("receipt key invalid");
  id(options.purpose, "purpose"); time(options.recordedAt, "recordedAt");
  const receiptHmac = createHmac("sha256", options.key).update(`v1\0${options.purpose}\0${valid.communityId}\0${valid.kind}\0${valid.memberId}\0${valid.dedupeKey}`).digest("hex");
  return freeze({ type: "DiscordMemberLifecycleReceipt", version: 1, purpose: options.purpose, kind: valid.kind, recordedAt: options.recordedAt, receiptHmac, privacy: { omitted: ["communityId", "memberId", "eventId", "messageContent", "channelId", "delivery", "template"] } });
}

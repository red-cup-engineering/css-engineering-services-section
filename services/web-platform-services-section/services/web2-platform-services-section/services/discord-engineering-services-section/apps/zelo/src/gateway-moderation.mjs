

const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) ? value : undefined;
const id = (value) => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u.test(value) ? value : undefined;
/**
 * Normalizes Zelo's pre-normalized interaction dispatch contract, not Discord's
 * raw wire payload. It opens no transport and deliberately does not parse
 * Discord option arrays; a gateway adapter must perform that mapping first.
 */
export function normalizeDiscordModerationInteraction(raw) {
  const packet = object(raw), data = packet && object(packet["d"]), command = data && object(data["data"]), member = data && object(data["member"]), user = member && object(member["user"]), args = command && object(command["arguments"]);
  if (packet?.["t"] !== "INTERACTION_CREATE" || command?.["kind"] !== "moderation-review" || !data || !args) return undefined;
  const caseId = id(command["case_id"]), guildId = id(data["guild_id"]), actorId = id(user?.["id"]), subjectId = id(command["subject_id"]), appealOf = command["appeal_of"] === undefined ? undefined : id(command["appeal_of"]), action = command["action"], severity = command["severity"], reasonCode = id(command["reason_code"]), evidenceDigest = command["evidence_digest"];
  if (!caseId || !guildId || !actorId || !subjectId || actorId === subjectId || (command["appeal_of"] !== undefined && (!appealOf || appealOf === caseId)) || !reasonCode || typeof evidenceDigest !== "string" || !/^[a-f0-9]{64}$/u.test(evidenceDigest) || !["warn", "timeout", "remove-role", "restore-role"].includes(String(action)) || !["low", "moderate", "high"].includes(String(severity))) return undefined;
  return Object.freeze({ caseId, guildId, actorId, subjectId, action: action, severity: severity, reasonCode, evidenceDigest, ...(appealOf === undefined ? {} : { appealOf }), arguments: Object.freeze({ ...args }) });
}

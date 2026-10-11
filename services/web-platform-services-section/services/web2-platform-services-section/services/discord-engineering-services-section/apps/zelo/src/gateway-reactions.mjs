import { semanticHex } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";

const text = (value) => typeof value === "string" && value.length > 0 ? value : undefined;
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value) ? value : undefined;
export function normalizeDiscordGatewayReactionDispatch(raw, observedAt) {
  const packet = object(raw), kind = packet?.["t"]; if (kind !== "MESSAGE_REACTION_ADD" && kind !== "MESSAGE_REACTION_REMOVE") return undefined;
  const data = packet && object(packet["d"]), emoji = data && object(data["emoji"]), guildId = data && text(data["guild_id"]), channelId = data && text(data["channel_id"]), messageId = data && text(data["message_id"]), actorId = data && text(data["user_id"]);
  if (!data || !emoji || !guildId || !channelId || !messageId || !actorId) return undefined;
  const name = text(emoji["name"]), id = text(emoji["id"]); if (!name && !id) return undefined;
  const sequence = typeof packet["s"] === "number" ? packet["s"] : 0, eventId = `gateway-reaction:${semanticHex({ kind, sequence, guildId, channelId, messageId, actorId, name, id })}`;
  return Object.freeze({ type: "DiscordReactionEvent", version: 1, eventId, occurredAt: new Date(observedAt).toISOString(), kind: kind === "MESSAGE_REACTION_ADD" ? "add" : "remove", guildId, channelId, messageId, actorId, emoji: Object.freeze({ ...(name ? { name } : {}), ...(id ? { id } : {}) }) });
}

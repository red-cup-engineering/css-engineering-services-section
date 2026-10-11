

const identifier = (value) => typeof value === "string" && /^[0-9]{1,32}$/u.test(value) ? value : undefined;
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) ? value : undefined;
const content = (value) => typeof value === "string" && value.trim().length > 0 && value.length <= 2_000 && !/[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/u.test(value) ? value.trim() : undefined;

/** Offline normalization only; this function opens no connection and invokes no Discord API. */
export function normalizeDiscordCommunityResponseDispatch(raw) {
  const packet = object(raw), kind = packet?.["t"], data = packet && object(packet["d"]);
  if (!data || (kind !== "MESSAGE_CREATE" && kind !== "INTERACTION_CREATE")) return undefined;
  const guildId = identifier(data["guild_id"]), channelId = identifier(data["channel_id"]), rawId = identifier(data["id"]);
  if (!guildId || !channelId || !rawId) return undefined;
  if (kind === "MESSAGE_CREATE") {
    const author = object(data["author"]), messageContent = content(data["content"]);
    if (!author || !identifier(author["id"]) || !messageContent) return undefined;
    return Object.freeze({ type: "CommunityResponseEvent", version: 1, id: `discord-message:${rawId}`, scopeId: `discord-channel:${channelId}`, content: messageContent, actorAuthority: "everyone", ...(author["bot"] === true ? { originResponse: Object.freeze({ id: "discord-bot", proposalId: "discord-bot" }) } : {}) });
  }
  const interaction = object(data["data"]), name = interaction && content(interaction["name"]);
  if (!name || !/^[A-Za-z][A-Za-z0-9_-]{0,99}$/u.test(name)) return undefined;
  return Object.freeze({ type: "CommunityResponseEvent", version: 1, id: `discord-interaction:${rawId}`, scopeId: `discord-channel:${channelId}`, content: `/${name}`, actorAuthority: "everyone" });
}

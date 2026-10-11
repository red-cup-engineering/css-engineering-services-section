import { readFile } from "node:fs/promises";

import { observeDiscordReactionSystem, writeDiscordReactionSystemObservation } from "@red-cup-engineering/discord-reaction-system-observation-service";

function argument(name) {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  if (typeof value !== "string" || value === "") throw new Error(`${name} is required`);
  return value;
}

const configurationFile = argument("--config");
const outputFile = argument("--output");
const token = process.env.DISCORD_BOT_TOKEN ?? process.env.DISCORD_TOKEN;
if (token === undefined || token === "") throw new Error("DISCORD_BOT_TOKEN or DISCORD_TOKEN is required");
const configuration = JSON.parse(await readFile(configurationFile, "utf8"));
const state = await observeDiscordReactionSystem(configuration, token, { projectionType: String(configuration.type ?? "DiscordReactionSystemObservation") });
await writeDiscordReactionSystemObservation(state, outputFile);
process.stdout.write(`${JSON.stringify({ type: state.type, observedAt: state.observedAt, guildId: state.guild.id, outputFile })}\n`);

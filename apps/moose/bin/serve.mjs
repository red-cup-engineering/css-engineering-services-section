#!/usr/bin/env node
import { serveMoose } from "../src/application.mjs";

function required(name) {
  const value = process.env[name];
  if (typeof value !== "string" || !value.trim()) throw new TypeError(name + " is required");
  return value;
}

async function main() {
  // Config contains paths, never key bytes; each actor has private file custody.
  const actors = JSON.parse(required("MOOSE_ACTORS_JSON"));
  const origin = required("MOOSE_ORIGIN");
  const stateDirectory = required("MOOSE_STATE_DIR");
  if (process.env.MOOSE_PUBLIC_READ !== "true") {
    throw new TypeError("MOOSE_PUBLIC_READ=true is required for public pages");
  }
  // Federation custody is retained by the original signed-inbox provider.
  // No social arrival invokes a MetroPlat operation or acquires office power.
  const onSocialActivity = async arrival => {
    const type = arrival.jsonLd?.type;
    if (!["Follow", "Undo", "Create", "Update", "Delete", "Like",
          "Announce", "Accept", "Reject"].includes(type)) {
      throw new TypeError("MOOSE social inbox does not admit this activity type");
    }
  };
  const running = await serveMoose({
    origin, stateDirectory, actors, onSocialActivity,
    authorizePublicRead: async ({ resource }) =>
      ["home", "public-timeline", "public-actors", "public-actor"].includes(resource),
    hostname: process.env.HOST ?? "127.0.0.1",
    port: process.env.PORT === undefined ? 8000 : Number(process.env.PORT),
    trustProxy: process.env.TRUST_PROXY === "true",
  });
  process.stdout.write(JSON.stringify({
    origin: running.origin,
    actors: actors.map(actor => running.origin + "/actors/" + actor.identifier),
  }) + "\n");
  let closing;
  const stop = () => {
    if (!closing) closing = running.close().catch(error => {
      process.stderr.write(String(error) + "\n");
      process.exitCode = 1;
    });
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

main().catch(error => {
  process.stderr.write((error instanceof Error ? error.stack ?? error.message : String(error)) + "\n");
  process.exitCode = 1;
});

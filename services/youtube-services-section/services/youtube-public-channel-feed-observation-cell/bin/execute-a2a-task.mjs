#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { executeRelationalOperationMessage } from "@red-cup-engineering/a2a-sovereign-operation-boundary-service";
import { observeYouTubePublicChannelFeed } from "../lib/observe.mjs";
import { observationProtocol } from "../src/protocol.mjs";
import { loadObservationRuntime } from "../src/runtime.mjs";

const operations = Object.freeze({
  "observe-youtube-public-channel-feed": (input, runtime) => observeYouTubePublicChannelFeed(input, runtime.providers),
});

export function executeA2aMessage(source, runtimeLoader = loadObservationRuntime) {
  return executeRelationalOperationMessage(source, {
    protocol: observationProtocol,
    operations,
    runtimeLoader,
    responseFilename: "youtube-public-channel-feed-observation-response.rmn.cbor",
    unknownOperationMessage: "unknown YouTube public observation operation",
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.stdout.write(`${JSON.stringify(await executeA2aMessage(JSON.parse(readFileSync(0, "utf8"))))}\n`); }
  catch (error) { process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1; }
}


#!/usr/bin/env node
import { executeRelationalOperationMessage } from "@red-cup-engineering/a2a-sovereign-operation-boundary-service";
import { observeYouTubePublicChannelFeed } from "../lib/observe.mjs";
import { observationProtocol } from "../src/protocol.mjs";
import { loadObservationRuntime } from "../src/runtime.mjs";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

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

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "execute-a2a-task", description: "executeA2aMessage — the execute-a2a-task operation.", operation: executeA2aMessage }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}

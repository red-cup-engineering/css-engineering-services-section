#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { projectRmnActivity } from "../src/rmn-activity.mjs";

function required(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${name} is required`);
  }
  return value;
}

const objectPath = required("--object");
const outputPath = required("--output");
const activity = projectRmnActivity({
  type: required("--type"),
  origin: required("--origin"),
  identifier: required("--identifier"),
  recipient: required("--recipient"),
  objectBytes: readFileSync(objectPath),
  agentCard: required("--agent-card"),
});
writeFileSync(outputPath, `${JSON.stringify([activity], null, 2)}\n`, {
  encoding: "utf8",
  flag: process.argv.includes("--replace") ? "w" : "wx",
  mode: 0o644,
});
process.stdout.write(`${JSON.stringify({
  type: "ActivityPubOutboxActivityMaterialized",
  activity: activity.id,
  object: activity.object.name,
  output: outputPath
})}\n`);

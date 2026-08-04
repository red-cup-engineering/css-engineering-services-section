#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { userRmnMessage } from "./rmn-part.mjs";

function required(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${name} is required`);
  return value;
}

const input = required("--input");
const output = required("--output");
const message = userRmnMessage(readFileSync(input));
writeFileSync(output, `${JSON.stringify(message)}\n`, {
  encoding: "utf8",
  flag: process.argv.includes("--replace") ? "w" : "wx",
  mode: 0o644,
});
process.stdout.write(`${JSON.stringify({
  type: "A2aRmnUserMessageMaterialized",
  messageId: message.messageId,
  input: message.parts[0].metadata.ni,
  output
})}\n`);

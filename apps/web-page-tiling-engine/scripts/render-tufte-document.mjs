#!/usr/bin/env node
import process from "node:process";
import { renderTufteDocument } from "../src/render-tufte-document.mjs";

let input = "";
for await (const chunk of process.stdin) input += chunk;
try {
  process.stdout.write(renderTufteDocument(input.trim() ? JSON.parse(input) : {}));
} catch (error) {
  process.stderr.write(`render-tufte-document: ${error.message}\n`);
  process.exitCode = 1;
}

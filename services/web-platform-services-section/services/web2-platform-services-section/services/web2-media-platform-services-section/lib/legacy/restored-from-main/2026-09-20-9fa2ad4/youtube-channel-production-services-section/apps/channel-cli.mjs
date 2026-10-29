#!/usr/bin/env node
/**
 * @module channel-cli
 * The composed face: one CLI dispatching to each production stage
 * script by verb, so an operator or workflow needs to know one command
 * rather than nine script paths.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runMain } from "@red-cup-engineering/javascript-file-main-guard-service";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(HERE, "..", "scripts");

/** @type {Readonly<Record<string, string>>} */
export const VERB_SCRIPTS = Object.freeze({
  authorize: "authorize-channel.mjs",
  plan: "plan-next-item.mjs",
  acquire: "acquire-sources.mjs",
  generate: "generate-script.mjs",
  render: "render-video.mjs",
  thumbnail: "make-thumbnail.mjs",
  publish: "publish-video.mjs",
  analytics: "collect-analytics.mjs",
  receipt: "record-receipt.mjs",
  produce: "run-production.mjs",
  "plan-lesson": "plan-next-lesson.mjs",
  observe: "observe-inventory.mjs",
  "produce-lesson": "run-lesson-production.mjs",
});

/**
 * Spawns one stage script, inheriting stdio, and resolves to its exit
 * code -- the CLI never re-implements a stage's own argument parsing.
 * @param {string} verb
 * @param {string[]} args
 * @returns {Promise<number>}
 * @throws {Error} when `verb` names no known stage
 */
export function runVerb(verb, args) {
  const scriptFile = VERB_SCRIPTS[verb];
  if (!scriptFile) throw new Error(`unknown channel-cli verb ${JSON.stringify(verb)}; known verbs: ${Object.keys(VERB_SCRIPTS).join(", ")}`);
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [join(SCRIPTS_DIR, scriptFile), ...args], { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => resolvePromise(signal ? 1 : (code ?? 0)));
  });
}

async function main({ argv }) {
  const [verb, ...rest] = argv;
  if (!verb) throw new Error(`usage: channel-cli.mjs <${Object.keys(VERB_SCRIPTS).join("|")}> [stage args...]`);
  const code = await runVerb(verb, rest);
  if (code !== 0) process.exitCode = code;
}

runMain(main, { moduleUrl: import.meta.url, exitCode: 1 });

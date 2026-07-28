#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runProgram } from "../src/program-runtime.mjs";

const path = process.argv[2];
if (!path) { process.stderr.write("usage: run-union-dev-program program.json\n"); process.exit(2); }
const result = await runProgram(JSON.parse(readFileSync(resolve(path), "utf8")));
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
process.exit(["complete", "already-satisfied"].includes(result.status) ? 0 : 1);

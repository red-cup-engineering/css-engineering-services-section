#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { submitMission } from "../src/mission-queue.mjs";

const path = process.argv[2];
if (!path) { process.stderr.write("usage: submit-union-dev-mission mission.json\n"); process.exit(2); }
const result = submitMission(JSON.parse(readFileSync(resolve(path), "utf8")));
process.stdout.write(JSON.stringify(result) + "\n");
